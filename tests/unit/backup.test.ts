import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { createBackup, fingerprintFile } from '../../src/safety/backup.js';

describe('Illustrator document backups', () => {
  test('creates a timestamped byte-identical backup beside the source', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-backup-test-'));
    const source = join(root, 'テスト 文書.ai');
    await writeFile(source, Buffer.from([0, 1, 2, 3, 255]));

    const backup = await createBackup(source, {
      now: new Date('2026-07-14T01:02:03.000Z'),
    });

    expect(backup.path).toBe(join(root, 'テスト 文書_backup_20260714_010203.ai'));
    expect(await readFile(backup.path)).toEqual(await readFile(source));
    expect(backup.sourceSha256).toBe(await fingerprintFile(source));
    expect(backup.backupSha256).toBe(backup.sourceSha256);
  });

  test('never overwrites an existing backup with the same timestamp', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-backup-test-'));
    const source = join(root, 'working.ai');
    await writeFile(source, 'first', 'utf8');
    const now = new Date('2026-07-14T01:02:03.000Z');
    const first = await createBackup(source, { now });
    await writeFile(source, 'second', 'utf8');
    const second = await createBackup(source, { now });

    expect(second.path).not.toBe(first.path);
    expect(await readFile(first.path, 'utf8')).toBe('first');
    expect(await readFile(second.path, 'utf8')).toBe('second');
  });
});
