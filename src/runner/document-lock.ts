import { createHash } from 'node:crypto';
import { mkdir, open, readFile, realpath, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { IllustratorError } from '../contracts/errors.js';

export interface DocumentLockMetadata {
  documentPath: string;
  runId: string;
  command: string;
  pid: number;
  startedAt: string;
  /**
   * Set when a mutation timed out ambiguously and the lock was deliberately kept.
   * The owning CLI process is dead by then, so a PID probe alone would classify
   * the lock as ordinary debris and clear the very warning it was left to raise.
   */
  ambiguousTimeoutAt?: string;
}

export interface DocumentLock {
  path: string;
  metadata: DocumentLockMetadata;
}

export interface AcquireDocumentLockInput {
  rootDir: string;
  documentPath: string;
  runId: string;
  command: string;
  pid?: number;
  startedAt?: string;
}

export async function canonicalDocumentPath(documentPath: string): Promise<string> {
  try {
    return await realpath(documentPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return resolve(documentPath);
    throw error;
  }
}

function lockName(documentPath: string): string {
  return `${createHash('sha256').update(documentPath).digest('hex')}.lock.json`;
}

async function parseLock(path: string): Promise<DocumentLockMetadata> {
  return JSON.parse(await readFile(path, 'utf8')) as DocumentLockMetadata;
}

export async function acquireDocumentLock(
  input: AcquireDocumentLockInput,
): Promise<DocumentLock> {
  await mkdir(input.rootDir, { recursive: true });
  const canonicalPath = await canonicalDocumentPath(input.documentPath);
  const path = join(input.rootDir, lockName(canonicalPath));
  const metadata: DocumentLockMetadata = {
    documentPath: canonicalPath,
    runId: input.runId,
    command: input.command,
    pid: input.pid ?? process.pid,
    startedAt: input.startedAt ?? new Date().toISOString(),
  };

  try {
    const handle = await open(path, 'wx', 0o600);
    try {
      await handle.writeFile(JSON.stringify(metadata), 'utf8');
    } finally {
      await handle.close();
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    let owner = 'unknown owner';
    try {
      const existing = await parseLock(path);
      owner = `${existing.runId} (${existing.command}, pid ${existing.pid})`;
    } catch {
      owner = 'unreadable lock';
    }
    throw new IllustratorError({
      code: 'DOCUMENT_LOCKED',
      message: `Document is locked by ${owner}.`,
      recoverable: true,
      safeToRetry: false,
      nextAction: 'Run illustrator-ai recover to diagnose the lock before retrying.',
    });
  }
  return { path, metadata };
}

/** Records why a lock is being retained so recovery can tell it from debris. */
export async function markDocumentLockAmbiguous(
  lock: DocumentLock,
  timestamp: string = new Date().toISOString(),
): Promise<void> {
  const metadata: DocumentLockMetadata = { ...lock.metadata, ambiguousTimeoutAt: timestamp };
  await writeFile(lock.path, JSON.stringify(metadata), 'utf8');
}

export interface LockDiagnosis {
  exists: boolean;
  stale: boolean;
  ownerAlive: boolean;
  ambiguous: boolean;
  metadata?: DocumentLockMetadata;
}

export async function diagnoseDocumentLock(
  path: string,
  isProcessAlive: (pid: number) => boolean,
): Promise<LockDiagnosis> {
  try {
    const metadata = await parseLock(path);
    const ownerAlive = isProcessAlive(metadata.pid);
    const ambiguous = typeof metadata.ambiguousTimeoutAt === 'string';
    // An ambiguous lock is never stale: Illustrator may still be executing the
    // script that outlived its caller.
    return { exists: true, stale: !ownerAlive && !ambiguous, ownerAlive, ambiguous, metadata };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { exists: false, stale: false, ownerAlive: false, ambiguous: false };
    }
    throw error;
  }
}

export async function releaseDocumentLock(lock: DocumentLock, runId: string): Promise<void> {
  const current = await parseLock(lock.path);
  if (current.runId !== runId) {
    throw new Error(`Lock owner mismatch: expected ${current.runId}, got ${runId}`);
  }
  await unlink(lock.path);
}
