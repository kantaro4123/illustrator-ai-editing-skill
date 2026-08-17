import { readdir, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DoctorState } from './doctor.js';
import { diagnoseDocumentLock } from '../runner/document-lock.js';

export interface RecoveryInput {
  doctorState: DoctorState;
  ambiguousTransactions: string[];
  recoveredDocuments: string[];
}

export interface RecoveryPlan {
  blockMutationRetry: boolean;
  actions: string[];
}

export interface RecoveryEvidence {
  ambiguousTransactions: string[];
  staleLocksCleared: string[];
  activeLocks: string[];
}

const TRANSACTION_DIRECTORY_PATTERN = /^illustrator-ai-[0-9a-f-]{36}$/i;

async function listDirectory(path: string): Promise<Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>> {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

function defaultProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

export async function collectRecoveryEvidence(options: {
  tempRoot?: string;
  lockRoot?: string;
  isProcessAlive?: (pid: number) => boolean;
} = {}): Promise<RecoveryEvidence> {
  const tempRoot = options.tempRoot ?? tmpdir();
  const lockRoot = options.lockRoot ?? join(tempRoot, 'illustrator-ai-locks');
  const isProcessAlive = options.isProcessAlive ?? defaultProcessAlive;

  const transactionEntries = await listDirectory(tempRoot);
  const preservedTransactions = transactionEntries
    .filter((entry) => entry.isDirectory() && TRANSACTION_DIRECTORY_PATTERN.test(entry.name))
    .map((entry) => join(tempRoot, entry.name));

  const staleLocksCleared: string[] = [];
  const activeLocks: string[] = [];
  const lockEntries = await listDirectory(lockRoot);
  for (const entry of lockEntries) {
    if (!entry.isFile() || !entry.name.endsWith('.lock.json')) continue;
    const path = join(lockRoot, entry.name);
    const diagnosis = await diagnoseDocumentLock(path, isProcessAlive);
    if (!diagnosis.exists) continue;
    if (diagnosis.stale) {
      try {
        await unlink(path);
        staleLocksCleared.push(path);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    } else {
      activeLocks.push(path);
    }
  }

  return {
    ambiguousTransactions: [...preservedTransactions, ...activeLocks],
    staleLocksCleared,
    activeLocks,
  };
}

export function planRecovery(input: RecoveryInput): RecoveryPlan {
  const actions: string[] = [];
  let blockMutationRetry = input.ambiguousTransactions.length > 0;

  if (input.recoveredDocuments.length > 0 || input.doctorState === 'RECOVERED_DOCUMENT_PRESENT') {
    blockMutationRetry = true;
    actions.push('Verify a known edit in each recovered document before choosing the working copy.');
    actions.push('Create a backup of the current disk working file, then save the verified recovered document to the exact target.');
  }
  if (input.ambiguousTransactions.length > 0) {
    actions.push('Inspect each preserved transaction sidecar and lock before any new mutation.');
  }
  if (input.doctorState === 'MODAL_OR_UNRESPONSIVE') {
    actions.push('Inspect Illustrator for a modal recovery dialog and ask the user to dismiss it if necessary.');
  }
  if (input.doctorState === 'RESPONSIVE_NO_DOCUMENTS') {
    actions.push('Reopen the last confirmed saved working file and re-inspect it.');
  }
  if (input.doctorState === 'NOT_RUNNING') {
    actions.push('Launch Illustrator, reopen the last confirmed saved working file, and re-inspect it.');
  }
  if (actions.length === 0) actions.push('Run a fresh read-only inspection before the next mutation.');
  return { blockMutationRetry, actions };
}
