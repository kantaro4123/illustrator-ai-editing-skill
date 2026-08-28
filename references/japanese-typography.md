# Japanese typography

## Preserve runs and meaning

Inspect each frame's character runs before editing. Replace only the intended ranges from
back to front. Preserve font, weight, point size, tracking, leading, baseline shift, and
horizontal/vertical scale unless the review explicitly changes them.

Normalize wave dash deliberately: convert ASCII tilde or U+301C only when the design requires
full-width U+FF5E. Do not globally normalize customer copy without instruction.

## Kinsoku and no-break

For Japanese area text, use the verified Illustrator values:

- `Justification.FULLJUSTIFYLASTLINELEFT` when full justification with a left final line is intended;
- `paragraph.kinsoku = "Hard"`;
- `paragraph.kinsokuOrder = KinsokuOrderEnum.PUSHIN`;
- `paragraph.kurikaeshiMojiShori = true`.

Apply `noBreak` to meaningful multi-character katakana or digit runs, not indiscriminately to
the whole paragraph. Re-check overflow and line endings after every change.

## Visual alignment

Japanese font frames carry invisible ascent/descent padding. Align glyph ink, not frame boxes.
Compare a duplicate outline's bounds, then confirm with equal-DPI crops spanning the same rows.

For hyphen-like marks that sit optically low, a controlled baseline shift based on the current
run size is safer than moving the whole frame. Confirm neighboring punctuation and line height.

## Tight tracking collides per glyph pair, not per run

Display numerals are often squeezed with heavy negative tracking to fit a badge or an arrow.
That value is a property of the run, but whether it *collides* is a property of the two glyph
shapes that meet. A run at −72 can be clean for most pairs and touch for a few: a numeral whose
upper-left stroke reaches back — `4` is the usual offender — closes the gap after a round-bottomed
`5` or `6` while `0`, `1` and `.` stay clear.

So when a reviewer names specific characters ("open up the 6 and the 4"), fix that pair, not the
run. Set tracking on the **first character of the pair** — tracking applies to the space after
the character — and leave the rest of the run at its reviewed value:

```javascript
var index = String(frame.contents).indexOf("64");
frame.textRange.characters[index].characterAttributes.tracking = 0;
```

Confirm the run value before widening it globally. If an approved sibling file carries the same
tracking on the same run and was not flagged, the run value is fine and only this pair needs
relief. Removing the negative tracking entirely for that one pair restores the font's designed
spacing, which is usually the right amount for "open it up a little".

Re-measure the frame width afterwards: the pair opens by `tracking_delta / 1000 × size`, and on
rotated badge text the bounding box grows on both axes.

## Reception-hours pattern

When a label and time must sit within separate outline parentheses:

1. measure the parenthesis group's ink bounds;
2. add tracking between the terminal `3` and `0` in `21：30` at the character level;
3. center the time frame by ink bounds inside the parentheses;
4. align the label optically to the parenthesis top;
5. render a tight crop and a wider footer crop;
6. verify no collision after font-weight changes.

Do not squeeze the entire line horizontally to make it fit unless the review explicitly asks
for condensed typography. Layout adjustment is preferable to altered aspect ratio.
