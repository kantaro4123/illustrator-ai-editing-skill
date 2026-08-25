import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

describe('productivity frontends', () => {
  test('routes targeted inspect, deterministic edit, and environment doctor before the generic CLI', async () => {
    const source = await readFile('bin/illustrator-ai', 'utf8');
    expect(source).toContain("command === 'edit'");
    expect(source).toContain("command === 'inspect'");
    expect(source).toContain("value === '--uuid'");
    expect(source).toContain("command === 'doctor' && cliArgs.includes('--environment')");
    expect(source).toContain('runDeterministicEdit');
    expect(source).toContain('runTargetedInspect');
    expect(source).toContain('runEnvironmentDoctor');
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
    expect(source).toContain("pdftoppm");
    expect(source).toContain("sips");
    expect(source).toContain("ffmpeg");
    expect(source).toContain('renderingReady');
    expect(source).toContain('cropCompareReady');
  });

  test('benchmark harness compares global and targeted inspection', async () => {
    const source = await readFile('scripts/benchmark-inspect.mjs', 'utf8');
    expect(source).toContain("compact-global");
    expect(source).toContain("targeted-${selector}");
    expect(source).toContain('meanMs');
  });
});
