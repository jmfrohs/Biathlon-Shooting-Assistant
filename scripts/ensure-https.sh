#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/scripts/server.config"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "[HTTPS] Keine scripts/server.config gefunden. Ueberspringe HTTPS-Setup."
  exit 0
fi

# shellcheck disable=SC1090
source "$CONFIG_FILE"

APP_PORT="${APP_PORT:-3001}"
DUCKDNS_TOKEN_VALUE="${DUCKDNS_TOKEN:-}"
DUCKDNS_DOMAIN_VALUE="${DUCKDNS_DOMAIN:-}"
DOMAIN="${HTTPS_DOMAIN:-}"
IP_TARGET="${SERVER_IP:-}"

if [[ -z "$DOMAIN" && -n "$DUCKDNS_DOMAIN_VALUE" && -n "$DUCKDNS_TOKEN_VALUE" && "$DUCKDNS_TOKEN_VALUE" != "DEIN-TOKEN-HIER" ]]; then
  if [[ "$DUCKDNS_DOMAIN_VALUE" == *.* ]]; then
    DOMAIN="$DUCKDNS_DOMAIN_VALUE"
  else
    DOMAIN="${DUCKDNS_DOMAIN_VALUE}.duckdns.org"
  fi
fi

has_valid_domain=true
if [[ -z "$DOMAIN" || "$DOMAIN" == "DEIN-DOMAIN-HIER" || "$DOMAIN" == "DEIN-TOKEN-HIER.duckdns.org" ]]; then
  has_valid_domain=false
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "[HTTPS] apt-get nicht gefunden. Dieses Auto-Setup unterstuetzt aktuell Debian/Ubuntu."
  exit 0
fi

SUDO=""
if [[ "$(id -u)" -ne 0 ]]; then
  if ! command -v sudo >/dev/null 2>&1; then
    echo "[HTTPS] sudo nicht gefunden und Benutzer ist nicht root. Setup nicht moeglich."
    exit 1
  fi
  SUDO="sudo"
fi

if ! command -v caddy >/dev/null 2>&1; then
  echo "[HTTPS] Installiere Caddy..."
  $SUDO apt-get update
  $SUDO apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl openssl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | $SUDO gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | $SUDO tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  $SUDO apt-get update
  $SUDO apt-get install -y caddy
fi

if [[ "$has_valid_domain" == true ]]; then
  echo "[HTTPS] Schreibe Caddyfile fuer Domain: $DOMAIN"
  $SUDO tee /etc/caddy/Caddyfile >/dev/null <<EOF
$DOMAIN {
    reverse_proxy 127.0.0.1:$APP_PORT
}
EOF
else
  if [[ -z "$IP_TARGET" ]]; then
    IP_TARGET="$(curl -4fsS --max-time 5 https://api.ipify.org || true)"
  fi
  if [[ -z "$IP_TARGET" ]]; then
    IP_TARGET="$(hostname -I | awk '{print $1}')"
  fi
  if [[ -z "$IP_TARGET" ]]; then
    echo "[HTTPS] Keine Domain und keine IP ermittelbar. HTTPS-Setup uebersprungen."
    exit 0
  fi

  CERT_DIR="/etc/caddy/certs"
  CERT_FILE="$CERT_DIR/biathlon-ip.crt"
  KEY_FILE="$CERT_DIR/biathlon-ip.key"

  echo "[HTTPS] Keine Domain gesetzt. Erstelle selbstsigniertes Zertifikat fuer IP: $IP_TARGET"
  $SUDO mkdir -p "$CERT_DIR"
  $SUDO openssl req -x509 -nodes -newkey rsa:2048 -sha256 -days 365 \
    -subj "/CN=$IP_TARGET" \
    -addext "subjectAltName = IP:$IP_TARGET" \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE"
  $SUDO chmod 600 "$KEY_FILE"

  $SUDO tee /etc/caddy/Caddyfile >/dev/null <<EOF
$IP_TARGET {
    tls $CERT_FILE $KEY_FILE
    reverse_proxy 127.0.0.1:$APP_PORT
}
EOF
fi

if command -v caddy >/dev/null 2>&1; then
  $SUDO caddy validate --config /etc/caddy/Caddyfile
fi

$SUDO systemctl enable --now caddy
$SUDO systemctl reload caddy

if [[ "$has_valid_domain" == true ]]; then
  echo "[HTTPS] Aktiv. Dein Server ist jetzt unter https://$DOMAIN erreichbar."
else
  echo "[HTTPS] Aktiv mit selbstsigniertem Zertifikat. Erreichbar unter https://$IP_TARGET"
  echo "[HTTPS] Hinweis: Browser zeigen eine Sicherheitswarnung, bis das Zertifikat als vertrauenswuerdig eingestuft wird."
fi
