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

export function classifyDoctorState(probe: DoctorProbe): DoctorState {
  if (!probe.processRunning) return 'NOT_RUNNING';
  if (!probe.responsive) return 'MODAL_OR_UNRESPONSIVE';
  if (probe.documents.some((document) => document.name.toLowerCase().includes('[recovered]'))) {
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
