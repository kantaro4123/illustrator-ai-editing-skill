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

## Equal container gaps are not equal visual gaps

Where a family sizes its text containers by a line-count rule, the slack below the last line
grows with the line count. Set the container gaps to one uniform number and the *visible* gaps
come out uneven, by exactly the difference in that slack. One column with sections of 2, 4, 5 and
2 lines had container gaps identical to 0.01pt and ink gaps of 23.04 / 24.96 / 25.92 — a 2.88pt
spread a reviewer reads as sloppy rhythm.

An approved sibling can hide this: if its sections happen to have similar line counts, its
uniform container gaps also produce uniform ink gaps, and the rule looks like it works.

Equalise the ink gaps instead, and solve for the shifts rather than nudging:

```
target gap  G = (sum of current ink gaps) / n
shift of section i = Σ (G - gap_j) for j < i
```

Work from whichever end is pinned by an alignment constraint. When the last section's bottom is
fixed to a neighbouring graphic, that section's computed shift comes out at zero — a useful check
that the arithmetic is right, and it keeps the alignment you already earned.

## A near miss reads worse than an obvious offset

Two column heads 12pt apart read as a deliberate stagger. The same two heads 2.88pt apart read as
an alignment someone attempted and missed. Ambiguity is the defect, so resolve it in one
direction or the other: align exactly, or separate far enough that the offset is legible as
intent. Check the option you prefer against the space it needs — restoring a sibling's 12pt
stagger is not available if the lower block has an extra line and would then overrun its band.

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
