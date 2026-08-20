import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTF8_BOM = '\uFEFF';

export interface TransactionFiles {
  id: string;
  directory: string;
  paramsPath: string;
  scriptPath: string;
  runnerPath: string;
  resultPath: string;
  markerPath: string;
}

/**
 * Written before the host call so a preserved directory can state what it was.
 * Recovery treats only mutation markers as ambiguous evidence; without this a
 * directory left by any failure is indistinguishable from an interrupted save.
 */
export interface TransactionMarker {
  id: string;
  documentPath: string;
  command: string;
  mutation: boolean;
  pid: number;
  startedAt: string;
}

export interface CreateTransactionOptions {
  rootDir?: string;
  id?: string;
}

export async function createTransactionFiles(
  options: CreateTransactionOptions = {},
): Promise<TransactionFiles> {
  const id = options.id ?? randomUUID();
  if (!UUID_PATTERN.test(id)) throw new Error(`Invalid transaction ID: ${id}`);

  const directory = join(options.rootDir ?? tmpdir(), `illustrator-ai-${id}`);
  await mkdir(directory, { recursive: false });

  return {
    id,
    directory,
    paramsPath: join(directory, `params-${id}.json`),
    scriptPath: join(directory, `script-${id}.jsx`),
    runnerPath: join(directory, `run-${id}.scpt`),
    resultPath: join(directory, `result-${id}.json`),
    markerPath: join(directory, 'transaction.json'),
  };
}

export async function writeTransactionMarker(
  files: TransactionFiles,
  marker: Omit<TransactionMarker, 'id' | 'pid' | 'startedAt'>
    & Partial<Pick<TransactionMarker, 'pid' | 'startedAt'>>,
): Promise<void> {
  const record: TransactionMarker = {
    id: files.id,
    documentPath: marker.documentPath,
    command: marker.command,
    mutation: marker.mutation,
    pid: marker.pid ?? process.pid,
    startedAt: marker.startedAt ?? new Date().toISOString(),
  };
  await writeFile(files.markerPath, JSON.stringify(record), 'utf8');
}

export async function readTransactionMarker(directory: string): Promise<TransactionMarker | undefined> {
  try {
    const raw = await readFile(join(directory, 'transaction.json'), 'utf8');
    const parsed = JSON.parse(raw) as Partial<TransactionMarker>;
    if (typeof parsed.documentPath !== 'string' || typeof parsed.mutation !== 'boolean') return undefined;
    return parsed as TransactionMarker;
  } catch {
    return undefined;
  }
}

export async function writeParams(files: TransactionFiles, params: unknown): Promise<void> {
  await writeFile(files.paramsPath, JSON.stringify(params ?? {}), 'utf8');
}

export async function writeJsx(files: TransactionFiles, source: string): Promise<void> {
  await writeFile(files.scriptPath, UTF8_BOM + source.replace(/^\uFEFF/, ''), 'utf8');
}

export async function readJsonResult(files: TransactionFiles): Promise<unknown> {
  const raw = await readFile(files.resultPath, 'utf8');
  return JSON.parse(raw.replace(/^\uFEFF/, '')) as unknown;
}

export async function cleanupTransaction(
  files: TransactionFiles,
  options: { preserve: boolean },
): Promise<void> {
  if (options.preserve) return;
  await rm(files.directory, { recursive: true, force: true });
}
