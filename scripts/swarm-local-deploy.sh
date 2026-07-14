#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

STACK_NAME="${STACK_NAME:-kws}"
ENV_FILE="${ENV_FILE:-packages/config/.env}"
STACK_FILE="${STACK_FILE:-docker-stack.prod.local.yml}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.ci.yml}"
WEB_REPLICAS="${WEB_REPLICAS:-2}"
MLS_REPLICAS="${MLS_REPLICAS:-1}"
TASK_HISTORY_LIMIT="${TASK_HISTORY_LIMIT:-0}"
RESET_STACK="${RESET_STACK:-0}"
STORE_PATH="${STORE_PATH:-$ROOT_DIR/store}"
SWARM_DB_PORT="${SWARM_DB_PORT:-${DB_PORT:-5432}}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-1}"
DB_INIT_PATH="${DB_INIT_PATH:-$ROOT_DIR/docker/database}"

APP_IMAGE="${APP_IMAGE:-kws-local/web:swarm}"
MLS_IMAGE="${MLS_IMAGE:-kws-local/mls:swarm}"
DB_IMAGE="${DB_IMAGE:-kws-local/db:swarm}"
REDIS_IMAGE="${REDIS_IMAGE:-kws-local/redis:swarm}"
NGINX_IMAGE="${NGINX_IMAGE:-kws-local/nginx:swarm}"

SKIP_WEB_BUILD="${SKIP_WEB_BUILD:-0}"
SKIP_MLS_BUILD="${SKIP_MLS_BUILD:-0}"

expand_home_tokens() {
  local value="$1"
  local home_dir="${HOME:-}"

  if [[ -n "$home_dir" ]]; then
    value="${value//\$HOME/$home_dir}"
    value="${value//\$\{HOME\}/$home_dir}"
  fi

  printf '%s\n' "$value"
}

