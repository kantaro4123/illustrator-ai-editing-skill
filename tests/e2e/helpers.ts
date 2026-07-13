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

export async function createIllustratorFixture(): Promise<IllustratorFixture> {
  const root = await mkdtemp(join(tmpdir(), 'illustrator-ai-e2e-'));
  const primaryPath = join(root, 'synthetic-primary.ai');
  const decoyPath = join(root, 'synthetic-primary-copy.ai');
  const fixture = { root, primaryPath, decoyPath };
  fixtures.push(fixture);
  const resultPath = join(root, 'fixture-result.json');
  const scriptPath = join(root, 'create-fixture.jsx');
  const template = await readFile(
    new URL('../../src/jsx/fixtures/create-test-document.jsx', import.meta.url),
    'utf8',
  );
  const source = template
    .replace('__PRIMARY_PATH__', JSON.stringify(primaryPath))
    .replace('__DECOY_PATH__', JSON.stringify(decoyPath))
    .replace('__RESULT_PATH__', JSON.stringify(resultPath));
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
      'for (var j = 0; j < paths.length; j++) {',
      'var expectedName = String(new File(paths[j]).name);',
      'var exactPath = currentPath === String(new File(paths[j]).fsName);',
      'var syntheticFallback = currentPath.indexOf("illustrator-ai-e2e-") >= 0 && currentName === expectedName;',
      'if (exactPath || syntheticFallback) { app.documents[i].close(SaveOptions.DONOTSAVECHANGES); break; }',
      '} } }());',
    ].join('\n');
    try {
      await writeFile(cleanupPath, `\uFEFF${source}`, 'utf8');
      await runAppleScript(cleanupPath, 30_000);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});
