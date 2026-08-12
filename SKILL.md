---
name: illustrator-ai-editing
description: Safely inspect, edit, repair, and review Adobe Illustrator .ai files on macOS, including Japanese typography, flyer layout, aspect ratio restoration, print review, rendering, and crash recovery.
---

# Illustrator AI Editing

Use this skill for production Illustrator work where preserving prior accepted edits
matters as much as making the requested change. Treat Illustrator as a stateful host:
bind every operation to an exact file, use one mutation at a time, save deliberately,
and verify from a render rather than trusting script success.

## Start here

1. Resolve the directory containing this `SKILL.md`; call it the skill root.
2. Run `<skill-root>/bin/illustrator-ai doctor` before a live Illustrator session.
3. Identify each file's role: pristine reference, current working file, or new output.
4. Run `inspect` on the exact absolute working path before planning edits.
5. Read only the references needed for the task from the routing table below.
6. Back up the working file before the first mutation. The CLI also backs up `run`
   and `save`; retain those artifacts until review is complete.
7. Apply one coherent edit transaction, inspect again, save, render, and compare.
8. Review the full affected section and then the full page before reporting completion.

Build once with `npm install && npm run build` if `dist/` is absent. CLI stdout is one
JSON object for commands; keep diagnostics on stderr in wrappers.

## Non-negotiable safety rules

- Never mutate a pristine comparison reference. Make or select a working copy.
- Never select a document by `activeDocument`, substring, collection index, or visual
  similarity. Bind the normalized full path and exact decoded filename.
- Never rerun a timed-out mutation. It may still be executing. Run `recover`, inspect
  preserved transaction evidence, and verify a known edit first.
- Never run two Illustrator mutations concurrently. The CLI serializes within one
  process and uses per-document locks; do not bypass either mechanism.
- Require `--confirm` for `run` and `save`. A custom JSX file must be an absolute path.
- Preserve user-stated type size. If restoring 100/100 scale causes overflow, change
  layout or spacing instead of silently shrinking the text.
- Never infer whether a percentage compressed width or height. Require direct metadata,
  before/after geometry, or multiple outlined glyph measurements against a 100/100 sample.
- Do not declare success from a JSON result alone. Inspect saved state and review renders.
- Keep client `.ai`, images, backups, sidecars, and absolute paths out of the repository.

Read [production safety](references/production-safety.md) before any production mutation.

When the request derives a new deliverable from an already-approved file ("前回の◯◯を元に",
"make the next one like this one"), that approved file is the base and the correct goal is a
**minimal diff**: change only the content that genuinely differs and leave every reviewed
property untouched. A template mentioned alongside it is a donor for the one part the base
lacks, not the base. Read [deriving from an approved file](references/deriving-from-approved.md)
first — choosing the wrong base or replacing whole strings on styled text are the two
expensive mistakes there.

## Standard command loop

```bash
<skill-root>/bin/illustrator-ai doctor
<skill-root>/bin/illustrator-ai inspect /absolute/working.ai --detail full
<skill-root>/bin/illustrator-ai backup /absolute/working.ai
<skill-root>/bin/illustrator-ai run /absolute/working.ai \
  --script /absolute/edit.jsx --confirm --timeout 180
<skill-root>/bin/illustrator-ai inspect /absolute/working.ai --detail full
<skill-root>/bin/illustrator-ai save /absolute/working.ai --confirm --review-round 2
<skill-root>/bin/illustrator-ai render /absolute/working.ai --dpi 150 --output /tmp/page.png
```

Use `crop` for a shared-detail view and `compare` for overlay and difference images.
Prefer external rendering from the PDF-compatible saved `.ai`; it is faster and does
not disturb Illustrator. Read [workflow](references/workflow.md) for command options and
transaction boundaries.

## Writing edit JSX

The CLI wraps custom command source with UTF-8 BOM, dialog suppression, exact-document
activation, error sidecar output, and reusable ES3 helpers. Custom code is the body of
one transaction; do not add another `#target`, wrapper IIFE, or host transport.

Select objects in this order:

1. stable UUID;
2. unique explicit `name` or `note` under a known layer/group;
3. unique content plus typename and geometry signature;
4. refuse and re-inspect if multiple candidates remain.

Return snapshots of changed objects where useful. Avoid `app.redraw()` unless a measured
reflow requires one final redraw. Avoid whole-frame `.contents` replacement when style
runs differ. Read [Illustrator DOM](references/illustrator-dom.md) and
[recipes](references/recipes.md) before authoring unfamiliar JSX.

## Verification gates

After each coherent transaction:

- inspect changed properties and bounds;
- check area-text overflow, collisions, locked/hidden state, and target path;
- save and reopen or re-inspect saved state;
- render the same DPI before/after;
- crop both images to identical pixel coordinates;
- inspect overlay/difference output;
- review neighboring elements, section rhythm, symmetry, and full-page balance.

For review feedback such as “spacing feels wrong,” measure ink bounds and repeated gaps;
do not nudge until it looks plausible. Read [layout review](references/layout-review.md).

## Task routing

- End-to-end command sequence, flags, and evidence: [workflow](references/workflow.md)
- Roles, backups, chronology, locks, save rules, and print preflight: [production safety](references/production-safety.md)
- Basing a new file on an approved one, minimal diff, style-run preservation: [deriving from an approved file](references/deriving-from-approved.md)
- Object identity, coordinates, text frames, and ES3 pitfalls: [Illustrator DOM](references/illustrator-dom.md)
- Kinsoku, style-safe replacement, reception hours, and Japanese text: [Japanese typography](references/japanese-typography.md)
- Live and outlined 100/100 restoration: [aspect ratio](references/aspect-ratio.md)
- Spacing, rigid sections, collision and holistic review: [layout review](references/layout-review.md)
- Timeouts, dialogs, recovered documents, and ambiguous state: [crash recovery](references/crash-recovery.md)
- Tested JSX patterns for common production corrections: [recipes](references/recipes.md)
- macOS bridge, dependencies, and deferred Windows backend: [platforms](references/platforms.md)

## Stop conditions

Stop and ask the user before proceeding when file roles or intended save destination are
unclear, axis evidence conflicts, a recovered document cannot be distinguished, the only
available action could discard unsaved non-synthetic work, or a design choice would change
content or hierarchy beyond the review instruction. Otherwise continue autonomously through
inspection, safe edits, verification, and evidence collection.
