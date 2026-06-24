# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Stage 0 — db  (docker-compose target: db)
#   PostgreSQL image with PostGIS + pgvector packages installed.
# ─────────────────────────────────────────────────────────────────────────────
FROM postgres:18.3 AS db

COPY docker/db-entrypoint.sh /usr/local/bin/db-entrypoint.sh
RUN apt-get update && apt-get install -y \
    postgresql-18-postgis-3 \
    postgresql-18-postgis-3-scripts \
    postgresql-18-pgvector \
    && rm -rf /var/lib/apt/lists/* \
    && sed -i 's/\r$//' /usr/local/bin/db-entrypoint.sh \
    && chmod +x /usr/local/bin/db-entrypoint.sh

ENTRYPOINT ["sh", "/usr/local/bin/db-entrypoint.sh"]

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — base
#   Install all dependencies from the lockfile.  This layer is shared by both
#   the dev and prod targets, so it is only rebuilt when package files change.
# ─────────────────────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS base

WORKDIR /app

# Copy only the manifest + lockfile first for optimal layer caching
COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — dev  (docker-compose target: dev)
#   Source code is NOT copied — this image is used for worker containers while
#   the TanStack Start app runs locally on the host machine.
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS dev

ENV NODE_ENV=development

# Include only the files required by worker startup and DB migrations so the
# container can still boot if a bind mount is temporarily unavailable.
COPY tsconfig.json ./tsconfig.json
COPY drizzle.config.ts ./drizzle.config.ts
COPY drizzle ./drizzle
COPY src ./src

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["sh", "/usr/local/bin/entrypoint.sh"]

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — builder
#   Full source copy + production build. Output lands in /app/.output.
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS builder

COPY . .

RUN bun run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 4 — prod  (docker-compose target: prod)
#   Lean runtime image.  Only the compiled output, production node_modules, and
#   the entrypoint script are included.  No source code, no dev tooling.
# ─────────────────────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS prod

ENV NODE_ENV=production

WORKDIR /app

# Only copy what is needed at runtime
COPY --from=builder /app/.output      ./.output
COPY --from=builder /app/node_modules  ./node_modules
COPY --from=builder /app/package.json  ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src           ./src

# Drizzle migration scripts and any already-committed migration files.
# The one-shot migrate service in docker-compose uses these to apply schema.
COPY --from=builder /app/drizzle      ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
	&& chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3443

ENTRYPOINT ["sh", "/usr/local/bin/entrypoint.sh"]
CMD ["bun", "run", "start"]