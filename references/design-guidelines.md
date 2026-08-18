# Working under a brand design guideline

Review feedback is not random taste. Franchise, agency and in-house brand work is usually
judged against a published design guideline, and most "subjective" rejections are violations
of a rule that was written down all along. Finding that document turns review from guessing
into checking.

## Find the guideline before the first round

Before designing or auditing branded material, ask whether an official guideline exists and
fetch it. Do this at the start of the project: discovering the guideline only after a
rejection converts avoidable rounds into rework.

Then write the rules down as a project-local checklist. Keep it out of this repository — a
client's brand rules, asset names and internal phrasing belong in the operator's own working
notes, not in a shared skill. A gitignored `references/local-*.md` beside this file is picked
up by the skill on that machine and never published.

## What such a guideline typically constrains

Use this as the shape of the checklist to build, then fill it from the actual document:

- **Colour** — an exact, small palette given in CMYK/hex, and a rule against introducing
  further colours.
- **Type** — permitted families and weights, a floor on weight/size, and usually a ban on
  outlines and drop shadows on text.
- **Glyph geometry** — aspect ratio locked at 100/100. This is nearly universal and is also
  a hard audit item elsewhere in this skill.
- **Grid** — text aligned to consistent vertical and horizontal lines. Misaligned grids are
  a commonly named rejection reason and are easy to miss without measuring shared axes.
- **Density** — a required margin relative to the ad area; dense, margin-free layouts get
  rejected even when nothing overflows.
- **Character width** — which fields take half-width alphanumerics (addresses, phone
  numbers) versus where full-width forms are required (often time ranges and their wave
  dash). These two rules coexist and cover different characters; do not normalize globally.
- **Fixed phrases and marks** — wording that must appear verbatim, with prescribed colour
  and framing, plus logo and character-asset rules (official files only, ratio untouched,
  no composites or overdrawing).

## Mechanical checks are not the whole review

An audit can pass every machine-verifiable item and still fail review. Track two lists and
report them separately:

- **mechanical** — overflow, 100/100 scale, minimum type size, tilde form, colour mode,
  embedded images, margin minimums: each is true or false, and passing them proves only
  that nothing is broken;
- **judgment** — grid alignment, spacing proportions, weight contrast, derived geometry:
  each needs a measured value compared against a design-derived threshold, not a boolean.

Declaring "this will pass review" on mechanical evidence alone is the precise mistake that
produced a rejection here. Judgment items must be measured too — they are just measured
against ratios and anchors instead of fixed constants.

## Evaluate spacing in em and against internal rhythm

A gap in points means nothing without the type it separates. Two rules that would have
caught a real rejection (8pt body, 14pt leading, 2.9pt heading gap):

- express block separation in em of the following text: 2.9pt over 8pt type is 0.36em,
  visibly cramped; the accepted fix was 5.9pt ≈ 0.74em;
- the gap *between* a heading and its body must exceed the gap *inside* the body
  (leading − size). Here the internal line gap was 6pt while the heading gap was 2.9pt,
  so the heading read as closer to nothing than to its own text. After the fix: 5.9pt
  outside vs 5pt inside — grouping reads correctly.

When asked to widen such a gap "by tightening the body leading", measure first-baseline
behaviour before assuming: in production files the first line often does not move when
leading changes. Create the gap by moving the frame; use the leading change to keep the
block's bottom edge where the reviewer already accepted it.

## Restored elements inherit their geometry from anchors

Twice, an element recreated during editing was rejected for eyeballed geometry: a divider
rule ended at a round number instead of reaching the adjacent text baseline, and a set of
label frames was sized by feel. The rule:

1. find what the element aligned to in the approved original — an ink edge, a shared axis,
   a partner element in the opposite column;
2. derive every coordinate of the restored element from those named anchors;
3. record the anchor in the verification report ("divider bottom = right-column address ink
   bottom 86.85"), so the next round can re-check the relationship, not the number.

If no anchor exists, that is a design decision — propose one and say so, rather than
silently inventing a value that a reviewer will read as arbitrary.
