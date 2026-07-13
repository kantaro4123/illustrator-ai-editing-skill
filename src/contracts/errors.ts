export type IllustratorErrorCode =
  | 'DOCUMENT_LOCKED'
  | 'MUTATION_TIMEOUT_AMBIGUOUS'
  | 'DOCUMENT_MISMATCH'
  | 'AMBIGUOUS_ASPECT_AXIS'
  | 'ASPECT_AXIS_CONFLICT'
  | 'REFERENCE_WRITE_FORBIDDEN'
  | 'ILLUSTRATOR_NOT_RUNNING'
  | 'ILLUSTRATOR_UNRESPONSIVE'
  | 'INVALID_ARGUMENT'
  | 'EXECUTION_FAILED';

export interface IllustratorErrorDetails {
  code: IllustratorErrorCode;
  message: string;
  recoverable: boolean;
  nextAction: string;
  safeToRetry?: boolean;
}

export class IllustratorError extends Error {
  readonly code: IllustratorErrorCode;
  readonly recoverable: boolean;
  readonly nextAction: string;
  readonly safeToRetry: boolean | undefined;

  constructor(details: IllustratorErrorDetails) {
    super(details.message);
    this.name = 'IllustratorError';
    this.code = details.code;
    this.recoverable = details.recoverable;
    this.nextAction = details.nextAction;
    this.safeToRetry = details.safeToRetry;
  }

  static ambiguousTimeout(timeoutMs: number): IllustratorError {
    return new IllustratorError({
      code: 'MUTATION_TIMEOUT_AMBIGUOUS',
      message: `Illustrator mutation produced no result within ${timeoutMs}ms; it may still have applied.`,
      recoverable: true,
      safeToRetry: false,
      nextAction: 'Run illustrator-ai recover and inspect the transaction before retrying.',
    });
  }

  toJSON(): IllustratorErrorDetails {
    const details: IllustratorErrorDetails = {
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      nextAction: this.nextAction,
    };
    if (this.safeToRetry !== undefined) details.safeToRetry = this.safeToRetry;
    return details;
  }
}
