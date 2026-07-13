import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach } from 'vitest';
import { createDefaultHandlers, runCli } from '../../src/cli/main.js';
import type { CommandResult } from '../../src/contracts/result.js';

const executeFile = promisify(execFile);
const fixtures: IllustratorFixture[] = [];

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export interface IllustratorFixture {
  root: string;
  primaryPath: string;
  decoyPath: string;
}

async function runAppleScript(scriptPath: string, timeoutMs = 180_000): Promise<void> {
  await executeFile('osascript', ['-e', [
    `with timeout of ${Math.ceil(timeoutMs / 1000)} seconds`,
    'tell application "Adobe Illustrator"',
    `do javascript (POSIX file ${JSON.stringify(scriptPath)})`,
    'end tell',
    'end timeout',
  ].join('\n')], { timeout: timeoutMs });
}

async function ensureEmptyIllustrator(): Promise<void> {
  await executeFile('open', ['-b', 'com.adobe.illustrator']);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const ready = await executeFile('osascript', [
        '-e', 'with timeout of 10 seconds',
        '-e', 'tell application "Adobe Illustrator" to do javascript "1+1"',
        '-e', 'end timeout',
      ], { timeout: 12_000 });
      if (ready.stdout.trim() !== '2') throw new Error('Unexpected Illustrator readiness result.');
      const count = await executeFile('osascript', ['-e', 'tell application "Adobe Illustrator" to return count of documents'], { timeout: 10_000 });
      if (Number(count.stdout.trim()) !== 0) {
        throw new Error('Illustrator E2E requires an empty session; refusing to touch open documents.');
      }
      return;
    } catch (error) {
      if (error instanceof Error && error.message.includes('refusing to touch')) throw error;
      await delay(2_000);
    }
  }
  throw new Error('Illustrator did not become ready for an isolated E2E session.');
}

async function terminateOwnedIllustrator(): Promise<void> {
  try {
    const found = await executeFile('pgrep', ['-x', 'Adobe Illustrator']);
    const pid = Number(found.stdout.trim().split(/\s+/)[0]);
    if (!Number.isInteger(pid) || pid <= 0) return;
    process.kill(pid, 'SIGTERM');
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        process.kill(pid, 0);
        await delay(1_000);
      } catch {
        return;
      }
    }
    throw new Error(`Illustrator E2E process ${pid} did not terminate after SIGTERM.`);
  } catch (error) {
    const code = (error as { code?: string | number }).code;
    if (code === 1 || code === '1') return;
    throw error;
  }
}

export async function createIllustratorFixture(): Promise<IllustratorFixture> {
  await ensureEmptyIllustrator();
  const root = await mkdtemp(join(tmpdir(), 'illustrator-ai-e2e-'));
  const primaryPath = join(root, 'synthetic-primary.ai');
  const decoyPath = join(root, 'synthetic-primary-copy.ai');
  const fixture = { root, primaryPath, decoyPath };
  fixtures.push(fixture);
  const resultPath = join(root, 'fixture-result.json');
  const scriptPath = join(root, 'create-fixture.jsx');
  const svgPath = join(root, 'primary.svg');
  await writeFile(svgPath, [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="595" height="842" viewBox="0 0 595 842">',
    '<g font-family="Kozuka Gothic Pr6N" fill="#111">',
    '<text id="JP_POINT" x="60" y="82" font-size="18">受付時間（月〜土曜 14：00〜21：30）</text>',
    '<text id="ASPECT_NORMAL" x="60" y="142" font-size="20">田田田</text>',
    '<text id="ASPECT_H82" x="60" y="192" font-size="20">田田田</text>',
    '<text id="ASPECT_V833" x="60" y="242" font-size="20">田田田</text>',
    '<text id="OUTLINE_SOURCE" x="340" y="142" font-size="20">田田田</text>',
    '<text id="JP_AREA" x="60" y="320" font-size="14">日本語の禁則処理と改行を検証します。</text>',
    '</g></svg>',
  ].join('\n'), 'utf8');
  const template = await readFile(
    new URL('../../src/jsx/fixtures/create-test-document.jsx', import.meta.url),
    'utf8',
  );
  const source = template
    .replace('__PRIMARY_PATH__', JSON.stringify(primaryPath))
    .replace('__DECOY_PATH__', JSON.stringify(decoyPath))
    .replace('__RESULT_PATH__', JSON.stringify(resultPath))
    .replace('__PRIMARY_SVG_PATH__', JSON.stringify(svgPath));
  await writeFile(scriptPath, `\uFEFF${source}`, 'utf8');
  await runAppleScript(scriptPath);
  const result = JSON.parse((await readFile(resultPath, 'utf8')).replace(/^\uFEFF/, '')) as {
    ok: boolean;
    message?: string;
  };
  if (!result.ok) throw new Error(result.message ?? 'Illustrator fixture creation failed.');
  return fixture;
}

export async function writeMutationScript(
  fixture: IllustratorFixture,
  name: string,
  source: string,
): Promise<string> {
  const path = join(fixture.root, `${name}.jsx`);
  await writeFile(path, source, 'utf8');
  return path;
}

export async function cliJson(argv: string[]): Promise<CommandResult> {
  const output = await runCli(argv, createDefaultHandlers());
  const result = JSON.parse(output.stdout) as CommandResult;
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result;
}

export function findTextFrame(result: CommandResult, name: string): Record<string, unknown> {
  if (!result.ok) throw new Error('Inspection failed.');
  const payload = result.data as { textFrames?: Array<Record<string, unknown>> };
  const frame = payload.textFrames?.find((item) => item.name === name);
  if (!frame) throw new Error(`Missing text fixture: ${name}`);
  return frame;
}

export function fixtureLabel(fixture: IllustratorFixture): string {
  return `${basename(fixture.primaryPath)} / ${basename(fixture.decoyPath)}`;
}

afterEach(async () => {
  for (const fixture of fixtures.splice(0)) {
    const cleanupPath = join(fixture.root, 'close-fixture.jsx');
    const source = [
      '#target illustrator',
      `(function () { var paths = [${JSON.stringify(fixture.primaryPath)}, ${JSON.stringify(fixture.decoyPath)}];`,
      'for (var i = app.documents.length - 1; i >= 0; i--) {',
      'var currentPath = ""; try { currentPath = String(app.documents[i].fullName.fsName); } catch (ignored) {}',
      'var currentName = String(app.documents[i].name);',
      'if (currentPath.indexOf("illustrator-ai-e2e-") >= 0) { app.documents[i].close(SaveOptions.DONOTSAVECHANGES); continue; }',
      'for (var j = 0; j < paths.length; j++) {',
      'var expectedName = String(new File(paths[j]).name);',
      'var exactPath = currentPath === String(new File(paths[j]).fsName);',
      'var syntheticFallback = currentPath.indexOf("illustrator-ai-e2e-") >= 0 && currentName === expectedName;',
      'if (exactPath || syntheticFallback) { app.documents[i].close(SaveOptions.DONOTSAVECHANGES); break; }',
      '} } }());',
    ].join('\n');
    try {
      await writeFile(cleanupPath, `\uFEFF${source}`, 'utf8');
      await runAppleScript(cleanupPath, 10_000);
    } catch {
      await terminateOwnedIllustrator();
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
}, 90_000);
