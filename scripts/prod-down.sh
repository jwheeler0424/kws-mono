#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-.env}"
STACK_NAME="${STACK_NAME:-kws}"

if [[ ! -f "$COMPOSE_ENV_FILE" ]]; then
  echo "[prod-down] Missing env file: $COMPOSE_ENV_FILE"
  exit 1
fi

set -a
source "$COMPOSE_ENV_FILE"
set +a

export COMPOSE_ENV_FILE

if docker stack ls --format '{{.Name}}' | grep -qx "$STACK_NAME"; then
  echo "[prod-down] Removing stack: $STACK_NAME"
  docker stack rm "$STACK_NAME"
else
  echo "[prod-down] Stack $STACK_NAME is not deployed"
fi

for _ in {1..60}; do
  leftovers="$(docker service ls --format '{{.Name}}' | grep "^${STACK_NAME}_" || true)"
  [[ -z "$leftovers" ]] && break
  sleep 1
done

if [[ "${WIPE_DATA:-0}" == "1" ]]; then
  echo "[prod-down] Removing named volumes for stack: $STACK_NAME"
  for vol in pgdata_prod redisdata_prod letsencrypt certbot_www; do
    docker volume rm "${STACK_NAME}_${vol}" >/dev/null 2>&1 || true
  done
fi
