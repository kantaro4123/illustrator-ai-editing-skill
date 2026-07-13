import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  acquireDocumentLock,
  diagnoseDocumentLock,
  releaseDocumentLock,
} from '../../src/runner/document-lock.js';
import { IllustratorError } from '../../src/contracts/errors.js';

async function tempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'illustrator-lock-test-'));
}

describe('per-document mutation lock', () => {
  test('writes auditable metadata and rejects a second owner', async () => {
    const root = await tempRoot();
    const documentPath = '/制作/テスト 文書.ai';
    const first = await acquireDocumentLock({
      rootDir: root,
      documentPath,
      runId: 'run-one',
      command: 'run',
      pid: 123,
      startedAt: '2026-07-14T01:00:00.000Z',
    });

    expect(JSON.parse(await readFile(first.path, 'utf8'))).toEqual({
      documentPath,
      runId: 'run-one',
      command: 'run',
      pid: 123,
      startedAt: '2026-07-14T01:00:00.000Z',
    });

    await expect(
      acquireDocumentLock({
        rootDir: root,
        documentPath,
        runId: 'run-two',
        command: 'save',
      }),
    ).rejects.toMatchObject({ code: 'DOCUMENT_LOCKED' } satisfies Partial<IllustratorError>);
  });

  test('allows different documents to be locked independently', async () => {
    const root = await tempRoot();
    const a = await acquireDocumentLock({
      rootDir: root,
      documentPath: '/制作/A.ai',
      runId: 'run-a',
      command: 'run',
    });
    const b = await acquireDocumentLock({
      rootDir: root,
      documentPath: '/制作/B.ai',
      runId: 'run-b',
      command: 'run',
    });
    expect(a.path).not.toBe(b.path);
  });

  test('diagnoses a stale lock without deleting it', async () => {
    const root = await tempRoot();
    const lock = await acquireDocumentLock({
      rootDir: root,
      documentPath: '/制作/A.ai',
      runId: 'run-stale',
      command: 'run',
      pid: 999_999,
    });

    const diagnosis = await diagnoseDocumentLock(lock.path, () => false);
    expect(diagnosis).toMatchObject({ exists: true, stale: true, ownerAlive: false });
    expect((await stat(lock.path)).isFile()).toBe(true);
  });

  test('only the owning run can release a lock', async () => {
    const root = await tempRoot();
    const lock = await acquireDocumentLock({
      rootDir: root,
      documentPath: '/制作/A.ai',
      runId: 'run-owner',
      command: 'run',
    });
    await expect(releaseDocumentLock(lock, 'wrong-run')).rejects.toThrow('Lock owner mismatch');
    await releaseDocumentLock(lock, 'run-owner');
    await expect(stat(lock.path)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
