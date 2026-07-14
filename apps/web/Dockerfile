# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS prepare
RUN bun add -g turbo@^2
COPY . .
RUN turbo prune web --docker

FROM base AS builder
COPY --from=prepare /app/out/json/ .
RUN bun install --linker=isolated --backend=copyfile
COPY --from=prepare /app/out/full/ .
RUN bunx turbo run build --filter=web...
RUN test -f /app/apps/web/dist/server/server.js && test -d /app/apps/web/dist/client


FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3443
WORKDIR /app/apps/web

# Runtime media symlink configuration
ENV WEB_MEDIA_SOURCE=/store/media
ENV WEB_MEDIA_TARGET=/app/apps/web/public/media

COPY --from=builder /app /app

# Ensure runtime config package env file is present in the final image.
RUN test -f /app/packages/config/.env

COPY docker/web-entrypoint.sh /usr/local/bin/web-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/web-entrypoint.sh \
    && chmod +x /usr/local/bin/web-entrypoint.sh

EXPOSE 3443

ENTRYPOINT ["sh", "/usr/local/bin/web-entrypoint.sh"]
CMD ["bun", "--bun", "run", "server.ts"]
