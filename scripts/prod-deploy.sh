#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-packages/config/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

MEDIA_STORE_PATH_DEFAULT="$HOME/store/media"
MEDIA_STORE_PATH="${MEDIA_STORE_PATH:-$MEDIA_STORE_PATH_DEFAULT}"
export MEDIA_STORE_PATH

compose() {
	docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

ensure_media_store_path() {
	mkdir -p "$MEDIA_STORE_PATH"
}

is_running() {
	local service="$1"
	local cid
	cid="$(compose ps -q "$service")"
	[[ -n "$cid" ]] || return 1
	[[ "$(docker inspect --format='{{.State.Running}}' "$cid" 2>/dev/null || true)" == "true" ]]
}

get_health() {
	local service="$1"
	local cid
	cid="$(compose ps -q "$service")"
	[[ -n "$cid" ]] || {
		echo "missing"
		return 0
	}
	docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || echo "missing"
}

wait_for_healthy() {
	local service="$1"
	local timeout_seconds="${2:-180}"
	local start
	start="$(date +%s)"

	echo "[deploy] Waiting for ${service} to become healthy..."
	while true; do
		local status
		status="$(get_health "$service")"
		if [[ "$status" == "healthy" || "$status" == "none" ]]; then
			echo "[deploy] ${service} status: ${status}"
			return 0
		fi

		local now elapsed
		now="$(date +%s)"
		elapsed="$((now - start))"
		if (( elapsed >= timeout_seconds )); then
			echo "[deploy] Timed out waiting for ${service}. Last status: ${status}" >&2
			return 1
		fi

		sleep 2
	done
}

ensure_proxy_running() {
	if is_running nginx; then
		return 0
	fi

	echo "[deploy] nginx is not running; starting nginx/certbot..."
	compose up -d nginx certbot
}

if is_running app_blue; then
	TARGET="app_green"
	OLD="app_blue"
elif is_running app_green; then
	TARGET="app_blue"
	OLD="app_green"
else
	TARGET="app_blue"
	OLD="app_green"
fi

echo "[deploy] Active target: ${TARGET}; old slot: ${OLD}"

ensure_media_store_path

echo "[deploy] Pulling latest app image..."
compose pull "$TARGET"

echo "[deploy] Pulling latest MLS image..."
compose pull mls

echo "[deploy] Starting ${TARGET}..."
compose up -d "$TARGET"

wait_for_healthy "$TARGET"

ensure_proxy_running

echo "[deploy] Reloading nginx..."
compose exec -T nginx nginx -s reload

if is_running "$OLD"; then
	echo "[deploy] Stopping old slot: ${OLD}"
	compose stop "$OLD"
else
	echo "[deploy] Old slot ${OLD} is not running; skipping stop"
fi

echo "[deploy] Updating MLS worker container..."
compose up -d --force-recreate mls

echo "[deploy] Blue-green deployment completed"
