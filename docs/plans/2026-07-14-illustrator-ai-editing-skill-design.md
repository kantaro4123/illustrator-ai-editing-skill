# Illustrator AI Editing Skill — Design

**Date:** 2026-07-14  
**Status:** Approved direction; implementation pending  
**Primary platform:** macOS, Adobe Illustrator 2026 (30.6.0)  
**Consumers:** Codex and Claude Code

## Objective

Create one production-grade Agent Skill that lets Codex and Claude Code inspect,
edit, save, render, compare, and recover Adobe Illustrator documents safely and
repeatably. The skill must preserve the hard-won workflow knowledge in the current
Claude/Codex copies while replacing their divergent scripts with one tested,
version-controlled implementation.

The first release is fully tested on macOS. Its Illustrator-side core remains
platform-neutral so a Windows PowerShell/COM bridge can be added later without
rewriting the editing logic.

## Non-goals for v1

- Claiming verified Windows support without a Windows Illustrator test machine.
- Replacing Illustrator with direct binary `.ai` editing.
- Treating image generation as a substitute for editable Illustrator artwork.
- Automatically approving subjective design decisions without rendered review.
- Making a long-running MCP server mandatory for basic editing.

## Findings from the current system

The existing personal installations are separate copies:

- `~/.agents/skills/illustrator-ai-editing`
- `~/.claude/skills/illustrator-ai-editing`

They already differ in six functional files. The Codex copy contains newer exact
document guards, outlined-text aspect-ratio safeguards, and rendering fallbacks
that are missing from the Claude copy. Separate installs therefore create a
correctness risk.

The local Illustrator 2026 installation includes Adobe's AppleScript dictionary,
ExtendScript sample scripts, and JavaScript scripting support. The working bridge
is `osascript -> Illustrator -> do javascript`, with file-based result transport.

## External research

### Adobe and agent-skill standards

- Adobe officially supports JavaScript/ExtendScript on macOS and Windows,
  AppleScript on macOS, and VBScript on Windows.
- Codex and Claude Code both use `SKILL.md`-based Agent Skills and support
  symlinked skill directories.
- Both products use progressive disclosure, so `SKILL.md` should remain a concise
  workflow/router and load detailed references only when needed.

Sources:

- https://ai-scripting.docsforadobe.dev/introduction/scriptingLanguageSupport/
- https://ai-scripting.docsforadobe.dev/jsobjref/javascript-object-reference/
- https://code.claude.com/docs/en/slash-commands
- https://developers.openai.com/codex/skills

### GitHub survey

#### `ie3jp/illustrator-mcp-server` (MIT)

This is the closest existing implementation. Version 1.5.1 contains a TypeScript
runner, UUID-scoped temp files, JSON parameter/result files, serialized JSX
execution, macOS and Windows bridges, 300+ unit/E2E test declarations, and a broad
Illustrator tool set.

Adopt as patterns:

- UTF-8 BOM on generated JSX.
- UUID-scoped temp files.
- JSON parameter/result transport.
- Single-flight execution queue.
- Transport abstraction for future Windows support.
- Generated fixtures and Illustrator E2E testing.
- UUID-based object identity where Illustrator supports it.

Do not depend on it as the v1 runtime because its primary abstraction is an MCP
server operating on the active document. This skill needs stronger production-file
guards, automatic immutable backups, review chronology, external PDF-compatible
rendering, crash-state diagnosis, and visual section comparison. Selected MIT
patterns may be reimplemented with attribution rather than copied wholesale.

Source: https://github.com/ie3jp/illustrator-mcp-server

#### `krVatsal/illustrator-mcp` (no license found in the checked-out tree)

Useful for confirming the simple platform-backend pattern and Windows COM route.
It has a much smaller test surface and returns AppleScript values directly. No code
will be copied because an explicit license was not found.

Source: https://github.com/krVatsal/illustrator-mcp

#### `mikechambers/adb-mcp` (MIT)

Provides a multi-Adobe CEP/WebSocket/MCP architecture and arbitrary ExtendScript
execution. It requires a CEP extension, proxy, and additional always-on services.
That is more operational complexity than v1 needs. Its low-level tool philosophy is
useful, but the transport is not adopted.

Source: https://github.com/mikechambers/adb-mcp

#### `github/awesome-copilot` Illustrator scripting skill (MIT)

Provides broad Illustrator DOM reference material and sample JSX scripts. It is a
script-authoring reference, not a safe production editing workflow. It may inform
reference coverage, while Adobe's installed documentation remains authoritative.

Source: https://github.com/github/awesome-copilot/tree/main/skills/adobe-illustrator-scripting

## Selected architecture

Use a shared-core plus integrated CLI architecture. One canonical repository is
the source of truth. Codex and Claude Code personal skill paths symlink to it.

