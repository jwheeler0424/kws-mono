#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

STACK_NAME="${STACK_NAME:-kws}"

echo "[swarm-local-down] Removing stack $STACK_NAME"
docker stack rm "$STACK_NAME" >/dev/null 2>&1 || true

for _ in $(seq 1 30); do
  if ! docker stack ls --format '{{.Name}}' | grep -qx "$STACK_NAME"; then
    break
  fi
  sleep 1
done

echo "[swarm-local-down] Waiting for services to disappear"
for _ in $(seq 1 30); do
  if [[ -z "$(docker service ls --format '{{.Name}}' | grep -E "^${STACK_NAME}_" || true)" ]]; then
    break
  fi
  sleep 1
done

RUNNING_CONTAINERS="$(docker ps -q --filter "name=^${STACK_NAME}_")"
if [[ -n "$RUNNING_CONTAINERS" ]]; then
  echo "[swarm-local-down] Stopping lingering ${STACK_NAME}_ containers"
  docker stop $RUNNING_CONTAINERS >/dev/null || true
fi

ALL_STACK_CONTAINERS="$(docker ps -aq --filter "name=^${STACK_NAME}_")"
if [[ -n "$ALL_STACK_CONTAINERS" ]]; then
  echo "[swarm-local-down] Removing lingering ${STACK_NAME}_ containers"
  docker rm $ALL_STACK_CONTAINERS >/dev/null || true
fi

echo "[swarm-local-down] Done"
docker ps -a --format "table {{.Names}}\t{{.Status}}" | (head -n 1 && grep -E "^${STACK_NAME}_" || true)
