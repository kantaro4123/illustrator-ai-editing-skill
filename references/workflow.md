# Workflow and CLI

## File roles first

Before opening Illustrator, label inputs as:

- `reference`: pristine or earlier comparison file; never a save target;
- `working`: current reviewed file; back up, then save in place when requested;
- `new`: a new output path intentionally created from a source.

Review rounds are chronological, not filename rankings. An old “修正前版” remains useful
for comparison but must not overwrite edits already accepted in the current working file.

## Deterministic loop

1. `doctor` checks process, responsiveness, open documents, and recovery state.
2. `inspect ABSOLUTE.ai --detail full` captures structure, text runs, bounds, links,
   artboards, layers, lock state, and exact document identity.
3. Make a written edit plan tied to stable object evidence.
4. `backup ABSOLUTE.ai` creates an exclusive timestamped copy and matching SHA-256 evidence.
5. `run ABSOLUTE.ai --script ABSOLUTE.jsx --confirm` applies one logical stage.
6. Re-inspect. If properties or identity differ from expectations, stop before save.
7. `save ABSOLUTE.ai --confirm --review-round N` verifies destination and a fresh matching backup.
8. `render`, `crop`, and `compare` create external evidence.
9. Repeat only for the next independent stage.

## Transaction sizing

One transaction should be large enough to avoid unnecessary host round trips but small
enough to understand if it fails. Good units are “repair one text block,” “move one section
rigidly,” or “restore one confirmed aspect axis.” Do not combine unrelated header, body,
and footer changes.

After a host error, reduce transaction size. After a timeout on a mutation, do not retry at
any size until recovery establishes whether it applied.

## CLI behavior

The CLI requires absolute document paths. `run` additionally requires an absolute JSX path
and `--confirm`; `save` requires `--confirm`. Use `--timeout SECONDS` for host commands.

Every command result uses the same envelope:

```json
{"ok":true,"command":"inspect","runId":"…","document":{"path":"…","name":"…"},"data":{},"warnings":[],"artifacts":[]}
```

Failures include a stable code, recoverability, retry guidance, and artifact paths. Parse
stdout as JSON; do not scrape human prose. Help and version are the only plain-text outputs.

## Visual evidence

Render at one fixed DPI for before/after comparison. Use identical crop rectangles. Keep:

- full-page before and after;
- detail crops for each instruction;
- overlay and difference images;
- inspection JSON and artifact hashes;
- a short pass/fail checklist against every review item.

Do not commit production artifacts. Store them in the transaction directory or another
explicit temporary/evidence location.
