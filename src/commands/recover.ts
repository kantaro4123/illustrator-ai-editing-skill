import { readdir, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DoctorState } from './doctor.js';
import { diagnoseDocumentLock } from '../runner/document-lock.js';
import { readTransactionMarker } from '../runner/temp-files.js';

export interface RecoveryInput {
  doctorState: DoctorState;
  ambiguousTransactions: string[];
  recoveredDocuments: string[];
  ambiguousLocks?: string[];
}

export interface RecoveryPlan {
  blockMutationRetry: boolean;
  actions: string[];
}

export interface RecoveryEvidence {
  /** Preserved mutations and retained locks: any of these blocks a retry. */
  ambiguousTransactions: string[];
  staleLocksCleared: string[];
  activeLocks: string[];
  /** Locks kept after an ambiguous mutation timeout, still awaiting resolution. */
  ambiguousLocks: string[];
  /** Temp directories with no usable marker. Reported, never treated as evidence. */
  unclassifiedTransactions: string[];
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
  /** Restricts evidence to one document. Omit to sweep every document. */
  documentPath?: string;
} = {}): Promise<RecoveryEvidence> {
  const tempRoot = options.tempRoot ?? tmpdir();
  const lockRoot = options.lockRoot ?? join(tempRoot, 'illustrator-ai-locks');
  const isProcessAlive = options.isProcessAlive ?? defaultProcessAlive;
  const scoped = options.documentPath;

  const transactionEntries = await listDirectory(tempRoot);
  const preservedTransactions: string[] = [];
  const unclassifiedTransactions: string[] = [];
  for (const entry of transactionEntries) {
    if (!entry.isDirectory() || !TRANSACTION_DIRECTORY_PATTERN.test(entry.name)) continue;
    const path = join(tempRoot, entry.name);
    const marker = await readTransactionMarker(path);
    // Without a marker the directory predates this format or came from a
    // read-only failure. Blocking retries on it would make recovery cry wolf.
    if (!marker || !marker.mutation) {
      unclassifiedTransactions.push(path);
      continue;
    }
    if (scoped !== undefined && marker.documentPath !== scoped) continue;
    preservedTransactions.push(path);
  }

  const staleLocksCleared: string[] = [];
  const activeLocks: string[] = [];
  const ambiguousLocks: string[] = [];
  const lockEntries = await listDirectory(lockRoot);
  for (const entry of lockEntries) {
    if (!entry.isFile() || !entry.name.endsWith('.lock.json')) continue;
    const path = join(lockRoot, entry.name);
    const diagnosis = await diagnoseDocumentLock(path, isProcessAlive);
    if (!diagnosis.exists) continue;
    if (scoped !== undefined && diagnosis.metadata?.documentPath !== scoped) continue;
    if (diagnosis.ambiguous) {
      ambiguousLocks.push(path);
    } else if (diagnosis.stale) {
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
    ambiguousTransactions: [...preservedTransactions, ...activeLocks, ...ambiguousLocks],
    staleLocksCleared,
    activeLocks,
    ambiguousLocks,
    unclassifiedTransactions,
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
  if (input.ambiguousLocks !== undefined && input.ambiguousLocks.length > 0) {
    actions.push('A mutation timed out ambiguously and its lock was retained. Confirm Illustrator finished or discarded that edit, then release the lock explicitly.');
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
