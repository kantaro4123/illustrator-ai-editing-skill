# Illustrator AI Editing Skill

A production-safety-first Adobe Illustrator editing skill and deterministic CLI for
Codex and Claude Code.

The first stable release targets macOS and Adobe Illustrator 2026. Illustrator-side
ExtendScript modules remain platform-neutral so a verified Windows bridge can be
added later.

Implementation is in progress. See `docs/plans/` for the approved architecture and
test plan.

## Install for Codex and Claude Code

The repository is the canonical skill directory. Both agent discovery locations are
symlinked to it so they cannot drift.

```bash
npm install
npm run build
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
