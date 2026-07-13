import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { IllustratorError } from '../contracts/errors.js';
import type { BackupEvidence } from './backup.js';

export type DocumentRole = 'reference' | 'working' | 'new';

export interface TransactionManifest {
  schemaVersion: 1;
  runId: string;
  createdAt: string;
  reviewRound: number;
  target: {
    path: string;
    role: DocumentRole;
    fingerprint: string;
  };
  comparisonReferences: string[];
  backup?: BackupEvidence;
}

export interface CreateManifestInput {
  runId: string;
  targetPath: string;
  targetRole: DocumentRole;
  targetFingerprint: string;
  reviewRound: number;
  comparisonReferences?: string[];
  createdAt?: string;
}

export function createTransactionManifest(input: CreateManifestInput): TransactionManifest {
  return {
    schemaVersion: 1,
    runId: input.runId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    reviewRound: input.reviewRound,
    target: {
      path: input.targetPath,
      role: input.targetRole,
      fingerprint: input.targetFingerprint,
    },
    comparisonReferences: input.comparisonReferences ?? [],
  };
}

export function assertSaveAllowed(manifest: TransactionManifest, destinationPath: string): void {
  if (manifest.target.role === 'reference') {
    throw new IllustratorError({
      code: 'REFERENCE_WRITE_FORBIDDEN',
      message: 'A pristine comparison reference cannot be used as a save target.',
      recoverable: false,
      safeToRetry: false,
      nextAction: 'Create or select a working copy and save there instead.',
    });
  }
  if (resolve(destinationPath) !== resolve(manifest.target.path)) {
    throw new IllustratorError({
      code: 'DOCUMENT_MISMATCH',
      message: `Save destination does not match the exact transaction target: ${destinationPath}`,
      recoverable: false,
      safeToRetry: false,
      nextAction: 'Start a new transaction explicitly bound to the intended destination.',
    });
  }
  if (manifest.target.role === 'working') {
    const backup = manifest.backup;
    if (
      !backup
      || backup.sourceSha256 !== manifest.target.fingerprint
      || backup.backupSha256 !== manifest.target.fingerprint
    ) {
      throw new Error('A fresh backup matching the inspected working copy is required before save.');
    }
  }
}

export async function writeTransactionManifest(
  path: string,
  manifest: TransactionManifest,
): Promise<void> {
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}
