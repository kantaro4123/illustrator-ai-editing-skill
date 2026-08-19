# Measuring from a photograph of a printed reference

When the source file is lost, the only reference is a phone photo of the printed piece.
That photo is not a scan: the sheet is tilted, often folded, and lit unevenly. Sizes read
off it drove two wrong decisions in real use, so treat measurement here as its own task
with its own discipline.

## Prefer the measurement that assumes least

Two ways to get a size out of such a photo:

- **Rectify then measure.** Pick the sheet's four corners, perspective-transform to the
  trim rectangle, then read coordinates. This assumes the corner picks are exact *and* that
  the sheet is planar.
- **Compare within one scanline.** For a single row of pixels, find the sheet's own left
  and right edges and the text's ink extent, then take the ratio. Perspective is linear
  along one row, so this needs no rectification and no corner picks.

The second is almost always right and the first is almost always tempting. In the case that
went wrong, rectification said a headline was 45.5pt; the single-row ratio said 51.7pt, and
51.7 was correct. The corner picks had landed *inside* the sheet on the left, so the
rectified image magnified the reference and made the reproduction look too large by
comparison. A fold also stretched the vertical scale by a further ~12%, varying with height.

```python
# ratio = title width / sheet width, measured on the same row
sheet = np.where(is_sheet_colour(row))[0]
ink   = np.where(is_text_colour(row))[0]
size_pt = (ink.max() - ink.min()) / (sheet.max() - sheet.min()) * TRIM_WIDTH_PT / n_chars
```

Scan a band of rows and take the **widest** result: that row is the one crossing the full
line. Exclude rows crossing other artwork — a white callout on a coloured arrow will extend
the "text" extent and inflate the answer.

## Validate the method before trusting the number

Both files share boilerplate — footer, address block, a bordered box. Measure one of those
**known-identical** elements in the reference and compare it with its true value in your own
file. If the measured value does not reproduce the known one, the method is wrong and every
other number it produced is wrong too. That single check would have caught the rectification
error immediately.

## Horizontal survives a fold; vertical does not

A sheet folded across its width foreshortens vertically while leaving horizontal scale
almost intact. So:

- derive **type sizes** from horizontal measurements (line width ÷ character count);
- do **not** derive vertical positions from the photo. Set them from layout reasoning —
  fill the band, keep the approved gaps — and confirm by eye against the reference.

Character counts must be in em, not glyphs: half-width digits and Latin letters advance
about half a full-width character, so `2025` is 2 em, not 4.

## When the user contradicts your measurement, they are holding the artefact

A measurement from a photo is an inference. The person asking has the printed sheet in
their hand. If they say the headline looks smaller than the original, that outranks a
derived number — especially after any earlier size mistake in the same session. Re-measure
with the least-assuming method rather than defending the figure.

## Do not iterate on a broken method

The wrong answer above was reached by refining the rectification repeatedly: recomputing
calibrations, trying more reference points, each time getting a slightly different and still
wrong number. Contradictory results from one method are the signal to change methods, not to
add another correction term. Stop when two attempts disagree and ask which assumption is
unverified.
