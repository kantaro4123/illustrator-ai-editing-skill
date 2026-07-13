import { describe, expect, test } from 'vitest';
import { createInspectCommand } from '../../src/commands/inspect.js';

describe('inspect command composition', () => {
  test('binds an exact path and passes compact/detail mode through JSON params', async () => {
    const request = await createInspectCommand({
      targetPath: '/制作/テスト 文書.ai',
      targetName: 'テスト 文書.ai',
      detail: 'full',
      paramsPath: '/tmp/params.json',
      resultPath: '/tmp/result.json',
    });
    expect(request.params).toEqual({ detail: 'full', maxStyleCharacters: 1000 });
    expect(request.jsx).toContain('var TARGET_PATH = "/制作/テスト 文書.ai";');
    expect(request.jsx).toContain('var inspectParams = parseJsonFile(PARAMS_PATH);');
    expect(request.jsx).toContain('if (frame.characters.length === 0) return [];');
    expect(request.jsx).toContain('styleRunAt(frame.characters[0], 0, frame.characters.length)');
    expect(request.jsx).toContain('styleRunsTruncated');
    expect(request.jsx).not.toMatch(/^\s*\/\/\s*@/m);
    expect(request.mutation).toBe(false);
  });
});
