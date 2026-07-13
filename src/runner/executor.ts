import { IllustratorError } from '../contracts/errors.js';

export interface ExecutionInput<T> {
  mutation: boolean;
  timeoutMs: number;
  operation: () => Promise<T>;
}

export class SerializedIllustratorExecutor {
  private tail: Promise<void> = Promise.resolve();

  execute<T>(input: ExecutionInput<T>): Promise<T> {
    if (!Number.isFinite(input.timeoutMs) || input.timeoutMs <= 0) {
      return Promise.reject(new Error('timeoutMs must be greater than zero'));
    }

    let resolveCaller!: (value: T) => void;
    let rejectCaller!: (reason: unknown) => void;
    const caller = new Promise<T>((resolve, reject) => {
      resolveCaller = resolve;
      rejectCaller = reject;
    });

    const queued = this.tail.then(async () => {
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        if (input.mutation) {
          rejectCaller(IllustratorError.ambiguousTimeout(input.timeoutMs));
        } else {
          rejectCaller(
            new IllustratorError({
              code: 'ILLUSTRATOR_UNRESPONSIVE',
              message: `Illustrator read produced no result within ${input.timeoutMs}ms.`,
              recoverable: true,
              safeToRetry: false,
              nextAction: 'Wait for the host operation to settle, then run illustrator-ai doctor before retrying.',
            }),
          );
        }
      }, input.timeoutMs);

      try {
        const value = await input.operation();
        if (!timedOut) resolveCaller(value);
      } catch (error) {
        if (!timedOut) rejectCaller(error);
      } finally {
        clearTimeout(timer);
      }
    });

    this.tail = queued.catch(() => undefined);
    return caller;
  }
}
