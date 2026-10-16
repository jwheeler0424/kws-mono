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
  if [[ "$GHCR_TOKEN" == github_pat_* ]]; then
    echo "[deploy-images] GHCR does not support fine-grained personal access tokens."
    echo "[deploy-images] Set GHCR_TOKEN to a personal access token (classic) with write:packages."
    echo "[deploy-images] Create one at https://github.com/settings/tokens/new?scopes=write:packages"
    exit 1
  fi

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

remote_digest() {
  docker buildx imagetools inspect "$1" --format '{{.Manifest.Digest}}' 2>/dev/null || true
}

CHANGED_SERVICES=()

# Usage: push_image <label> <image> [swarm service suffix]
push_image() {
  local label="$1" image="$2" service="${3:-}"
  local before after

  before="$(remote_digest "$image")"
  echo "[deploy-images] Pushing $label image..."
  docker push "$image"
  after="$(remote_digest "$image")"

  if [[ -n "$after" && "$before" == "$after" ]]; then
    echo "[deploy-images] $label image unchanged ($after)"
  else
    echo "[deploy-images] $label image updated: ${before:-<none>} -> ${after:-<unknown>}"
    if [[ -n "$service" ]]; then
      CHANGED_SERVICES+=("$service")
    fi
  fi
}

push_image app "$APP_IMAGE" web
push_image mls "$MLS_IMAGE" mls
push_image db "$DB_IMAGE" db
push_image nginx "$NGINX_IMAGE"

DEPLOY_REPOSITORY="${DEPLOY_REPOSITORY:-jwheeler0424/kws-mono}"
DEPLOY_WORKFLOW="${DEPLOY_WORKFLOW:-ghcr-swarm-deploy.yml}"
DEPLOY_REF="${DEPLOY_REF:-main}"
DEPLOY_TOKEN="${DEPLOY_TOKEN:-$(read_env_value DEPLOY_TOKEN)}"
DEPLOY_TOKEN="${DEPLOY_TOKEN:-$GHCR_TOKEN}"

if [[ ${#CHANGED_SERVICES[@]} -eq 0 ]]; then
  echo "[deploy-images] No deployed images changed; skipping workflow dispatch."
elif [[ -z "$DEPLOY_TOKEN" ]]; then
  echo "[deploy-images] No DEPLOY_TOKEN/GHCR_TOKEN set; skipping workflow dispatch."
else
  services="${CHANGED_SERVICES[*]}"
  echo "[deploy-images] Triggering $DEPLOY_WORKFLOW on $DEPLOY_REPOSITORY@$DEPLOY_REF for: $services"
  status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $DEPLOY_TOKEN" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${DEPLOY_REPOSITORY}/actions/workflows/${DEPLOY_WORKFLOW}/dispatches" \
    -d "{\"ref\":\"${DEPLOY_REF}\",\"inputs\":{\"services\":\"${services}\"}}")"
  if [[ "$status" != "204" ]]; then
    echo "[deploy-images] Workflow dispatch failed (HTTP $status). Token needs the classic 'repo' scope."
    exit 1
  fi
fi

echo "[deploy-images] Done."
