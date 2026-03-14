#!/bin/bash
# Biathlon Shooting Assistant — Linux Server Setup
# Einmalig ausfuehren nach git clone

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/server.config"

echo "=== Biathlon Server Setup ==="

# Config laden
if [ -f "$CONFIG_FILE" ]; then
  source "$CONFIG_FILE"
  echo "Konfiguration geladen aus server.config"
else
  echo "WARNUNG: scripts/server.config nicht gefunden"
fi

# 1. Node.js installieren (falls nicht vorhanden)
if ! command -v node &> /dev/null; then
  echo "[1/6] Node.js installieren..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "[1/6] Node.js bereits installiert: $(node -v)"
fi

# 2. PM2 installieren
if ! command -v pm2 &> /dev/null; then
  echo "[2/6] PM2 installieren..."
  sudo npm install -g pm2
else
  echo "[2/6] PM2 bereits installiert"
fi

# 3. Abhaengigkeiten installieren
echo "[3/6] Abhaengigkeiten installieren..."
cd "$SCRIPT_DIR/.."
npm install
cd server && npm install && cd ..

# 4. .env erstellen falls nicht vorhanden
if [ ! -f server/.env ]; then
  echo "[4/6] .env erstellen..."
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  cat > server/.env << EOF
PORT=3001
JWT_SECRET=$SECRET
EOF
  echo "    JWT_SECRET automatisch generiert."
else
  echo "[4/6] .env bereits vorhanden"
fi

# 5. Firewall Port freigeben
echo "[5/6] Firewall konfigurieren..."
if command -v ufw &> /dev/null; then
  sudo ufw allow 3001/tcp
  echo "    Port 3001 freigegeben"
fi

# 6. DuckDNS einrichten (falls Token vorhanden)
if [ -n "$DUCKDNS_TOKEN" ] && [ "$DUCKDNS_TOKEN" != "DEIN-TOKEN-HIER" ]; then
  echo "[6/6] DuckDNS Auto-Update einrichten..."

  # Update-Script erstellen
  cat > /usr/local/bin/duckdns-update.sh << EOF
#!/bin/bash
curl -s "https://www.duckdns.org/update?domains=$DUCKDNS_DOMAIN&token=$DUCKDNS_TOKEN&ip=" > /var/log/duckdns.log 2>&1
EOF
  chmod +x /usr/local/bin/duckdns-update.sh

  # Einmalig ausfuehren
  /usr/local/bin/duckdns-update.sh

  # Cron Job alle 5 Minuten
  (crontab -l 2>/dev/null | grep -v duckdns; echo "*/5 * * * * /usr/local/bin/duckdns-update.sh") | crontab -
  echo "    DuckDNS wird alle 5 Minuten aktualisiert"
  echo "    Domain: $DUCKDNS_DOMAIN.duckdns.org"
else
  echo "[6/6] DuckDNS übersprungen (kein Token in server.config)"
fi

# Offentliche IP ermitteln
PUBLIC_IP=$(curl -s https://api.ipify.org)

echo ""
echo "=== Setup abgeschlossen! ==="
echo ""
echo "Offentliche IP:       $PUBLIC_IP"
echo ""
echo "Server starten:       npm run server:pm2:start"
echo "Autostart einrichten: npm run server:pm2:save"
echo ""
if [ -n "$DUCKDNS_TOKEN" ] && [ "$DUCKDNS_TOKEN" != "DEIN-TOKEN-HIER" ]; then
  echo "Erreichbar unter:     http://$DUCKDNS_DOMAIN.duckdns.org:3001"
else
  echo "Erreichbar unter:     http://$PUBLIC_IP:3001"
fi
