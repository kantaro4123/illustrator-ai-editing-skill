import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  cleanupTransaction,
  createTransactionFiles,
  readJsonResult,
  writeJsx,
  writeParams,
} from '../../src/runner/temp-files.js';

describe('Illustrator transaction files', () => {
  test('creates isolated paths under a UUID-scoped directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-ai-test-'));
    const first = await createTransactionFiles({ rootDir: root, id: '11111111-1111-4111-8111-111111111111' });
    const second = await createTransactionFiles({ rootDir: root, id: '22222222-2222-4222-8222-222222222222' });

    expect(first.directory).not.toBe(second.directory);
    expect(first.paramsPath).toContain(first.id);
    expect(first.resultPath).toContain(first.id);
    expect((await stat(first.directory)).isDirectory()).toBe(true);
  });

  test('writes parameters as UTF-8 JSON and JSX with a BOM', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-ai-日本語-'));
    const files = await createTransactionFiles({ rootDir: root, id: '33333333-3333-4333-8333-333333333333' });

    await writeParams(files, { path: '/制作/テスト 文書.ai', text: '受付時間' });
    await writeJsx(files, '#target illustrator\nvar message = "日本語";');

    expect(JSON.parse(await readFile(files.paramsPath, 'utf8'))).toEqual({
      path: '/制作/テスト 文書.ai',
      text: '受付時間',
    });
    expect(await readFile(files.scriptPath, 'utf8')).toBe(
      '\uFEFF#target illustrator\nvar message = "日本語";',
    );
  });

  test('parses a BOM-prefixed JSON result', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-ai-test-'));
    const files = await createTransactionFiles({ rootDir: root, id: '44444444-4444-4444-8444-444444444444' });
    await writeFile(files.resultPath, '\uFEFF{"ok":true,"value":"完了"}', 'utf8');

    await expect(readJsonResult(files)).resolves.toEqual({ ok: true, value: '完了' });
  });

  test('removes successful transactions and preserves ambiguous ones', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-ai-test-'));
    const removed = await createTransactionFiles({ rootDir: root, id: '55555555-5555-4555-8555-555555555555' });
    const preserved = await createTransactionFiles({ rootDir: root, id: '66666666-6666-4666-8666-666666666666' });

    await cleanupTransaction(removed, { preserve: false });
    await cleanupTransaction(preserved, { preserve: true });

    await expect(stat(removed.directory)).rejects.toMatchObject({ code: 'ENOENT' });
    expect((await stat(preserved.directory)).isDirectory()).toBe(true);
  });

  test('rejects transaction IDs that could escape the root directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-ai-test-'));
    await expect(createTransactionFiles({ rootDir: root, id: '../escape' })).rejects.toThrow(
      'Invalid transaction ID',
    );
  });
});
