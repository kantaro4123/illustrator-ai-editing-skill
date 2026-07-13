import { copyFile, mkdtemp, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join } from 'node:path';
import type { PixelRectangle } from './crop.js';

export type Renderer = 'pdftoppm' | 'sips';

export interface ProcessInvocation {
  executable: string;
  args: string[];
}

export function chooseRenderer(available: Set<string>): Renderer {
  if (available.has('pdftoppm')) return 'pdftoppm';
  if (available.has('sips')) return 'sips';
  throw new Error('No supported PDF renderer found (pdftoppm or sips).');
}

export function buildRenderInvocation(input: {
  renderer: Renderer;
  inputPdf: string;
  outputPrefix: string;
  dpi: number;
}): ProcessInvocation {
  if (input.renderer === 'pdftoppm') {
    return {
      executable: 'pdftoppm',
      args: [
        '-png',
        '-r',
        String(input.dpi),
        '-f',
        '1',
        '-l',
        '1',
        input.inputPdf,
        input.outputPrefix,
      ],
    };
  }
  return {
    executable: 'sips',
    args: ['-s', 'format', 'png', input.inputPdf, '--out', `${input.outputPrefix}.png`],
  };
}

export function buildCropInvocation(input: {
  executable: 'ffmpeg';
  inputPath: string;
  outputPath: string;
  rectangle: PixelRectangle;
  upscale: number;
}): ProcessInvocation {
  const { x, y, width, height } = input.rectangle;
  const filter = `crop=${width}:${height}:${x}:${y},scale=${width * input.upscale}:${height * input.upscale}:flags=lanczos`;
  return {
    executable: input.executable,
    args: ['-y', '-loglevel', 'error', '-i', input.inputPath, '-vf', filter, '-frames:v', '1', input.outputPath],
  };
}

export interface RenderResult {
  path: string;
  renderer: Renderer;
  dpi: number;
}

export async function renderAi(input: {
  inputPath: string;
  outputPath: string;
  dpi: number;
  renderer: Renderer;
  run: (invocation: ProcessInvocation) => Promise<void>;
}): Promise<RenderResult> {
  const transaction = await mkdtemp(join(tmpdir(), 'illustrator-render-'));
  const pdfPath = join(transaction, `${basename(input.inputPath, extname(input.inputPath))}.pdf`);
  const prefix = join(transaction, 'page');
  await copyFile(input.inputPath, pdfPath);
  const invocation = buildRenderInvocation({
    renderer: input.renderer,
    inputPdf: pdfPath,
    outputPrefix: prefix,
    dpi: input.dpi,
  });
  try {
    await input.run(invocation);
    const generated = input.renderer === 'pdftoppm' ? `${prefix}-1.png` : `${prefix}.png`;
    await rename(generated, input.outputPath);
  } finally {
    await rm(transaction, { recursive: true, force: true });
  }
  return { path: input.outputPath, renderer: input.renderer, dpi: input.dpi };
}
