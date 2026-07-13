#!/bin/bash
set -euo pipefail

MODE="dry-run"
case "${1:-}" in
  ""|--dry-run) ;;
  --apply) MODE="apply" ;;
  *) echo "usage: scripts/uninstall.sh [--dry-run|--apply]" >&2; exit 2 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
SOURCE="${ILLUSTRATOR_SKILL_SOURCE:-$(cd "$SCRIPT_DIR/.." && pwd -P)}"
SOURCE="$(cd "$SOURCE" && pwd -P)"
TARGETS=(
  "$HOME/.agents/skills/illustrator-ai-editing"
  "$HOME/.claude/skills/illustrator-ai-editing"
)

resolve_link() {
  local target="$1" value
  value="$(readlink "$target")"
  if [[ "$value" = /* ]]; then
    (cd "$value" 2>/dev/null && pwd -P) || printf '%s\n' "$value"
  else
    (cd "$(dirname "$target")/$value" 2>/dev/null && pwd -P) || printf '%s\n' "$(dirname "$target")/$value"
  fi
}

for target in "${TARGETS[@]}"; do
  if [ -L "$target" ]; then
    if [ "$(resolve_link "$target")" != "$SOURCE" ]; then
      echo "refusing unrelated symlink: $target -> $(readlink "$target")" >&2
      exit 4
    fi
  elif [ -e "$target" ]; then
    echo "refusing non-symlink target: $target" >&2
    exit 5
  fi
done

for target in "${TARGETS[@]}"; do
  if [ ! -L "$target" ]; then
    echo "not installed: $target"
  elif [ "$MODE" = "dry-run" ]; then
    echo "DRY-RUN would unlink: $target"
  else
    unlink "$target"
    echo "uninstalled: $target"
  fi
done

if [ "$MODE" = "dry-run" ]; then
  echo "Run scripts/uninstall.sh --apply to remove canonical links. Backups are retained."
fi
