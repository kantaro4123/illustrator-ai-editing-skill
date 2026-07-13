import { createHash } from 'node:crypto';
import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { IllustratorError } from '../contracts/errors.js';

export interface DocumentLockMetadata {
  documentPath: string;
  runId: string;
  command: string;
  pid: number;
  startedAt: string;
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
  const path = join(input.rootDir, lockName(input.documentPath));
  const metadata: DocumentLockMetadata = {
    documentPath: input.documentPath,
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

export interface LockDiagnosis {
  exists: boolean;
  stale: boolean;
  ownerAlive: boolean;
  metadata?: DocumentLockMetadata;
}

export async function diagnoseDocumentLock(
  path: string,
  isProcessAlive: (pid: number) => boolean,
): Promise<LockDiagnosis> {
  try {
    const metadata = await parseLock(path);
    const ownerAlive = isProcessAlive(metadata.pid);
    return { exists: true, stale: !ownerAlive, ownerAlive, metadata };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { exists: false, stale: false, ownerAlive: false };
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
