# Deriving a new deliverable from an approved file

The most common real request is not "build this from a blank template". It is "make the
next one, based on the one we already got approved". Treat that as its own workflow,
because the failure modes are different from authoring.

## Identify the base before touching anything

When the request names a prior deliverable and also mentions a template, they are not
interchangeable:

- the **base** is the file the new one is derived from — usually the approved deliverable;
- a **template** mentioned alongside is a *donor* for the one part the base lacks.

Read the request for the derivation verb: "◯◯を元に", "based on", "同じように". The object
of that verb is the base. A template named for a specific new section ("参考のため", "for the
new section") is a donor, not the base.

If the base is ambiguous and the two candidates differ structurally, ask before building.
Choosing wrong is expensive: an approved base already carries typography, spacing, colour,
and review fixes that a blank template does not, and rebuilding those from scratch both
wastes the session and reintroduces every issue the reviewer already made you fix.

## Minimal diff is the requirement, not a preference

The base is approved. Every property you change is a new chance to fail review. So change
only what genuinely differs between the old subject and the new one — usually names,
numbers, dates, body copy, and the photo.

Do not, on an approved base:

- re-set attributes that are already correct (size, leading, justification, kinsoku,
  tracking, colour) "to be sure";
- re-layout sections that did not change;
- re-derive spacing you did not measure a problem in.

A useful test before each edit: *what did the reviewer see, and does this change alter it?*
If the answer is "yes, but nothing asked for that", don't.

## Replace content without destroying styling

`textFrame.contents = "..."` collapses every style run in the frame to the first run's
style. On an approved file this silently destroys deliberate typographic contrast, and the
damage is invisible in a plain-text read of `contents` — the string looks right while the
design is gone.

The classic casualty is a label+value string where the value is deliberately larger:
`入塾時偏差値48` renders with small kanji and a large number, but reads as one flat string.

So on an approved base:

1. `inspect --detail full` and look at `styleRuns` for every frame you intend to edit.
   More than one run means the frame carries intentional mixed styling.
2. If the change is a few characters inside otherwise identical text (a number, a year),
   assign per character/range — `frame.characters[i].contents = "5"` — leaving the runs alone.
3. If the whole string changes, capture the run structure first and reapply it, or copy the
   original object and edit only the differing characters (see below).

## Copy-the-object, then edit the characters

When an object's styling is complex (mixed runs, rotation, effects) and you need it in a
new file, do not re-author it. Duplicate the original object cross-document and change only
the characters that differ:

```javascript
var dup = sourceFrame.duplicate(targetLayer, ElementPlacement.PLACEATBEGINNING);
var chars = dup.textRange.characters, n = chars.length;
chars[n - 2].contents = "5";
chars[n - 1].contents = "0";
```

This preserves size runs, rotation, baseline shifts, and colour exactly, and it is far
faster than measuring and rebuilding them. Verify by comparing bounds against the source:
matching width and height is strong evidence the styling survived (a collapsed-run frame is
visibly shorter — e.g. H29.4 where the original was H42.5).

## Verify the new file against the base, not only against the brief

Before declaring done, diff the derivative against its base and account for **every**
difference. Anything you cannot explain as "this is what the brief asked to change" is a
regression you introduced.

Cheap and effective: render both to PNG at the same dpi, crop the same regions, and compare
side by side — bounds comparison per object catches what the eye misses. Pay particular
attention to objects you edited textually, because that is where style-run collapse hides.

## Changing the text moves the ink even when the frame does not

A Japanese glyph carries its own left side bearing, so replacing copy changes where the ink
starts even though the text frame never moved. Swapping a headline's first character from
東 to 市 pushed the visible left edge 1.5pt right — invisible in the frame coordinates,
plainly visible against the column below it, and squarely inside the "文字のグリッドが揃って
いない" category reviewers reject for.

Frame bounds cannot detect this. After any copy change, measure ink bounds and compare them
against the approved predecessor, numerically:

```
approved flyer : headline ink left 761.04, +1.92pt from the body column
this flyer     : headline ink left 762.53, +3.36pt   <- 1.44pt worse
after aligning : headline ink left 761.04, +1.92pt   <- matches approved
```

Note what the target is. The approved file is not perfectly aligned either — it carries a
+1.92pt offset that passed review. The goal is **parity with the approved file**, not an
ideal you invented: matching a number that already cleared review is defensible, while
"improving" past it silently changes something the reviewer accepted.

Apply the same test to any element whose first glyph, first line, or line count changed.

## Building a variant the template does not have

Sometimes the requested layout exists only as a printed example — a no-photo version of a
flyer whose template only ships the photo version. Derive it from the closest approved file
and classify every element up front:

- **deleted** — what the variant does not have (the photograph, its badge, the large name);
- **repositioned** — what exists but sits elsewhere (a deviation graphic moving to the
  corner the photo vacated);
- **retyped** — what keeps its role but changes content and size;
- **untouched** — everything outside the restructured zone.

Say which zone each element is in before editing, then leave the untouched zone genuinely
untouched: the footer, the consultation box and the logo carry prior review approval and
have no reason to move because the header changed.

Pick the base by what it already contains, not by recency. A four-section base was the right
start for a four-section variant even though a newer three-section file existed, because
adding a section back costs more than restructuring a header.

## When the reference and the current template disagree

An old printed reference and the current approved template will differ in shared
boilerplate — walking times, address formatting, whether a line says 「お問い合わせ」 or
「お問合わせ」, whether opening hours include holidays. These are not reproduction errors;
they are the template moving on, or the reference being newer than your base.

Do not silently choose. List every such difference with both values and ask, because only
the client knows which is current. Reproduce the *content* of the reference and keep the
*boilerplate* of the approved base until told otherwise — that keeps the diff against the
approved file minimal, which is the whole point of deriving.

## Outlined means fixed, live means variable

In a family of per-instance deliverables, the file itself records which parts the design holds
constant. Elements converted to outlines are the fixed frame: they cannot be retyped, and the
fact that someone outlined them says they were never meant to vary. Elements left as live text
are the fields that change per instance.

So before agreeing to a copy change, check which one it is. A request that would retype an
outlined heading is a design change, not a content change — surface it instead of rebuilding
the artwork to match. And when supplied copy disagrees with an outlined heading, the outlined
heading usually wins: the supplied wording is often the interviewer's question, not a new
heading.

## Read house-style variance off the siblings, not off one file

One approved file cannot tell you which of its properties are fixed and which were chosen for
that instance. Two or three can. Compare the siblings before deciding that a property is
untouchable:

- a headline set at one size in the base and a different size, on a different number of lines,
  in a sibling means headline size is fitted per instance — so shrinking it to fit a longer
  university name is house style, not a violation;
- a section title worded differently across siblings is a per-instance field;
- a value identical across every sibling is structural, and changing it needs a reason.

This matters most when the supplied copy does not fit. The question "may I change this?" is
usually already answered by the family.
