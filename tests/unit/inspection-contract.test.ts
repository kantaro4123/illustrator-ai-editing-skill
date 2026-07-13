import { describe, expect, test } from 'vitest';
import { parseInspection } from '../../src/contracts/inspection.js';

const validInspection = {
  document: {
    path: '/制作/対象.ai',
    name: '対象.ai',
    saved: true,
    colorSpace: 'CMYK',
  },
  artboards: [{ index: 0, name: 'アートボード 1', bounds: [0, 842, 595, 0] }],
  layers: [{ index: 0, name: '本文', locked: false, visible: true, itemCount: 2 }],
  textFrames: [
    {
      uuid: 'text-uuid',
      name: 'address',
      kind: 'POINTTEXT',
      contents: '東京都新宿区',
      geometricBounds: [10, 100, 110, 80],
      visibleBounds: [10, 100, 110, 80],
      locked: false,
      hidden: false,
      overflow: false,
      styleRuns: [
        {
          start: 0,
          length: 6,
          font: 'HiraginoSans-W6',
          size: 11.5,
          horizontalScale: 100,
          verticalScale: 100,
          tracking: 0,
          leading: 13.8,
        },
      ],
    },
  ],
  pageItems: [
    {
      uuid: 'item-uuid',
      typename: 'PathItem',
      name: 'divider',
      note: '',
      geometricBounds: [0, 50, 595, 49],
      visibleBounds: [0, 50, 595, 49],
      locked: false,
      hidden: false,
    },
  ],
  links: [],
  rasterItems: [],
};

describe('inspection contract', () => {
  test('accepts a structured Illustrator inspection', () => {
    expect(parseInspection(validInspection)).toEqual(validInspection);
  });

  test('rejects text inspection without both scale axes', () => {
    const broken = structuredClone(validInspection);
    delete (broken.textFrames[0]!.styleRuns[0] as { verticalScale?: number }).verticalScale;
    expect(() => parseInspection(broken)).toThrow('verticalScale');
  });

  test('rejects malformed bounds before layout math can use them', () => {
    const broken = structuredClone(validInspection);
    broken.pageItems[0]!.geometricBounds = [0, 50, 595] as unknown as number[];
    expect(() => parseInspection(broken)).toThrow('geometricBounds');
  });
});
