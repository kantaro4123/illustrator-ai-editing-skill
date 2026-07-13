import { writeFile } from 'node:fs/promises';
import type { TransactionFiles } from './temp-files.js';

export interface AppleScriptOptions {
  scriptPath?: string;
  appPath?: string;
  timeoutSeconds: number;
  activate?: boolean;
}

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function buildAppleScript(options: AppleScriptOptions & { scriptPath: string }): string {
  if (!Number.isInteger(options.timeoutSeconds) || options.timeoutSeconds <= 0) {
    throw new Error('timeoutSeconds must be a positive integer');
  }
  const app = escapeAppleScriptString(options.appPath ?? 'Adobe Illustrator');
  const jsx = escapeAppleScriptString(options.scriptPath);
  const lines = [
    `with timeout of ${options.timeoutSeconds} seconds`,
    `tell application "${app}"`,
  ];
  if (options.activate) lines.push('activate');
  lines.push(`do javascript (POSIX file "${jsx}")`, 'end tell', 'end timeout');
  return `${lines.join('\n')}\n`;
}

export async function writeAppleScript(
  files: TransactionFiles,
  options: Omit<AppleScriptOptions, 'scriptPath'>,
): Promise<void> {
  const source = buildAppleScript({ ...options, scriptPath: files.scriptPath });
  await writeFile(files.runnerPath, source, 'utf8');
}
