export function buildDoctorAppleScript(timeoutSeconds: number): string {
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds <= 0) {
    throw new Error('timeoutSeconds must be a positive integer');
  }
  return [
    `with timeout of ${timeoutSeconds} seconds`,
    'tell application "Adobe Illustrator"',
    'set documentCount to count of documents',
    'set outputText to "DOCUMENTS=" & documentCount',
    'repeat with currentDocument in documents',
    'set documentPath to ""',
    'try',
    'set documentPath to POSIX path of (full name of currentDocument)',
    'end try',
    'set outputText to outputText & linefeed & (name of currentDocument) & tab & documentPath',
    'end repeat',
    'return outputText',
    'end tell',
    'end timeout',
    '',
  ].join('\n');
}