normalize_path_var() {
  local value
  value="$(expand_home_tokens "$1")"

  if [[ -n "$value" && "$value" != /* ]]; then
    value="$ROOT_DIR/$value"
  fi

  printf '%s\n' "$value"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[swarm-local] Missing required command: $1"
    exit 1
  fi
}

load_env_file() {
  local env_path="$1"
  [[ -f "$env_path" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"

    if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "${line//[[:space:]]/}" ]]; then
      continue
    fi

    if [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"

      # Strip one matching pair of surrounding quotes, preserving inner chars.
      if [[ "$value" =~ ^\"(.*)\"$ ]]; then
        value="${BASH_REMATCH[1]}"
      elif [[ "$value" =~ ^\'(.*)\'$ ]]; then
        value="${BASH_REMATCH[1]}"
      fi

      export "$key=$value"
    fi
  done <"$env_path"
}

require_cmd docker
require_cmd bun

if [[ -f "$ENV_FILE" ]]; then
  echo "[swarm-local] Loading environment from $ENV_FILE"
  load_env_file "$ENV_FILE"
fi

if [[ "$RUN_MIGRATIONS" == "1" ]]; then
  if [[ -z "${DKIM_PRIVATE_KEY:-}" || -z "${MLS_START_DATE:-}" ]]; then
    echo "[swarm-local] RUN_MIGRATIONS=1 requires DKIM_PRIVATE_KEY and MLS_START_DATE in $ENV_FILE"
    exit 1
  fi
fi

STORE_PATH="$(normalize_path_var "$STORE_PATH")"
DB_INIT_PATH="$(normalize_path_var "$DB_INIT_PATH")"

if [[ "$STORE_PATH" == *'\$HOME'* || "$STORE_PATH" == *'\${HOME}'* ]]; then
  echo "[swarm-local] STORE_PATH contains unresolved HOME token: $STORE_PATH"
  exit 1
fi

if [[ "$DB_INIT_PATH" == *'\$HOME'* || "$DB_INIT_PATH" == *'\${HOME}'* ]]; then
  echo "[swarm-local] DB_INIT_PATH contains unresolved HOME token: $DB_INIT_PATH"
  exit 1
fi

export STORE_PATH
export SWARM_DB_PORT
export DB_INIT_PATH
export APP_IMAGE
export MLS_IMAGE
export DB_IMAGE
export REDIS_IMAGE
export NGINX_IMAGE

mkdir -p "$STORE_PATH/media"
mkdir -p "$STORE_PATH/data"
mkdir -p "$DB_INIT_PATH"

SWARM_STATE="$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || true)"
if [[ "$SWARM_STATE" != "active" ]]; then
  echo "[swarm-local] Docker Swarm is not active. Initializing on this node..."
  docker swarm init
fi

echo "[swarm-local] Setting task history limit to $TASK_HISTORY_LIMIT"
docker swarm update --task-history-limit "$TASK_HISTORY_LIMIT" >/dev/null

if [[ "$RESET_STACK" == "1" ]]; then
  echo "[swarm-local] Resetting stack $STACK_NAME before deploy"
  docker stack rm "$STACK_NAME" >/dev/null 2>&1 || true
  for _ in $(seq 1 30); do
    if ! docker stack ls --format '{{.Name}}' | grep -qx "$STACK_NAME"; then
      break
    fi
    sleep 1
  done
fi

echo "[swarm-local] Removing exited containers from stack $STACK_NAME"
STACK_EXITED_CONTAINERS="$(docker ps -aq --filter "label=com.docker.stack.namespace=${STACK_NAME}" --filter status=exited)"
if [[ -n "$STACK_EXITED_CONTAINERS" ]]; then
  docker rm $STACK_EXITED_CONTAINERS >/dev/null
fi

echo "[swarm-local] Building monorepo artifacts..."
bun run build

echo "[swarm-local] Building local Docker images..."
APP_IMAGE="$APP_IMAGE" \
MLS_IMAGE="$MLS_IMAGE" \
DB_IMAGE="$DB_IMAGE" \
REDIS_IMAGE="$REDIS_IMAGE" \
NGINX_IMAGE="$NGINX_IMAGE" \
SKIP_WEB_BUILD="$SKIP_WEB_BUILD" \
SKIP_MLS_BUILD="$SKIP_MLS_BUILD" \
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build app mls db redis nginx

echo "[swarm-local] Validating web image contains built server artifact"
docker run --rm --entrypoint sh "$APP_IMAGE" -lc 'test -f /app/apps/web/dist/server/server.js'

echo "[swarm-local] Validating mls image contains runtime entrypoint"
docker run --rm --entrypoint sh "$MLS_IMAGE" -lc 'test -f /app/apps/mls/src/index.ts'

echo "[swarm-local] Deploying stack (STACK_NAME=$STACK_NAME)..."
echo "[swarm-local] Using APP_IMAGE=$APP_IMAGE"
echo "[swarm-local] Using MLS_IMAGE=$MLS_IMAGE"
echo "[swarm-local] Using DB_IMAGE=$DB_IMAGE"
echo "[swarm-local] Using REDIS_IMAGE=$REDIS_IMAGE"
echo "[swarm-local] Using NGINX_IMAGE=$NGINX_IMAGE"
echo "[swarm-local] Using STORE_PATH=$STORE_PATH"
echo "[swarm-local] Using DB_INIT_PATH=$DB_INIT_PATH"

if [[ "$RUN_MIGRATIONS" == "1" ]]; then
  WEB_REPLICAS=0 MLS_REPLICAS=0 docker stack deploy \
    --prune \
    --resolve-image never \
    --compose-file "$STACK_FILE" \
    "$STACK_NAME"
else
  WEB_REPLICAS="$WEB_REPLICAS" MLS_REPLICAS="$MLS_REPLICAS" docker stack deploy \
    --prune \
    --resolve-image never \
    --compose-file "$STACK_FILE" \
    "$STACK_NAME"
fi

NETWORK_NAME="${STACK_NAME}_backend"

if [[ "$RUN_MIGRATIONS" == "1" ]]; then
  echo "[swarm-local] Running db migrations from local workspace against localhost:$SWARM_DB_PORT"
  MIGRATED=0
  for attempt in $(seq 1 20); do
    if NODE_ENV=development \
      DB_HOST=localhost \
      DB_PORT="$SWARM_DB_PORT" \
      DB_USER="${DB_USER:-postgres}" \
      DB_PASSWORD="${DB_PASSWORD:-postgres}" \
      DB_NAME="${DB_NAME:-postgres}" \
      DKIM_PRIVATE_KEY="$DKIM_PRIVATE_KEY" \
      MLS_START_DATE="$MLS_START_DATE" \
      DATABASE_URL="postgres://${DB_USER:-postgres}:${DB_PASSWORD:-postgres}@localhost:${SWARM_DB_PORT}/${DB_NAME:-postgres}" \
      bun run db:migrate; then
      MIGRATED=1
      break
    fi

    echo "[swarm-local] Migration attempt $attempt/20 failed; retrying..."
    sleep 3
  done

  if [[ "$MIGRATED" != "1" ]]; then
    echo "[swarm-local] Migration failed after 20 attempts."
    exit 1
  fi

  echo "[swarm-local] Scaling services to target replicas (web=$WEB_REPLICAS, mls=$MLS_REPLICAS)..."
  docker service scale \
    "${STACK_NAME}_web=${WEB_REPLICAS}" \
    "${STACK_NAME}_mls=${MLS_REPLICAS}"
fi

echo "[swarm-local] Deployment complete."
docker service ls --filter "label=com.docker.stack.namespace=${STACK_NAME}"

echo "[swarm-local] Cleaning exited containers for stack $STACK_NAME"
STACK_EXITED_CONTAINERS="$(docker ps -aq --filter "label=com.docker.stack.namespace=${STACK_NAME}" --filter status=exited)"
if [[ -n "$STACK_EXITED_CONTAINERS" ]]; then
  docker rm $STACK_EXITED_CONTAINERS >/dev/null
fi
