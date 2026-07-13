import { readFile } from 'node:fs/promises';

const CORE_MODULES = [
  'json',
  'result',
  'document',
  'identity',
  'geometry',
  'text',
  'japanese-text',
  'aspect-ratio',
  'layout',
  'snapshot',
] as const;

export interface BuildJsxInput {
  commandSource: string;
  paramsPath: string;
  resultPath: string;
  targetPath: string;
  targetName: string;
}

async function readCoreModule(name: (typeof CORE_MODULES)[number]): Promise<string> {
  return stripExtendScriptAnnotations(
    await readFile(new URL(`../jsx/core/${name}.jsx`, import.meta.url), 'utf8'),
  );
}

function stripExtendScriptAnnotations(source: string): string {
  // Illustrator 2026 treats JSDoc-like `// @...` lines as ExtendScript directives
  // and reports a syntax error. Keep markers in source files for maintainers only.
  return source.replace(/^\s*\/\/\s*@[^\r\n]*(?:\r?\n|$)/gm, '');
}

export async function buildJsx(input: BuildJsxInput): Promise<string> {
  const modules = await Promise.all(CORE_MODULES.map((name) => readCoreModule(name)));
  const prelude = [
    '#target illustrator',
    `(function () {`,
    `var PARAMS_PATH = ${JSON.stringify(input.paramsPath)};`,
    `var RESULT_PATH = ${JSON.stringify(input.resultPath)};`,
    `var TARGET_PATH = ${JSON.stringify(input.targetPath)};`,
    `var TARGET_NAME = ${JSON.stringify(input.targetName)};`,
    modules.join('\n'),
    'var __previousInteractionLevel = null;',
    'try {',
    '  __previousInteractionLevel = app.userInteractionLevel;',
    '  app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;',
    '  requireTargetDocument();',
    stripExtendScriptAnnotations(input.commandSource),
    '} catch (__error) {',
    '  writeErrorResult(RESULT_PATH, __error);',
    '} finally {',
    '  try { if (__previousInteractionLevel !== null) app.userInteractionLevel = __previousInteractionLevel; } catch (__restoreError) {}',
    '}',
    '}());',
    '',
  ];
  return prelude.join('\n');
}
