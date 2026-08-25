import { execFile } from 'node:child_process';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = join(fileURLToPath(new URL('..', import.meta.url)));
const binPath = join(root, 'bin', 'illustrator-ai');

function parse(argv) {
  const documentPath = argv[0];
  if (!documentPath || !isAbsolute(documentPath)) throw new Error('benchmark-inspect requires an absolute .ai path.');
  const options = {};
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      options[key] = next;
      index += 1;
    } else options[key] = true;
  }
  return { documentPath, options };
}

async function measured(label, args) {
  const started = process.hrtime.bigint();
  const { stdout } = await execFileAsync(process.execPath, [binPath, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  const parsed = JSON.parse(stdout.trim());
  return { label, elapsedMs: Math.round(elapsedMs * 10) / 10, ok: parsed.ok, data: parsed.data };
}

const { documentPath, options } = parse(process.argv.slice(2));
const runs = Number(options.runs ?? 1);
if (!Number.isInteger(runs) || runs < 1 || runs > 20) throw new Error('--runs must be an integer from 1 to 20.');
const selector = ['uuid', 'name', 'layer'].find((key) => typeof options[key] === 'string');
const results = [];
for (let index = 0; index < runs; index += 1) {
  results.push(await measured('compact-global', ['inspect', documentPath, '--detail', 'compact', '--content', 'none']));
  if (selector) {
    results.push(await measured(`targeted-${selector}`, [
      'inspect', documentPath, `--${selector}`, options[selector], '--detail', 'compact', '--content', 'none',
    ]));
  }
}

function summarize(label) {
  const values = results.filter((entry) => entry.label === label).map((entry) => entry.elapsedMs);
  if (!values.length) return undefined;
  return {
    samples: values.length,
    minMs: Math.min(...values),
    maxMs: Math.max(...values),
    meanMs: Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10,
  };
}

const summary = { global: summarize('compact-global') };
if (selector) summary.targeted = summarize(`targeted-${selector}`);
process.stdout.write(`${JSON.stringify({ documentPath, runs, selector: selector ?? null, summary }, null, 2)}\n`);
