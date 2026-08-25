import { describe, expect, test } from 'vitest';
import { buildDeterministicEditSource } from '../../src/commands/deterministic-edit.js';

describe('deterministic edit source', () => {
  test('builds style-preserving replacement for one UUID target', () => {
    const source = buildDeterministicEditSource({
      operation: 'replace-text',
      uuid: 'item-uuid',
      search: '旧テキスト',
      replacement: '新テキスト',
    });
    expect(source).toContain('findPageItemByUuid(__doc, "item-uuid")');
    expect(source).toContain('replaceTextPreservingStyles');
    expect(source).toContain('EDIT_NO_MATCH');
    expect(source).toContain('writeResultFile(RESULT_PATH');
  });

  test('requires a unique named target rather than accepting the first match', () => {
    const source = buildDeterministicEditSource({ operation: 'move', name: 'CTA', dx: 0, dy: -6 });
    expect(source).toContain('findPageItemsBySignature');
    expect(source).toContain('__matches.length !== 1');
    expect(source).toContain('__target.translate(0, -6)');
  });

  test('builds a deterministic font-size edit', () => {
    const source = buildDeterministicEditSource({ operation: 'set-font-size', uuid: 'text', size: 11.5 });
    expect(source).toContain('set-font-size requires TextFrame');
    expect(source).toContain('characterAttributes.size = 11.5');
  });

  test('rejects invalid numeric edits before Illustrator is contacted', () => {
    expect(() => buildDeterministicEditSource({ operation: 'set-font-size', uuid: 'text', size: 0 })).toThrow('positive');
    expect(() => buildDeterministicEditSource({ operation: 'move', uuid: 'item', dx: Number.NaN, dy: 0 })).toThrow('finite');
  });
});
