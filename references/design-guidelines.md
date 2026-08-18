# Working under a brand design guideline

Review feedback is not random taste. Franchise and brand work is usually judged against a
published design guideline, and most "subjective" rejections are violations of a rule that
was written down all along. Finding that document changes review from guessing to checking.

## Find the guideline before the first round

Before designing or auditing branded material, ask whether an official guideline exists and
fetch it. Encode its rules into the audit checklist for the session. Do this at the start:
discovering the guideline after a rejection converts avoidable rounds into rework.

For 武田塾 print work the public guideline is https://suneight.design/takedaguide/
(re-check the page each project; the summary below reflects its state as of 2026-08).

## Takeda guideline checklist (encoded)

Colour — compose from the three base colours only:

- black K100 (#231815);
- red M100 Y100 (#c11920; the irregular variant #e60012 only where already in use);
- white #ffffff.

Type:

- gothic or mincho families; Hiragino ゴシック/明朝 on Mac;
- no outlines/フチ and no drop shadows on text — flat design;
- avoid overly thin weights, especially at small sizes;
- never change glyph aspect ratio (this is also a hard audit item elsewhere in this skill).

Layout:

- text must sit on consistent vertical/horizontal grid lines — misaligned grids are an
  explicitly named rejection reason;
- leave real margin relative to the ad area; dense, margin-free layouts are rejected;
- background art must not be visibly displaced from its designed position.

Content conventions:

- addresses and phone numbers in half-width alphanumerics (this coexists with the
  full-width wave-dash rule for time ranges — the two rules cover different characters);
- 「無料受験相談受付中」 on a white background: red frame, red text;
- logos only from official assets, aspect ratio untouched, and the registered
  「日本初！授業はしない。」 stays attached;
- brand characters: printed material, signage and SNS cover images only — no ratio change,
  no composites, no added speech bubbles, no drawing over faces.

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
line ended at a round number instead of reaching the address baseline, and station-walk
frames were sized by feel. The rule:

1. find what the element aligned to in the approved original — an ink edge, a shared axis,
   a partner element on the other column;
2. derive every coordinate of the restored element from those named anchors;
3. record the anchor in the verification report ("divider bottom = 中山 address ink bottom
   86.85"), so the next round can re-check the relationship instead of the number.

If no anchor exists, that is a design decision — propose one and say so, rather than
silently inventing a value that reads as "適当" to a reviewer.
