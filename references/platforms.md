# Platform backends

## macOS v1

The supported backend writes UUID-scoped parameter JSON, UTF-8 BOM JSX, AppleScript, and result
JSON files. AppleScript sends the JSX file to Adobe Illustrator with a bounded timeout. Results
flow through the sidecar, not the AppleEvent return value. Mutations are serialized and locked.

Required or preferred local tools:

- Adobe Illustrator 2026;
- Node.js 20 or newer;
- `osascript`;
- Poppler `pdftoppm` preferred, macOS `sips` fallback;
- `ffmpeg` for crop, overlay, and difference artifacts.

The CLI should discover the installed Illustrator bundle rather than assume a marketing-version
path. `doctor` must distinguish application launch, scripting-dictionary resolution, modal
blocking, and exact document state.

## Windows later

ExtendScript command bodies, JSON contracts, safety manifests, locks, rendering logic, and most
tests are platform-neutral. Windows support needs a separately tested transport that invokes
Illustrator through COM/ActiveX (typically PowerShell), preserves UTF-8 paths and sidecars, maps
timeouts to the same ambiguity contract, and finds the installed application/version safely.

Do not claim Windows support until real-host tests cover Unicode paths, multiple documents,
modal dialogs, crash recovery, save/reopen, PDF-compatible rendering, and mutation timeout
semantics. Keep platform selection behind one transport interface; do not fork the skill's
production rules.

## Cross-agent use

The repository is the canonical skill package. Agent-specific discovery locations should be
symlinks to this one directory, so the workflow, runtime, references, and tests cannot drift.
Installation scripts must back up existing directories, default to dry-run, and support rollback.
