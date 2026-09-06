# Pre-submission audit

A deliverable can satisfy every line of the brief and still come back from review, because
reviewers flag geometry the brief never mentioned. Audit before sending, and audit against a
number rather than an impression.

## Look at it before you measure it

A geometry sweep that passes says nothing about proportion. A two-school footer once cleared
every alignment metric in this file — column heads 0.00, shared left axes 0.00, no overflow,
clearances all positive — and was rejected on sight, because the school name was set at 20pt in
a family whose approved siblings and the blank template both use ~40pt, the phone at 11pt against
16.5pt, and a decorative bracket at 1.4× the sibling's. Every relationship was aligned; every
size was wrong. Alignment audits cannot see that, and neither can a report that was written
from the numbers without opening the render.

So the audit starts with the eye, not the ruler:

1. Render the deliverable and the nearest approved sibling at the same dpi, crop the same
   region, and put them one above the other in one image. Look at the pair at reading scale.
2. Compare the **type-size hierarchy** element by element: heading, sub-label, phone, fine
   print, address, CTA. Read the sibling's sizes off `inspect` and put them beside yours in the
   table. A size that differs from the family's by more than roughly 15% without a stated reason
   is a finding, even when the element is perfectly aligned.
3. Only then run the sweep below.

Do not send a report on a layout you have not looked at. If the render was never opened in
this session, the work is not verified.

## The standard is the approved sibling, not an ideal

For each metric, produce two values: this file, and the same metric on an already-approved file
from the same family. Anything worse than the sibling is a finding; anything equal or better is
defensible, even when it is not perfect. This keeps the audit honest in both directions — it
stops you shipping a regression, and it stops you burning a session chasing a tolerance the
family never held.

Report it as a table, because the comparison is the argument:

```
metric                          this file   approved   verdict
section gap spread (ink)           0.48        0.48     equal
upper-band left-edge spread        0.00        0.48     better
body left-edge spread              1.44        1.92     better
last section bottom vs logo        0.00        0.48     better
```

An approved sibling also tells you what is *not* a defect. A value the reviewer flagged on one
file and left alone on another is not the defect by itself — look for what differs in the
content it is applied to.

## One sibling is a point; several are a band

A single approved file gives you one measurement, and one measurement cannot distinguish a
requirement from a coincidence. Read a rule off it and you will over-tighten: a reviewer's
instruction to "line this up with the logo" produced an exactly-zero offset on one file, which
looked like the requirement — until two more approvals showed the same metric at −3.36 and +0.96.
The real tolerance was about ±3.4pt, and the zero was just where that one correction landed.

So when the family grows, re-derive the bands rather than carrying forward the first reading.
Record min and max per metric, and treat a value inside the band as passing even when it is not
the best of the set. Over-tightening is not free: it spends the session, and it can force
compensating changes elsewhere that a reviewer never asked for.

Two cautions when reading a band:

- **Only compare within the same structural variant.** A metric can be undefined or meaningless
  on a sibling built differently — section-gap uniformity says nothing about a file whose sections
  are too long to have gaps at that scale.
- **A quantity that depends on content volume is not a constant.** If the metric moves with copy
  length or line count, the band describes the family's range, not a target to hit.

When a variant still has only one approved example, say so and treat its numbers as a point.
Match it individually rather than pretending a band exists.

## The sweep

Measure from the render, not from bounds. Work through all of it; the finding you skip is the
one that comes back.

1. **Every alignment the design implies.** Column heads, shared left axes, a block's bottom
   against the graphic beside it. List the pairs first, then measure each — an alignment nobody
   wrote down is still one a reviewer sees.
2. **Section rhythm.** Ink-to-ink gaps down each column, and their spread.
3. **Clearances.** Every pair that could collide, with its measured gap: text against artwork,
   column against column, last block against the band or footer below it.
4. **Overflow.** Every area-text frame, by flag, not by eye.
5. **Tight-tracked runs.** Glyph pairs in numerals or condensed labels, at magnification.
6. **Copy, verbatim.** Diff every string against the agreed source, including the footer
   boilerplate nobody re-read.
7. **Preflight.** Colour mode, unembedded links, fonts, locked or hidden objects, items outside
   the artboard. See [production safety](production-safety.md).

## Inherited quirks are not findings

A family carries oddities that predate this file: an empty zero-width text frame parked off the
artboard, a body column whose ink left edge wanders by a point or two because every paragraph
starts with a different glyph. If the approved siblings have it too, it passed review — record it
as inherited and move on. Changing it is a diff the reviewer did not ask for.

The exception is anything the reviewer has *ever* corrected on *any* sibling. A file approved
before that correction still carries the defect, and copying its objects copies the defect
into the new deliverable: a footer transplanted from the oldest approved flyer arrived with the
1.2pt label offset the reviewer had rejected on a later one. Keep the family's list of reviewer
corrections (see the local checklist) and re-check every item on every new file, whichever
sibling it was derived from. Inherited from an approved file is not the same as approved.

## Finish by re-measuring what you fixed

Every fix in the audit is a move, and a move is only evidence once it has been measured again.
Close the loop metric by metric and put the before/after pair in the report. A fix applied in
the wrong direction reports success and doubles the error — see
[measuring from the render](measuring-from-the-render.md).
