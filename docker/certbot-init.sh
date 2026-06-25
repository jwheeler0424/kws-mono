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
EMAIL="${CERTBOT_EMAIL:-admin@kyleweberseattle.com}"
WEBROOT="/var/www/certbot"

mkdir -p "$WEBROOT"

echo "[certbot] Using domain: ${DOMAIN}"

auth_cert() {
  certbot certonly \
    --webroot \
    --webroot-path "$WEBROOT" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --keep-until-expiring \
    -d "$DOMAIN" \
    -d "www.${DOMAIN}"
}

if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ] || [ ! -f "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ]; then
  echo "[certbot] Issuing initial certificate"
  auth_cert
else
  echo "[certbot] Certificate already exists; skipping initial issuance"
fi

while :; do
  sleep 12h
  certbot renew --webroot --webroot-path "$WEBROOT" --quiet || true
done
