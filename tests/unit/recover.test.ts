import { describe, expect, test } from 'vitest';
import { planRecovery } from '../../src/commands/recover.js';

describe('Illustrator recovery planning', () => {
  test('never proposes a blind retry for an ambiguous mutation', () => {
    const plan = planRecovery({
      doctorState: 'MODAL_OR_UNRESPONSIVE',
      ambiguousTransactions: ['/tmp/illustrator-ai-run-id'],
      recoveredDocuments: [],
    });
    expect(plan.blockMutationRetry).toBe(true);
    expect(plan.actions.join(' ')).toContain('transaction');
    expect(plan.actions.join(' ')).not.toContain('rerun mutation');
  });

  test('prioritizes verifying and saving a recovered document', () => {
    const plan = planRecovery({
      doctorState: 'RECOVERED_DOCUMENT_PRESENT',
      ambiguousTransactions: [],
      recoveredDocuments: ['target [Recovered].ai'],
    });
    expect(plan.blockMutationRetry).toBe(true);
    expect(plan.actions[0]).toContain('known edit');
    expect(plan.actions.join(' ')).toContain('backup');
  });

  test('reopens the last confirmed save when Illustrator has no documents', () => {
    const plan = planRecovery({
      doctorState: 'RESPONSIVE_NO_DOCUMENTS',
      ambiguousTransactions: [],
      recoveredDocuments: [],
    });
    expect(plan.actions).toContain('Reopen the last confirmed saved working file and re-inspect it.');
  });
});
