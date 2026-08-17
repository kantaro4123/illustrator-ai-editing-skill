import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { collectRecoveryEvidence, planRecovery } from '../../src/commands/recover.js';

describe('recovery evidence discovery', () => {
  test('finds preserved transactions, clears stale locks, and retains active locks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-recovery-test-'));
    const lockRoot = join(root, 'illustrator-ai-locks');
    const transaction = join(root, 'illustrator-ai-123e4567-e89b-42d3-a456-426614174000');
    const staleLock = join(lockRoot, 'stale.lock.json');
    const activeLock = join(lockRoot, 'active.lock.json');

    try {
      await mkdir(transaction);
      await mkdir(lockRoot);
      await writeFile(staleLock, JSON.stringify({
        documentPath: '/tmp/stale.ai',
        runId: 'stale-run',
        command: 'save',
        pid: 111,
        startedAt: '2026-08-17T00:00:00.000Z',
      }));
      await writeFile(activeLock, JSON.stringify({
        documentPath: '/tmp/active.ai',
        runId: 'active-run',
        command: 'run',
        pid: 222,
        startedAt: '2026-08-17T00:00:00.000Z',
      }));

      const evidence = await collectRecoveryEvidence({
        tempRoot: root,
        lockRoot,
        isProcessAlive: (pid) => pid === 222,
      });

      expect(evidence.staleLocksCleared).toEqual([staleLock]);
      expect(evidence.activeLocks).toEqual([activeLock]);
      expect(evidence.ambiguousTransactions).toContain(transaction);
      expect(evidence.ambiguousTransactions).toContain(activeLock);
      await expect(access(staleLock)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(access(activeLock)).resolves.toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('blocks mutation retry while preserved or recovered state is unresolved', () => {
    expect(planRecovery({
      doctorState: 'RESPONSIVE_DOCUMENTS_OPEN',
      ambiguousTransactions: ['/tmp/illustrator-ai-transaction'],
      recoveredDocuments: [],
    }).blockMutationRetry).toBe(true);

    expect(planRecovery({
      doctorState: 'RECOVERED_DOCUMENT_PRESENT',
      ambiguousTransactions: [],
      recoveredDocuments: ['/tmp/recovered.ai'],
    }).blockMutationRetry).toBe(true);
  });
});
