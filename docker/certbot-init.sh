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
CERT_NAME="$DOMAIN"

if [ -f "/etc/letsencrypt/renewal/${DOMAIN}.conf" ]; then
  CERT_NAME="$DOMAIN"
else
  latest_renewal="$(ls -1 /etc/letsencrypt/renewal/${DOMAIN}-*.conf 2>/dev/null | sort -V | tail -n1 || true)"
  if [ -n "$latest_renewal" ]; then
    CERT_NAME="$(basename "$latest_renewal" .conf)"
  fi
fi

mkdir -p "$WEBROOT"

echo "[certbot] Using domain: ${DOMAIN}"
echo "[certbot] Using cert lineage: ${CERT_NAME}"

has_existing_lineage() {
  [ -f "/etc/letsencrypt/renewal/${DOMAIN}.conf" ] || [ -f "/etc/letsencrypt/renewal/${CERT_NAME}.conf" ]
}

auth_cert() {
  certbot certonly \
    --webroot \
    --webroot-path "$WEBROOT" \
    --cert-name "$CERT_NAME" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --keep-until-expiring \
    -d "$DOMAIN" \
    -d "www.${DOMAIN}"
}

auth_cert_without_name() {
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

echo "[certbot] Ensuring certificate exists/is up to date"
if has_existing_lineage; then
  echo "[certbot] Existing lineage found; running renew instead of issuing a new certificate"
  certbot renew --webroot --webroot-path "$WEBROOT" || true
else
  if ! auth_cert; then
    echo "[certbot] Initial certbot run with cert lineage '${CERT_NAME}' failed; retrying without explicit cert name"
    if ! auth_cert_without_name; then
      echo "[certbot] Certificate issuance failed; continuing so renew loop can retry later"
    fi
  fi
fi

while :; do
  sleep 12h
  certbot renew --webroot --webroot-path "$WEBROOT" --quiet || true
done
