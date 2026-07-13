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
    expect(request.params).toEqual({ detail: 'full' });
    expect(request.jsx).toContain('var TARGET_PATH = "/制作/テスト 文書.ai";');
    expect(request.jsx).toContain('@command inspect');
    expect(request.mutation).toBe(false);
  });
});
