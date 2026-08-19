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

## Running on a different Mac

The package is portable by construction, and each of these was verified from a clean clone:

- **No runtime dependencies.** Everything the CLI executes at run time is Node's standard
  library; `typescript` and `vitest` are dev-only. Nothing needs a network at run time.
- **Node >= 20.11**, declared in `engines`. The launcher checks the running version first and
  reports `UNSUPPORTED_NODE` rather than failing somewhere deeper.
- **`dist/` is not in git.** A fresh clone cannot run until it is built. The launcher detects
  the missing build and returns `NOT_BUILT` naming the exact command to run; before that it
  surfaced a bare `ERR_MODULE_NOT_FOUND` that named a path but never the fix.
- **Illustrator is addressed by application name**, not by an installation path, so a
  different Illustrator version or install location needs no change. `appPath` exists as an
  override for unusual installs.
- **The installer resolves its own location** and symlinks both agent directories under
  `$HOME`; `ILLUSTRATOR_SKILL_SOURCE` overrides the source. It dry-runs unless given `--apply`.

What does not travel with the repository, and must be true on the other machine:

- **Automation permission.** The first Apple Event raises a macOS consent prompt, and it must
  be approved by someone at that keyboard. A headless or remote session cannot grant it.
- **Fonts.** Japanese production files here expect the Hiragino families that ship with macOS.
  A missing font silently substitutes and changes every measurement you take.
- **Adobe Illustrator itself**, with scripting enabled.

Verify a new machine with: `npm install && npm run build && npm run validate`, then
`bin/illustrator-ai doctor`. The first three need no Illustrator; `doctor` is the first
command that does.
