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

export async function runEnvironmentDoctor(args, root) {
  const target = args.find((value) => !value.startsWith('--'));
  const binPath = join(root, 'bin', 'illustrator-ai');
  const baseArgs = [binPath, 'doctor'];
  if (target) baseArgs.push(target);
  const timeoutIndex = args.indexOf('--timeout');
  if (timeoutIndex >= 0 && args[timeoutIndex + 1]) baseArgs.push('--timeout', args[timeoutIndex + 1]);

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