```text
illustrator-ai-editing/
├── SKILL.md
├── README.md
├── LICENSE
├── agents/
│   └── openai.yaml
├── bin/
│   └── illustrator-ai
├── src/
│   ├── cli/
│   ├── runner/
│   ├── platform/
│   │   └── macos.ts
│   ├── render/
│   └── jsx/
│       ├── core/
│       ├── commands/
│       └── fixtures/
├── references/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── prompts/
│   └── fixtures/
├── scripts/
│   ├── install.sh
│   └── validate-skill.sh
└── docs/plans/
```

Node.js/TypeScript is the host runtime because the installed Codex environment
already provides Node, JSON/process primitives are reliable, and a future MCP
adapter can reuse the same library. Illustrator-side code stays ExtendScript ES3.

## CLI contract

The stable human/agent interface is:

```text
illustrator-ai doctor
illustrator-ai inspect <file.ai>
illustrator-ai backup <file.ai>
illustrator-ai run <edit.jsx> --document <file.ai>
illustrator-ai save <file.ai>
illustrator-ai render <file.ai> --output <page.png>
illustrator-ai crop <page.png> --artboard ... --bounds ...
illustrator-ai compare <before.ai> <after.ai> --output <dir>
illustrator-ai verify <file.ai>
illustrator-ai recover
```

Every command prints one JSON object to stdout and diagnostics to stderr. The JSON
envelope includes:

```json
{
  "ok": true,
  "command": "inspect",
  "runId": "uuid",
  "document": {"path": "/absolute/file.ai", "name": "file.ai"},
  "data": {},
  "warnings": [],
  "artifacts": []
}
```

Failures use a non-zero exit code and structured `error.code`, `error.message`,
`error.recoverable`, and `error.nextAction` fields.

## Execution protocol

1. Resolve and normalize the exact target path.
2. Acquire a per-document lock; reject concurrent mutation.
3. Create a UUID-scoped temporary transaction directory.
4. Write parameters as UTF-8 JSON.
5. Compose core JSX plus one command and prepend a UTF-8 BOM.
6. Execute via a generated AppleScript file with a bounded timeout.
7. Read a JSON result sidecar written by ExtendScript.
8. Preserve the transaction directory on ambiguous failure; clean it on success.
9. Never rerun a timed-out mutation automatically.

The runner serializes all Illustrator executions because Illustrator is effectively
single-threaded. Read-only commands may still queue behind mutations.

## Document and object identity

Mutations require all of the following:

- Absolute canonical path.
- Exact filename.
- Open-document `fullName.fsName` equality when available.
- Optional precondition fingerprint captured during inspection.

Never trust `app.activeDocument` without verifying it. Never identify persistent
objects by collection index. Prefer `PageItem.uuid`/`Document.getPageItemFromUuid`
when available, then explicit object names/notes, then content plus geometry
signatures. Indices are diagnostic output only.

## Safety and transaction model

- The first mutation creates a timestamped backup beside the source unless the
  command operates on an explicitly disposable fixture.
- A pristine reference can be marked read-only in a transaction manifest and may
  never be a save target.
- Existing working copies can be edited in place only after a fresh backup.
- Save after each logical stage, with PDF compatibility enabled.
- Record before/after snapshots for every edited object.
- Use a lock file containing PID, run ID, document path, command, and start time.
- Detect stale locks, but require an explicit recovery action before removing one.
- Preserve accepted review chronology; never restore an older whole document over
  a newer reviewed working copy.

## Illustrator core modules

- `document.jsx`: exact open/activate guards, save/save-as, reference protection.
- `identity.jsx`: UUID/name/note/content/geometry selectors.
- `geometry.jsx`: bounds, anchoring, translation, spacing, collision checks.
- `text.jsx`: style-run-safe replacement, overflow, point/area/path text.
- `japanese-text.jsx`: kinsoku, justification, no-break runs, punctuation variants.
- `aspect-ratio.jsx`: axis-confirmed text and outline restoration with sample glyph
  measurement and point-size preservation.
- `layout.jsx`: rigid section movement, equal gaps, visual margin assertions.
- `inspect.jsx`: compact and detailed structured document maps.
- `result.jsx`: JSON-safe success/error sidecar writer.

No helper may silently change an explicitly stated font size to make an element
fit. Aspect-ratio restoration must identify the compressed axis using measured
glyph evidence or an explicit caller assertion.

## Rendering and verification

Saved PDF-compatible `.ai` files are rendered outside Illustrator with Poppler when
available, then with native macOS fallbacks. Cropping uses exact document-to-pixel
coordinate conversion. Comparison generates:

- full-page before/after images;
- matching section crops;
- an overlay/difference image;
- a machine-readable geometry and typography diff;
- a contact sheet for human review.

