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

	# Init scripts can create/replace helper functions as postgres; normalize ownership for app migrations.
	ensure_migration_function_ownership

	echo "[db-entrypoint] Stopping temporary server"
	gosu postgres pg_ctl -D "$PGDATA" -m fast -w stop
else
	echo "[db-entrypoint] Existing cluster detected; reconciling role/database from DB_* variables"
	ensure_network_hba_rules
	gosu postgres pg_ctl -D "$PGDATA" -o "-c listen_addresses='' -c unix_socket_directories=/var/run/postgresql" -w start
	ensure_role_and_database
	ensure_migration_function_ownership
	gosu postgres pg_ctl -D "$PGDATA" -m fast -w stop
fi

echo "[db-entrypoint] Starting postgres"
exec gosu postgres "$@"
