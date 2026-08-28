# Tested recipes

Custom JSX passed to `run` is inserted inside the protected wrapper and has core helpers loaded.
Use ES3 syntax and unique object evidence.

## Style-safe replacement

```javascript
var frame = requireTargetDocument().textFrames.getByName("BODY_TEXT");
replaceTextPreservingStyles(frame, "old", "new");
writeResultFile(RESULT_PATH, { item: snapshotItem(frame) });
```

Inspect style runs afterward. Replacement length changes can create new run boundaries.

## Restore live scale and size

```javascript
var frame = requireTargetDocument().textFrames.getByName("ADDRESS");
restoreLiveTextAspect(frame, "horizontal", 11.5, "left");
writeResultFile(RESULT_PATH, { item: snapshotItem(frame) });
```

The confirmed axis must come from inspection or measurement, not the percentage alone.

## Restore an outlined horizontal compression

```javascript
var group = requireTargetDocument().groupItems.getByName("CTA_OUTLINE");
restoreOutlinedAspect(group, 83.3, "horizontal", "center");
writeResultFile(RESULT_PATH, { item: snapshotItem(group) });
```

Measure several square glyphs against a 100/100 reference before running.

## Move a section rigidly

```javascript
var documentValue = requireTargetDocument();
var items = [
  documentValue.groupItems.getByName("SECTION_HEADING"),
  documentValue.textFrames.getByName("SECTION_BODY"),
  documentValue.pathItems.getByName("SECTION_RULE")
];
writeResultFile(RESULT_PATH, moveSectionRigid(items, 0, -6));
```

Record all pre/post bounds and verify no item was omitted from the section.

## Reception hours inside parentheses

```javascript
var d = requireTargetDocument();
var result = fitReceptionInParens(
  d.textFrames.getByName("RECEPTION_LABEL"),
  d.textFrames.getByName("RECEPTION_TIME"),
  d.groupItems.getByName("RECEPTION_PARENS"),
  100
);
writeResultFile(RESULT_PATH, result);
```

Render a footer crop after any weight change because thicker glyphs alter optical width.

## Read-only collision audit

```javascript
var group = requireTargetDocument().groupItems.getByName("TARGET_SECTION");
writeResultFile(RESULT_PATH, { collisions: findCollisions(group.pageItems) });
```

A zero collision count does not prove adequate breathing room; review near gaps visually.

## Return your own data from a custom script

`run` appends a default result writer after your source, but only when the script did not
already produce one. Write to `RESULT_PATH` yourself and that value is what `run` returns:

```javascript
writeResultFile(RESULT_PATH, { ok: true, measurements: report });
```

Older builds appended the default unconditionally and destroyed whatever the script wrote,
which is why some scripts write to a private path instead. That workaround still works and is
worth keeping when the same file must be read by a later, separate transaction.

## Replace part of a styled line

`characters.itemByRange` does not exist in Illustrator — it is InDesign, and it throws.
Write the replacement into the first character of the match so it inherits that character's
style, then delete the leftover originals from the back:

```javascript
frame.textRange.characters[start].contents = replacement;
for (var k = searchValue.length - 2; k >= 0; k--) {
  frame.textRange.characters[start + replacement.length + k].remove();
}
```

`replaceTextPreservingStyles` does exactly this. It preserves the style at the match's start,
so a match spanning two runs collapses onto the first run's style. For a label-plus-number
line where the halves are deliberately different sizes, either replace each run separately or
reapply both runs by index afterwards, and confirm with bounds that the size contrast survived.

## Align a block to one character of the line above

Reviewers ask for alignment against a specific glyph ("line this up under the 合"). Measure
the advance of everything before that character by setting a duplicate to the full line and
then to the tail starting at the target character: the difference of their **ink right**
edges is the prefix advance, because both strings end identically.

```javascript
var probe = title.duplicate();
probe.contents = "理工学部へ合格!!";  var full = inkBounds(probe)[2];
probe.contents = "合格!!";            var tail = inkBounds(probe);
probe.remove();
var targetLeft = tail[0] + (full - tail[2]);   // ink left of 合 within the full line
```

The same subtraction gives a hanging indent for a wrapped label line: indent the second
paragraph by the advance of the label prefix so its text starts under the first line's text
rather than under the label.

## Move artwork and the text sitting on it as one

Artwork and the captions printed over it are usually separate, unparented items. Anything
that moves one must move all of them by the same delta, and the arrangement must be checked
afterwards — absolute positions can each look right while the relationship is broken.

```javascript
var offsets = relativeOffsets([label, value], graphic);   // before
moveSetTo([graphic, label, value], graphic, 1168, 752);   // move together
restoreRelative([label, value], graphic, offsets);        // assert/repair after
```

When the relationship is already broken, recover the correct offsets from the untouched
base file rather than guessing them from the current state.

## Resize an area-text container without scaling the text

`textFrame.resize()` scales the glyphs with the box, so it cannot be used to give an area
frame more or fewer lines. Move the container path's anchor points instead. For the usual
rectangular frame, displace only the points on the edge you are changing:

```javascript
var points = frame.textPath.pathPoints;
if (points.length !== 4) throw new Error("expected a rectangular text path");
var topY = null, i;
for (i = 0; i < points.length; i++) {
  if (topY === null || points[i].anchor[1] > topY) topY = points[i].anchor[1];
}
for (i = 0; i < points.length; i++) {
  var p = points[i];
  var delta = (Math.abs(p.anchor[1] - topY) < 0.5) ? deltaTop : deltaBottom;
  p.anchor         = [p.anchor[0],         p.anchor[1]         + delta];
  p.leftDirection  = [p.leftDirection[0],  p.leftDirection[1]  + delta];
  p.rightDirection = [p.rightDirection[0], p.rightDirection[1] + delta];
}
```

Move `leftDirection` and `rightDirection` with the anchor or the segment warps. Assert the
point count rather than assuming a rectangle. Gate the result on `textOverflows(frame)` before
and after — that flag, not the reported bounds, is what tells you the copy now fits. The frame's
`geometricBounds` may not change at all when the container does.

Derive the target height from the file's own rule rather than from leading. Container heights in
an approved family usually follow a fixed relation to line count; recover it from three existing
frames with different line counts and solve, then size every frame you touch with that relation.

## Open one glyph pair without disturbing the run

Tracking applies to the space after a character, so a single pair is opened by touching one
character. Locate it by content, and refuse an ambiguous match rather than editing the first hit:

```javascript
var contents = String(frame.contents);
var index = contents.indexOf(pair);
if (index < 0) throw new Error("pair not found");
if (contents.indexOf(pair, index + 1) >= 0) throw new Error("pair is ambiguous");
frame.textRange.characters[index].characterAttributes.tracking = newTracking;
```
