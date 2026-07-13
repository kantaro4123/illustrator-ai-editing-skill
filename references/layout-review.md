# Layout and review

## Measure relationships

Translate review language into explicit relationships: equal gaps, aligned ink edges, centered
groups, preserved margins, or collision-free containers. Capture the relevant bounds before
moving anything.

When a section has drifted, restore or move it as a rigid unit. Repeated individual nudges
destroy internal rhythm and make later review harder.

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
