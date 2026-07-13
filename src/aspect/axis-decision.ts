import { IllustratorError } from '../contracts/errors.js';

export type AspectAxis = 'horizontal' | 'vertical' | 'none';

export interface AspectEvidenceInput {
  horizontalScale?: number;
  verticalScale?: number;
  glyphRatios?: number[];
  referenceGlyphRatios?: number[];
  explicitAxis?: Exclude<AspectAxis, 'none'>;
  statedPointSize?: number;
}

export interface AspectDecision {
  axis: AspectAxis;
  evidence: 'character-scale' | 'glyph-median' | 'explicit';
  preservePointSize?: number;
  observedRatio?: number;
}

function median(values: number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middle]!
    : (ordered[middle - 1]! + ordered[middle]!) / 2;
}

function ambiguous(message: string): never {
  throw new IllustratorError({
    code: 'AMBIGUOUS_ASPECT_AXIS',
    message,
    recoverable: true,
    safeToRetry: false,
    nextAction: 'Measure multiple square glyphs against a temporary 100/100 reference and confirm the axis.',
  });
}

function conflict(explicitAxis: string, measuredAxis: string): never {
  throw new IllustratorError({
    code: 'ASPECT_AXIS_CONFLICT',
    message: `Explicit ${explicitAxis} axis conflicts with measured ${measuredAxis} distortion.`,
    recoverable: true,
    safeToRetry: false,
    nextAction: 'Stop and inspect the glyph measurements; do not apply inverse scaling.',
  });
}

export function decideAspectAxis(input: AspectEvidenceInput): AspectDecision {
  let measuredAxis: AspectAxis | undefined;
  let evidence: AspectDecision['evidence'] | undefined;
  let observedRatio: number | undefined;

  if (input.horizontalScale !== undefined || input.verticalScale !== undefined) {
    if (input.horizontalScale === undefined || input.verticalScale === undefined) {
      ambiguous('Both horizontalScale and verticalScale are required.');
    }
    const horizontalChanged = Math.abs(input.horizontalScale - 100) > 0.5;
    const verticalChanged = Math.abs(input.verticalScale - 100) > 0.5;
    if (horizontalChanged && verticalChanged) {
      ambiguous('Both character scale axes are distorted.');
    }
    measuredAxis = horizontalChanged ? 'horizontal' : verticalChanged ? 'vertical' : 'none';
    evidence = 'character-scale';
  } else if (input.glyphRatios || input.referenceGlyphRatios) {
    if (
      !input.glyphRatios
      || !input.referenceGlyphRatios
      || input.glyphRatios.length < 3
      || input.referenceGlyphRatios.length < 3
    ) {
      ambiguous('At least three target and three reference glyph measurements are required.');
    }
    observedRatio = median(input.glyphRatios) / median(input.referenceGlyphRatios);
    measuredAxis = observedRatio < 0.92 ? 'horizontal' : observedRatio > 1.08 ? 'vertical' : 'none';
    evidence = 'glyph-median';
  }

  if (input.explicitAxis && measuredAxis && measuredAxis !== 'none' && measuredAxis !== input.explicitAxis) {
    conflict(input.explicitAxis, measuredAxis);
  }
  if (!measuredAxis && input.explicitAxis) {
    measuredAxis = input.explicitAxis;
    evidence = 'explicit';
  }
  if (!measuredAxis || !evidence) ambiguous('No reliable aspect-ratio axis evidence was supplied.');

  const decision: AspectDecision = { axis: measuredAxis, evidence };
  if (input.statedPointSize !== undefined) decision.preservePointSize = input.statedPointSize;
  if (observedRatio !== undefined) decision.observedRatio = observedRatio;
  return decision;
}
