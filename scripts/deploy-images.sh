#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-packages/config/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.ci.yml}"

REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_NAME="${IMAGE_NAME:-${GITHUB_REPOSITORY_OWNER:-jwheeler0424}/kyleweberseattle.com}"
MLS_IMAGE_NAME="${MLS_IMAGE_NAME:-${GITHUB_REPOSITORY_OWNER:-jwheeler0424}/kyleweberseattle.com-mls}"
DB_IMAGE_NAME="${DB_IMAGE_NAME:-${GITHUB_REPOSITORY_OWNER:-jwheeler0424}/kyleweberseattle.com-db}"

APP_IMAGE="${APP_IMAGE:-${REGISTRY}/${IMAGE_NAME}:latest}"
MLS_IMAGE="${MLS_IMAGE:-${REGISTRY}/${MLS_IMAGE_NAME}:latest}"
DB_IMAGE="${DB_IMAGE:-${REGISTRY}/${DB_IMAGE_NAME}:latest}"

SKIP_WEB_BUILD="${SKIP_WEB_BUILD:-1}"
SKIP_MLS_BUILD="${SKIP_MLS_BUILD:-1}"

compose_ci() {
  APP_IMAGE="$APP_IMAGE" \
  MLS_IMAGE="$MLS_IMAGE" \
  DB_IMAGE="$DB_IMAGE" \
  SKIP_WEB_BUILD="$SKIP_WEB_BUILD" \
  SKIP_MLS_BUILD="$SKIP_MLS_BUILD" \
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

echo "[deploy-images] Running turbo build..."
bunx turbo run build

echo "[deploy-images] Building app image: $APP_IMAGE"
compose_ci build app

echo "[deploy-images] Building mls image: $MLS_IMAGE"
compose_ci build mls

echo "[deploy-images] Building db image: $DB_IMAGE"
compose_ci build db

echo "[deploy-images] Pushing app image..."
docker push "$APP_IMAGE"

echo "[deploy-images] Pushing mls image..."
docker push "$MLS_IMAGE"

echo "[deploy-images] Pushing db image..."
docker push "$DB_IMAGE"

echo "[deploy-images] Done."
