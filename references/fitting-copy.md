# Fitting supplied copy into a fixed area

Client copy arrives at whatever length it arrives. The area it must sit in is fixed by an
approved layout. This reference is the workflow for resolving that conflict.

## Copy is a constraint, not a variable

Do not paraphrase, condense, or trim supplied text to make it fit. A testimonial, a quote, or
any words attributed to a person are that person's; editing them to solve a layout problem
misrepresents them and is not yours to do. Offering a summary was refused outright in real
use, correctly.

The variables you may move are, in order of preference:

1. type size and leading within the block;
2. the block's own geometry (frame height, section spacing);
3. the layout (where the block sits), if the layout is not itself approved;
4. asking the copy's owner for a shorter version.

Fix obvious transcription damage — OCR artifacts, a wrong homophone, an inconsistent
separator — and report every such change explicitly with the before and after. That is
correcting a transmission error, not rewriting the author.

## Measure capacity; never estimate it

Two a-priori models were wrong in the same task, in opposite directions:

- `chars per line = width / size` overestimates, because kinsoku pushes characters down;
- applying a 0.95 penalty for kinsoku *under*estimates, because full justification with
  punctuation compression packs roughly **7% more** than nominal — measured 48 characters
  per line where the nominal figure was 44.8.

Both errors were large enough to change the chosen type size. The fix is to stop predicting:
flow the real text into the real frame, give the frame a temporary oversize height so nothing
overflows, and read `frame.lines.length`.

## Sweep candidate sizes in one transaction

Each Illustrator round-trip is expensive, so test every candidate inside one script: set
size and leading, read `lines.length`, compute the resulting height, and record it. Then pick
the largest size that still clears the required margin, apply it, and return the table.

```javascript
var candidates = [6.0, 6.25, 6.4, 6.5, 6.75, 7.0];
var trials = [];
for (var c = 0; c < candidates.length; c++) {
  var size = candidates[c], lead = size * APPROVED_LEADING_RATIO;
  var counts = [];
  for (var i = 0; i < uuids.length; i++) {
    var f = findPageItemByUuid(doc, uuids[i]);
    f.textRange.characterAttributes.size = size;
    f.textRange.characterAttributes.leading = lead;
    counts.push(f.lines.length);
  }
  var bodies = 0;
  for (var k = 0; k < counts.length; k++) bodies += (counts[k] - 1) * lead + 0.95 * size;
  trials.push({ size: size, lines: counts, clearance: (TOP - bodies - FIXED) - BAND });
}
```

Keep the leading *ratio* from the approved file rather than its absolute value: the reviewer
approved a relationship, and the ratio is what survives a size change.

## Budget the space before choosing

Write the fixed elements down and subtract them, so the number you are solving for is only
the body:

```
section span      = first heading top - next band top
fixed per section = heading height + heading-to-body gap
fixed total       = n * fixed per section + (n-1) * inter-section gap + bottom clearance
body budget       = section span - fixed total
```

Last-line height is about `0.95 * size`, so a block of `n` lines occupies
`(n - 1) * leading + 0.95 * size`. Verify against measured ink bounds afterwards, not against
frame bounds.

## Fit a single line to a width by size, never by scale

When a headline must not cross a right edge, iterate: measure the ink width, scale the size by
`available / actual`, re-measure, repeat twice. Two passes converge because width is nearly
linear in size.

Never reach for `horizontalScale` — it is the exact defect reviewers flag, and it is banned
outright by most brand guidelines.

## Compare alternatives numerically before proposing one

A second layout looked like it would buy a much larger type size. Costed out, it bought
0.25pt and required shrinking a brand logo and a bordered box by 15%. That comparison — one
short calculation — turned a hard-looking judgement call into an obvious one. Do the
arithmetic before presenting options, and present the numbers with them.

## Verify after fitting

- every frame reports `overflow === false`;
- line counts match the ones the sweep chose;
- ink bottom to the next boundary meets the clearance you budgeted;
- the heading-to-body and inter-section gaps still equal the approved values;
- render and read the block at normal size.
