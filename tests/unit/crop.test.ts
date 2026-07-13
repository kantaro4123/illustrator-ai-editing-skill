import { describe, expect, test } from 'vitest';
import { documentBoundsToPixels } from '../../src/render/crop.js';

describe('document-coordinate image cropping', () => {
  test('converts Illustrator bounds to pixels at the requested DPI', () => {
    expect(
      documentBoundsToPixels({
        artboardTop: 842,
        artboardLeft: 0,
        dpi: 144,
        bounds: [10, 800, 110, 750],
        imageWidth: 1190,
        imageHeight: 1684,
      }),
    ).toEqual({ x: 20, y: 84, width: 200, height: 100 });
  });

  test('adds point padding and clips the rectangle to the page', () => {
    expect(
      documentBoundsToPixels({
        artboardTop: 100,
        artboardLeft: 0,
        dpi: 72,
        bounds: [-5, 105, 20, 80],
        paddingPt: 10,
        imageWidth: 100,
        imageHeight: 100,
      }),
    ).toEqual({ x: 0, y: 0, width: 30, height: 30 });
  });

  test('rejects empty or inverted Illustrator bounds', () => {
    expect(() =>
      documentBoundsToPixels({
        artboardTop: 100,
        artboardLeft: 0,
        dpi: 72,
        bounds: [20, 80, 10, 90],
        imageWidth: 100,
        imageHeight: 100,
      }),
    ).toThrow('Invalid Illustrator bounds');
  });
});
