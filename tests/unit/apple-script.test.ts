import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { buildAppleScript, writeAppleScript } from '../../src/runner/apple-script.js';
import { createTransactionFiles } from '../../src/runner/temp-files.js';

describe('AppleScript bridge', () => {
  test('executes a JSX file with a bounded timeout and optional activation', () => {
    const script = buildAppleScript({
      scriptPath: '/tmp/制作 files/edit "final".jsx',
      timeoutSeconds: 180,
      activate: true,
    });

    expect(script).toContain('with timeout of 180 seconds');
    expect(script).toContain('tell application "Adobe Illustrator"');
    expect(script).toContain('activate');
    expect(script).toContain('do javascript (POSIX file "/tmp/制作 files/edit \\"final\\".jsx")');
    expect(script).not.toContain('#target illustrator');
  });

  test('can bind a specific Illustrator application path', () => {
    const script = buildAppleScript({
      scriptPath: '/tmp/edit.jsx',
      appPath: '/Applications/Adobe Illustrator 2026/Adobe Illustrator.app',
      timeoutSeconds: 30,
    });
    expect(script).toContain(
      'tell application "/Applications/Adobe Illustrator 2026/Adobe Illustrator.app"',
    );
  });

  test('writes the bridge into a private transaction runner file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-ai-test-'));
    const files = await createTransactionFiles({
      rootDir: root,
      id: '77777777-7777-4777-8777-777777777777',
    });
    await writeAppleScript(files, { timeoutSeconds: 45 });
    expect(await readFile(files.runnerPath, 'utf8')).toContain('with timeout of 45 seconds');
    expect((await stat(files.runnerPath)).mode & 0o777).toBe(0o600);
  });
});
