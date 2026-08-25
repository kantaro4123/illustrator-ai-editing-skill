import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);

function optionKey(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function parseOptions(tokens) {
  const options = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) throw new Error(`Unexpected positional argument: ${token}`);
    const equals = token.indexOf('=');
    if (equals > 2) {
      options[optionKey(token.slice(2, equals))] = token.slice(equals + 1);
      continue;
    }
    const key = optionKey(token.slice(2));
    const next = tokens[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }
  return options;
}

function emitBatchResult(stdout) {
  const parsed = JSON.parse(stdout.trim());
  parsed.command = 'edit-batch';
  process.stdout.write(`${JSON.stringify(parsed)}\n`);
  if (!parsed.ok) process.exitCode = 1;
}

export async function runDeterministicEditBatch(args, root) {
  const documentPath = args[0];
  if (!documentPath || !isAbsolute(documentPath)) {
    throw new Error('edit-batch requires an absolute Illustrator document path.');
  }
  const options = parseOptions(args.slice(1));
  if (options.confirm !== true) throw new Error('edit-batch is a mutation and requires --confirm.');
  if (typeof options.file !== 'string' || !isAbsolute(options.file)) {
    throw new Error('edit-batch requires --file with an absolute JSON file path.');
  }

  const raw = await readFile(options.file, 'utf8');
  let edits;
  try {
    edits = JSON.parse(raw);
  } catch (error) {
    throw new Error(`edit-batch JSON is invalid: ${error}`);
  }
  if (!Array.isArray(edits)) throw new Error('edit-batch JSON root must be an array.');

  const moduleUrl = pathToFileURL(join(root, 'dist', 'src', 'commands', 'deterministic-edit.js')).href;
  const { buildDeterministicBatchSource } = await import(moduleUrl);
  const source = buildDeterministicBatchSource(edits);
  const directory = await mkdtemp(join(tmpdir(), 'illustrator-ai-edit-batch-'));
  const scriptPath = join(directory, 'edit-batch.jsx');
  await writeFile(scriptPath, source, { encoding: 'utf8', mode: 0o600 });

  try {
    const binPath = join(root, 'bin', 'illustrator-ai');
    const runArgs = [binPath, 'run', documentPath, '--script', scriptPath, '--confirm'];
    if (typeof options.timeout === 'string') runArgs.push('--timeout', options.timeout);
    try {
      const { stdout } = await execFileAsync(process.execPath, runArgs, { encoding: 'utf8' });
      emitBatchResult(stdout);
    } catch (error) {
      if (error && typeof error === 'object' && typeof error.stdout === 'string' && error.stdout.trim()) {
        emitBatchResult(error.stdout);
        return;
      }
      throw error;
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
