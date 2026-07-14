#!/bin/sh
set -eu

SOURCE_DIR="${WEB_MEDIA_SOURCE:-/app/apps/web/public/media}"
TARGET_LINK="${WEB_MEDIA_TARGET:-/app/apps/web/public/media}"
COMPAT_LINK="${WEB_MEDIA_COMPAT_TARGET:-/app/apps/web/dist/client/media}"

TARGET_PARENT="$(dirname "$TARGET_LINK")"
COMPAT_PARENT="$(dirname "$COMPAT_LINK")"
mkdir -p "$TARGET_PARENT"
mkdir -p "$COMPAT_PARENT"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "[web-entrypoint] Media source directory not found: $SOURCE_DIR"
  echo "[web-entrypoint] Create or mount it to persist uploads/media."
fi

if [ "$SOURCE_DIR" != "$TARGET_LINK" ]; then
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
fi

echo "[web-entrypoint] Media symlink ready: $TARGET_LINK -> $SOURCE_DIR"

# Keep compatibility with runtime static serving rooted at dist/client.
if [ -L "$COMPAT_LINK" ]; then
  CURRENT_COMPAT_TARGET="$(readlink "$COMPAT_LINK" || true)"
  if [ "$CURRENT_COMPAT_TARGET" != "$TARGET_LINK" ]; then
    rm -f "$COMPAT_LINK"
  fi
elif [ -e "$COMPAT_LINK" ]; then
  rm -rf "$COMPAT_LINK"
fi

if [ ! -L "$COMPAT_LINK" ]; then
  ln -s "$TARGET_LINK" "$COMPAT_LINK"
fi

echo "[web-entrypoint] Media compatibility symlink ready: $COMPAT_LINK -> $TARGET_LINK"

exec "$@"
