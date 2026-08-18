# Illustrator AI Editing Skill Implementation Plan

> **For Codex/Claude:** REQUIRED SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Use `superpowers:test-driven-development` for every production-code task and `superpowers:verification-before-completion` before declaring completion.

**Goal:** Build and install one production-grade macOS Illustrator editing skill, shared by Codex and Claude Code, with a safe JSON CLI, external visual verification, real Illustrator tests, and private GitHub delivery readiness.

**Architecture:** A version-controlled TypeScript host CLI serializes Illustrator work and communicates through UUID-scoped JSON/JSX sidecars. ExtendScript ES3 modules perform exact-document inspection and mutation. The Agent Skill is a concise workflow router over this deterministic runtime. Both personal skill locations symlink to the same canonical repository.

**Tech Stack:** Node.js 20+, TypeScript, Vitest, ExtendScript ES3, AppleScript/`osascript`, Poppler `pdftoppm`, ffmpeg/sips, Bash, Agent Skills `SKILL.md`, GitHub CLI.

---

## Task 1: Initialize the canonical repository and baseline controls

**Files:**

- Create: `.gitignore`
- Create: `.gitattributes`
- Create: `README.md`
- Create: `LICENSE`
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/index.ts`
- Create: `tests/unit/repository-safety.test.ts`
- Modify: `docs/plans/2026-07-14-illustrator-ai-editing-skill-design.md`

**Step 1: Write the failing repository-safety test**

Assert that `.gitignore` excludes `.ai`, backup files, `.out`, rendered images,
transaction folders, logs, `.DS_Store`, and test artifacts, while allowing an
explicit `tests/fixtures/synthetic/` exception.

**Step 2: Run the test and verify it fails**

Run: `npm test -- tests/unit/repository-safety.test.ts`

Expected: FAIL because the repository files do not exist.

**Step 3: Add the minimal project files**

Initialize Git, add MIT licensing for original code, set LF/UTF-8 attributes, add
scripts for `build`, `typecheck`, `test`, `test:unit`, `test:integration`, and
`validate`, and create the restrictive ignore policy.

**Step 4: Run the test and project checks**

Run: `npm test -- tests/unit/repository-safety.test.ts && npm run typecheck`

Expected: PASS.

**Step 5: Commit**

```bash
git add .gitignore .gitattributes README.md LICENSE package.json package-lock.json tsconfig.json vitest.config.ts src/index.ts tests/unit/repository-safety.test.ts docs/plans
git commit -m "chore: initialize illustrator editing skill"
```

## Task 2: Implement the JSON result contract and error taxonomy

**Files:**

- Create: `src/contracts/result.ts`
- Create: `src/contracts/errors.ts`
- Create: `tests/unit/result-contract.test.ts`

**Step 1: Write failing tests**

Cover success envelopes, warnings/artifacts, normalized absolute document identity,
recoverable errors, ambiguous timeout errors, and JSON serialization without
`undefined` values.

**Step 2: Run tests and verify failure**

Run: `npm test -- tests/unit/result-contract.test.ts`

Expected: FAIL with missing modules.

**Step 3: Implement the smallest typed contract**

Add `CommandResult`, `DocumentIdentity`, `Artifact`, `IllustratorError`, stable error
codes, and `successResult`/`failureResult` helpers.

**Step 4: Run tests**

Run: `npm test -- tests/unit/result-contract.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/contracts tests/unit/result-contract.test.ts
git commit -m "feat: add structured command result contract"
```

## Task 3: Implement safe temp transport and path escaping

**Files:**

- Create: `src/runner/temp-files.ts`
- Create: `src/runner/transport.ts`
- Create: `src/runner/apple-script.ts`
- Create: `tests/unit/temp-files.test.ts`
- Create: `tests/unit/apple-script.test.ts`

**Step 1: Write failing tests**

Test UUID-isolated directories, UTF-8 BOM generation, Japanese/space/quote paths,
JSON params, sidecar parsing, cleanup on success, and preservation on ambiguous
failure. Test that AppleScript uses a script file rather than interpolated JSX.

**Step 2: Verify RED**

Run: `npm test -- tests/unit/temp-files.test.ts tests/unit/apple-script.test.ts`

Expected: FAIL.

**Step 3: Implement the transport**

Use `fs.mkdtemp`, `crypto.randomUUID`, UTF-8 JSON, BOM-prefixed JSX, generated
AppleScript files, and `execFile` argument arrays. Add MIT attribution comments where
the UUID-sidecar pattern materially follows `ie3jp/illustrator-mcp-server`.

**Step 4: Verify GREEN**

Run: `npm test -- tests/unit/temp-files.test.ts tests/unit/apple-script.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/runner tests/unit/temp-files.test.ts tests/unit/apple-script.test.ts
git commit -m "feat: add isolated illustrator file transport"
```

## Task 4: Implement single-flight execution, locking, and timeout semantics

**Files:**

- Create: `src/runner/document-lock.ts`
- Create: `src/runner/executor.ts`
- Create: `tests/unit/document-lock.test.ts`
- Create: `tests/unit/executor.test.ts`

**Step 1: Write failing tests**

Test per-document contention, different-document locks, stale-lock diagnosis without
automatic deletion, global execution serialization, normal/heavy timeouts, process
failure mapping, and the rule that timed-out mutations are never retried.

**Step 2: Verify RED**

Run: `npm test -- tests/unit/document-lock.test.ts tests/unit/executor.test.ts`

Expected: FAIL.

**Step 3: Implement locking and executor**

Write lock metadata atomically, serialize JSX calls with an in-process promise
queue, classify failures, and retain ambiguous transaction artifacts.

**Step 4: Verify GREEN**

Run: `npm test -- tests/unit/document-lock.test.ts tests/unit/executor.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/runner tests/unit/document-lock.test.ts tests/unit/executor.test.ts
git commit -m "feat: serialize and lock illustrator mutations"
```

## Task 5: Build the ExtendScript core and exact document guard

**Files:**

- Create: `src/jsx/core/json.jsx`
- Create: `src/jsx/core/result.jsx`
- Create: `src/jsx/core/document.jsx`
- Create: `src/jsx/core/identity.jsx`
- Create: `src/jsx/core/snapshot.jsx`
- Create: `src/runner/jsx-builder.ts`
- Create: `tests/unit/jsx-builder.test.ts`
- Create: `tests/fixtures/jsx/document-guard-cases.json`

**Step 1: Write failing host tests**

Assert deterministic module order, ES3-safe output, exact path/name guard inclusion,
parameter/result path injection, dialog-state restoration, and caught error output.

**Step 2: Verify RED**

Run: `npm test -- tests/unit/jsx-builder.test.ts`

Expected: FAIL.

**Step 3: Implement ES3 core**

Port and improve `openOrActivate`, `requireDocExact`, snapshot, and safe result
helpers. Compare `fullName.fsName`, exact name, and canonical target path. Add UUID
lookup with named/content/geometry fallbacks. Do not use indices as identity.

**Step 4: Verify GREEN and static ES3 checks**

Run: `npm test -- tests/unit/jsx-builder.test.ts && npm run validate`

Expected: PASS and no `let`, `const`, arrow functions, template literals, or modern
array methods in emitted JSX.

**Step 5: Commit**

```bash
git add src/jsx/core src/runner/jsx-builder.ts tests/unit/jsx-builder.test.ts tests/fixtures/jsx
git commit -m "feat: add exact-document extendscript core"
```

## Task 6: Implement backup, transaction manifests, and save protection

**Files:**

- Create: `src/safety/backup.ts`
- Create: `src/safety/manifest.ts`
- Create: `src/jsx/commands/save.jsx`
- Create: `tests/unit/backup.test.ts`
- Create: `tests/unit/manifest.test.ts`

**Step 1: Write failing tests**

Cover timestamped non-overwriting backups, immutable reference targets, working-copy
in-place saves only after backup, chronology metadata, and PDF-compatible save
options.

**Step 2: Verify RED**

Run: `npm test -- tests/unit/backup.test.ts tests/unit/manifest.test.ts`

Expected: FAIL.

**Step 3: Implement minimum safety layer**

Use copy-with-exclusive-destination, SHA-256 fingerprints, a JSON transaction
manifest, explicit reference/working roles, and save precondition checks.

**Step 4: Verify GREEN**

Run: `npm test -- tests/unit/backup.test.ts tests/unit/manifest.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/safety src/jsx/commands/save.jsx tests/unit/backup.test.ts tests/unit/manifest.test.ts
git commit -m "feat: protect illustrator source and save chronology"
```

## Task 7: Implement document inspection and object snapshots

**Files:**

- Create: `src/jsx/commands/inspect.jsx`
- Create: `src/commands/inspect.ts`
- Create: `src/contracts/inspection.ts`
- Create: `tests/unit/inspection-contract.test.ts`
- Create: `tests/integration/inspect.integration.test.ts`

**Step 1: Write failing contract tests**

Specify artboards, layers, text frames, style runs, horizontal/vertical scale,
tracking/leading/justification, page items, links, raster items, UUIDs, names, notes,
geometric/visible bounds, lock/visibility, and compact/detail modes.

**Step 2: Verify RED**

Run: `npm test -- tests/unit/inspection-contract.test.ts`

Expected: FAIL.

**Step 3: Implement inspect command**

Emit structured JSON and avoid unnecessary redraws. Cache repeated properties inside
loops and cap preview text lengths.

**Step 4: Run unit test and mocked integration test**

Run: `npm test -- tests/unit/inspection-contract.test.ts tests/integration/inspect.integration.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/jsx/commands/inspect.jsx src/commands/inspect.ts src/contracts/inspection.ts tests/unit/inspection-contract.test.ts tests/integration/inspect.integration.test.ts
git commit -m "feat: inspect illustrator documents as structured json"
```

## Task 8: Port and test geometry, text, and Japanese typography helpers

**Files:**

- Create: `src/jsx/core/geometry.jsx`
- Create: `src/jsx/core/text.jsx`
- Create: `src/jsx/core/japanese-text.jsx`
- Create: `src/jsx/core/layout.jsx`
- Create: `tests/unit/jsx-helpers-static.test.ts`
- Create: `tests/e2e/typography.e2e.test.ts`

**Step 1: Write failing static and E2E specifications**

Cover anchoring, rigid translations, equal gaps, ink bounds, style-run-safe text
replacement, area overflow, JP justification, kinsoku, no-break, wave-dash
normalization, hyphen baseline, and reception-time fitting.

**Step 2: Verify static RED**

Run: `npm test -- tests/unit/jsx-helpers-static.test.ts`

Expected: FAIL.

**Step 3: Port minimal helpers from the current skill**

Preserve verified Illustrator 2026 enum spellings and documented crash guards. Split
helpers by domain and remove duplicate/global collisions.

**Step 4: Verify unit/static GREEN**

Run: `npm test -- tests/unit/jsx-helpers-static.test.ts`

Expected: PASS.

**Step 5: Defer real E2E execution until the fixture harness exists, but commit the
failing/skipped host-gated specification**

```bash
git add src/jsx/core tests/unit/jsx-helpers-static.test.ts tests/e2e/typography.e2e.test.ts
git commit -m "feat: add production typography and layout helpers"
```

## Task 9: Implement guarded aspect-ratio restoration

**Files:**

- Create: `src/aspect/axis-decision.ts`
- Create: `src/jsx/core/aspect-ratio.jsx`
- Create: `tests/unit/axis-decision.test.ts`
- Create: `tests/e2e/aspect-ratio.e2e.test.ts`
- Create: `tests/fixtures/aspect/measurements.json`

**Step 1: Write failing decision tests**

Test horizontal, vertical, ambiguous, explicit-axis conflict, insufficient glyph
sample, normal Japanese glyph ratio, and point-size-preservation requirements.

**Step 2: Verify RED**

Run: `npm test -- tests/unit/axis-decision.test.ts`

Expected: FAIL.

**Step 3: Implement decision and JSX helpers**

Require explicit or measured axis evidence, return `AMBIGUOUS_ASPECT_AXIS` when
uncertain, preserve stated point size, and require layout adjustment rather than
silent shrinking. For outlines, sample multiple square kanji against a temporary
100/100 outlined reference and use a robust median.

**Step 4: Verify unit GREEN**

Run: `npm test -- tests/unit/axis-decision.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/aspect src/jsx/core/aspect-ratio.jsx tests/unit/axis-decision.test.ts tests/e2e/aspect-ratio.e2e.test.ts tests/fixtures/aspect
git commit -m "feat: guard illustrator aspect-ratio corrections"
```

## Task 10: Implement external render, crop, compare, and verification reports

**Files:**

- Create: `src/render/dependencies.ts`
- Create: `src/render/render.ts`
- Create: `src/render/crop.ts`
- Create: `src/render/compare.ts`
- Create: `src/render/contact-sheet.ts`
- Create: `tests/unit/crop.test.ts`
- Create: `tests/unit/render-command.test.ts`
- Create: `tests/integration/render.integration.test.ts`

**Step 1: Write failing tests**

Cover point-to-pixel conversion, clipping, negative/out-of-range bounds, Poppler
preference, sips fallback, ffmpeg crop, artifact metadata, overlay/diff output, and
commands built without shell interpolation.

**Step 2: Verify RED**

Run: `npm test -- tests/unit/crop.test.ts tests/unit/render-command.test.ts`

Expected: FAIL.

**Step 3: Implement rendering pipeline**

Use `execFile`, saved PDF-compatible `.ai` input, deterministic output names, and
matching before/after crop coordinates. Preserve all generated artifacts in the
result envelope.

**Step 4: Verify GREEN and integration rendering**

Run: `npm test -- tests/unit/crop.test.ts tests/unit/render-command.test.ts tests/integration/render.integration.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/render tests/unit/crop.test.ts tests/unit/render-command.test.ts tests/integration/render.integration.test.ts
git commit -m "feat: render and compare illustrator documents"
```

## Task 11: Implement doctor and recovery diagnostics

**Files:**

- Create: `src/commands/doctor.ts`
- Create: `src/commands/recover.ts`
- Create: `src/platform/macos.ts`
- Create: `tests/unit/doctor.test.ts`
- Create: `tests/unit/recover.test.ts`

**Step 1: Write failing tests**

Model not-running, responsive/no-docs, correct-doc-open, wrong-doc-open,
modal/timeout, recovered-document, and ambiguous-running-transaction states.

**Step 2: Verify RED**

Run: `npm test -- tests/unit/doctor.test.ts tests/unit/recover.test.ts`

Expected: FAIL.

**Step 3: Implement read-only diagnosis**

Query process state and bounded AppleScript document metadata. Return exact next
actions without clicking dialogs, discarding recovery documents, or rerunning
mutations automatically.

**Step 4: Verify GREEN**

Run: `npm test -- tests/unit/doctor.test.ts tests/unit/recover.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/commands/doctor.ts src/commands/recover.ts src/platform/macos.ts tests/unit/doctor.test.ts tests/unit/recover.test.ts
git commit -m "feat: diagnose and recover illustrator sessions"
```

## Task 12: Assemble the integrated CLI

**Files:**

- Create: `src/cli/main.ts`
- Create: `src/cli/arguments.ts`
- Create: `bin/illustrator-ai`
- Modify: `src/index.ts`
- Modify: `package.json`
- Create: `tests/unit/cli.test.ts`
- Create: `tests/integration/cli.integration.test.ts`

**Step 1: Write failing CLI tests**

Test help, version, `doctor`, `inspect`, `backup`, `run`, `save`, `render`, `crop`,
`compare`, `verify`, and `recover`; absolute-path requirements; JSON-only stdout;
exit codes; and mutation confirmation/preconditions.

**Step 2: Verify RED**

Run: `npm test -- tests/unit/cli.test.ts`

Expected: FAIL.

**Step 3: Implement command routing**

Keep parsing deterministic and dependency-light. Connect every command to the
contract, safety layer, runner, and renderer.

**Step 4: Verify GREEN**

Run: `npm test -- tests/unit/cli.test.ts tests/integration/cli.integration.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/cli src/index.ts bin/illustrator-ai package.json package-lock.json tests/unit/cli.test.ts tests/integration/cli.integration.test.ts
git commit -m "feat: add illustrator-ai command line interface"
```

## Task 13: Build the synthetic Illustrator E2E fixture harness

**Files:**

- Create: `src/jsx/fixtures/create-test-document.jsx`
- Create: `tests/e2e/helpers.ts`
- Create: `tests/e2e/document-safety.e2e.test.ts`
- Modify: `tests/e2e/typography.e2e.test.ts`
- Modify: `tests/e2e/aspect-ratio.e2e.test.ts`
- Create: `tests/fixtures/synthetic/README.md`

**Step 1: Confirm E2E tests fail before harness implementation**

Run: `ILLUSTRATOR_E2E=1 npm test -- tests/e2e`

Expected: FAIL because fixture creation is missing.

**Step 2: Implement fixture generation**

Create disposable RGB and CMYK documents containing point text, area text,
Japanese text, 82%/83.3% distortions on each axis, outlined glyphs, groups, locked
layers, two similar document names, multiple artboards, and safe synthetic content.

**Step 3: Run E2E tests on Illustrator 2026**

Run: `ILLUSTRATOR_E2E=1 npm test -- tests/e2e`

Expected: PASS; all fixture files are created under a temporary directory and
closed without affecting user documents.

**Step 4: Run save/reopen/render assertions**

Verify exact path binding, Japanese path transport, PDF compatibility, rendered
PNG existence, and before/after property values.

**Step 5: Commit**

```bash
git add src/jsx/fixtures tests/e2e tests/fixtures/synthetic/README.md
git commit -m "test: add illustrator 2026 end-to-end fixtures"
```

## Task 14: Write the cross-agent skill and references

**Files:**

- Create: `SKILL.md`
- Create: `agents/openai.yaml`
- Create: `references/workflow.md`
- Create: `references/production-safety.md`
- Create: `references/illustrator-dom.md`
- Create: `references/japanese-typography.md`
- Create: `references/aspect-ratio.md`
- Create: `references/layout-review.md`
- Create: `references/crash-recovery.md`
- Create: `references/recipes.md`
- Create: `references/platforms.md`
- Create: `THIRD_PARTY_NOTICES.md`
- Create: `tests/unit/skill-structure.test.ts`

**Step 1: Write failing skill-structure tests**

Assert valid frontmatter, concise trigger-rich description, fewer than 500 lines,
all references linked, no duplicated full reference content, no platform-specific
agent assumptions, and valid `agents/openai.yaml`.

**Step 2: Verify RED**

Run: `npm test -- tests/unit/skill-structure.test.ts`

Expected: FAIL.

**Step 3: Write the minimal workflow skill**

Port the current skill's proven production rules, route details into references,
and make the integrated CLI the default. Explicitly require inspect-before-edit,
backup, exact target binding, small transactions, render verification, and
whole-section review.

**Step 4: Add provenance**

Document current local-skill ancestry and any adopted MIT patterns from
`ie3jp/illustrator-mcp-server`, `mikechambers/adb-mcp`, and
`github/awesome-copilot`.

**Step 5: Verify GREEN**

Run: `npm test -- tests/unit/skill-structure.test.ts && npm run validate`

Expected: PASS.

**Step 6: Commit**

```bash
git add SKILL.md agents references THIRD_PARTY_NOTICES.md tests/unit/skill-structure.test.ts
git commit -m "feat: add cross-agent illustrator editing skill"
```

## Task 15: Add prompt evaluations for Codex and Claude Code

**Files:**

- Create: `tests/prompts/cases.json`
- Create: `tests/prompts/rubric.md`
- Create: `scripts/run-prompt-evals.sh`
- Create: `tests/unit/prompt-cases.test.ts`

**Step 1: Write failing prompt-case validation tests**

Require should-trigger, should-not-trigger, safety, timeout, wrong-document,
aspect-axis, and visual-verification categories with expected behaviors.

**Step 2: Verify RED**

Run: `npm test -- tests/unit/prompt-cases.test.ts`

Expected: FAIL.

**Step 3: Add evaluation corpus and runner**

Support dry-run validation by default and explicit live runs against `codex exec`
and `claude -p`. Never include production file paths or content in prompt fixtures.

**Step 4: Run dry and live evaluations**

Run: `npm test -- tests/unit/prompt-cases.test.ts`

Run live only with explicit local-agent availability:

```bash
scripts/run-prompt-evals.sh codex
scripts/run-prompt-evals.sh claude
```

Expected: activation and safety rubric passes; record failures and refine
`description`/instructions before proceeding.

**Step 5: Commit**

```bash
git add tests/prompts scripts/run-prompt-evals.sh tests/unit/prompt-cases.test.ts SKILL.md
git commit -m "test: evaluate illustrator skill across agents"
```

## Task 16: Install one canonical skill into Codex and Claude Code

**Files:**

- Create: `scripts/install.sh`
- Create: `scripts/uninstall.sh`
- Create: `tests/unit/installer.test.ts`
- Modify: `README.md`

**Step 1: Write failing installer tests**

Test backup of existing directories, symlink creation, idempotency, rollback after
partial failure, refusal to overwrite unrelated symlinks, and dry-run output.

**Step 2: Verify RED**

Run: `npm test -- tests/unit/installer.test.ts`

Expected: FAIL.

**Step 3: Implement installer and rollback**

Target `~/.agents/skills/illustrator-ai-editing` and
`~/.claude/skills/illustrator-ai-editing`. Preserve timestamped backups and print
their paths. Require explicit `--apply`; default to dry-run.

**Step 4: Verify tests and perform installation**

Run: `npm test -- tests/unit/installer.test.ts`

Run: `scripts/install.sh --dry-run`

After reviewing output, run: `scripts/install.sh --apply`

Expected: both locations resolve to the canonical repository and existing copies
remain backed up.

**Step 5: Commit**

```bash
git add scripts/install.sh scripts/uninstall.sh tests/unit/installer.test.ts README.md
git commit -m "feat: install shared skill for codex and claude"
```

## Task 17: Run a real-document smoke test on safe copies

**Files:**

- Create: `docs/verification/real-document-smoke-test.md`
- Do not track: copied `.ai` files, backups, PNGs, sidecars, or logs

**Step 1: Select a non-pristine working copy**

Use a temporary copy of a prior real flyer working file. Mark the older
pre-review file as comparison-only. Do not mutate either original.

**Step 2: Run read-only inspection and rendering**

Run `doctor`, `inspect`, `render`, and matching crops. Confirm the exact selected
path in every JSON result.

**Step 3: Run one reversible edit transaction**

On the temporary copy only, apply a harmless test property change and restore it in
a second saved transaction. Verify automatic backups, snapshots, save/reopen, and
visual comparison.

**Step 4: Verify safety edge cases**

Open a similarly named copy and confirm wrong-document binding is rejected. Confirm
the comparison-only reference cannot be a save target.

**Step 5: Record sanitized evidence**

Write only commands, pass/fail results, Illustrator version, and artifact hashes;
exclude customer content and file names where unnecessary.

**Step 6: Commit the sanitized report**

```bash
git add docs/verification/real-document-smoke-test.md
git commit -m "test: verify skill on a production-style illustrator copy"
```

## Task 18: Final verification and private GitHub publication

**Files:**

- Create: `scripts/prepublish-check.sh`
- Create: `tests/unit/prepublish.test.ts`
- Modify: `README.md`
- Modify: `THIRD_PARTY_NOTICES.md`

**Step 1: Write failing prepublish tests**

Assert no tracked `.ai`, images, sidecars, backups, transaction data, absolute home
paths, obvious secrets, or customer identifiers; require clean tests and attribution.

**Step 2: Verify RED, implement checker, verify GREEN**

Run: `npm test -- tests/unit/prepublish.test.ts`

Then implement and run:

```bash
npm run typecheck
npm test
ILLUSTRATOR_E2E=1 npm test -- tests/e2e
npm run build
npm run validate
scripts/prepublish-check.sh
git status --short
```

Expected: all pass and the worktree is clean after committing final changes.

**Step 3: Use verification-before-completion**

Inspect actual outputs rather than relying on previous runs. Confirm both personal
skill paths resolve to the canonical repo and both agents discover the skill.

**Step 4: Confirm GitHub target with the user**

Ask for the GitHub owner and repository name. Recommended name:
`illustrator-ai-editing-skill`.

**Step 5: Verify account and create a private repository**

```bash
gh auth status
gh repo create OWNER/REPO --private --source=. --remote=origin
gh repo view OWNER/REPO --json visibility,nameWithOwner
```

Expected: `visibility` is `PRIVATE` before any push.

**Step 6: Push the tested history and tag**

```bash
git push -u origin main
git tag -a v1.0.0 -m "Illustrator AI Editing Skill v1.0.0"
git push origin v1.0.0
```

**Step 7: Verify remote contents and visibility**

Run `gh repo view`, inspect the remote tree, and confirm no excluded artifacts or
sensitive data were published.

**Step 8: Final handoff**

Report canonical path, installed symlinks, backup locations, Illustrator/Codex/
Claude versions, test counts, E2E evidence, private repository URL, tag, known
limitations, and the deferred Windows bridge.

