#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-.env}"
STACK_NAME="${STACK_NAME:-kws}"

if [[ ! -f "$COMPOSE_ENV_FILE" ]]; then
  echo "[prod-ps] Missing env file: $COMPOSE_ENV_FILE"
  exit 1
fi

set -a
source "$COMPOSE_ENV_FILE"
set +a

export COMPOSE_ENV_FILE

docker stack services "$STACK_NAME"
echo
docker stack ps "$STACK_NAME" --no-trunc
