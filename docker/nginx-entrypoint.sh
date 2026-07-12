#!/bin/sh
set -eu

resolve_domain() {
  host_value="${HOST:-}"
  fallback="${CERTBOT_DOMAIN_FALLBACK:-kyleweberseattle.com}"

  if [ -z "$host_value" ] || [ "$host_value" = "localhost" ]; then
    printf '%s' "$fallback"
    return
  fi

  printf '%s' "$host_value"
}

DOMAIN="$(resolve_domain)"
export DOMAIN
APP_PORT="${APP_PORT:-3443}"
export APP_PORT

echo "[nginx] Using domain: ${DOMAIN}"

if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ] || [ ! -f "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ]; then
  echo "[nginx] Certificate not found for ${DOMAIN}; creating temporary self-signed certificate"
  apk add --no-cache openssl >/dev/null
  mkdir -p "/etc/letsencrypt/live/${DOMAIN}"
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" \
    -out "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" \
    -subj "/CN=${DOMAIN}" >/dev/null 2>&1
fi

envsubst '$DOMAIN $APP_PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

(
  while :; do
    sleep 6h
    nginx -s reload || true
  done
) &

exec nginx -g 'daemon off;'
