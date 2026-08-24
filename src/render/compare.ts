import type { ProcessInvocation } from './render.js';

export function buildComparisonInvocations(input: {
  beforePath: string;
  afterPath: string;
  overlayPath: string;
  differencePath: string;
  overwrite: boolean;
}): ProcessInvocation[] {
  const common = [input.overwrite ? '-y' : '-n', '-loglevel', 'error', '-i', input.beforePath, '-i', input.afterPath];
  return [
    {
      executable: 'ffmpeg',
      args: [...common, '-filter_complex', 'blend=all_mode=average', '-frames:v', '1', input.overlayPath],
    },
    {
      executable: 'ffmpeg',
      args: [...common, '-filter_complex', 'blend=all_mode=difference', '-frames:v', '1', input.differencePath],
    },
  ];
}
