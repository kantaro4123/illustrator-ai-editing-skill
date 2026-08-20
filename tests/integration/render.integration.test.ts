import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { renderAi } from '../../src/render/render.js';

describe('render orchestration', () => {
  test('copies the AI to an isolated PDF path and normalizes Poppler output', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-render-test-'));
    const input = join(root, '日本語.ai');
    const output = join(root, 'page.png');
    await writeFile(input, '%PDF-synthetic', 'utf8');
    const calls: Array<{ executable: string; args: string[] }> = [];

    const result = await renderAi({
      inputPath: input,
      outputPath: output,
      dpi: 150,
      renderer: 'pdftoppm',
      run: async (invocation) => {
        calls.push(invocation);
        const prefix = invocation.args.at(-1)!;
        await writeFile(`${prefix}-1.png`, 'synthetic png', 'utf8');
      },
    });

    expect(result.path).toBe(output);
    expect(result.requestedDpi).toBe(150);
    expect(result.dpi).toBe(150);
    expect(await readFile(output, 'utf8')).toBe('synthetic png');
    expect(basename(calls[0]!.args.at(-2)!)).toContain('.pdf');
  });

  test('does not claim an exact DPI for the sips fallback', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-render-sips-test-'));
    const input = join(root, 'input.ai');
    const output = join(root, 'page.png');
    await writeFile(input, '%PDF-synthetic', 'utf8');

    const result = await renderAi({
      inputPath: input,
      outputPath: output,
      dpi: 150,
      renderer: 'sips',
      run: async (invocation) => {
        const generated = invocation.args.at(-1)!;
        await writeFile(generated, 'synthetic sips png', 'utf8');
      },
    });

    expect(result.requestedDpi).toBe(150);
    expect(result.dpi).toBeNull();
    expect(await readFile(output, 'utf8')).toBe('synthetic sips png');
  });
});
