import { describe, expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import { decideAspectAxis } from '../../src/aspect/axis-decision.js';

describe('aspect-ratio axis decision', () => {
  test('detects horizontal text compression from explicit character scales', () => {
    expect(
      decideAspectAxis({ horizontalScale: 82, verticalScale: 100, statedPointSize: 11.5 }),
    ).toMatchObject({ axis: 'horizontal', evidence: 'character-scale', preservePointSize: 11.5 });
  });

  test('detects vertical text compression from explicit character scales', () => {
    expect(decideAspectAxis({ horizontalScale: 100, verticalScale: 83.3 })).toMatchObject({
      axis: 'vertical',
      evidence: 'character-scale',
    });
  });

  test('uses multiple outlined glyphs relative to a normal reference', () => {
    expect(
      decideAspectAxis({
        glyphRatios: [0.81, 0.83, 0.84, 0.82],
        referenceGlyphRatios: [0.99, 1.01, 1.0, 0.98],
      }),
    ).toMatchObject({ axis: 'horizontal', evidence: 'glyph-median' });
    expect(
      decideAspectAxis({
        glyphRatios: [1.18, 1.21, 1.19, 1.2],
        referenceGlyphRatios: [0.99, 1.01, 1.0, 0.98],
      }),
    ).toMatchObject({ axis: 'vertical', evidence: 'glyph-median' });
  });

  test('returns none for normal square-glyph proportions', () => {
    expect(
      decideAspectAxis({
        glyphRatios: [0.98, 1.0, 1.01],
        referenceGlyphRatios: [0.99, 1.01, 1.0],
      }),
    ).toMatchObject({ axis: 'none', evidence: 'glyph-median' });
  });

  test('refuses insufficient or contradictory evidence', () => {
    expect(() =>
      decideAspectAxis({ glyphRatios: [0.82], referenceGlyphRatios: [1.0] }),
    ).toThrowError(expect.objectContaining({ code: 'AMBIGUOUS_ASPECT_AXIS' }));
    expect(() =>
      decideAspectAxis({ horizontalScale: 82, verticalScale: 100, explicitAxis: 'vertical' }),
    ).toThrowError(expect.objectContaining({ code: 'ASPECT_AXIS_CONFLICT' }));
  });

  test('refuses two-axis distortion without an explicit measured decision', () => {
    expect(() => decideAspectAxis({ horizontalScale: 82, verticalScale: 83 })).toThrowError(
      expect.objectContaining({ code: 'AMBIGUOUS_ASPECT_AXIS' }),
    );
  });

  test('ExtendScript restoration requires a confirmed axis and preserves live-text size', async () => {
    const source = await readFile(
      new URL('../../src/jsx/core/aspect-ratio.jsx', import.meta.url),
      'utf8',
    );
    expect(source).toContain('function restoreLiveTextAspect(');
    expect(source).toContain('expectedPointSize');
    expect(source).toContain('function restoreOutlinedAspect(');
    expect(source).toContain('confirmedAxis');
    expect(source).toContain('10000 / compressedPercent');
  });
});
