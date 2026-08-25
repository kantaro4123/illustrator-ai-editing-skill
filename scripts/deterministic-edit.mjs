import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
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

function selector(options) {
  const uuid = typeof options.uuid === 'string' ? options.uuid : undefined;
  const name = typeof options.name === 'string' ? options.name : undefined;
  if ((uuid ? 1 : 0) + (name ? 1 : 0) !== 1) {
    throw new Error('edit requires exactly one of --uuid or --name.');
  }
  return uuid ? { uuid } : { name };
}

function finiteOption(options, key) {
  if (typeof options[key] !== 'string') throw new Error(`--${key} is required.`);
  const value = Number(options[key]);
  if (!Number.isFinite(value)) throw new Error(`--${key} must be a finite number.`);
  return value;
}

function makeEdit(options) {
  if (typeof options.operation !== 'string') throw new Error('edit requires --operation.');
  const selected = selector(options);
  if (options.operation === 'replace-text') {
    if (typeof options.search !== 'string' || typeof options.replacement !== 'string') {
      throw new Error('replace-text requires --search and --replacement.');
    }
    return { operation: 'replace-text', ...selected, search: options.search, replacement: options.replacement };
  }
  if (options.operation === 'move') {
    return { operation: 'move', ...selected, dx: finiteOption(options, 'dx'), dy: finiteOption(options, 'dy') };
  }
  if (options.operation === 'set-font-size') {
    return { operation: 'set-font-size', ...selected, size: finiteOption(options, 'size') };
  }
  throw new Error('--operation must be replace-text, move, or set-font-size.');
}

function emitEditResult(stdout) {
  const parsed = JSON.parse(stdout.trim());
  parsed.command = 'edit';
  process.stdout.write(`${JSON.stringify(parsed)}\n`);
  if (!parsed.ok) process.exitCode = 1;
}

export async function runDeterministicEdit(args, root) {
  const documentPath = args[0];
  if (!documentPath || !isAbsolute(documentPath)) {
    throw new Error('edit requires an absolute Illustrator document path.');
  }
  const options = parseOptions(args.slice(1));
  if (options.confirm !== true) throw new Error('edit is a mutation and requires --confirm.');

  const moduleUrl = pathToFileURL(join(root, 'dist', 'src', 'commands', 'deterministic-edit.js')).href;
  const { buildDeterministicEditSource } = await import(moduleUrl);
  const source = buildDeterministicEditSource(makeEdit(options));
  const directory = await mkdtemp(join(tmpdir(), 'illustrator-ai-edit-'));
  const scriptPath = join(directory, 'edit.jsx');
  await writeFile(scriptPath, source, { encoding: 'utf8', mode: 0o600 });

  try {
    const binPath = join(root, 'bin', 'illustrator-ai');
    const runArgs = [binPath, 'run', documentPath, '--script', scriptPath, '--confirm'];
    if (typeof options.timeout === 'string') runArgs.push('--timeout', options.timeout);
    try {
      const { stdout } = await execFileAsync(process.execPath, runArgs, { encoding: 'utf8' });
      emitEditResult(stdout);
    } catch (error) {
      if (error && typeof error === 'object' && typeof error.stdout === 'string' && error.stdout.trim()) {
        emitEditResult(error.stdout);
        return;
      }
      throw error;
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
