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
