import type { DoctorState } from './doctor.js';

export interface RecoveryInput {
  doctorState: DoctorState;
  ambiguousTransactions: string[];
  recoveredDocuments: string[];
}

export interface RecoveryPlan {
  blockMutationRetry: boolean;
  actions: string[];
}

export function planRecovery(input: RecoveryInput): RecoveryPlan {
  const actions: string[] = [];
  let blockMutationRetry = input.ambiguousTransactions.length > 0;

  if (input.recoveredDocuments.length > 0 || input.doctorState === 'RECOVERED_DOCUMENT_PRESENT') {
    blockMutationRetry = true;
    actions.push('Verify a known edit in each recovered document before choosing the working copy.');
    actions.push('Create a backup of the current disk working file, then save the verified recovered document to the exact target.');
  }
  if (input.ambiguousTransactions.length > 0) {
    actions.push('Inspect each preserved transaction sidecar and lock before any new mutation.');
  }
  if (input.doctorState === 'MODAL_OR_UNRESPONSIVE') {
    actions.push('Inspect Illustrator for a modal recovery dialog and ask the user to dismiss it if necessary.');
  }
  if (input.doctorState === 'RESPONSIVE_NO_DOCUMENTS') {
    actions.push('Reopen the last confirmed saved working file and re-inspect it.');
  }
  if (input.doctorState === 'NOT_RUNNING') {
    actions.push('Launch Illustrator, reopen the last confirmed saved working file, and re-inspect it.');
  }
  if (actions.length === 0) actions.push('Run a fresh read-only inspection before the next mutation.');
  return { blockMutationRetry, actions };
}
