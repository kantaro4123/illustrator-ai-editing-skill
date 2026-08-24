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
    *.ai|*.ait|*.eps|*.pdf|*.png|*.jpg|*.jpeg|*.tif|*.tiff|*.psd|*.bak|*.out|*.log|*.illustrator-ai.json|*.DS_Store|*_backup_*|*/transactions/*|*/.illustrator-ai/*)
      printf 'prepublish: forbidden tracked artifact: %s\n' "$path" >&2
      exit 42
      ;;
  esac
done || fail "remove forbidden generated or production artifacts"

# Keep the literal split so this checker does not match its own policy string.
PERSONAL_PATH_PATTERN='/User''s/[^/[:space:]]+'
SECRET_PATTERN='BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY|github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9]+|AKIA[0-9A-Z]{16}'
SCAN_RESULT=$(mktemp "${TMPDIR:-/tmp}/illustrator-prepublish.XXXXXX")
trap 'rm -f "$SCAN_RESULT"' EXIT

scan_history() {
  pattern=$1
  exclude_checker=$2
  : > "$SCAN_RESULT"
  for revision in $(git rev-list HEAD); do
    if [ "$exclude_checker" = yes ]; then
      git grep -I -n -E "$pattern" "$revision" -- . ':!scripts/prepublish-check.sh' >> "$SCAN_RESULT" || true
    else
      git grep -I -n -E "$pattern" "$revision" -- . >> "$SCAN_RESULT" || true
    fi
  done
  if [ -s "$SCAN_RESULT" ]; then
    sed -n '1,20p' "$SCAN_RESULT" >&2
    return 0
  fi
  return 1
}

if scan_history "$PERSONAL_PATH_PATTERN" yes; then
  fail "remove personal absolute paths from tracked text"
fi
if scan_history "$SECRET_PATTERN" yes; then
  fail "possible secret found in tracked text"
fi
if [ -n "${PREPUBLISH_DENY_PATTERN:-}" ] && scan_history "$PREPUBLISH_DENY_PATTERN" no; then
  fail "project-specific denied text found"
fi
if git log HEAD --format='%ae%n%ce' | grep -E '\.local$'; then
  fail "local-machine commit email found in history"
fi

[ -f LICENSE ] || fail "LICENSE is required"
[ -f THIRD_PARTY_NOTICES.md ] || fail "THIRD_PARTY_NOTICES.md is required"

printf 'prepublish: PASS (%s tracked files)\n' "$(git ls-files | wc -l | tr -d ' ')"
