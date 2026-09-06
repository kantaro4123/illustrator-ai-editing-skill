# Measuring from the render

Bounds answer "where does Illustrator think this object is". Review feedback is about
"where does the ink appear". Those are different numbers, and on real production files they
differ by enough to fail review. When an edit is specified against a **visual** edge — align to
the logo, align to the photo, close the gap under that line — measure the rendered pixels.

## Bounds lie, in three separate ways

Each of these was measured on a production flyer, and each would have produced a wrong edit
if trusted:

| Object | Bounds said | Ink actually was | Cause |
|---|---|---|---|
| Logo group | `visibleBounds` bottom 185.3 | 229.7 | an invisible member inflated the group box by 44pt |
| Photo | raster bounds bottom 549.8 | 566.9 | the raster is clipped; 17pt of it never renders |
| Two-line headline | `geometricBounds` bottom 724.6 | — | `inkBounds()` returned 747.8: it described **line 1 only** |

So: `visibleBounds` is not "what you can see" — an empty or fully transparent member still
counts. A clipped raster reports its pre-clip extent. And `inkBounds()` is reliable for a single
line, not for a multi-line frame.

A quick smell test that catches the first two: if an object's reported bottom sits *below* an
element it visibly does not touch — a band edge, a footer, a rule — the bounds include something
that does not render. Stop and measure pixels.

## The render is the PDF page, not the artboard

`render` rasterizes the document's PDF page. That page normally carries bleed, so it is larger
than the artboard and the artboard is inset within it. Derive the inset rather than assuming the
image starts at the artboard corner:

```python
page_w, page_h = image_px_w * 72 / dpi, image_px_h * 72 / dpi
ox, oy = (page_w - artboard_w) / 2, (page_h - artboard_h) / 2
px_x = (doc_x - artboard_left + ox) * dpi / 72
px_y = (artboard_top - doc_y + oy) * dpi / 72
```

If `crop` reports a rectangle is outside the rendered page for coordinates you know sit inside
the artboard, that inset is why. Derive the offset and crop with an external tool for that
measurement; keep using `crop` for the shared-detail views its metadata binding protects.

At 150 dpi one pixel is 0.48pt. Treat a residual smaller than one pixel as aligned, and do not
report more precision than the render resolution supports.

## Reading ink out of the render

Pick the test from the ground, not by habit: dark ink on a light ground is a low-luminance test,
white ink on a dark band is a high-luminance test. State which one applies before you measure.

Require two or more qualifying pixels in a row before counting the row as ink. One pixel is
usually an antialiased edge or a compression artifact.

**Guard the search window.** A band edge, a rule, a footer, or a background transition inside the
window is detected as ink and silently becomes your answer. Two measurements in one session
returned exactly the window boundary — both were the band edge, not the object. So:

- stop the window short of any known boundary;
- if the result lands on the window edge, treat it as invalid and re-measure with a shorter window.

**Name the ink threshold, and make it tight.** A dark-red gradient band (RGB ≈ 98/17/20) passes a
`< 150` "black" test and was read as the bottom of a black text block, misplacing the whole
footer by 8pt. Dark ink on white should be tested at something like `< 80` on all three
channels; if a non-black colour sits anywhere in the window, exclude it explicitly.

## Row profiling beats frame bounds for stacked text

To learn where lines and sections actually sit, scan rows across the column and record the
contiguous ink blocks. This yields real line positions and real inter-block gaps, which frame
bounds cannot: text frames carry ascent/descent padding, adjacent frames' boxes overlap even
when the glyphs do not, and a container sized for its old copy tells you nothing about the new.

The profile is also the fastest way to answer "how much headroom do I have" before a move —
the gap between the block above and the block you intend to raise.

**Isolate the line before you profile it.** Two stacked lines of small type overlap vertically:
the second line's ascenders reach up past the first line's baseline. A window drawn from the
first line's frame top to the second line's frame top therefore contains both, and the leftmost
ink it reports belongs to whichever glyph starts further left. On a 5.5pt label pair this read a
1.20pt misalignment as 0.48pt — the window had picked up the top of the 月 below — and the
"fix" derived from it left two thirds of the defect in place. Scan the row profile first, note
the ink bands, and measure each line inside its own band with a margin of at least one glyph
height's tenth at both ends.

## What a reviewer means by "align to X"

The lowest **ink** of X, not its box. Before moving anything, produce both numbers:

```
reference edge (ink)  229.70
target edge   (ink)   225.86   → 3.84pt over
```

Then derive the move from that difference. Verify by re-measuring the same two numbers on the
new render and reporting the residual, not by declaring the edit applied.

## Verify a move by re-measuring, not by trusting the delta

A translate can be reported as successful while the visual relationship is still wrong, because
the number you moved by came from the wrong measurement. The after-render measurement is the
evidence. Include the before/after pair in the report:

```
before  reference 229.70 / target 225.86  → -3.84pt
after   reference 229.70 / target 229.70  → +0.00pt
```

The commonest way this goes wrong is not a bad magnitude but a **flipped sign**. Illustrator's
y axis increases upward while every render measurement counts downward, so "raise it" and a
positive `dy` agree in one frame and disagree in the other. A sign error is invisible in the
edit result — the move reports success with the magnitude you asked for — and it does not merely
fail to fix the gap, it doubles it: a 2.88pt misalignment moved the wrong way measured 5.76pt
afterwards. That doubling is the signature; if a residual comes back at exactly twice the
original offset, you moved the right amount the wrong way.

Only the after-measurement catches it, which is why re-measuring is a gate and not a courtesy.
