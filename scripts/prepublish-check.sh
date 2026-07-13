#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"

fail() {
  printf 'prepublish: %s\n' "$1" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || fail "git is required"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "not a git worktree"

git ls-files -z | while IFS= read -r -d '' path; do
  case "$path" in
    *.ai|*.ait|*.eps|*.pdf|*.png|*.jpg|*.jpeg|*.tif|*.tiff|*.psd|*.bak|*.out|*.log|*.DS_Store|*_backup_*|*/transactions/*|*/.illustrator-ai/*)
      printf 'prepublish: forbidden tracked artifact: %s\n' "$path" >&2
      exit 42
      ;;
  esac
done || fail "remove forbidden generated or production artifacts"

# Keep the literal split so this checker does not match its own policy string.
PERSONAL_PATH_PATTERN='/User''s/[^/[:space:]]+'
SECRET_PATTERN='BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY|github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9]+|AKIA[0-9A-Z]{16}'

if git grep -I -n -E "$PERSONAL_PATH_PATTERN" -- . ':!scripts/prepublish-check.sh'; then
  fail "remove personal absolute paths from tracked text"
fi
if git grep -I -n -E "$SECRET_PATTERN" -- . ':!scripts/prepublish-check.sh'; then
  fail "possible secret found in tracked text"
fi
if [ -n "${PREPUBLISH_DENY_PATTERN:-}" ] && git grep -I -n -E "$PREPUBLISH_DENY_PATTERN" -- .; then
  fail "project-specific denied text found"
fi

[ -f LICENSE ] || fail "LICENSE is required"
[ -f THIRD_PARTY_NOTICES.md ] || fail "THIRD_PARTY_NOTICES.md is required"

printf 'prepublish: PASS (%s tracked files)\n' "$(git ls-files | wc -l | tr -d ' ')"
