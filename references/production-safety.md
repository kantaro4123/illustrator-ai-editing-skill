# Production safety

## Invariants

- A reference is immutable.
- A working file receives a byte-identical backup before mutation or save.
- The exact normalized path and decoded filename identify the host document.
- One document lock has one owner run ID; only that owner releases it.
- A mutating timeout is ambiguous and unsafe to retry.
- Save destination must equal the transaction target.
- User data never enters source control.

## Backup evidence

Backups are created beside the source with a UTC timestamp and collision suffix. Exclusive
creation prevents accidental overwrite. Both source and backup are hashed; a working save
is allowed only when both hashes equal the inspected precondition fingerprint.

Do not replace this with a casual `cp` in an agent-generated shell pipeline. The CLI records
the path and SHA-256 in its result artifact list.

## Exact document binding

Illustrator often has several similarly named copies open. The wrapper searches all open
documents by normalized `fullName.fsName`, activates only an exact match, and otherwise opens
the exact target file. It then verifies both path and decoded name. Failure is
`DOCUMENT_MISMATCH`, not a reason to fall back to the front document.

## Locks and timeouts

Locks live outside client folders and contain document path, command, PID, start time, and
run ID. An existing lock blocks mutation until `recover` diagnoses its owner. Never delete a
lock solely because it is old; first determine whether Illustrator or the owning process is
still executing.

A lock kept after an ambiguous mutation timeout also records why it was kept. `recover` clears
locks whose owner merely died, but never those, because the dead owner is the expected state
after a timeout and says nothing about whether Illustrator finished the edit.

Read operations may be retried only when the error marks them safe. A timed-out mutation may
have completed after the caller stopped waiting, so preserve its transaction directory and
inspect both the sidecar and document state.

## Authorization boundary

Normal in-scope actions are read-only inspection, working-copy backups, requested edits,
save to the agreed working path, and temporary verification artifacts. Ask before changing
the save destination, discarding an unknown unsaved document, force-quitting Illustrator
when non-synthetic work may be open, installing system software, or publishing externally.

## Print submission preflight

A file that looks correct on screen can still fail at the printer. Check these before
declaring a document ready to submit, because the failure is invisible locally:

- **Linked vs embedded images.** A `PlacedItem` is a *link* to a path on this machine. Ship
  the `.ai` alone and the printer gets a missing image — dropped artwork or a low-resolution
  preview in its place. Any image placed during the session is linked by default. Embed
  them (`placedItem.embed()`, which converts each to a `RasterItem`) and verify the link
  count is zero afterwards. Images inherited from an approved base may already be linked —
  check, don't assume.
- **Colour mode** is CMYK for print.
- **Effective resolution** of placed images at their final scale, not their pixel count.
- **Minimum sizes**: text at or above ~6pt, strokes at or above ~0.3pt, no hairlines.
- **Bleed and safety**: artwork to the bleed edge, text inside the safety margin (~3mm).

Report each as a checked item with its measured value, not as a general assurance.

## Repository hygiene

Ignore `.ai`, `.ait`, `.eps`, rendered images, sidecars, backups, lock data, transactions,
and customer-specific reports. Sanitized verification documents may contain command shapes,
versions, hashes, and pass/fail outcomes, but not client content or unnecessary filenames.
