export type DoctorState =
  | 'NOT_RUNNING'
  | 'RESPONSIVE_NO_DOCUMENTS'
  | 'RESPONSIVE_TARGET_OPEN'
  | 'RESPONSIVE_WRONG_DOCUMENT'
  | 'MODAL_OR_UNRESPONSIVE'
  | 'RECOVERED_DOCUMENT_PRESENT'
  | 'RESPONSIVE_DOCUMENTS_OPEN';

export interface DoctorProbe {
  processRunning: boolean;
  responsive: boolean;
  targetPath?: string;
  documents: Array<{ name: string; path: string }>;
}

/**
 * Illustrator titles an auto-recovered document with a "[Recovered]" suffix.
 * Localized builds may use a translated suffix, so a negative result is not
 * proof that no recovered document is open.
 */
export function isRecoveredDocumentName(name: string): boolean {
  return name.toLowerCase().includes('[recovered]');
}

export function classifyDoctorState(probe: DoctorProbe): DoctorState {
  if (!probe.processRunning) return 'NOT_RUNNING';
  if (!probe.responsive) return 'MODAL_OR_UNRESPONSIVE';
  if (probe.documents.some((document) => isRecoveredDocumentName(document.name))) {
    return 'RECOVERED_DOCUMENT_PRESENT';
  }
  if (probe.documents.length === 0) return 'RESPONSIVE_NO_DOCUMENTS';
  if (probe.targetPath) {
    return probe.documents.some((document) => document.path === probe.targetPath)
      ? 'RESPONSIVE_TARGET_OPEN'
      : 'RESPONSIVE_WRONG_DOCUMENT';
  }
  return 'RESPONSIVE_DOCUMENTS_OPEN';
}
