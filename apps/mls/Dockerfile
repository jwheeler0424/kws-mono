# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS pruner
RUN bun add -g turbo@^2
COPY . .
RUN turbo prune mls --docker

FROM base AS installer
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile --linker=isolated --backend=copyfile
COPY --from=pruner /app/out/full/ .
RUN bunx turbo run build --filter=mls...
RUN test -f /app/apps/mls/dist/index.js


FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app/apps/mls

# Runtime data symlink configuration
ENV MLS_DATA_SOURCE=/store/data
ENV MLS_DATA_TARGET=/app/apps/mls/data
ENV MLS_MEDIA_SOURCE=/store/media
ENV MLS_MEDIA_TARGET=/app/store/media

COPY --from=installer /app /app

# Ensure runtime config package env files are present in the final image.
RUN test -f /app/packages/config/.env

COPY docker/mls-entrypoint.sh /usr/local/bin/mls-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/mls-entrypoint.sh \
	&& chmod +x /usr/local/bin/mls-entrypoint.sh

ENTRYPOINT ["sh", "/usr/local/bin/mls-entrypoint.sh"]
CMD ["bun", "--bun", "run", "dist/index.js"]
