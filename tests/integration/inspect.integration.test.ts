import { describe, expect, test } from 'vitest';
import { createInspectCommand } from '../../src/commands/inspect.js';

describe('inspect command composition', () => {
  test('binds an exact path and uses privacy-preserving inspection defaults', async () => {
    const request = await createInspectCommand({
      targetPath: '/制作/テスト 文書.ai',
      targetName: 'テスト 文書.ai',
      detail: 'full',
      paramsPath: '/tmp/params.json',
      resultPath: '/tmp/result.json',
    });
    expect(request.params).toEqual({
      detail: 'full',
      content: 'truncated',
      maxContentCharacters: 240,
      includeLinkPaths: false,
      maxStyleCharacters: 1000,
    });
    expect(request.jsx).toContain('var TARGET_PATH = "/制作/テスト 文書.ai";');
    expect(request.jsx).toContain('var inspectParams = parseJsonFile(PARAMS_PATH);');
    expect(request.jsx).toContain('if (mode === "none")');
    expect(request.jsx).toContain('path: inspectParams.includeLinkPaths ? linkPath : null');
    expect(request.jsx).toContain('if (frame.characters.length === 0) return [];');
    expect(request.jsx).toContain('styleRunAt(frame.characters[0], 0, frame.characters.length)');
    expect(request.jsx).toContain('styleRunsTruncated');
    expect(request.jsx).not.toMatch(/^\s*\/\/\s*@/m);
    expect(request.mutation).toBe(false);
  });

  test('allows explicit full content and linked paths when the task needs them', async () => {
    const request = await createInspectCommand({
      targetPath: '/tmp/file.ai',
      targetName: 'file.ai',
      detail: 'compact',
      content: 'full',
      includeLinkPaths: true,
      paramsPath: '/tmp/params.json',
      resultPath: '/tmp/result.json',
    });
    expect(request.params.content).toBe('full');
    expect(request.params.includeLinkPaths).toBe(true);
  });
});
