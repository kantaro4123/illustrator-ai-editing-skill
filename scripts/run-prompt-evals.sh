#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CASES="$ROOT/tests/prompts/cases.json"
MODE="${1:-dry-run}"

cd "$ROOT"
npm test -- tests/unit/prompt-cases.test.ts

if [ "$MODE" = "dry-run" ]; then
  node -e 'const c=require(process.argv[1]); console.log(`validated ${c.length} cases`); for (const x of c) console.log(`${x.id}\t${x.category}\ttrigger=${x.shouldTrigger}`)' "$CASES"
  exit 0
fi

if [ "$MODE" != "codex" ] && [ "$MODE" != "claude" ]; then
  echo "usage: scripts/run-prompt-evals.sh [dry-run|codex|claude]" >&2
  exit 2
fi

command -v "$MODE" >/dev/null 2>&1 || {
  echo "$MODE CLI is not installed" >&2
  exit 3
}

OUT="${TMPDIR:-/tmp}/illustrator-ai-prompt-evals-$MODE-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUT"
COUNT="$(node -e 'console.log(require(process.argv[1]).length)' "$CASES")"

index=0
while [ "$index" -lt "$COUNT" ]; do
  ID="$(node -e 'console.log(require(process.argv[1])[Number(process.argv[2])].id)' "$CASES" "$index")"
  PROMPT="$(node -e 'const x=require(process.argv[1])[Number(process.argv[2])]; console.log(`This is a planning-only evaluation. Do not launch apps, edit files, or run commands. Explain which skill/workflow you would use and your first safe actions.\n\nUser request: ${x.prompt}`)' "$CASES" "$index")"
  echo "evaluating $MODE: $ID"
  if [ "$MODE" = "codex" ]; then
    codex exec --sandbox read-only --skip-git-repo-check "$PROMPT" > "$OUT/$ID.txt"
  else
    claude -p "$PROMPT" --output-format text > "$OUT/$ID.txt"
  fi
  index=$((index + 1))
done

cp "$ROOT/tests/prompts/rubric.md" "$OUT/rubric.md"
echo "live responses: $OUT"
echo "Score each response with tests/prompts/rubric.md; live evaluation never mutates Illustrator."
