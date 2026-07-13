import { describe, expect, test } from 'vitest';
import { buildJsx } from '../../src/runner/jsx-builder.js';

describe('ExtendScript builder', () => {
  test('loads core modules in deterministic dependency order', async () => {
    const source = await buildJsx({
      commandSource: 'writeResultFile(RESULT_PATH, { ok: true });',
      paramsPath: '/tmp/params.json',
      resultPath: '/tmp/result.json',
      targetPath: '/制作/対象.ai',
      targetName: '対象.ai',
    });
    const markers = [
      'function readUtf8File(',
      'function writeResultFile(',
      'function normalizedFsPath(',
      'function findPageItemByUuid(',
      'function snapshotItem(',
    ];
    const positions = markers.map((marker) => source.indexOf(marker));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(source).not.toMatch(/^\s*\/\/\s*@/m);
  });

  test('injects escaped paths and verifies the exact document before the command', async () => {
    const source = await buildJsx({
      commandSource: 'var doc = requireTargetDocument();',
      paramsPath: '/tmp/日本語 params.json',
      resultPath: '/tmp/日本語 result.json',
      targetPath: '/Volumes/work/制作/テスト "文書".ai',
      targetName: 'テスト "文書".ai',
    });

    expect(source).toContain('var PARAMS_PATH = "/tmp/日本語 params.json";');
    expect(source).toContain('var RESULT_PATH = "/tmp/日本語 result.json";');
    expect(source).toContain('var TARGET_PATH = "/Volumes/work/制作/テスト \\"文書\\".ai";');
    expect(source).toContain('var TARGET_NAME = "テスト \\"文書\\".ai";');
    expect(source.indexOf('requireTargetDocument();')).toBeLessThan(
      source.lastIndexOf('var doc = requireTargetDocument();'),
    );
  });

  test('suppresses dialogs, catches errors, and restores interaction state', async () => {
    const source = await buildJsx({
      commandSource: 'throw new Error("test");',
      paramsPath: '/tmp/params.json',
      resultPath: '/tmp/result.json',
      targetPath: '/tmp/file.ai',
      targetName: 'file.ai',
    });

    expect(source).toContain('UserInteractionLevel.DONTDISPLAYALERTS');
    expect(source).toContain('catch (__error)');
    expect(source).toContain('writeErrorResult');
    expect(source).toContain('app.userInteractionLevel = __previousInteractionLevel');
  });

  test('emits ExtendScript ES3-compatible syntax', async () => {
    const source = await buildJsx({
      commandSource: 'writeResultFile(RESULT_PATH, { ok: true });',
      paramsPath: '/tmp/params.json',
      resultPath: '/tmp/result.json',
      targetPath: '/tmp/file.ai',
      targetName: 'file.ai',
    });

    expect(source).not.toMatch(/\b(?:let|const)\b/);
    expect(source).not.toContain('=>');
    expect(source).not.toContain('`');
    expect(source).not.toContain('.includes(');
  });
});
