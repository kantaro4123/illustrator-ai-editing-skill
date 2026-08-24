import { describe, expect, test } from 'vitest';
import {
  buildCropInvocation,
  buildRenderInvocation,
  chooseRenderer,
} from '../../src/render/render.js';
import { buildComparisonInvocations } from '../../src/render/compare.js';
import { buildContactSheetInvocation } from '../../src/render/contact-sheet.js';

describe('external render commands', () => {
  test('prefers Poppler and passes paths as arguments rather than shell source', () => {
    expect(chooseRenderer(new Set(['pdftoppm', 'sips']))).toBe('pdftoppm');
    const invocation = buildRenderInvocation({
      renderer: 'pdftoppm',
      inputPdf: '/tmp/テスト "文書".pdf',
      outputPrefix: '/tmp/output page',
      dpi: 150,
    });
    expect(invocation).toEqual({
      executable: 'pdftoppm',
      args: ['-png', '-r', '150', '-f', '1', '-l', '1', '/tmp/テスト "文書".pdf', '/tmp/output page'],
    });
    expect(invocation.args.join(' ')).not.toContain('$( ');
  });

  test('falls back to sips when Poppler is unavailable', () => {
    expect(chooseRenderer(new Set(['sips']))).toBe('sips');
    expect(() => chooseRenderer(new Set())).toThrow('No supported PDF renderer');
  });

  test('builds no-clobber ffmpeg commands unless overwrite is explicit', () => {
    const crop = buildCropInvocation({
      executable: 'ffmpeg',
      inputPath: '/tmp/page.png',
      outputPath: '/tmp/crop.png',
      rectangle: { x: 20, y: 30, width: 100, height: 50 },
      upscale: 4,
      overwrite: false,
    });
    expect(crop.args[0]).toBe('-n');
    expect(crop.args).toContain('crop=100:50:20:30,scale=400:200:flags=lanczos');

    const forcedCrop = buildCropInvocation({
      executable: 'ffmpeg',
      inputPath: '/tmp/page.png',
      outputPath: '/tmp/crop.png',
      rectangle: { x: 20, y: 30, width: 100, height: 50 },
      upscale: 1,
      overwrite: true,
    });
    expect(forcedCrop.args[0]).toBe('-y');

    const compare = buildComparisonInvocations({
      beforePath: '/tmp/before.png',
      afterPath: '/tmp/after.png',
      overlayPath: '/tmp/overlay.png',
      differencePath: '/tmp/difference.png',
      overwrite: false,
    });
    expect(compare).toHaveLength(2);
    expect(compare[0]!.args[0]).toBe('-n');
    expect(compare[0]!.args).toContain('blend=all_mode=average');
    expect(compare[1]!.args).toContain('blend=all_mode=difference');

    const forcedCompare = buildComparisonInvocations({
      beforePath: '/tmp/before.png',
      afterPath: '/tmp/after.png',
      overlayPath: '/tmp/overlay.png',
      differencePath: '/tmp/difference.png',
      overwrite: true,
    });
    expect(forcedCompare[0]!.args[0]).toBe('-y');

    const sheet = buildContactSheetInvocation({
      inputs: ['/tmp/before.png', '/tmp/after.png', '/tmp/difference.png'],
      outputPath: '/tmp/contact.png',
    });
    expect(sheet.args).toContain('hstack=inputs=3');
  });
});
