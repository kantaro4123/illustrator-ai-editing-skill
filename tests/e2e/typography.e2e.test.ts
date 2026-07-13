import { describe, expect, test } from 'vitest';
import { cliJson, createIllustratorFixture, findTextFrame, writeMutationScript } from './helpers.js';

describe.skipIf(process.env.ILLUSTRATOR_E2E !== '1')('Illustrator 2026 typography fixtures', () => {
  test('applies Japanese typography while preserving font size and style runs', async () => {
    const fixture = await createIllustratorFixture();
    const script = await writeMutationScript(fixture, 'typography', [
      'var frame = requireTargetDocument().textFrames.getByName("JP_POINT");',
      'var originalSize = frame.textRange.characterAttributes.size;',
      'normalizeTilde(frame);',
      'applyNoBreakRuns(frame);',
      'frame.textRange.characterAttributes.tracking = 25;',
      'frame.textRange.characterAttributes.size = originalSize;',
    ].join('\n'));
    await cliJson(['run', fixture.primaryPath, '--script', script, '--confirm']);
    const inspected = await cliJson(['inspect', fixture.primaryPath, '--detail', 'full']);
    const frame = findTextFrame(inspected, 'JP_POINT');
    const runs = frame.styleRuns as Array<{ size: number; tracking: number }>;
    expect(runs.every((run) => run.size === 18)).toBe(true);
    expect(runs.some((run) => run.tracking === 25)).toBe(true);
  }, 240_000);
});
