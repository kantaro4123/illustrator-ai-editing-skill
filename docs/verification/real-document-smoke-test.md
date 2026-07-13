# Real-document copy smoke test

Date: 2026-07-14 (Asia/Tokyo)

## Scope and safeguards

- Adobe Illustrator 2026, version 30.6.0 (build 109), macOS backend.
- Used temporary copies of the current reviewed working file and an older comparison file.
- Renamed the copies to generic working/reference names before any host operation.
- Never opened or mutated either original during the test.
- Verified both original SHA-256 values were unchanged after the test.
- No artwork, inspection payload, client filename, render, sidecar, backup, or temporary path is tracked.

## Results

| Check | Result |
|---|---|
| Exact normalized path and filename binding | PASS |
| Compact structural inspection | PASS: 1 artboard, 4 layers, 27 text frames, 19,190 page items |
| External PDF-compatible render at 150 DPI | PASS using `pdftoppm` |
| Reference role used as a save target | Correctly rejected with `REFERENCE_WRITE_FORBIDDEN` |
| Automatic backup on reversible add transaction | PASS |
| Automatic backup and precondition check on save | PASS |
| Save, close exact copy, reopen, and inspect marker | PASS: exactly one marker layer |
| Remove marker, save, close, reopen, and inspect | PASS: zero marker layers |
| Initial versus restored final render | PASS: byte-identical PNG and identical SHA-256 |
| Wrong expected filename for the correct real-copy path | Correctly rejected with `DOCUMENT_MISMATCH` |
| Synthetic similarly named active-document E2E | PASS in the disposable host suite |
| Illustrator documents left open after scoped cleanup | None observed |

Initial and restored final render SHA-256:

```text
787a6ae3fadc1ccab20f3708e822f75ea2f45ff2ac0393ee10e290491fe8faaa
```

Four independent `.ai` backup artifacts were produced by the two `run` and two `save`
operations. Each CLI result recorded its backup artifact and hash.

## Failures found and corrected during the smoke test

1. An empty production text frame caused `Illegal Argument` while reading aggregate text-range
   attributes. Inspection now returns no style runs for empty frames and samples a real character
   for compact mode.
2. Full per-character style inspection on the 19,190-item file exceeded 180 seconds and kept
   running inside Illustrator after the AppleEvent timed out. Full mode now has an explicit
   style-character budget and marks truncated frames; compact mode completed in about 75 seconds.
3. A read timeout was previously marked immediately safe to retry. Real-host behavior proved the
   host script can continue, so read timeouts now set `safeToRetry: false` until the operation has
   settled and `doctor` confirms responsiveness.
4. The CLI safety layer did not expose document roles on `save`. `--role reference` is now wired
   through the manifest and rejected before Illustrator is contacted.
5. Loading a second 26 MB real copy concurrently exceeded the AppleEvent window. The attempt was
   stopped without mutation; exact path/name rejection was then verified in a single isolated
   read transaction, while the similarly named/frontmost scenario remains covered by synthetic E2E.

## Conclusion

The runtime preserved both originals, rejected reference and identity violations, created the
required backups, survived a real production-scale inspection failure without duplicate mutation,
and restored the temporary working copy to a visually identical state. Production guidance should
prefer compact global inspection followed by targeted full inspection of candidate text frames.
