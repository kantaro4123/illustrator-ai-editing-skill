import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
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
  overwrite: boolean;
}): ProcessInvocation {
  const { x, y, width, height } = input.rectangle;
  const filter = `crop=${width}:${height}:${x}:${y},scale=${width * input.upscale}:${height * input.upscale}:flags=lanczos`;
  return {
    executable: input.executable,
    args: [input.overwrite ? '-y' : '-n', '-loglevel', 'error', '-i', input.inputPath, '-vf', filter, '-frames:v', '1', input.outputPath],
  };
}

export interface RenderMetadata {
  schemaVersion: 1;
  renderer: Renderer;
  requestedDpi: number;
  /** Effective DPI when the renderer can guarantee it; otherwise null. */
  dpi: number | null;
  imageSha256: string;
}

export interface RenderResult extends RenderMetadata {
  path: string;
  metadataPath: string;
}

export function renderMetadataPath(imagePath: string): string {
  return `${imagePath}.illustrator-ai.json`;
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256');
  hash.update(await readFile(path));
  return hash.digest('hex');
}

function parseRenderMetadata(raw: string): RenderMetadata {
  const parsed = JSON.parse(raw) as Partial<RenderMetadata>;
  if (
    parsed.schemaVersion !== 1
    || !['pdftoppm', 'sips'].includes(String(parsed.renderer))
    || !Number.isFinite(parsed.requestedDpi)
    || !(Number(parsed.requestedDpi) > 0)
    || !(parsed.dpi === null || (Number.isFinite(parsed.dpi) && Number(parsed.dpi) > 0))
    || typeof parsed.imageSha256 !== 'string'
    || !/^[0-9a-f]{64}$/i.test(parsed.imageSha256)
  ) {
    throw new Error('Invalid Illustrator render metadata.');
  }
  return parsed as RenderMetadata;
}

export async function readRenderMetadata(
  imagePath: string,
  metadataPath: string = renderMetadataPath(imagePath),
): Promise<RenderMetadata | undefined> {
  let raw: string;
  try {
    raw = await readFile(metadataPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
  const metadata = parseRenderMetadata(raw);
  const actualSha256 = await sha256File(imagePath);
  if (actualSha256 !== metadata.imageSha256) {
    throw new Error('Render metadata does not match the current image bytes. Re-render before cropping.');
  }
  return metadata;
}

export async function resolveCropDpi(input: {
  imagePath: string;
  metadataPath?: string | undefined;
  explicitDpi?: number | undefined;
  allowUnverifiedDpi?: boolean | undefined;
}): Promise<{ dpi: number; verified: boolean; metadata?: RenderMetadata }> {
  if (input.explicitDpi !== undefined && (!Number.isFinite(input.explicitDpi) || input.explicitDpi <= 0)) {
    throw new Error('Explicit crop DPI must be greater than zero.');
  }
  const metadata = await readRenderMetadata(input.imagePath, input.metadataPath);
  if (metadata?.dpi !== null && metadata?.dpi !== undefined) {
    if (input.explicitDpi !== undefined && input.explicitDpi !== metadata.dpi) {
      throw new Error(`--dpi ${input.explicitDpi} does not match verified render DPI ${metadata.dpi}.`);
    }
    return { dpi: metadata.dpi, verified: true, metadata };
  }
  if (input.allowUnverifiedDpi === true && input.explicitDpi !== undefined) {
    return { dpi: input.explicitDpi, verified: false, ...(metadata ? { metadata } : {}) };
  }
  if (metadata) {
    throw new Error(
      'Rendered image has unknown effective DPI (sips). Re-render with pdftoppm, or pass --dpi with --allow-unverified-dpi only after independently verifying the raster density.',
    );
  }
  throw new Error(
    'Crop requires matching render metadata. Re-render with illustrator-ai render, or pass --dpi with --allow-unverified-dpi only after independently verifying the raster density.',
  );
}

export async function renderAi(input: {
  inputPath: string;
  outputPath: string;
  dpi: number;
  renderer: Renderer;
  overwrite?: boolean;
  run: (invocation: ProcessInvocation) => Promise<void>;
}): Promise<RenderResult> {
  const transaction = await mkdtemp(join(tmpdir(), 'illustrator-render-'));
  const pdfPath = join(transaction, `${basename(input.inputPath, extname(input.inputPath))}.pdf`);
  const prefix = join(transaction, 'page');
  const metadataPath = renderMetadataPath(input.outputPath);
  let createdOutput = false;
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
    const metadata: RenderMetadata = {
      schemaVersion: 1,
      renderer: input.renderer,
      requestedDpi: input.dpi,
      dpi: input.renderer === 'pdftoppm' ? input.dpi : null,
      imageSha256: await sha256File(generated),
    };
    // COPYFILE_EXCL makes review artifacts no-clobber by default. --force opts in
    // to replacement explicitly at the CLI boundary.
    await copyFile(generated, input.outputPath, input.overwrite ? 0 : constants.COPYFILE_EXCL);
    createdOutput = !input.overwrite;
    try {
      await writeFile(metadataPath, `${JSON.stringify(metadata)}\n`, {
        encoding: 'utf8',
        mode: 0o600,
        flag: input.overwrite ? 'w' : 'wx',
      });
    } catch (error) {
      if (createdOutput) await unlink(input.outputPath).catch(() => undefined);
      throw error;
    }
    return { path: input.outputPath, metadataPath, ...metadata };
  } finally {
    await rm(transaction, { recursive: true, force: true });
  }
}
