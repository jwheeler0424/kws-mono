#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-.env}"
if [[ ! -f "$COMPOSE_ENV_FILE" ]]; then
  echo "[prod-init-store] Missing env file: $COMPOSE_ENV_FILE"
  exit 1
fi

set -a
source "$COMPOSE_ENV_FILE"
set +a

export STORE_PATH="${STORE_PATH:-$HOME/store/kyleweberseattle.com}"

mkdir -p "$STORE_PATH/media" "$STORE_PATH/data"

# Optional convenience symlink so repository-local ./store points at persistent server storage.
if [[ ! -e "store" ]]; then
  ln -s "$STORE_PATH" "store"
  echo "[prod-init-store] Created symlink: $ROOT_DIR/store -> $STORE_PATH"
elif [[ -L "store" ]]; then
  echo "[prod-init-store] Existing symlink detected at $ROOT_DIR/store"
else
  echo "[prod-init-store] $ROOT_DIR/store already exists and is not a symlink; leaving it unchanged"
fi

echo "[prod-init-store] Store directories are ready at: $STORE_PATH"
