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
