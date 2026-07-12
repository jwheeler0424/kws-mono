#!/bin/sh
set -eu

SOURCE_DIR="${WEB_MEDIA_SOURCE:-/srv/media}"
TARGET_LINK="${WEB_MEDIA_TARGET:-/app/apps/web/dist/client/media}"

TARGET_PARENT="$(dirname "$TARGET_LINK")"
mkdir -p "$TARGET_PARENT"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "[web-entrypoint] Media source directory not found: $SOURCE_DIR"
  echo "[web-entrypoint] Create or mount it to persist uploads/media."
fi

if [ -L "$TARGET_LINK" ]; then
  CURRENT_TARGET="$(readlink "$TARGET_LINK" || true)"
  if [ "$CURRENT_TARGET" != "$SOURCE_DIR" ]; then
    rm -f "$TARGET_LINK"
  fi
elif [ -e "$TARGET_LINK" ]; then
  rm -rf "$TARGET_LINK"
fi

if [ ! -L "$TARGET_LINK" ]; then
  ln -s "$SOURCE_DIR" "$TARGET_LINK"
fi

echo "[web-entrypoint] Media symlink ready: $TARGET_LINK -> $SOURCE_DIR"

exec "$@"
