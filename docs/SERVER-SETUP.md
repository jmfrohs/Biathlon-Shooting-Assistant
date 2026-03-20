# Server-Installation — Biathlon Shooting Assistant

Vollständige Anleitung zur Installation und Konfiguration des Backends.  
Der Server ermöglicht Multi-User-Betrieb, Datensynchronisation und Fernzugriff über das Netzwerk.

---

## Inhaltsverzeichnis

1. [Voraussetzungen](#1-voraussetzungen)
2. [Installation (Windows)](#2-installation-windows)
3. [Installation (Linux / Raspberry Pi)](#3-installation-linux--raspberry-pi)
4. [Konfiguration (.env)](#4-konfiguration-env)
5. [Server starten](#5-server-starten)
6. [Netzwerkzugriff einrichten](#6-netzwerkzugriff-einrichten)
7. [DuckDNS — Feste Domain (empfohlen)](#7-duckdns--feste-domain-empfohlen)
8. [Autostart einrichten](#8-autostart-einrichten)
9. [App mit dem Server verbinden](#9-app-mit-dem-server-verbinden)
10. [Fehlerbehebung](#10-fehlerbehebung)

---

## 1. Voraussetzungen

| Software | Version | Download |
|---|---|---|
| **Node.js** | 18 oder neuer | [nodejs.org](https://nodejs.org) |
| **npm** | kommt mit Node.js | — |
| **Git** _(optional)_ | beliebig | [git-scm.com](https://git-scm.com) |

Node.js-Version prüfen:
```bash
node -v   # muss v18.x.x oder höher sein
npm -v
```

---

## 2. Installation (Windows)

### Schritt 1 — Projekt herunterladen
```powershell
# Option A: Mit Git
git clone <repo-url>
cd Biathlon-Shooting-Assistant

# Option B: ZIP herunterladen und entpacken
```

### Schritt 2 — Abhängigkeiten installieren
```powershell
# Im Hauptverzeichnis (installiert alles auf einmal)
npm run install:all
```

Oder manuell:
```powershell
npm install
cd server
npm install
cd ..
```

### Schritt 3 — .env Datei erstellen
Im Ordner `server/` eine Datei namens `.env` erstellen:
```powershell
# PowerShell
$secret = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
"PORT=3001`nJWT_SECRET=$secret" | Out-File -FilePath server\.env -Encoding UTF8
```

Oder manuell die Datei `server/.env` anlegen:
```env
PORT=3001
JWT_SECRET=dein-langer-zufaelliger-geheimer-schluessel-mindestens-32-zeichen
```

> **Wichtig:** `JWT_SECRET` muss ein langer, zufälliger String sein. Niemals teilen oder in Git einchecken.

### Schritt 4 — Server starten
```powershell
npm run server:start
```

Erfolgreich wenn die Ausgabe so aussieht:
```
────────────────────────────────────────────────────────
  🎯 Biathlon Shooting Assistant — Server
────────────────────────────────────────────────────────
  Lokal:        http://localhost:3001
  Netzwerk:     http://192.168.1.25:3001

  ➜ Diese IP in den App-Einstellungen eintragen:
    192.168.1.25:3001

  ⚠️  Nur im lokalen Netzwerk erreichbar.
     Für Internet-Zugriff: Port 3001 am Router weiterleiten.
────────────────────────────────────────────────────────
```

---

## 3. Installation (Linux / Raspberry Pi)

### Schritt 1 — Projekt herunterladen
```bash
git clone <repo-url>
cd Biathlon-Shooting-Assistant
```

### Schritt 2 — Automatisches Setup-Script ausführen
```bash
# Konfiguration vorbereiten
cp scripts/server.config.example scripts/server.config
nano scripts/server.config   # Token und Domain eintragen (siehe Abschnitt 7)

# Setup ausführen (installiert Node.js, PM2, richtet Firewall und DuckDNS ein)
bash scripts/setup-linux.sh
```

Das Script erledigt automatisch:
- Node.js installieren (falls nicht vorhanden)
- PM2 (Prozessmanager) installieren
- Abhängigkeiten installieren
- `.env` mit zufälligem JWT-Secret erstellen
- Firewall-Port 3001 öffnen
- DuckDNS Auto-Update einrichten (alle 5 Minuten)

### Schritt 3 — Server starten
```bash
npm run server:pm2:start
```

---

## 4. Konfiguration (.env)

Datei: `server/.env`

```env
# Server-Port (Standard: 3001)
PORT=3001

# JWT Secret — langer, zufälliger String (mindestens 32 Zeichen)
# Generieren: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

JWT-Secret generieren:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5. Server starten

### Windows
```powershell
# Normaler Start (Fenster bleibt offen)
npm run server:start

# Entwicklungsmodus (Auto-Reload bei Dateiänderungen)
cd server && npm run dev

# Server stoppen
npm run server:stop
```

### Linux mit PM2 (empfohlen für Dauerbetrieb)
```bash
# Starten
npm run server:pm2:start

# Status anzeigen
pm2 status

# Live-Logs anzeigen
npm run server:pm2:logs

# Neustarten
npm run server:pm2:restart

# Stoppen
npm run server:pm2:stop
```

---

## 6. Netzwerkzugriff einrichten

Der Server läuft standardmäßig auf `0.0.0.0:3001` und ist damit im lokalen Netzwerk erreichbar.

### Lokales Netzwerk (WLAN/LAN)

Beim Start wird die LAN-IP angezeigt, z.B. `192.168.1.25:3001`.  
Geräte im selben WLAN können direkt diese IP verwenden.

### Zugriff über das Internet (Port-Forwarding)

1. **Router-Interface öffnen** — meist `http://192.168.1.1` im Browser
2. **Port-Forwarding einrichten:**
   - Externer Port: `3001`
   - Internes Ziel: `<LAN-IP des Server-PCs>:3001` (z.B. `192.168.1.25`)
   - Protokoll: `TCP`
3. **Öffentliche IP herausfinden:** [whatismyip.com](https://www.whatismyip.com)
4. In der App eintragen: `<öffentliche-IP>:3001`

> **Hinweis:** Öffentliche IPs wechseln bei den meisten Heimanschlüssen täglich.  
> Für stabilen Zugriff → **DuckDNS** verwenden (Abschnitt 7).

### Windows-Firewall freigeben
Falls der Server im lokalen Netzwerk nicht erreichbar ist:
```powershell
# Als Administrator ausführen
netsh advfirewall firewall add rule name="Biathlon Server" dir=in action=allow protocol=TCP localport=3001
```

---

## 7. DuckDNS — Feste Domain (empfohlen)

DuckDNS gibt dir eine kostenlose, feste Domain wie `mein-biathlon.duckdns.org`  
die immer auf deine aktuelle IP zeigt — auch wenn sie sich täglich ändert.

### Einrichtung

**Schritt 1 — DuckDNS Account**
1. Gehe auf [duckdns.org](https://www.duckdns.org)
2. Mit GitHub/Google/etc. einloggen
3. Eine Domain erstellen (z.B. `mein-biathlon`)
4. **Token** kopieren (oben auf der Seite angezeigt)

**Schritt 2 — Konfiguration**

`scripts/server.config` erstellen (aus der Vorlage):
```bash
cp scripts/server.config.example scripts/server.config
```

In `scripts/server.config` eintragen:
```bash
DUCKDNS_TOKEN="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
DUCKDNS_DOMAIN="mein-biathlon"   # ohne .duckdns.org
```

**Schritt 3 — Auto-Update einrichten**

*Windows (Task Scheduler):*
```powershell
# Als Administrator ausführen
.\scripts\duckdns-update.ps1          # einmalig ausführen (IP registrieren)
.\scripts\setup-duckdns-task.ps1      # Task Scheduler alle 5 Minuten
```

*Linux (Cron):*
```bash
# Wird automatisch durch setup-linux.sh eingerichtet
# Manuell:
*/5 * * * * curl -s "https://www.duckdns.org/update?domains=mein-biathlon&token=DEIN-TOKEN&ip=" > /var/log/duckdns.log
```

**Schritt 4 — In App eintragen**
```
mein-biathlon.duckdns.org:3001
```

---

## 8. Autostart einrichten

### Windows — Autostart beim PC-Start

1. `Win + R` → `shell:startup` eingeben → Enter
2. Dort eine Verknüpfung erstellen für:
   ```
   powershell.exe -WindowStyle Hidden -Command "cd 'C:\Pfad\zu\Biathlon-Shooting-Assistant\server'; node index.js"
   ```

Oder mit PM2 auf Windows:
```powershell
npm install -g pm2
npm run server:pm2:start
pm2 save
npm run server:pm2:save   # registriert Autostart
```

### Linux — Autostart mit PM2
```bash
npm run server:pm2:start   # Server starten
pm2 save                    # aktuellen Status speichern
pm2 startup                 # Autostart-Befehl anzeigen (dann ausführen)
```

PM2 registriert sich als Systemd-Service und startet automatisch nach einem Neustart.

### Linux — Autostart mit systemd (alternativ)

`/etc/systemd/system/biathlon.service` erstellen:
```ini
[Unit]
Description=Biathlon Shooting Assistant Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Biathlon-Shooting-Assistant/server
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Aktivieren:
```bash
sudo systemctl daemon-reload
sudo systemctl enable biathlon
sudo systemctl start biathlon
sudo systemctl status biathlon
```

---

## 9. App mit dem Server verbinden

1. App öffnen → **Settings** → Abschnitt **Server-Verbindung**
2. IP-Adresse eintragen:
   - Lokales Netzwerk: `192.168.1.25:3001` (LAN-IP aus Server-Startausgabe)
   - Internet: `mein-biathlon.duckdns.org:3001` oder `<öffentliche-IP>:3001`
3. **„Mit Server verbinden"** klicken
4. Login- / Registrierungsseite erscheint
5. Konto erstellen oder einloggen
6. Daten werden automatisch synchronisiert

Nach der ersten Anmeldung verbindet sich die App beim nächsten Start **automatisch** über die gespeicherte IP.

---

## 10. Fehlerbehebung

### Server startet nicht — Port bereits belegt
```powershell
# Windows: Prozess auf Port 3001 beenden
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force
```
```bash
# Linux
sudo lsof -ti:3001 | xargs kill -9
```

### Server nicht erreichbar aus dem Netzwerk
- Windows-Firewall prüfen (Abschnitt 6)
- Router-Port-Forwarding prüfen
- Sicherstellen dass Server auf `0.0.0.0` (nicht nur `localhost`) lauscht

### `.env` fehlt — JWT-Fehler beim Login
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Ausgabe in `server/.env` als `JWT_SECRET=...` eintragen.

### DuckDNS zeigt alte IP
```powershell
# Windows: Update manuell auslösen
.\scripts\duckdns-update.ps1
```
```bash
# Linux
/usr/local/bin/duckdns-update.sh
cat /var/log/duckdns.log   # Ausgabe prüfen (sollte "OK" sein)
```

### Verbindungsprobleme — Health-Check
```bash
# Lokal
curl http://localhost:3001/api/health

# Aus anderem Gerät im Netzwerk
curl http://192.168.1.25:3001/api/health

# Aus dem Internet
curl http://mein-biathlon.duckdns.org:3001/api/health
```
Erwartete Antwort: `{"status":"ok","timestamp":"..."}`

---

## Datenbankpfad

Die SQLite-Datenbank wird automatisch erstellt unter:
```
server/db/biathlon.db
```

Für Backups einfach diese Datei kopieren.
