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
RUN bun install
COPY --from=prepare /app/out/full/ .

# Optional remote cache args for CI/VPS builds
ARG TURBO_TEAM
ENV TURBO_TEAM=$TURBO_TEAM
ARG TURBO_TOKEN
ENV TURBO_TOKEN=$TURBO_TOKEN
ARG SKIP_WEB_BUILD=0

RUN if [ "$SKIP_WEB_BUILD" = "1" ]; then \
            echo "Skipping web build; expecting prebuilt dist artifacts"; \
        else \
            bunx turbo run build --filter=web...; \
        fi

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3443

# Runtime media symlink configuration
ENV WEB_MEDIA_SOURCE=/srv/media
ENV WEB_MEDIA_TARGET=/app/apps/web/dist/client/media

COPY --from=builder /app /app
COPY docker/web-entrypoint.sh /usr/local/bin/web-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/web-entrypoint.sh \
    && chmod +x /usr/local/bin/web-entrypoint.sh

EXPOSE 3443

ENTRYPOINT ["sh", "/usr/local/bin/web-entrypoint.sh"]
CMD ["bun", "--bun", "run", "apps/web/server.ts"]
