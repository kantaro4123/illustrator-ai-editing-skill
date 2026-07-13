import { describe, expect, test } from 'vitest';
import { classifyDoctorState } from '../../src/commands/doctor.js';
import { buildDoctorAppleScript } from '../../src/platform/macos.js';

describe('Illustrator doctor diagnosis', () => {
  test.each([
    [{ processRunning: false, responsive: false, documents: [] }, 'NOT_RUNNING'],
    [{ processRunning: true, responsive: true, documents: [] }, 'RESPONSIVE_NO_DOCUMENTS'],
    [
      {
        processRunning: true,
        responsive: true,
        targetPath: '/制作/target.ai',
        documents: [{ name: 'target.ai', path: '/制作/target.ai' }],
      },
      'RESPONSIVE_TARGET_OPEN',
    ],
    [
      {
        processRunning: true,
        responsive: true,
        targetPath: '/制作/target.ai',
        documents: [{ name: 'other.ai', path: '/制作/other.ai' }],
      },
      'RESPONSIVE_WRONG_DOCUMENT',
    ],
    [{ processRunning: true, responsive: false, documents: [] }, 'MODAL_OR_UNRESPONSIVE'],
    [
      {
        processRunning: true,
        responsive: true,
        documents: [{ name: 'target [Recovered].ai', path: '' }],
      },
      'RECOVERED_DOCUMENT_PRESENT',
    ],
  ])('classifies probe %j as %s', (probe, expected) => {
    expect(classifyDoctorState(probe)).toBe(expected);
  });

  test('builds a bounded read-only AppleScript without GUI clicks', () => {
    const source = buildDoctorAppleScript(30);
    expect(source).toContain('with timeout of 30 seconds');
    expect(source).toContain('count of documents');
    expect(source).toContain('full name');
    expect(source).not.toMatch(/click|keystroke/i);
  });
});
