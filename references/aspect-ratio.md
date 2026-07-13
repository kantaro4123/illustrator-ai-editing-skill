# Aspect-ratio restoration

## Evidence before correction

A reported “82%” or “83.3%” does not identify the compressed axis. Accept one of:

- live-text `horizontalScale` or `verticalScale` inspection;
- before/after width and height evidence with one stable dimension;
- at least three square-glyph ratios compared with at least three 100/100 outlined samples.

Reject conflicting metadata and geometry. A single glyph is insufficient because typeface
design, stroke shape, and punctuation can distort width/height measurements.

## Live text

Set only the confirmed scale axis back to 100, set the other to 100 only when inspection shows
it is also distorted, and restore the explicitly stated point size. Preserve an intentional
anchor: left, center, or bottom. Re-check style runs and area overflow.

Do not “preserve width” by reducing point size when the user requires a specific size. If the
restored text no longer fits, adjust container width, adjacent spacing, or section layout.

## Outlined text

Outlined glyphs have no `horizontalScale` property. If they were horizontally compressed to
`p%`, apply `10000 / p` percent horizontally and 100 vertically. Reverse the axes only when
vertical compression is confirmed. Use a stable anchor and compare the corrected glyph ratios
to the 100/100 reference median.

For `83.3%`, the inverse is approximately `120.048%`; use the exact calculation rather than a
rounded visual guess.

## Verification

Record pre/post bounds, confirmed axis evidence, point size for live text, median glyph ratios
for outlines, anchor displacement, and a shared crop. Then inspect the wider section because
restored width can collide with labels, dividers, or parentheses.
