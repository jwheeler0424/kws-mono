#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-packages/config/.env}"

REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_NAME="${IMAGE_NAME:-${GITHUB_REPOSITORY_OWNER:-jwheeler0424}/kyleweberseattle.com}"
MLS_IMAGE_NAME="${MLS_IMAGE_NAME:-${GITHUB_REPOSITORY_OWNER:-jwheeler0424}/kyleweberseattle.com-mls}"
DB_IMAGE_NAME="${DB_IMAGE_NAME:-${GITHUB_REPOSITORY_OWNER:-jwheeler0424}/kyleweberseattle.com-db}"
NGINX_IMAGE_NAME="${NGINX_IMAGE_NAME:-${GITHUB_REPOSITORY_OWNER:-jwheeler0424}/kyleweberseattle.com-nginx}"

read_env_value() {
  local key="$1"
  local value=""

  if [[ ! -f "$ENV_FILE" ]]; then
    return 0
  fi

  value="$(awk -F= -v key="$key" '
    $0 !~ /^[[:space:]]*#/ && $1 == key {
      sub(/^[^=]*=/, "", $0)
      print $0
    }
  ' "$ENV_FILE" | tail -n1)"

  value="${value%$'\r'}"

  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value#\"}"
    value="${value%\"}"
  elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
    value="${value#\'}"
    value="${value%\'}"
  fi

  printf '%s' "$value"
}

GHCR_USERNAME="${GHCR_USERNAME:-}"
if [[ -z "$GHCR_USERNAME" ]]; then
  GHCR_USERNAME="$(read_env_value GHCR_USERNAME)"
fi
if [[ -z "$GHCR_USERNAME" ]]; then
  GHCR_USERNAME="$(read_env_value GITHUB_REPOSITORY_OWNER)"
fi
if [[ -z "$GHCR_USERNAME" ]]; then
  GHCR_USERNAME="${GITHUB_REPOSITORY_OWNER:-}"
fi

GHCR_TOKEN="${GHCR_TOKEN:-}"
if [[ -z "$GHCR_TOKEN" ]]; then
  GHCR_TOKEN="$(read_env_value GHCR_TOKEN)"
fi
if [[ -z "$GHCR_TOKEN" ]]; then
  GHCR_TOKEN="$(read_env_value REPO_TOKEN)"
fi
if [[ -z "$GHCR_TOKEN" ]]; then
  GHCR_TOKEN="$(read_env_value GITHUB_TOKEN)"
fi
if [[ -z "$GHCR_TOKEN" ]]; then
  GHCR_TOKEN="${REPO_TOKEN:-${GITHUB_TOKEN:-}}"
fi

APP_IMAGE="${APP_IMAGE:-${REGISTRY}/${IMAGE_NAME}:latest}"
MLS_IMAGE="${MLS_IMAGE:-${REGISTRY}/${MLS_IMAGE_NAME}:latest}"
DB_IMAGE="${DB_IMAGE:-${REGISTRY}/${DB_IMAGE_NAME}:latest}"
NGINX_IMAGE="${NGINX_IMAGE:-${REGISTRY}/${NGINX_IMAGE_NAME}:latest}"

if [[ "$REGISTRY" == "ghcr.io" && -n "$GHCR_TOKEN" ]]; then
  if [[ -z "$GHCR_USERNAME" ]]; then
    echo "[deploy-images] GHCR token provided but GHCR_USERNAME is empty."
    echo "[deploy-images] Set GHCR_USERNAME (typically your GitHub username or org)."
    exit 1
  fi

  echo "[deploy-images] Logging in to GHCR as $GHCR_USERNAME"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

echo "[deploy-images] Building app image: $APP_IMAGE"
docker build -f apps/web/Dockerfile -t "$APP_IMAGE" .

echo "[deploy-images] Building mls image: $MLS_IMAGE"
docker build -f apps/mls/Dockerfile -t "$MLS_IMAGE" .

echo "[deploy-images] Building db image: $DB_IMAGE"
docker build -f Dockerfile --target db -t "$DB_IMAGE" .

echo "[deploy-images] Building nginx image: $NGINX_IMAGE"
docker build -f docker/nginx/Dockerfile -t "$NGINX_IMAGE" .

echo "[deploy-images] Pushing app image..."
docker push "$APP_IMAGE"

echo "[deploy-images] Pushing mls image..."
docker push "$MLS_IMAGE"

echo "[deploy-images] Pushing db image..."
docker push "$DB_IMAGE"

echo "[deploy-images] Pushing nginx image..."
docker push "$NGINX_IMAGE"

echo "[deploy-images] Done."
