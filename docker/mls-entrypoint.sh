#!/bin/sh
set -eu

SOURCE_DIR="${MLS_DATA_SOURCE:-/store/data}"
TARGET_LINK="${MLS_DATA_TARGET:-/app/apps/mls/data}"
MEDIA_SOURCE_DIR="${MLS_MEDIA_SOURCE:-/store/media}"
MEDIA_TARGET_LINK="${MLS_MEDIA_TARGET:-/app/store/media}"

TARGET_PARENT="$(dirname "$TARGET_LINK")"
MEDIA_TARGET_PARENT="$(dirname "$MEDIA_TARGET_LINK")"
mkdir -p "$TARGET_PARENT"
mkdir -p "$MEDIA_TARGET_PARENT"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "[mls-entrypoint] Data source directory not found: $SOURCE_DIR"
  echo "[mls-entrypoint] Create or mount it to provide history replay seed data."
fi

if [ ! -d "$MEDIA_SOURCE_DIR" ]; then
  echo "[mls-entrypoint] Media source directory not found: $MEDIA_SOURCE_DIR"
  echo "[mls-entrypoint] Create or mount it to provide MLS media assets."
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

echo "[mls-entrypoint] Data symlink ready: $TARGET_LINK -> $SOURCE_DIR"

if [ -L "$MEDIA_TARGET_LINK" ]; then
  CURRENT_MEDIA_TARGET="$(readlink "$MEDIA_TARGET_LINK" || true)"
  if [ "$CURRENT_MEDIA_TARGET" != "$MEDIA_SOURCE_DIR" ]; then
    rm -f "$MEDIA_TARGET_LINK"
  fi
elif [ -e "$MEDIA_TARGET_LINK" ]; then
  rm -rf "$MEDIA_TARGET_LINK"
fi

if [ ! -L "$MEDIA_TARGET_LINK" ]; then
  ln -s "$MEDIA_SOURCE_DIR" "$MEDIA_TARGET_LINK"
fi

echo "[mls-entrypoint] Media symlink ready: $MEDIA_TARGET_LINK -> $MEDIA_SOURCE_DIR"

exec "$@"
