import { describe, expect, test } from 'vitest';
import {
  failureResult,
  serializeResult,
  successResult,
  type DocumentIdentity,
} from '../../src/contracts/result.js';
import { IllustratorError } from '../../src/contracts/errors.js';

const document: DocumentIdentity = {
  path: '/Volumes/work/制作/テスト 文書.ai',
  name: 'テスト 文書.ai',
};

describe('command result contract', () => {
  test('creates a stable success envelope with artifacts and warnings', () => {
    const result = successResult({
      command: 'inspect',
      runId: 'run-123',
      document,
      data: { textFrames: 12 },
      warnings: ['font substituted'],
      artifacts: [{ kind: 'inspection', path: '/tmp/inspect.json' }],
    });

    expect(result).toEqual({
      ok: true,
      command: 'inspect',
      runId: 'run-123',
      document,
      data: { textFrames: 12 },
      warnings: ['font substituted'],
      artifacts: [{ kind: 'inspection', path: '/tmp/inspect.json' }],
    });
  });

  test('creates a recoverable failure with an explicit next action', () => {
    const error = new IllustratorError({
      code: 'DOCUMENT_LOCKED',
      message: 'Another Illustrator transaction owns this document.',
      recoverable: true,
      nextAction: 'Run illustrator-ai recover before retrying.',
    });

    const result = failureResult({
      command: 'run',
      runId: 'run-locked',
      document,
      error,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toEqual({
      code: 'DOCUMENT_LOCKED',
      message: 'Another Illustrator transaction owns this document.',
      recoverable: true,
      nextAction: 'Run illustrator-ai recover before retrying.',
    });
  });

  test('marks a mutation timeout as ambiguous and never safe to auto-retry', () => {
    const error = IllustratorError.ambiguousTimeout(180_000);
    expect(error.code).toBe('MUTATION_TIMEOUT_AMBIGUOUS');
    expect(error.recoverable).toBe(true);
    expect(error.safeToRetry).toBe(false);
    expect(error.nextAction).toContain('recover');
  });

  test('serializes without undefined fields', () => {
    const result = successResult({
      command: 'doctor',
      runId: 'run-doctor',
      data: { version: undefined, responsive: true },
    });

    const json = serializeResult(result);
    expect(json).not.toContain('undefined');
    expect(JSON.parse(json)).toEqual({
      ok: true,
      command: 'doctor',
      runId: 'run-doctor',
      data: { responsive: true },
      warnings: [],
      artifacts: [],
    });
  });
});
