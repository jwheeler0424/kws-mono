#!/bin/sh
# entrypoint.sh — used by both dev and prod containers
# 1. If Docker secrets are mounted, export their values as env vars.
# 2. Run Drizzle migrations.
# 3. Hand off to the container's CMD.
set -e

# ─── Docker secrets → environment variables ────────────────────────────────
# Secrets are mounted at /run/secrets/<name> by Docker Swarm.
# In dev (plain compose), no secrets directory exists, so this is a no-op.
load_secret() {
  secret_name="$1"
  env_var="$2"
  secret_file="/run/secrets/${secret_name}"
  if [ -f "$secret_file" ]; then
    value=$(cat "$secret_file")
    export "${env_var}=${value}"
  fi
}

load_secret "postgres_user"     "DB_USER"
load_secret "postgres_password" "DB_PASSWORD"

# ─── Wait for the database to accept TCP connections ────────────────────────
# Uses nc (BusyBox netcat, available in Alpine) for a lightweight TCP probe.
# The compose healthcheck already waits for pg_isready, but this guard also
# handles direct `docker run` usage and edge-case restart races.
DB_HOST="${DB_HOST:-${DB_HOST:-db}}"
DB_PORT="${DB_PORT:-${DB_PORT:-5432}}"

echo "[entrypoint] Waiting for database at ${DB_HOST}:${DB_PORT}..."
until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  sleep 1
done
echo "[entrypoint] Database is ready."

# ─── Optional DB init step ──────────────────────────────────────────────────
# In development we run generate + migrate here so the app only starts after
# the schema is current, without leaving behind a one-shot migration container.
if [ -n "${DB_INIT_COMMAND:-}" ]; then
  echo "[entrypoint] Running DB init command..."
  sh -lc "$DB_INIT_COMMAND"
  echo "[entrypoint] DB init command completed."
fi

# ─── Start the application ──────────────────────────────────────────────────
# In production, keep migrations outside the multi-replica app service.
exec "$@"
