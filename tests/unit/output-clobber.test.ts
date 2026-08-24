import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { createDefaultHandlers, runCli } from '../../src/cli/main.js';

// ffmpeg's -n declines the write but still exits 0, so delegating the refusal to the
// renderer made crop and compare report success while leaving the previous image in
// place -- the failure mode a reviewer is least able to notice.
function stubbedHandlers(calls: string[][]) {
  return createDefaultHandlers({
    runProcess: async (invocation) => { calls.push(invocation.args); return { stdout: '' }; },
    executableAvailable: async () => true,
  });
}

describe('review artifacts are no-clobber without --force', () => {
  test('crop refuses an existing output instead of silently keeping the old crop', async () => {
    const root = await mkdtemp(join(tmpdir(), 'clobber-crop-'));
    const image = join(root, 'page.png');
    const output = join(root, 'crop.png');
    await writeFile(image, 'png', 'utf8');
    await writeFile(output, 'stale crop', 'utf8');

    const calls: string[][] = [];
    const result = await runCli([
      'crop', image, '--output', output, '--bounds', '0,100,50,50',
      '--artboardTop', '100', '--artboardLeft', '0', '--dpi', '72', '--allow-unverified-dpi',
    ], stubbedHandlers(calls));

    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe('OUTPUT_EXISTS');
    expect(payload.error.nextAction).toContain('--force');
    expect(calls).toHaveLength(0);
    expect(await readFile(output, 'utf8')).toBe('stale crop');
  });

  test('compare checks both destinations before writing either', async () => {
    const root = await mkdtemp(join(tmpdir(), 'clobber-compare-'));
    const before = join(root, 'before.png');
    const after = join(root, 'after.png');
    await writeFile(before, 'a', 'utf8');
    await writeFile(after, 'b', 'utf8');
    // Only the second artifact exists: the old loop regenerated the overlay and then
    // declined the difference, leaving a mixed-generation pair.
    await writeFile(join(root, 'difference.png'), 'stale difference', 'utf8');

    const calls: string[][] = [];
    const result = await runCli([
      'compare', before, after, '--output-dir', root,
    ], stubbedHandlers(calls));

    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe('OUTPUT_EXISTS');
    expect(calls).toHaveLength(0);
  });
});
