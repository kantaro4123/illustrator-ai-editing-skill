import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';
import { buildJsx } from '../../src/runner/jsx-builder.js';

async function core(name: string): Promise<string> {
  return readFile(new URL(`../../src/jsx/core/${name}.jsx`, import.meta.url), 'utf8');
}

describe('production Illustrator helper library', () => {
  test('ships geometry helpers that preserve anchors and rigid sections', async () => {
    const source = await core('geometry');
    for (const helper of [
      'setLeft',
      'centerX',
      'centerY',
      'inkBounds',
      'alignInkBottom',
      'translateRigid',
      'equalizeVerticalGaps',
    ]) {
      expect(source).toContain(`function ${helper}(`);
    }
  });

  test('ships style-safe text and overflow helpers', async () => {
    const source = await core('text');
    expect(source).toContain('function replaceTextPreservingStyles(');
    expect(source).toContain('for (index = matches.length - 1; index >= 0; index--)');
    expect(source).toContain('function textOverflows(');
    expect(source).not.toContain('frame.contents = frame.contents.replace');
  });

  test('ships verified Japanese typography helpers', async () => {
    const source = await core('japanese-text');
    expect(source).toContain('Justification.FULLJUSTIFYLASTLINELEFT');
    expect(source).toContain('KinsokuOrderEnum.PUSHIN');
    expect(source).toContain('function normalizeTilde(');
    expect(source).toContain('function applyNoBreakRuns(');
    expect(source).toContain('function centerHyphens(');
    expect(source).toContain('function fitReceptionInParens(');
  });

  test('includes all helper modules in emitted JSX and remains ES3-safe', async () => {
    const source = await buildJsx({
      commandSource: 'writeResultFile(RESULT_PATH, { ok: true });',
      paramsPath: '/tmp/params.json',
      resultPath: '/tmp/result.json',
      targetPath: '/tmp/file.ai',
      targetName: 'file.ai',
    });
    for (const marker of ['function inkBounds(', 'function replaceTextPreservingStyles(',
      'function applyJapaneseJustification(', 'function boundsIntersect(']) {
      expect(source).toContain(marker);
    }
    expect(source).not.toMatch(/^\s*\/\/\s*@/m);
    expect(source).not.toMatch(/\b(?:let|const)\b/);
    expect(source).not.toContain('=>');
  });
});
