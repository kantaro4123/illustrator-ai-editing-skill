import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { basename, isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);

function parseOptions(tokens) {
  const options = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) throw new Error(`Unexpected positional argument: ${token}`);
    const key = token.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const next = tokens[index + 1];
    if (next && !next.startsWith('--')) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }
  return options;
}

function positive(options, key, fallback) {
  if (options[key] === undefined) return fallback;
  const value = Number(options[key]);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`--${key} must be greater than zero.`);
  return value;
}

function resolveSelector(options) {
  const candidates = [
    ['uuid', options.uuid],
    ['name', options.name],
    ['layer', options.layer],
  ].filter((entry) => typeof entry[1] === 'string' && entry[1].length > 0);
  if (candidates.length !== 1) throw new Error('Targeted inspect requires exactly one of --uuid, --name, or --layer.');
  return { selector: candidates[0][0], value: candidates[0][1] };
}

export async function runTargetedInspect(args, root) {
  const targetPath = args[0];
  if (!targetPath || !isAbsolute(targetPath)) throw new Error('inspect requires an absolute document path.');
  const options = parseOptions(args.slice(1));
  const selected = resolveSelector(options);
  const detail = options.detail === 'full' ? 'full' : 'compact';
  const content = options.content ?? 'truncated';
  if (!['none', 'truncated', 'full'].includes(content)) throw new Error('--content must be none, truncated, or full.');
  const timeoutSeconds = positive(options, 'timeout', 180);

  const tempUrl = pathToFileURL(join(root, 'dist', 'src', 'runner', 'temp-files.js')).href;
  const builderUrl = pathToFileURL(join(root, 'dist', 'src', 'runner', 'jsx-builder.js')).href;
  const appleUrl = pathToFileURL(join(root, 'dist', 'src', 'runner', 'apple-script.js')).href;
  const temp = await import(tempUrl);
  const { buildJsx } = await import(builderUrl);
  const { writeAppleScript } = await import(appleUrl);

  const files = await temp.createTransactionFiles();
  try {
    await temp.writeTransactionMarker(files, { documentPath: targetPath, command: 'inspect-target', mutation: false });
    await temp.writeParams(files, {
      ...selected,
      detail,
      content,
      maxContentCharacters: positive(options, 'maxContentCharacters', 240),
      maxStyleCharacters: positive(options, 'maxStyleCharacters', 1000),
      maxPageItems: positive(options, 'maxPageItems', 100),
    });
    const commandSource = await readFile(join(root, 'src', 'jsx', 'commands', 'inspect-target.jsx'), 'utf8');
    const jsx = await buildJsx({
      commandSource,
      paramsPath: files.paramsPath,
      resultPath: files.resultPath,
      targetPath,
      targetName: basename(targetPath),
    });
    await temp.writeJsx(files, jsx);
    await writeAppleScript(files, { timeoutSeconds: Math.ceil(timeoutSeconds), activate: false });
    await execFileAsync('osascript', [files.runnerPath], {
      encoding: 'utf8',
      timeout: Math.ceil((timeoutSeconds + 5) * 1000),
    });
    const value = await temp.readJsonResult(files);
    if (value && typeof value === 'object' && 'error' in value) {
      throw new Error(String(value.message ?? 'Targeted ExtendScript inspection failed.'));
    }
    process.stdout.write(`${JSON.stringify({
      ok: true,
      command: 'inspect',
      runId: files.id,
      document: { path: targetPath, name: basename(targetPath) },
      data: value,
      warnings: [],
      artifacts: [],
    })}\n`);
  } finally {
    await temp.cleanupTransaction(files, { preserve: false });
  }
}
