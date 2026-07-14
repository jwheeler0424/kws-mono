#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-.env}"
STACK_NAME="${STACK_NAME:-kws}"
TARGET_WEB_REPLICAS="${WEB_REPLICAS:-3}"
TARGET_MLS_REPLICAS="${MLS_REPLICAS:-1}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-1}"

if [[ ! -f "$COMPOSE_ENV_FILE" ]]; then
  echo "[prod-up] Missing env file: $COMPOSE_ENV_FILE"
  exit 1
fi

set -a
source "$COMPOSE_ENV_FILE"
set +a

export COMPOSE_ENV_FILE
export PROJECT_ROOT="$ROOT_DIR"
export STORE_PATH="${STORE_PATH:-$HOME/store/kyleweberseattle.com}"
STORE_PATH="${STORE_PATH%$'\r'}"
STORE_PATH="${STORE_PATH%/}"
export STORE_PATH
export HOST="${HOST:-kyleweberseattle.com}"
export CERTBOT_DOMAIN_FALLBACK="${CERTBOT_DOMAIN_FALLBACK:-kyleweberseattle.com}"

mkdir -p "$STORE_PATH/media" "$STORE_PATH/data"

if [[ "$STORE_PATH" != /* ]]; then
  echo "[prod-up] STORE_PATH must be an absolute path. Current value: $STORE_PATH"
  exit 1
fi

required_paths=(
  "$STORE_PATH/media"
  "$STORE_PATH/data"
  "$PROJECT_ROOT/docker/database"
  "$PROJECT_ROOT/docker/nginx.swarm.local.conf.template"
  "$PROJECT_ROOT/docker/nginx-entrypoint.sh"
  "$PROJECT_ROOT/docker/certbot-init.sh"
)

for path in "${required_paths[@]}"; do
  if [[ ! -e "$path" ]]; then
    echo "[prod-up] Required bind source does not exist: $path"
    exit 1
  fi
done

echo "[prod-up] Using STORE_PATH=$STORE_PATH"
echo "[prod-up] Using PROJECT_ROOT=$PROJECT_ROOT"

rendered_config="$(docker stack config -c "$COMPOSE_FILE")"
bind_sources="$(printf '%s\n' "$rendered_config" | awk '
  $1 == "type:" { current_type=$2 }
  $1 == "source:" && current_type == "bind" { print $2 }
')"

if [[ -n "$bind_sources" ]]; then
  echo "[prod-up] Rendered bind sources:"
  while IFS= read -r src; do
    [[ -n "$src" ]] || continue
    echo "  - $src"
    if [[ ! -e "$src" ]]; then
      echo "[prod-up] Rendered bind source does not exist: $src"
      exit 1
    fi
  done <<< "$bind_sources"
fi

GHCR_TOKEN="${GHCR_TOKEN:-${REPO_TOKEN:-${GITHUB_TOKEN:-}}}"
GHCR_USERNAME="${GHCR_USERNAME:-${GITHUB_REPOSITORY_OWNER:-}}"
REGISTRY="${REGISTRY:-ghcr.io}"

if [[ "$REGISTRY" == "ghcr.io" && -n "$GHCR_TOKEN" ]]; then
  if [[ -z "$GHCR_USERNAME" ]]; then
    echo "[prod-up] GHCR token is set but GHCR username is missing"
    exit 1
  fi

  echo "[prod-up] Logging in to GHCR as $GHCR_USERNAME"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

if [[ "$(docker info --format '{{.Swarm.LocalNodeState}}')" != "active" ]]; then
  echo "[prod-up] Initializing Docker Swarm"
  docker swarm init
fi

echo "[prod-up] Deploying stack with app services initially scaled to 0"
WEB_REPLICAS=0 MLS_REPLICAS=0 docker stack deploy --with-registry-auth -c "$COMPOSE_FILE" "$STACK_NAME"

for service in db redis; do
  ready=0
  for _ in {1..60}; do
    replicas="$(docker service ls --format '{{.Name}} {{.Replicas}}' | awk -v svc="${STACK_NAME}_${service}" '$1==svc { print $2 }')"
    if [[ "$replicas" == "1/1" ]]; then
      ready=1
      break
    fi
    sleep 2
  done

  if [[ "$ready" != "1" ]]; then
    echo "[prod-up] ${service} did not become ready"
    exit 1
  fi
done

if [[ "$RUN_MIGRATIONS" == "1" ]]; then
  echo "[prod-up] Triggering db entrypoint migration pass via forced db service restart"
  docker service update --force "${STACK_NAME}_db" >/dev/null

  ready=0
  for _ in {1..90}; do
    replicas="$(docker service ls --format '{{.Name}} {{.Replicas}}' | awk -v svc="${STACK_NAME}_db" '$1==svc { print $2 }')"
    if [[ "$replicas" == "1/1" ]]; then
      ready=1
      break
    fi
    sleep 2
  done

  if [[ "$ready" != "1" ]]; then
    echo "[prod-up] db did not become ready after migration restart"
    docker service ps "${STACK_NAME}_db" --no-trunc || true
    docker service logs --tail 200 "${STACK_NAME}_db" || true
    exit 1
  fi
fi

echo "[prod-up] Scaling app services to target replicas"
docker service scale "${STACK_NAME}_web=${TARGET_WEB_REPLICAS}" "${STACK_NAME}_mls=${TARGET_MLS_REPLICAS}"

check_service_replicas() {
  local service="$1"
  local target="$2"
  local service_name="${STACK_NAME}_${service}"
  local expected="${target}/${target}"

  for _ in {1..90}; do
    replicas="$(docker service ls --format '{{.Name}} {{.Replicas}}' | awk -v svc="$service_name" '$1==svc { print $2 }')"
    if [[ "$replicas" == "$expected" ]]; then
      return 0
    fi
    sleep 2
  done

  echo "[prod-up] Service did not reach desired replicas: ${service_name} (expected ${expected}, current ${replicas:-unknown})"
  echo "[prod-up] Recent tasks for ${service_name}:"
  docker service ps "$service_name" --no-trunc || true
  echo
  echo "[prod-up] Recent logs for ${service_name}:"
  docker service logs --tail 200 "$service_name" || true
  return 1
}

check_service_replicas web "$TARGET_WEB_REPLICAS"
check_service_replicas mls "$TARGET_MLS_REPLICAS"

echo "[prod-up] Current status"
docker stack services "$STACK_NAME"
