import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

describe('productivity frontends', () => {
  test('routes targeted inspect, deterministic edits, batches, and environment doctor before the generic CLI', async () => {
    const source = await readFile('bin/illustrator-ai', 'utf8');
    expect(source).toContain("command === 'edit'");
    expect(source).toContain("command === 'edit-batch'");
    expect(source).toContain("command === 'inspect'");
    expect(source).toContain("value === '--uuid'");
    expect(source).toContain("command === 'doctor' && cliArgs.includes('--environment')");
    expect(source).toContain('runDeterministicEdit');
    expect(source).toContain('runDeterministicEditBatch');
    expect(source).toContain('runTargetedInspect');
    expect(source).toContain('runEnvironmentDoctor');
  });

  test('batch frontend requires an absolute JSON edit file and protected run path', async () => {
    const source = await readFile('scripts/deterministic-edit-batch.mjs', 'utf8');
    expect(source).toContain("options.confirm !== true");
    expect(source).toContain("!isAbsolute(options.file)");
    expect(source).toContain('buildDeterministicBatchSource');
    expect(source).toContain("'run', documentPath, '--script', scriptPath, '--confirm'");
  });

  test('deterministic edits expose preconditions and before/after diff evidence', async () => {
    const command = await readFile('src/commands/deterministic-edit.ts', 'utf8');
    const snapshot = await readFile('src/jsx/core/snapshot.jsx', 'utf8');
    expect(command).toContain('expectedText');
    expect(command).toContain('expectedBounds');
    expect(command).toContain('PRECONDITION_FAILED');
    expect(command).toContain('diffSnapshots(before, after)');
    expect(snapshot).toContain('changed: changed');
    expect(snapshot).toContain('fontSize');
    expect(snapshot).toContain('opacity');
  });

  test('targeted inspection prefers UUID and preserves exact-document binding', async () => {
    const source = await readFile('src/jsx/commands/inspect-target.jsx', 'utf8');
    expect(source).toContain('findPageItemByUuid(targetDocument, targetParams.value)');
    expect(source).toContain('findPageItemsBySignature');
    expect(source).toContain('uniqueLayerByName');
    expect(source).toContain('styleRunMode');
    expect(source).toContain('sampledCharacterIndex');
  });

  test('environment doctor checks renderer and comparison dependencies', async () => {
    const source = await readFile('scripts/environment-doctor.mjs', 'utf8');
    expect(source).toContain('pdftoppm');
    expect(source).toContain('sips');
    expect(source).toContain('ffmpeg');
    expect(source).toContain('renderingReady');
    expect(source).toContain('cropCompareReady');
  });

  test('benchmark harness compares global and targeted inspection', async () => {
    const source = await readFile('scripts/benchmark-inspect.mjs', 'utf8');
    expect(source).toContain('compact-global');
    expect(source).toContain('targeted-${selector}');
    expect(source).toContain('meanMs');
  });
});
