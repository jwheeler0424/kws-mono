#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_OWNER="${IMAGE_OWNER:-${GITHUB_REPOSITORY_OWNER:-jwheeler0424}}"
PROJECT_TAG="${PROJECT_TAG:-latest}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-1}"

APP_IMAGE="${APP_IMAGE:-${REGISTRY}/${IMAGE_OWNER}/kyleweberseattle.com:${PROJECT_TAG}}"
MLS_IMAGE="${MLS_IMAGE:-${REGISTRY}/${IMAGE_OWNER}/kyleweberseattle.com-mls:${PROJECT_TAG}}"
DB_IMAGE="${DB_IMAGE:-${REGISTRY}/${IMAGE_OWNER}/kyleweberseattle.com-db:${PROJECT_TAG}}"
MIGRATE_IMAGE="${MIGRATE_IMAGE:-${REGISTRY}/${IMAGE_OWNER}/kyleweberseattle.com-migrate:${PROJECT_TAG}}"
REDIS_IMAGE="${REDIS_IMAGE:-${REGISTRY}/${IMAGE_OWNER}/kyleweberseattle.com-redis:${PROJECT_TAG}}"
NGINX_IMAGE="${NGINX_IMAGE:-${REGISTRY}/${IMAGE_OWNER}/kyleweberseattle.com-nginx:${PROJECT_TAG}}"

echo "[deploy-project] Using project tag: $PROJECT_TAG"
echo "[deploy-project] APP_IMAGE=$APP_IMAGE"
echo "[deploy-project] MLS_IMAGE=$MLS_IMAGE"
echo "[deploy-project] DB_IMAGE=$DB_IMAGE"
echo "[deploy-project] MIGRATE_IMAGE=$MIGRATE_IMAGE"
echo "[deploy-project] REDIS_IMAGE=$REDIS_IMAGE"
echo "[deploy-project] NGINX_IMAGE=$NGINX_IMAGE"

PULL_IMAGES=1 \
RUN_MIGRATIONS="$RUN_MIGRATIONS" \
APP_IMAGE="$APP_IMAGE" \
MLS_IMAGE="$MLS_IMAGE" \
DB_IMAGE="$DB_IMAGE" \
MIGRATE_IMAGE="$MIGRATE_IMAGE" \
REDIS_IMAGE="$REDIS_IMAGE" \
NGINX_IMAGE="$NGINX_IMAGE" \
bash scripts/swarm-local-deploy.sh
