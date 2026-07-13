import { describe, expect, test } from 'vitest';
import { cliJson, createIllustratorFixture, findTextFrame, writeMutationScript } from './helpers.js';

describe.skipIf(process.env.ILLUSTRATOR_E2E !== '1')('Illustrator aspect-ratio fixtures', () => {
  test('restores each confirmed axis and preserves stated live-text size', async () => {
    const fixture = await createIllustratorFixture();
    const script = await writeMutationScript(fixture, 'aspect', [
      'var documentValue = requireTargetDocument();',
      'restoreLiveTextAspect(documentValue.textFrames.getByName("ASPECT_H82"), "horizontal", 20, "left");',
      'restoreLiveTextAspect(documentValue.textFrames.getByName("ASPECT_V833"), "vertical", 20, "left");',
      'restoreOutlinedAspect(documentValue.groupItems.getByName("OUTLINE_H833"), 83.3, "horizontal", "center");',
    ].join('\n'));
    await cliJson(['run', fixture.primaryPath, '--script', script, '--confirm']);
    const inspected = await cliJson(['inspect', fixture.primaryPath, '--detail', 'full']);
    for (const name of ['ASPECT_H82', 'ASPECT_V833']) {
      const frame = findTextFrame(inspected, name);
      const run = (frame.styleRuns as Array<{ size: number; horizontalScale: number; verticalScale: number }>)[0]!;
      expect(run).toMatchObject({ size: 20, horizontalScale: 100, verticalScale: 100 });
    }
  }, 240_000);
});
