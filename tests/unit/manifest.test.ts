import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { IllustratorError } from '../../src/contracts/errors.js';
import {
  assertSaveAllowed,
  createTransactionManifest,
  writeTransactionManifest,
} from '../../src/safety/manifest.js';

describe('transaction manifest save policy', () => {
  test('forbids saving a pristine reference document', () => {
    const manifest = createTransactionManifest({
      runId: 'run-reference',
      targetPath: '/制作/入力済(修正前版).ai',
      targetRole: 'reference',
      targetFingerprint: 'sha-reference',
      reviewRound: 1,
    });
    expect(() => assertSaveAllowed(manifest, manifest.target.path)).toThrowError(
      expect.objectContaining<Partial<IllustratorError>>({ code: 'REFERENCE_WRITE_FORBIDDEN' }),
    );
  });

  test('requires a fresh backup before saving a working copy in place', () => {
    const manifest = createTransactionManifest({
      runId: 'run-working',
      targetPath: '/制作/修正版.ai',
      targetRole: 'working',
      targetFingerprint: 'sha-working',
      reviewRound: 2,
    });
    expect(() => assertSaveAllowed(manifest, manifest.target.path)).toThrow('fresh backup');

    manifest.backup = {
      path: '/制作/修正版_backup_20260714_010203.ai',
      sourceSha256: 'sha-working',
      backupSha256: 'sha-working',
      createdAt: '2026-07-14T01:02:03.000Z',
    };
    expect(() => assertSaveAllowed(manifest, manifest.target.path)).not.toThrow();
  });

  test('rejects a destination that differs from the exact working target', () => {
    const manifest = createTransactionManifest({
      runId: 'run-working',
      targetPath: '/制作/修正版.ai',
      targetRole: 'working',
      targetFingerprint: 'sha-working',
      reviewRound: 2,
    });
    manifest.backup = {
      path: '/制作/backup.ai',
      sourceSha256: 'sha-working',
      backupSha256: 'sha-working',
      createdAt: '2026-07-14T01:02:03.000Z',
    };
    expect(() => assertSaveAllowed(manifest, '/制作/別名.ai')).toThrowError(
      expect.objectContaining<Partial<IllustratorError>>({ code: 'DOCUMENT_MISMATCH' }),
    );
  });

  test('persists review chronology and backup evidence as JSON', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-manifest-test-'));
    const path = join(root, 'manifest.json');
    const manifest = createTransactionManifest({
      runId: 'run-review-two',
      targetPath: '/制作/修正版.ai',
      targetRole: 'working',
      targetFingerprint: 'sha-working',
      reviewRound: 2,
      comparisonReferences: ['/制作/入力済(修正前版).ai'],
    });
    await writeTransactionManifest(path, manifest);
    expect(JSON.parse(await readFile(path, 'utf8'))).toMatchObject({
      runId: 'run-review-two',
      reviewRound: 2,
      comparisonReferences: ['/制作/入力済(修正前版).ai'],
    });
  });

  test('Illustrator save command requires PDF compatibility', async () => {
    const source = await readFile(
      new URL('../../src/jsx/commands/save.jsx', import.meta.url),
      'utf8',
    );
    expect(source).toContain('pdfCompatible = true');
    expect(source).toContain('compressed = true');
    expect(source).toContain('assertTargetDocument');
  });
});
