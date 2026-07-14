#!/bin/sh
set -eu

DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-postgres}"
PGDATA="${PGDATA:-/var/lib/postgresql/18/docker}"

mkdir -p "$PGDATA" /var/run/postgresql
chown -R postgres:postgres /var/lib/postgresql /var/run/postgresql
chmod 3775 /var/run/postgresql

ensure_role_and_database() {
	gosu postgres psql --dbname postgres --set ON_ERROR_STOP=1 \
		--set=db_user="$DB_USER" \
		--set=db_password="$DB_PASSWORD" \
		--set=db_name="$DB_NAME" <<'SQL'
SELECT format('CREATE ROLE %I WITH LOGIN PASSWORD %L', :'db_user', :'db_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'db_user')
\gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'db_user', :'db_password')
WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'db_user')
\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db_name')
\gexec

SELECT format('ALTER DATABASE %I OWNER TO %I', :'db_name', :'db_user')
WHERE EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db_name')
\gexec
SQL
}

ensure_migration_function_ownership() {
	gosu postgres psql --dbname "$DB_NAME" --set ON_ERROR_STOP=1 \
		--set=db_user="$DB_USER" <<'SQL'
SELECT format('ALTER FUNCTION public.immutable_array_to_string(text[], text) OWNER TO %I', :'db_user')
WHERE EXISTS (
	SELECT 1
	FROM pg_proc p
	JOIN pg_namespace n ON n.oid = p.pronamespace
	WHERE n.nspname = 'public'
		AND p.proname = 'immutable_array_to_string'
		AND pg_get_function_identity_arguments(p.oid) = 'text[], text'
)
\gexec
SQL
}

ensure_schema_migrations_table() {
	gosu postgres psql --dbname "$DB_NAME" --set ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
	id text PRIMARY KEY,
	applied_at timestamptz NOT NULL DEFAULT now()
);
SQL
}

apply_pending_migrations() {
	if [ ! -d /docker-entrypoint-migrations ]; then
		echo "[db-entrypoint] No bundled migrations directory found; skipping"
		return
	fi

	ensure_schema_migrations_table

	# If this database already has user tables but no local migration markers,
	# assume schema was provisioned previously and avoid replaying full init SQL.
	existing_table_count="$(gosu postgres psql --dbname "$DB_NAME" -Atq <<'SQL'
SELECT count(*)
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name <> 'schema_migrations';
SQL
)"

	marked_migration_count="$(gosu postgres psql --dbname "$DB_NAME" -Atq <<'SQL'
SELECT count(*) FROM public.schema_migrations;
SQL
)"

	if [ "${existing_table_count:-0}" -gt 0 ] && [ "${marked_migration_count:-0}" -eq 0 ]; then
		echo "[db-entrypoint] Existing schema detected; bootstrapping migration markers"
		for migration_sql in $(find /docker-entrypoint-migrations -mindepth 2 -maxdepth 2 -type f -name migration.sql | sort); do
			migration_dir="$(dirname "$migration_sql")"
			migration_id="$(basename "$migration_dir")"
			gosu postgres psql --dbname "$DB_NAME" --set ON_ERROR_STOP=1 \
				-c "INSERT INTO public.schema_migrations (id) VALUES ('$migration_id') ON CONFLICT (id) DO NOTHING;"
		done
		return
	fi

	for migration_sql in $(find /docker-entrypoint-migrations -mindepth 2 -maxdepth 2 -type f -name migration.sql | sort); do
		migration_dir="$(dirname "$migration_sql")"
		migration_id="$(basename "$migration_dir")"

		if gosu postgres psql --dbname "$DB_NAME" -Atq \
			-c "SELECT 1 FROM public.schema_migrations WHERE id = '$migration_id' LIMIT 1;" \
			| grep -qx '1'; then
			continue
		fi

		echo "[db-entrypoint] Applying migration: $migration_id"
		gosu postgres psql --dbname "$DB_NAME" --set ON_ERROR_STOP=1 -f "$migration_sql"
		gosu postgres psql --dbname "$DB_NAME" --set ON_ERROR_STOP=1 \
			-c "INSERT INTO public.schema_migrations (id) VALUES ('$migration_id');"
	done
}

ensure_network_hba_rules() {
	hba_file="$PGDATA/pg_hba.conf"

	if ! grep -q '^host[[:space:]]\+all[[:space:]]\+all[[:space:]]\+0\.0\.0\.0/0[[:space:]]\+scram-sha-256$' "$hba_file"; then
		echo 'host all all 0.0.0.0/0 scram-sha-256' >>"$hba_file"
	fi

	if ! grep -q '^host[[:space:]]\+all[[:space:]]\+all[[:space:]]\+::/0[[:space:]]\+scram-sha-256$' "$hba_file"; then
		echo 'host all all ::/0 scram-sha-256' >>"$hba_file"
	fi
}

if [ ! -s "$PGDATA/PG_VERSION" ]; then
	echo "[db-entrypoint] Initializing database cluster at $PGDATA"
	gosu postgres initdb -D "$PGDATA" --auth-local=trust --auth-host=scram-sha-256
	ensure_network_hba_rules

	echo "[db-entrypoint] Starting temporary server"
	gosu postgres pg_ctl -D "$PGDATA" -o "-c listen_addresses='' -c unix_socket_directories=/var/run/postgresql" -w start

	echo "[db-entrypoint] Configuring role and database from DB_* variables"
	ensure_role_and_database

	if [ -d /docker-entrypoint-initdb.d ]; then
		echo "[db-entrypoint] Running init scripts"
		for script in /docker-entrypoint-initdb.d/*; do
			[ -e "$script" ] || continue
			case "$script" in
				*.sh)
					sh "$script"
					;;
				*.sql)
					gosu postgres psql --dbname "$DB_NAME" --set ON_ERROR_STOP=1 -f "$script"
					;;
			esac
		done
	fi

	apply_pending_migrations

	# Init scripts can create/replace helper functions as postgres; normalize ownership for app migrations.
	ensure_migration_function_ownership

	echo "[db-entrypoint] Stopping temporary server"
	gosu postgres pg_ctl -D "$PGDATA" -m fast -w stop
else
	echo "[db-entrypoint] Existing cluster detected; reconciling role/database from DB_* variables"
	ensure_network_hba_rules
	gosu postgres pg_ctl -D "$PGDATA" -o "-c listen_addresses='' -c unix_socket_directories=/var/run/postgresql" -w start
	ensure_role_and_database
	apply_pending_migrations
	ensure_migration_function_ownership
	gosu postgres pg_ctl -D "$PGDATA" -m fast -w stop
fi

echo "[db-entrypoint] Starting postgres"
exec gosu postgres "$@"
