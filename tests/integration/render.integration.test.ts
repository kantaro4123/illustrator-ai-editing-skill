import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  readRenderMetadata,
  renderAi,
  resolveCropDpi,
} from '../../src/render/render.js';

describe('render orchestration', () => {
  test('copies the AI to an isolated PDF path and writes verified Poppler metadata', async () => {
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
    await expect(readRenderMetadata(output)).resolves.toMatchObject({
      renderer: 'pdftoppm',
      dpi: 150,
      imageSha256: result.imageSha256,
    });
    await expect(resolveCropDpi({ imagePath: output })).resolves.toMatchObject({
      dpi: 150,
      verified: true,
    });
  });

  test('does not let unknown sips DPI silently become a crop DPI', async () => {
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
    await expect(resolveCropDpi({ imagePath: output })).rejects.toThrow('unknown effective DPI');
    await expect(resolveCropDpi({
      imagePath: output,
      explicitDpi: 72,
      allowUnverifiedDpi: true,
    })).resolves.toMatchObject({ dpi: 72, verified: false });
  });

  test('rejects mismatched render metadata and existing outputs by default', async () => {
    const root = await mkdtemp(join(tmpdir(), 'illustrator-render-safety-test-'));
    const input = join(root, 'input.ai');
    const output = join(root, 'page.png');
    await writeFile(input, '%PDF-synthetic', 'utf8');

    const render = () => renderAi({
      inputPath: input,
      outputPath: output,
      dpi: 144,
      renderer: 'pdftoppm' as const,
      run: async (invocation: { args: string[] }) => {
        const prefix = invocation.args.at(-1)!;
        await writeFile(`${prefix}-1.png`, 'png bytes', 'utf8');
      },
    });

    await render();
    await expect(render()).rejects.toThrow();
    await writeFile(output, 'tampered bytes', 'utf8');
    await expect(readRenderMetadata(output)).rejects.toThrow('does not match');
  });
});
