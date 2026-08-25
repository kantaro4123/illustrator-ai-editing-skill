import { describe, expect, test } from 'vitest';
import {
  buildDeterministicBatchSource,
  buildDeterministicEditSource,
} from '../../src/commands/deterministic-edit.js';

describe('deterministic edit source', () => {
  test('builds style-preserving replacement with a precondition and before/after diff', () => {
    const source = buildDeterministicEditSource({
      operation: 'replace-text',
      uuid: 'item-uuid',
      search: '旧テキスト',
      replacement: '新テキスト',
      preconditions: { expectedText: '旧テキスト', expectedTypename: 'TextFrame' },
    });
    expect(source).toContain('findPageItemByUuid');
    expect(source).toContain('PRECONDITION_FAILED');
    expect(source).toContain('replaceTextPreservingStyles');
    expect(source).toContain('diffSnapshots(before, after)');
    expect(source).toContain('EDIT_NO_MATCH');
  });

  test('requires a unique named target rather than accepting the first match', () => {
    const source = buildDeterministicEditSource({ operation: 'move', name: 'CTA', dx: 0, dy: -6 });
    expect(source).toContain('findPageItemsBySignature');
    expect(source).toContain('matches.length !== 1');
    expect(source).toContain('target.translate(Number(edit.dx), Number(edit.dy))');
  });

  test('supports common typography, opacity, rotate, and scale operations', () => {
    expect(buildDeterministicEditSource({ operation: 'set-font-size', uuid: 'text', size: 11.5 }))
      .toContain('characterAttributes.size = Number(edit.size)');
    expect(buildDeterministicEditSource({ operation: 'set-tracking', uuid: 'text', tracking: 25 }))
      .toContain('characterAttributes.tracking = Number(edit.tracking)');
    expect(buildDeterministicEditSource({ operation: 'set-leading', uuid: 'text', leading: 14 }))
      .toContain('characterAttributes.leading = Number(edit.leading)');
    expect(buildDeterministicEditSource({ operation: 'set-opacity', uuid: 'item', opacity: 80 }))
      .toContain('target.opacity = Number(edit.opacity)');
    expect(buildDeterministicEditSource({ operation: 'rotate', uuid: 'item', angle: 15 }))
      .toContain('target.rotate(Number(edit.angle))');
    expect(buildDeterministicEditSource({ operation: 'scale', uuid: 'item', scaleX: 110, scaleY: 90 }))
      .toContain('target.resize(Number(edit.scaleX), Number(edit.scaleY))');
  });

  test('preflights every batch target and precondition before the first mutation', () => {
    const source = buildDeterministicBatchSource([
      { operation: 'move', uuid: 'a', dx: 0, dy: -6, preconditions: { expectedName: 'Header' } },
      { operation: 'set-opacity', uuid: 'b', opacity: 90, preconditions: { expectedOpacity: 100 } },
    ]);
    const validateIndex = source.indexOf('__editAssertPreconditions');
    const applyLoopIndex = source.indexOf('var __results = []');
    expect(validateIndex).toBeGreaterThan(-1);
    expect(applyLoopIndex).toBeGreaterThan(validateIndex);
    expect(source).toContain('operation: "edit-batch"');
    expect(source).toContain('count: __results.length');
  });

  test('rejects invalid numeric edits before Illustrator is contacted', () => {
    expect(() => buildDeterministicEditSource({ operation: 'set-font-size', uuid: 'text', size: 0 })).toThrow('greater than zero');
    expect(() => buildDeterministicEditSource({ operation: 'move', uuid: 'item', dx: Number.NaN, dy: 0 })).toThrow('finite');
    expect(() => buildDeterministicEditSource({ operation: 'set-opacity', uuid: 'item', opacity: 101 })).toThrow('between 0 and 100');
    expect(() => buildDeterministicBatchSource([])).toThrow('At least one');
  });
});
