import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function available(name) {
  try {
    await execFileAsync('which', [name], { encoding: 'utf8' });
    return true;
  } catch {
    return false;
  }
}

function parseArgs(args) {
  let target;
  let timeout;
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--timeout') {
      timeout = args[index + 1];
      if (timeout === undefined) throw new Error('--timeout requires a value.');
      index += 1;
      continue;
    }
    if (token.startsWith('--timeout=')) {
      timeout = token.slice('--timeout='.length);
      continue;
    }
    if (token.startsWith('--')) throw new Error(`Unknown doctor option: ${token}`);
    if (target) throw new Error('doctor accepts at most one target document path.');
    target = token;
  }
  return { target, timeout };
}

export async function runEnvironmentDoctor(args, root) {
  const { target, timeout } = parseArgs(args);
  const binPath = join(root, 'bin', 'illustrator-ai');
  const baseArgs = [binPath, 'doctor'];
  if (target) baseArgs.push(target);
  if (timeout) baseArgs.push('--timeout', timeout);

  const { stdout } = await execFileAsync(process.execPath, baseArgs, { encoding: 'utf8' });
  const base = JSON.parse(stdout.trim());
  const tools = {
    node: { available: true, version: process.versions.node },
    osascript: { available: await available('osascript'), required: true },
    pdftoppm: { available: await available('pdftoppm'), preferred: true },
    sips: { available: await available('sips'), fallback: true },
    ffmpeg: { available: await available('ffmpeg'), requiredForCropCompare: true },
  };
  const renderingReady = tools.pdftoppm.available || tools.sips.available;
  const cropCompareReady = tools.ffmpeg.available;
  const hostResponsive = Boolean(base.ok && base.data && String(base.data.state || '').startsWith('RESPONSIVE'));

  const result = {
    ...base,
    command: 'doctor',
    data: {
      ...(base.data ?? {}),
      environment: {
        tools,
        renderingReady,
        cropCompareReady,
        hostResponsive,
        automationLikelyGranted: hostResponsive,
        notes: hostResponsive
          ? []
          : ['A non-responsive host can also mean a modal dialog or missing macOS Automation permission; approve the first Apple Event at the keyboard.'],
      },
    },
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.ok) process.exitCode = 1;
}
