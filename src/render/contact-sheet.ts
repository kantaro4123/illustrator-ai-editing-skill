import type { ProcessInvocation } from './render.js';

export function buildContactSheetInvocation(input: {
  inputs: string[];
  outputPath: string;
}): ProcessInvocation {
  if (input.inputs.length < 2) throw new Error('A contact sheet requires at least two images.');
  const args: string[] = ['-y', '-loglevel', 'error'];
  for (const path of input.inputs) args.push('-i', path);
  args.push('-filter_complex', `hstack=inputs=${input.inputs.length}`, '-frames:v', '1', input.outputPath);
  return { executable: 'ffmpeg', args };
}
