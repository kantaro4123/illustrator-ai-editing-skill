# Illustrator AI Editing Skill

A production-safety-first Adobe Illustrator editing skill and deterministic CLI for
Codex and Claude Code.

The initial stable target is macOS with Adobe Illustrator 2026. The Illustrator-side
ExtendScript modules remain platform-neutral so a verified Windows bridge can be
added later.

The package combines:

- a shared `SKILL.md` and focused references for Codex and Claude Code;
- a deterministic `illustrator-ai` CLI with JSON-only command results;
- exact path/name document binding, backups, locks, and no-auto-retry timeouts;
- structure inspection, mutation wrapping, PDF-based rendering, crops, and comparison;
- synthetic Illustrator host E2E tests and a production-copy smoke-test protocol.

## Install for Codex and Claude Code

The repository is the canonical skill directory. Both agent discovery locations are
symlinked to it so they cannot drift.

```bash
npm install
npm run build
npm run validate
scripts/install.sh                 # dry-run; writes nothing
scripts/install.sh --apply         # backs up existing copies, then links both agents
```

Targets are `~/.agents/skills/illustrator-ai-editing` and
`~/.claude/skills/illustrator-ai-editing`. Existing directories receive timestamped
backups beside their original locations. An unrelated symlink is never overwritten,
and a partial installation rolls back already changed targets.

```bash
scripts/uninstall.sh               # dry-run
scripts/uninstall.sh --apply       # removes only links to this canonical repository
```

Uninstall retains backups for manual recovery. Run `npm run validate` before install
or publication; run `ILLUSTRATOR_E2E=1 npm test -- tests/e2e` for the disposable
Illustrator 2026 host suite.

## Safe command loop

```bash
bin/illustrator-ai doctor
bin/illustrator-ai inspect /absolute/path/working.ai --detail compact
bin/illustrator-ai backup /absolute/path/working.ai
bin/illustrator-ai run /absolute/path/working.ai \
  --script /absolute/path/edit.jsx --confirm
bin/illustrator-ai save /absolute/path/working.ai \
  --confirm --role working --review-round 2
bin/illustrator-ai render /absolute/path/working.ai \
  --dpi 150 --output /tmp/review.png
```

Never target a pristine reference with a mutation. Never retry a timed-out operation
until the host has settled and `doctor` confirms its state. Read
[`SKILL.md`](SKILL.md) for the full workflow and reference routing.

## Verification and publication

```bash
npm run validate
npm run build
python3 /path/to/skill-creator/scripts/quick_validate.py .
npm run prepublish:check
```

`prepublish:check` rejects tracked production/generated artwork, personal absolute paths,
and common credential formats. A deployment can add client-specific terms without
committing them:

```bash
PREPUBLISH_DENY_PATTERN='client-name|project-number' npm run prepublish:check
```

No production Illustrator document or rendered client artwork belongs in this
repository. See [the real-document copy smoke-test report](docs/verification/real-document-smoke-test.md)
for the validated safety behavior; it contains metrics only, not client content.

## Development

- `npm test`: unit and mocked integration tests; live E2E files skip by default.
- `ILLUSTRATOR_E2E=1 npm test -- tests/e2e`: destructive tests on generated fixtures
  in an otherwise empty Illustrator session.
- `scripts/run-prompt-evals.sh dry-run`: validate the shared prompt corpus.
- `scripts/run-prompt-evals.sh codex|claude`: planning-only live agent evaluation.

Architecture and implementation records are in `docs/plans/`. Third-party research
provenance is documented in `THIRD_PARTY_NOTICES.md`.
