#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-.env}"
STACK_NAME="${STACK_NAME:-kws}"

if [[ ! -f "$COMPOSE_ENV_FILE" ]]; then
  echo "[prod-logs] Missing env file: $COMPOSE_ENV_FILE"
  exit 1
fi

set -a
source "$COMPOSE_ENV_FILE"
set +a

export COMPOSE_ENV_FILE

SERVICE_NAME="${1:-web}"

if [[ "$SERVICE_NAME" == *"_"* ]]; then
  FULL_SERVICE_NAME="$SERVICE_NAME"
else
  FULL_SERVICE_NAME="${STACK_NAME}_${SERVICE_NAME}"
fi

docker service logs -f --tail "${TAIL:-200}" "$FULL_SERVICE_NAME"
