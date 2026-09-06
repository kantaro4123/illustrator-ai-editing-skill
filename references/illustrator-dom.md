# Illustrator DOM and ExtendScript

## Runtime constraints

Illustrator 2026 still executes ExtendScript with ES3-era constraints. Use `var`, classic
functions, simple arrays/objects, and explicit loops. Avoid `let`, `const`, arrow functions,
template literals, modern array helpers, and Node APIs. A UTF-8 BOM is required for reliable
Japanese source literals.

Illustrator 2026 treats lines shaped like `// @name` as directives and can report a syntax
error. The builder strips source annotations before execution.

## Object identity

Prefer native UUID lookup when available. Otherwise combine `typename`, explicit `name`,
`note`, layer/group ancestry, contents, and geometry. Collection indices are unstable after
outline creation, duplication, recovery, and z-order changes. Refuse non-unique matches.

Locked or hidden ancestors can prevent writes even when the leaf appears editable. Inspect
and deliberately unlock only the required chain, then restore the prior state.

Object names left by earlier sessions go stale. A production file carried a `BODY_*` name on the
body of a different section entirely: the name survived while the content around it was rewritten.
Names are a hint; position plus contents is the evidence. When a name and the layout disagree,
believe the layout.

UUID lookup and collection membership can disagree. An id reported under `rasterItems` resolved
through `getPageItemFromUuid` to a `GroupItem` whose own `pageItems` then threw. When a resolved
handle starts raising on its own properties, stop trusting it and re-find the target by geometry
within the collection that should contain it — iterate `document.rasterItems` and match bounds —
rather than pushing on through a bad reference. Wrapping every property read in a `safe()` helper
turns that failure into readable evidence instead of an opaque host error.

**UUIDs are not stable across a structural edit.** They can be positional in the file's
serialization, so deleting objects renumbers the survivors: removing two text frames shifted a
footer label from `21638` to `21616`, and a batch keyed on the old id failed with
`EDIT_TARGET_NOT_FOUND`. Treat ids captured before a deletion, insertion, or reorder as spent —
re-inspect and re-key afterwards. Within a run of pure moves and text edits they hold, which is
why the failure is easy to miss until the one time it bites.

The same warning applies to a plan written across several transactions: capture the ids in the
transaction that uses them, not in the survey you did at the start.

**A reference dies with its object, and `embed()` is a removal.** Removing a raster and placing
its replacement leaves the old handle in every variable that held it; passing one of those
downstream raised "Object is invalid" two phases later, far from the cause. `placedItem.embed()`
does the same — the placed item is replaced by a new `RasterItem` and the old handle is gone.
When an object is going to be removed or embedded, capture what you still need (its bounds, its
size) as plain values first, and pass the values, not the handle.

## Collection scale traps

`document.pageItems` enumerates EVERY nested descendant. A flyer with outlined headline
text held 19,190 items (one path per glyph): full enumeration took over two minutes and
serialized to 5MB, which reads as a false ILLUSTRATOR_UNRESPONSIVE timeout. Default to
top-level items per layer (`layer.pageItems`, recursing only on demand), cap the count,
and always report the true total plus a truncation flag so the caller knows to narrow.

AppleScript-side: Illustrator documents expose `file path` (an alias), not `full name` —
the latter is a compile error that makes every probe look unresponsive. Dereference loop
variables with a two-step `set f to file path of d` before `POSIX path of f`; the inline
form silently yields "".

## Coordinates and bounds

Illustrator document bounds use `[left, top, right, bottom]`; vertical values decrease
downward. `geometricBounds` excludes some visual effects while `visibleBounds` includes
strokes/effects. Text-frame bounds include font metrics and are not the same as visible ink.

For exact text alignment, duplicate the frame, outline the duplicate, measure its glyph
bounds, then remove it. Never destroy the production live text merely to measure ink.

`item.left` and `item.top` are **visibleBounds** properties. Assigning them a target derived
from `geometricBounds` displaces the item by exactly the effect it carries — a glow, shadow
or stroke — and reports a plausible position afterwards, so nothing looks wrong until a
human sees the render. An arrow with a 10pt glow drifted 10pt away from the text labelling
it this way, and the defect survived four more edits because every later script re-derived
its delta from the already-wrong position.

Move by delta, never by absolute assignment: `item.translate(dx, dy)`, or the helpers
`moveItemTo`, `setLeft`, `setTop`, which compute the delta from `geometricBounds` for you.

At DPI `d`, points convert to pixels by `d / 72`. Relative to an artboard:

```text
x_px = (document_x - artboard_left) * d / 72
y_px = (artboard_top - document_y) * d / 72
```

## Text frames

Point text and area text behave differently. Area text can overflow; count visible line
characters versus text-range characters after accounting for breaks. Inspect character
style runs before replacement. Assigning a complete `.contents` string can collapse mixed
font, size, tracking, or weight runs.

Replace ranges from the end toward the start so earlier indices remain stable. Re-inspect
style runs after mutation.

## Expensive and fragile calls

Avoid repeated `app.redraw()`, outlining large production groups, per-character DOM access
on long frames, and guessed enum/property writes. Cache DOM properties in local variables.
Use one redraw only when a measured reflow cannot otherwise be observed.

Save with `IllustratorSaveOptions`, `pdfCompatible = true`, and `compressed = true` so the
saved file can be externally rendered.
