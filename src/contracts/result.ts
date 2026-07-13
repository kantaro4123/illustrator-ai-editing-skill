import type { IllustratorError, IllustratorErrorDetails } from './errors.js';

export interface DocumentIdentity {
  path: string;
  name: string;
  fingerprint?: string;
}

export interface Artifact {
  kind: string;
  path: string;
  sha256?: string;
}

interface ResultBase {
  command: string;
  runId: string;
  document?: DocumentIdentity;
}

export interface CommandSuccess<T = unknown> extends ResultBase {
  ok: true;
  data: T;
  warnings: string[];
  artifacts: Artifact[];
}

export interface CommandFailure extends ResultBase {
  ok: false;
  error: IllustratorErrorDetails;
  warnings: string[];
  artifacts: Artifact[];
}

export type CommandResult<T = unknown> = CommandSuccess<T> | CommandFailure;

export interface SuccessInput<T> extends ResultBase {
  data: T;
  warnings?: string[];
  artifacts?: Artifact[];
}

export interface FailureInput extends ResultBase {
  error: IllustratorError;
  warnings?: string[];
  artifacts?: Artifact[];
}

export function successResult<T>(input: SuccessInput<T>): CommandSuccess<T> {
  const result: CommandSuccess<T> = {
    ok: true,
    command: input.command,
    runId: input.runId,
    data: input.data,
    warnings: input.warnings ?? [],
    artifacts: input.artifacts ?? [],
  };
  if (input.document) result.document = input.document;
  return result;
}

export function failureResult(input: FailureInput): CommandFailure {
  const result: CommandFailure = {
    ok: false,
    command: input.command,
    runId: input.runId,
    error: input.error.toJSON(),
    warnings: input.warnings ?? [],
    artifacts: input.artifacts ?? [],
  };
  if (input.document) result.document = input.document;
  return result;
}

export function serializeResult(result: CommandResult): string {
  return JSON.stringify(result);
}
