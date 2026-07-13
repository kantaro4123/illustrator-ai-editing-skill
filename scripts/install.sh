#!/bin/bash
set -euo pipefail

MODE="dry-run"
case "${1:-}" in
  ""|--dry-run) ;;
  --apply) MODE="apply" ;;
  *) echo "usage: scripts/install.sh [--dry-run|--apply]" >&2; exit 2 ;;
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
    linked="$(resolve_link "$target")"
    if [ "$linked" != "$SOURCE" ]; then
      echo "refusing unrelated symlink: $target -> $(readlink "$target")" >&2
      exit 4
    fi
  fi
done

if [ "$MODE" = "dry-run" ]; then
  echo "DRY-RUN canonical source: $SOURCE"
  for target in "${TARGETS[@]}"; do
    if [ -L "$target" ]; then
      echo "already installed: $target"
    elif [ -e "$target" ]; then
      echo "would back up and link: $target"
    else
      echo "would create link: $target"
    fi
  done
  echo "Run scripts/install.sh --apply to make these changes."
  exit 0
fi

changed_targets=()
backup_paths=()
rollback() {
  status=$?
  trap - EXIT
  if [ "$status" -ne 0 ]; then
    index=$((${#changed_targets[@]} - 1))
    while [ "$index" -ge 0 ]; do
      target="${changed_targets[$index]}"
      backup="${backup_paths[$index]}"
      if [ -L "$target" ] && [ "$(resolve_link "$target")" = "$SOURCE" ]; then
        unlink "$target"
      fi
      if [ -n "$backup" ] && [ -e "$backup" ]; then
        mv "$backup" "$target"
      fi
      index=$((index - 1))
    done
    echo "installation failed; prior targets restored" >&2
  fi
  exit "$status"
}
trap rollback EXIT

stamp="$(date -u +%Y%m%d_%H%M%S).$$"
count=0
for target in "${TARGETS[@]}"; do
  if [ -L "$target" ]; then
    echo "already installed: $target"
    continue
  fi
  mkdir -p "$(dirname "$target")"
  backup=""
  if [ -e "$target" ]; then
    backup="$target.backup.$stamp"
    mv "$target" "$backup"
    echo "backup: $backup"
  fi
  changed_targets+=("$target")
  backup_paths+=("$backup")
  ln -s "$SOURCE" "$target"
  count=$((count + 1))
  if [ "${ILLUSTRATOR_INSTALL_FAIL_AFTER:-0}" = "$count" ]; then
    echo "injected installation failure after target $count" >&2
    exit 99
  fi
  echo "installed: $target -> $SOURCE"
done

trap - EXIT
echo "installation complete"
