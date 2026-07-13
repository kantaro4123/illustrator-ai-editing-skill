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
