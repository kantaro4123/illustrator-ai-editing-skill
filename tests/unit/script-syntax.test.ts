import { execFileSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';

const scripts = [
  'bin/illustrator-ai',
  'scripts/deterministic-edit.mjs',
  'scripts/deterministic-edit-batch.mjs',
  'scripts/targeted-inspect.mjs',
  'scripts/environment-doctor.mjs',
  'scripts/benchmark-inspect.mjs',
];

describe('runtime wrapper syntax', () => {
  test.each(scripts)('%s parses with the active Node runtime', (path) => {
    expect(() => execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' })).not.toThrow();
  });
});
