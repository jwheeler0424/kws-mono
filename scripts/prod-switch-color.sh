#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-packages/config/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

if [[ "${1:-}" != "blue" && "${1:-}" != "green" ]]; then
	echo "Usage: $0 <blue|green>"
	exit 1
fi

TARGET="app_${1}"
OTHER="app_blue"
if [[ "$TARGET" == "app_blue" ]]; then
	OTHER="app_green"
fi

compose() {
	docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

echo "[switch] Starting target slot: ${TARGET}"
compose up -d "$TARGET"

echo "[switch] Reloading nginx"
compose exec -T nginx nginx -s reload

echo "[switch] Stopping other slot: ${OTHER}"
compose stop "$OTHER"

echo "[switch] Completed manual switch to ${TARGET}"
