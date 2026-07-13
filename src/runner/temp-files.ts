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
  };
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
