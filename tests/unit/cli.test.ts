import { describe, expect, test } from 'vitest';
import { parseArguments } from '../../src/cli/arguments.js';
import { runCli, type CommandHandlers } from '../../src/cli/main.js';
import { successResult } from '../../src/contracts/result.js';

describe('illustrator-ai CLI', () => {
  test('parses commands, positional paths, booleans, and named options', () => {
    expect(
      parseArguments([
        'inspect',
        '/制作/対象.ai',
        '--detail',
        'full',
        '--timeout',
        '180',
        '--json',
      ]),
    ).toEqual({
      command: 'inspect',
      positionals: ['/制作/対象.ai'],
      options: { detail: 'full', timeout: '180', json: true },
    });
  });

  test('rejects unsupported commands and relative document paths', () => {
    expect(() => parseArguments(['destroy', '/tmp/file.ai'])).toThrow('Unknown command');
    expect(() => parseArguments(['inspect', 'relative.ai'])).toThrow('absolute path');
  });

  test('requires both compare inputs to be absolute paths', () => {
    expect(() => parseArguments(['compare', '/tmp/before.png'])).toThrow('before and after');
    expect(() => parseArguments(['compare', '/tmp/before.png', 'after.png'])).toThrow('absolute');
    expect(parseArguments(['compare', '/tmp/before.png', '/tmp/after.png']).positionals).toEqual([
      '/tmp/before.png',
      '/tmp/after.png',
    ]);
  });

  test('requires explicit confirmation and an absolute script for mutations', () => {
    expect(() => parseArguments(['run', '/tmp/file.ai', '--script', '/tmp/edit.jsx'])).toThrow(
      '--confirm',
    );
    expect(() => parseArguments(['run', '/tmp/file.ai', '--script', 'edit.jsx', '--confirm'])).toThrow(
      'absolute script',
    );
    expect(() => parseArguments(['save', '/tmp/file.ai'])).toThrow('--confirm');
    expect(parseArguments(['save', '/tmp/file.ai', '--confirm']).options.confirm).toBe(true);
  });

  test('routes every supported command through one JSON result contract', async () => {
    const commands = [
      'doctor',
      'inspect',
      'backup',
      'run',
      'save',
      'render',
      'crop',
      'compare',
      'verify',
      'recover',
    ] as const;
    const seen: string[] = [];
    const handlers = Object.fromEntries(
      commands.map((command) => [
        command,
        async () => {
          seen.push(command);
          return successResult({ command, runId: `run-${command}`, data: { command } });
        },
      ]),
    ) as unknown as CommandHandlers;

    for (const command of commands) {
      const argv = command === 'run'
        ? [command, '/tmp/file.ai', '--script', '/tmp/edit.jsx', '--confirm']
        : command === 'save'
          ? [command, '/tmp/file.ai', '--confirm']
          : command === 'compare'
            ? [command, '/tmp/before.png', '/tmp/after.png']
            : ['doctor', 'recover'].includes(command)
              ? [command]
              : [command, '/tmp/file.ai'];
      const result = await runCli(argv, handlers);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({ ok: true, command });
    }
    expect(seen).toEqual(commands);
  });

  test('returns structured invalid-argument errors instead of mixed stdout', async () => {
    const result = await runCli(['inspect', 'relative.ai'], {} as CommandHandlers);
    expect(result.exitCode).toBe(2);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_ARGUMENT' },
    });
    expect(result.stdout.trim().split('\n')).toHaveLength(1);
  });
});
