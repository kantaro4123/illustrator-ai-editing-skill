import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { createDefaultHandlers, runCli } from '../../src/cli/main.js';

describe('default CLI handlers', () => {
  test('backup creates evidence without launching Illustrator', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-cli-test-'));
    const source = join(root, '作業版.ai');
    await writeFile(source, 'synthetic ai', 'utf8');
    const result = await runCli(['backup', source], createDefaultHandlers());
    const json = JSON.parse(result.stdout);
    expect(json).toMatchObject({ ok: true, command: 'backup' });
    expect(await readFile(json.data.path, 'utf8')).toBe('synthetic ai');
  });

  test('help and version do not require Illustrator', async () => {
    const handlers = createDefaultHandlers();
    const help = await runCli(['help'], handlers);
    const version = await runCli(['version'], handlers);
    expect(help.stdout).toContain('illustrator-ai inspect');
    expect(version.stdout).toMatch(/^\d+\.\d+\.\d+\n$/);
  });

  test('inspect crosses the file-based Illustrator bridge and returns JSON only', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-cli-inspect-'));
    const source = join(root, '対象.ai');
    await writeFile(source, 'synthetic ai', 'utf8');
    const handlers = createDefaultHandlers({
      executableAvailable: async () => true,
      runProcess: async ({ executable, args }) => {
        expect(executable).toBe('osascript');
        const runner = await readFile(args[0]!, 'utf8');
        const scriptMatch = runner.match(/POSIX file "([^"]+\.jsx)"/);
        const script = await readFile(scriptMatch![1]!, 'utf8');
        const resultMatch = script.match(/var RESULT_PATH = ("[^"]+");/);
        const resultPath = JSON.parse(resultMatch![1]!) as string;
        await writeFile(resultPath, JSON.stringify({ document: { path: source, name: '対象.ai' } }), 'utf8');
        return { stdout: '' };
      },
    });
    const result = await runCli(['inspect', source, '--detail', 'full'], handlers);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim().split('\n')).toHaveLength(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      command: 'inspect',
      document: { path: source },
      data: { document: { path: source } },
    });
  });

  test('refuses a reference save before contacting Illustrator', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-cli-reference-'));
    const source = join(root, 'reference.ai');
    await writeFile(source, 'synthetic reference', 'utf8');
    let contactedHost = false;
    const handlers = createDefaultHandlers({
      executableAvailable: async () => true,
      runProcess: async () => {
        contactedHost = true;
        return { stdout: '' };
      },
    });
    const result = await runCli(['save', source, '--role', 'reference', '--confirm'], handlers);
    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      error: { code: 'REFERENCE_WRITE_FORBIDDEN', recoverable: false },
    });
    expect(contactedHost).toBe(false);
  });
});
