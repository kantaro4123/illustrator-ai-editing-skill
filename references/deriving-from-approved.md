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
