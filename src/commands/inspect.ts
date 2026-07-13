import { readFile } from 'node:fs/promises';
import { buildJsx } from '../runner/jsx-builder.js';

export interface InspectCommandInput {
  targetPath: string;
  targetName: string;
  detail: 'compact' | 'full';
  maxStyleCharacters?: number;
  paramsPath: string;
  resultPath: string;
}

export async function createInspectCommand(input: InspectCommandInput): Promise<{
  mutation: false;
  params: { detail: 'compact' | 'full'; maxStyleCharacters: number };
  jsx: string;
}> {
  const commandSource = await readFile(
    new URL('../jsx/commands/inspect.jsx', import.meta.url),
    'utf8',
  );
  return {
    mutation: false,
    params: { detail: input.detail, maxStyleCharacters: input.maxStyleCharacters ?? 1000 },
    jsx: await buildJsx({
      commandSource,
      paramsPath: input.paramsPath,
      resultPath: input.resultPath,
      targetPath: input.targetPath,
      targetName: input.targetName,
    }),
  };
}