Verification combines deterministic assertions and visual review. Deterministic
checks include exact text scale, point size, overflow, collisions, minimum margins,
missing fonts/links, color mode, and object presence. Subjective alignment and
visual weight remain explicit human/vision-model review steps.

## Recovery behavior

`doctor` and `recover` distinguish:

- Illustrator not running;
- responsive with zero documents;
- responsive with intended document open;
- timed out or blocked by a modal dialog;
- recovered document present;
- ambiguous transaction still possibly running.

After a timeout, the CLI reports the transaction path and forbids blind mutation
retry. Recovery first inspects app and sidecar state, then either saves a verified
recovered document or reopens the last confirmed saved file.

## Skill content design

`SKILL.md` remains below 500 lines and contains only activation scope, safety gates,
the standard workflow, command selection, and reference routing. Detailed material
moves to targeted references:

- production safety and review chronology;
- Illustrator DOM pitfalls;
- Japanese typography;
- outlined text and aspect ratios;
- layout and design review;
- crash recovery;
- recipe library;
- platform notes.

Claude-only frontmatter features will not be required for correctness. Codex UI
metadata lives in `agents/openai.yaml`; Claude Code ignores it harmlessly.

## Test strategy

Follow red-green-refactor for host code, JSX helpers, and skill behavior.

### Static validation

- Agent Skill frontmatter and folder validation.
- LF line endings and UTF-8 encoding.
- Shell syntax and executable bits.
- TypeScript typecheck and formatting.
- No absolute developer paths embedded in shipped files.
- Every referenced resource exists.

### Unit tests without Illustrator

- AppleScript/JSX/path escaping, including spaces and Japanese characters.
- JSON envelope and malformed sidecar handling.
- lock acquisition, contention, stale lock diagnosis, and cleanup.
- timeout classification and no-auto-retry policy.
- coordinate conversion, crop rectangles, and geometry diffs.
- aspect-axis decision logic using known glyph measurements.
- installer backup/symlink behavior.

### Illustrator integration tests

- `doctor` talks to Illustrator 2026 and reports version 30.6.0.
- Generate RGB and CMYK fixture documents.
- Inspect, mutate, save, close, reopen, and re-inspect.
- Verify exact document binding with two similarly named documents open.
- Verify Japanese filenames and text survive transport.
- Verify point text, area text, outlined text, groups, locked layers, and artboards.
- Verify PDF compatibility and external rendering.

### Destructive and recovery tests

Run only on temporary fixtures/copies:

- second mutation is rejected while a lock is held;
- timeout leaves an auditable transaction and does not auto-retry;
- wrong-document mutation is rejected;
- pristine reference save target is rejected;
- existing working copy is backed up before mutation;
- interrupted transaction can be inspected and recovered.

### Skill behavior evaluations

Maintain should-trigger, should-not-trigger, and adversarial prompts. Evaluate both
Codex and Claude Code for:

- correct skill activation;
- exact-document safety behavior;
- use of inspection before mutation;
- render-and-verify completion;
- refusal to infer aspect-ratio axis;
- avoidance of unsupported claims after a timeout.

## Installation and migration

1. Initialize the canonical `illustrator-ai-editing` repository.
2. Copy current knowledge into the new structure, preserving provenance.
3. Run all static/unit/integration tests.
4. Back up both existing personal skill directories.
5. Replace both personal directories with symlinks to the canonical repository.
6. Verify discovery in fresh Codex and Claude Code sessions.
7. Retain the backups until real-document smoke testing succeeds.

## Private GitHub repository delivery

After local and Illustrator E2E verification, publish the canonical repository to a
new private GitHub repository. Repository creation and the first push are explicit
delivery steps, not prerequisites for local development.

Before any push:

- confirm the GitHub owner and repository name with the user;
- verify `gh auth status` and the intended account;
- run secret scanning and inspect every tracked path;
- exclude all production `.ai` files, customer names/data, rendered review images,
  sidecar results, transaction directories, backups, logs, and macOS metadata;
- include only synthetic fixtures that were generated for the test suite;
- include third-party attribution for any adopted MIT-licensed code or substantial
  implementation pattern;
- require the remote repository visibility to report `PRIVATE` before pushing;
- push a tagged, tested initial release only after the local symlink installation
  and smoke tests pass.

Recommended default repository name: `illustrator-ai-editing-skill`. The final owner
and name remain a user decision at publish time.

## Future MCP and Windows work

The CLI library exposes a programmatic command API so an MCP adapter can be added
without changing the skill or JSX core. Windows support later adds
`src/platform/windows.ts` using PowerShell/COM and must pass the same transport
contract and real Illustrator E2E suite on Windows before being marked stable.
