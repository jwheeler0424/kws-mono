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

SERVER_DOMAIN="$(resolve_domain)"
APP_PORT="${APP_PORT:-3443}"
export APP_PORT

echo "[nginx] Using requested domain: ${SERVER_DOMAIN}"

# openssl is required to inspect certificate issuers.
if ! command -v openssl >/dev/null 2>&1; then
  apk add --no-cache openssl >/dev/null
fi

CERT_FULLCHAIN_PATH=""
CERT_PRIVKEY_PATH=""
CERT_LINEAGE=""

is_letsencrypt_cert() {
  cert_path="$1"
  issuer="$(openssl x509 -in "$cert_path" -noout -issuer 2>/dev/null || true)"
  printf '%s' "$issuer" | grep -qi "Let's Encrypt"
}

pick_lineage() {
  latest_suffixed="$(ls -1d /etc/letsencrypt/live/${SERVER_DOMAIN}-* 2>/dev/null | sort -V | tail -n1 || true)"
  if [ -n "$latest_suffixed" ] && [ -f "$latest_suffixed/fullchain.pem" ] && [ -f "$latest_suffixed/privkey.pem" ]; then
    CERT_LINEAGE="$(basename "$latest_suffixed")"
    return
  fi

  for dir in /etc/letsencrypt/live/"${SERVER_DOMAIN}"; do
    [ -d "$dir" ] || continue
    [ -f "$dir/fullchain.pem" ] || continue
    [ -f "$dir/privkey.pem" ] || continue
    if is_letsencrypt_cert "$dir/fullchain.pem"; then
      CERT_LINEAGE="$(basename "$dir")"
    fi
  done
}

pick_lineage

if [ -n "$CERT_LINEAGE" ]; then
  CERT_FULLCHAIN_PATH="/etc/letsencrypt/live/${CERT_LINEAGE}/fullchain.pem"
  CERT_PRIVKEY_PATH="/etc/letsencrypt/live/${CERT_LINEAGE}/privkey.pem"
  echo "[nginx] Using Let's Encrypt lineage: ${CERT_LINEAGE}"
else
  echo "[nginx] No Let's Encrypt cert found; creating temporary self-signed certificate"
  mkdir -p /etc/nginx/selfsigned
  CERT_FULLCHAIN_PATH="/etc/nginx/selfsigned/${SERVER_DOMAIN}.crt"
  CERT_PRIVKEY_PATH="/etc/nginx/selfsigned/${SERVER_DOMAIN}.key"
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "$CERT_PRIVKEY_PATH" \
    -out "$CERT_FULLCHAIN_PATH" \
    -subj "/CN=${SERVER_DOMAIN}" >/dev/null 2>&1
fi

export DOMAIN="$SERVER_DOMAIN"
export CERT_FULLCHAIN_PATH
export CERT_PRIVKEY_PATH
echo "[nginx] Using certificate files: ${CERT_FULLCHAIN_PATH} | ${CERT_PRIVKEY_PATH}"

envsubst '$DOMAIN $CERT_FULLCHAIN_PATH $CERT_PRIVKEY_PATH $APP_PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

(
  while :; do
    sleep 6h
    nginx -s reload || true
  done
) &

exec nginx -g 'daemon off;'
