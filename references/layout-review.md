# Layout and review

## Measure relationships

Translate review language into explicit relationships: equal gaps, aligned ink edges, centered
groups, preserved margins, or collision-free containers. Capture the relevant bounds before
moving anything.

When a section has drifted, restore or move it as a rigid unit. Repeated individual nudges
destroy internal rhythm and make later review harder.

## Reviewer instructions encode a measurement

Feedback often pairs a qualitative move with an alignment target: "tighten the gaps between the
interviews a little, and line the last one up with the logo". The second clause is the
specification; the first is only the mechanism. The target fixes the amount, the phrase tells
you where to take it from.

Measure before judging the instruction. A pairing that reads as contradictory usually is not:
three gaps of 17.6pt, with the final section sitting 3.84pt past the target edge, resolves to
1.28pt off each gap. "A little" was accurate — computing it was not the reviewer's job.

If after measuring the two clauses genuinely cannot both hold — the mechanism moves the target
the wrong way, or the required move collides with fixed artwork — report the numbers and ask.
Do not silently satisfy one clause and drop the other.

## An approved sibling settles which object is wrong

When a shared element has drifted, the same element in an already-approved file from the same
family is the reference. It supplies the correct value *and* identifies which of two misaligned
objects moved: the one that disagrees with the sibling. A 1.5pt left-edge drift between a label
and the line beneath it is invisible in isolation and unmistakable against a sibling that has
them flush.

The sibling also bounds what counts as a defect. If a value the reviewer flagged here is
identical in an approved sibling they did not flag, that value is not the problem — look for
what else differs, usually the specific content it is applied to.

## Spacing

For stacked sections, choose a trusted gap from an accepted neighboring pair. Sort objects by
top position, compute ink-to-ink or visible-bounds gaps consistently, and move downstream
sections by one delta. Do not mix frame bounds for one gap with ink bounds for another.

For a request such as “add the same space below the final line,” compare the target section's
final ink bottom to its next boundary with equivalent accepted sections. Moving the heading and
all following content together can preserve internal layout when the intended change is section
separation.

## Whole-section gate

After every local change, inspect:

- shared left/right/center axes;
- repeated type sizes and weights;
- optical rather than mathematical gaps;
- symmetry of brackets, rules, buttons, and paired labels;
- collisions and near-collisions;
- section bottom margin and page balance;
- unintended movement outside the target group.

Then inspect the full page at normal reading scale. A tight crop catches glyph defects; it
cannot reveal whether the section now feels too heavy or too low on the page.

## Comparison artifacts

Use the same renderer, DPI, page, and crop coordinates for before/after. An average overlay
shows displacement; a difference image highlights every changed pixel. Expected differences
must map to the edit plan. Unexpected distant differences require investigation before save.
