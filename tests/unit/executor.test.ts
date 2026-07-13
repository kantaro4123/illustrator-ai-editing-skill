import { describe, expect, test } from 'vitest';
import { SerializedIllustratorExecutor } from '../../src/runner/executor.js';
import { IllustratorError } from '../../src/contracts/errors.js';

const delay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

describe('serialized Illustrator executor', () => {
  test('runs all Illustrator operations one at a time', async () => {
    const executor = new SerializedIllustratorExecutor();
    let active = 0;
    let maximumActive = 0;
    const operation = async (value: number) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await delay(10);
      active -= 1;
      return value;
    };

    const values = await Promise.all([
      executor.execute({ mutation: false, timeoutMs: 100, operation: () => operation(1) }),
      executor.execute({ mutation: true, timeoutMs: 100, operation: () => operation(2) }),
      executor.execute({ mutation: false, timeoutMs: 100, operation: () => operation(3) }),
    ]);

    expect(values).toEqual([1, 2, 3]);
    expect(maximumActive).toBe(1);
  });

  test('classifies a mutation timeout as ambiguous and does not retry', async () => {
    const executor = new SerializedIllustratorExecutor();
    let calls = 0;
    const pending = executor.execute({
      mutation: true,
      timeoutMs: 5,
      operation: async () => {
        calls += 1;
        await delay(25);
        return 'late';
      },
    });

    await expect(pending).rejects.toMatchObject({
      code: 'MUTATION_TIMEOUT_AMBIGUOUS',
      safeToRetry: false,
    } satisfies Partial<IllustratorError>);
    expect(calls).toBe(1);
  });

  test('classifies a read-only timeout as safely retryable after diagnosis', async () => {
    const executor = new SerializedIllustratorExecutor();
    await expect(
      executor.execute({
        mutation: false,
        timeoutMs: 5,
        operation: async () => {
          await delay(25);
          return 'late';
        },
      }),
    ).rejects.toMatchObject({
      code: 'ILLUSTRATOR_UNRESPONSIVE',
      safeToRetry: true,
    } satisfies Partial<IllustratorError>);
  });

  test('continues processing the queue after a rejected operation', async () => {
    const executor = new SerializedIllustratorExecutor();
    const failed = executor.execute({
      mutation: false,
      timeoutMs: 100,
      operation: async () => {
        throw new Error('bridge failed');
      },
    });
    const succeeded = executor.execute({
      mutation: false,
      timeoutMs: 100,
      operation: async () => 'next',
    });
    await expect(failed).rejects.toThrow('bridge failed');
    await expect(succeeded).resolves.toBe('next');
  });
});
