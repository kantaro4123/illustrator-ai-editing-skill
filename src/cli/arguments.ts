import { isAbsolute } from 'node:path';

export const COMMANDS = [
  'doctor',
  'inspect',
  'backup',
  'run',
  'save',
  'render',
  'crop',
  'compare',
  'verify',
  'recover',
] as const;

export type CommandName = (typeof COMMANDS)[number];

export interface ParsedArguments {
  command: CommandName;
  positionals: string[];
  options: Record<string, string | boolean>;
}

const DOCUMENT_COMMANDS = new Set<CommandName>([
  'inspect',
  'backup',
  'run',
  'save',
  'render',
  'crop',
  'compare',
  'verify',
]);

function optionName(value: string): string {
  return value.replace(/^--/, '').replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function parseArguments(argv: string[]): ParsedArguments {
  const [rawCommand, ...tokens] = argv;
  if (!rawCommand || !COMMANDS.includes(rawCommand as CommandName)) {
    throw new Error(`Unknown command: ${rawCommand ?? '(missing)'}`);
  }
  const command = rawCommand as CommandName;
  const positionals: string[] = [];
  const options: Record<string, string | boolean> = {};

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }
    if (token === '--') throw new Error('Bare -- is not supported.');
    const equals = token.indexOf('=');
    if (equals > 2) {
      options[optionName(token.slice(0, equals))] = token.slice(equals + 1);
      continue;
    }
    const next = tokens[index + 1];
    if (next && !next.startsWith('--')) {
      options[optionName(token)] = next;
      index += 1;
    } else {
      options[optionName(token)] = true;
    }
  }

  if (DOCUMENT_COMMANDS.has(command)) {
    if (!positionals[0]) throw new Error(`${command} requires an absolute document path.`);
    if (!isAbsolute(positionals[0])) throw new Error('Document path must be an absolute path.');
  }
  if (command === 'compare') {
    if (!positionals[1]) throw new Error('compare requires absolute before and after image paths.');
    if (!isAbsolute(positionals[1])) throw new Error('compare after image path must be an absolute path.');
  }
  if (command === 'run' || command === 'save') {
    if (options.confirm !== true) {
      throw new Error(`${command} is a mutation and requires --confirm.`);
    }
  }
  if (command === 'run') {
    if (typeof options.script !== 'string') {
      throw new Error('run requires --script with an absolute script path.');
    }
    if (!isAbsolute(options.script)) throw new Error('run requires an absolute script path.');
  }
  if (command === 'save' && options.role !== undefined) {
    const role = String(options.role);
    if (role === 'new') {
      throw new Error('--role new is not supported by save; create or select the new working file first, then save it as --role working.');
    }
    if (!['reference', 'working'].includes(role)) {
      throw new Error('--role must be reference or working.');
    }
  }
  return { command, positionals, options };
}
