import { readdir, readFile } from 'node:fs/promises';
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
      'setTop',
      'moveItemTo',
      'moveSetTo',
      'relativeOffsets',
      'restoreRelative',
    ]) {
      expect(source).toContain(`function ${helper}(`);
    }
  });

  // The positioning helpers exist because assigning left/top a geometricBounds-derived
  // value silently displaces anything with a glow or stroke. They must stay delta-based.
  test('positions items by delta rather than assigning left/top', async () => {
    const source = await core('geometry');
    for (const helper of ['setLeft', 'setTop', 'moveItemTo']) {
      const body = source.slice(source.indexOf(`function ${helper}(`));
      const end = body.indexOf('\n}');
      expect(`${helper}:${body.slice(0, end).includes('.translate(')}`).toBe(`${helper}:true`);
    }
    expect(source).not.toMatch(/\.(left|top)\s*=/);
  });

  test('ships style-safe text and overflow helpers', async () => {
    const source = await core('text');
    expect(source).toContain('function replaceTextPreservingStyles(');
    expect(source).toContain('for (index = matches.length - 1; index >= 0; index--)');
    expect(source).toContain('function textOverflows(');
    expect(source).not.toContain('frame.contents = frame.contents.replace');
  });

  // A presence assertion cannot tell a working helper from one that calls an API
  // the host does not have. `characters.itemByRange` is InDesign-only and threw on
  // every call until it was found in production.
  test('never reaches for InDesign-only APIs that Illustrator does not implement', async () => {
    const names = await readdir(new URL('../../src/jsx/', import.meta.url), { recursive: true });
    const sources = await Promise.all(
      names
        .filter((name) => String(name).endsWith('.jsx'))
        .map(async (name) => [String(name), await readFile(new URL(`../../src/jsx/${name}`, import.meta.url), 'utf8')] as const),
    );
    expect(sources.length).toBeGreaterThan(5);
    const forbidden = [
      'itemByRange',
      'itemByName',
      'everyItem',
      'insertionPoints',
      'parentStory',
      'changeGrep',
      'findGrep',
      'appliedFont',
    ];
    for (const [name, source] of sources) {
      const body = source.replace(/\/\/[^\n]*/g, '');
      for (const api of forbidden) {
        expect(`${name}:${body.includes(api) ? api : 'clean'}`).toBe(`${name}:clean`);
      }
    }
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
