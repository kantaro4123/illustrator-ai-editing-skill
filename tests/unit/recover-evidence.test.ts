import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { collectRecoveryEvidence, planRecovery } from '../../src/commands/recover.js';

async function writeMarker(directory: string, marker: Record<string, unknown>): Promise<void> {
  await writeFile(join(directory, 'transaction.json'), JSON.stringify(marker), 'utf8');
}

describe('recovery evidence discovery', () => {
  test('finds preserved transactions, clears stale locks, and retains active locks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-recovery-test-'));
    const lockRoot = join(root, 'illustrator-ai-locks');
    const transaction = join(root, 'illustrator-ai-123e4567-e89b-42d3-a456-426614174000');
    const staleLock = join(lockRoot, 'stale.lock.json');
    const activeLock = join(lockRoot, 'active.lock.json');

    try {
      await mkdir(transaction);
      await writeMarker(transaction, {
        id: '123e4567-e89b-42d3-a456-426614174000',
        documentPath: '/tmp/flyer.ai',
        command: 'save',
        mutation: true,
        pid: 999,
        startedAt: '2026-08-17T00:00:00.000Z',
      });
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

  test('ignores read-only and unmarked directories instead of blocking forever', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-recovery-test-'));
    const unmarked = join(root, 'illustrator-ai-11111111-1111-4111-8111-111111111111');
    const readOnly = join(root, 'illustrator-ai-22222222-2222-4222-8222-222222222222');

    try {
      await mkdir(unmarked);
      await mkdir(readOnly);
      await writeMarker(readOnly, {
        id: '22222222-2222-4222-8222-222222222222',
        documentPath: '/tmp/flyer.ai',
        command: 'inspect',
        mutation: false,
        pid: 999,
        startedAt: '2026-08-17T00:00:00.000Z',
      });

      const evidence = await collectRecoveryEvidence({
        tempRoot: root, lockRoot: join(root, 'illustrator-ai-locks'), isProcessAlive: () => false,
      });

      expect(evidence.ambiguousTransactions).toEqual([]);
      expect(evidence.unclassifiedTransactions).toEqual(
        expect.arrayContaining([unmarked, readOnly]),
      );
      expect(planRecovery({
        doctorState: 'RESPONSIVE_DOCUMENTS_OPEN',
        ambiguousTransactions: evidence.ambiguousTransactions,
        recoveredDocuments: [],
      }).blockMutationRetry).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('keeps a lock retained after an ambiguous timeout instead of clearing it as stale', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-recovery-test-'));
    const lockRoot = join(root, 'illustrator-ai-locks');
    const retained = join(lockRoot, 'ambiguous.lock.json');

    try {
      await mkdir(lockRoot, { recursive: true });
      await writeFile(retained, JSON.stringify({
        documentPath: '/tmp/flyer.ai',
        runId: 'timed-out-run',
        command: 'save',
        pid: 111,
        startedAt: '2026-08-17T00:00:00.000Z',
        ambiguousTimeoutAt: '2026-08-17T00:05:00.000Z',
      }));

      // The owning CLI is dead, which is exactly when the PID probe alone would
      // have deleted the warning the timeout left behind.
      const evidence = await collectRecoveryEvidence({
        tempRoot: root, lockRoot, isProcessAlive: () => false,
      });

      expect(evidence.staleLocksCleared).toEqual([]);
      expect(evidence.ambiguousLocks).toEqual([retained]);
      expect(evidence.ambiguousTransactions).toContain(retained);
      await expect(access(retained)).resolves.toBeUndefined();
      expect(planRecovery({
        doctorState: 'RESPONSIVE_DOCUMENTS_OPEN',
        ambiguousTransactions: evidence.ambiguousTransactions,
        ambiguousLocks: evidence.ambiguousLocks,
        recoveredDocuments: [],
      }).blockMutationRetry).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('scopes evidence to one document when a path is given', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-recovery-test-'));
    const mine = join(root, 'illustrator-ai-33333333-3333-4333-8333-333333333333');
    const other = join(root, 'illustrator-ai-44444444-4444-4444-8444-444444444444');

    try {
      await mkdir(mine);
      await mkdir(other);
      await writeMarker(mine, {
        id: '33333333-3333-4333-8333-333333333333',
        documentPath: '/tmp/mine.ai', command: 'save', mutation: true,
        pid: 999, startedAt: '2026-08-17T00:00:00.000Z',
      });
      await writeMarker(other, {
        id: '44444444-4444-4444-8444-444444444444',
        documentPath: '/tmp/other.ai', command: 'save', mutation: true,
        pid: 999, startedAt: '2026-08-17T00:00:00.000Z',
      });

      const evidence = await collectRecoveryEvidence({
        tempRoot: root,
        lockRoot: join(root, 'illustrator-ai-locks'),
        isProcessAlive: () => false,
        documentPath: '/tmp/mine.ai',
      });

      expect(evidence.ambiguousTransactions).toEqual([mine]);
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
