import { readFile } from 'node:fs/promises';
import { buildJsx } from '../runner/jsx-builder.js';

export type InspectionContentMode = 'none' | 'truncated' | 'full';

export interface InspectCommandInput {
  targetPath: string;
  targetName: string;
  detail: 'compact' | 'full';
  content?: InspectionContentMode;
  maxContentCharacters?: number;
  includeLinkPaths?: boolean;
  maxStyleCharacters?: number;
  paramsPath: string;
  resultPath: string;
}

export async function createInspectCommand(input: InspectCommandInput): Promise<{
  mutation: false;
  params: {
    detail: 'compact' | 'full';
    content: InspectionContentMode;
    maxContentCharacters: number;
    includeLinkPaths: boolean;
    maxStyleCharacters: number;
  };
  jsx: string;
}> {
  const commandSource = await readFile(
    new URL('../jsx/commands/inspect.jsx', import.meta.url),
    'utf8',
  );
  return {
    mutation: false,
    params: {
      detail: input.detail,
      content: input.content ?? 'truncated',
      maxContentCharacters: input.maxContentCharacters ?? 240,
      includeLinkPaths: input.includeLinkPaths ?? false,
      maxStyleCharacters: input.maxStyleCharacters ?? 1000,
    },
    jsx: await buildJsx({
      commandSource,
      paramsPath: input.paramsPath,
      resultPath: input.resultPath,
      targetPath: input.targetPath,
      targetName: input.targetName,
    }),
  };
}
