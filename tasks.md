# TODO

* pdf /excel import u export
    * dritte Schießzeit ist immer gesamte 


* requirements für perfekte installation

* README update

## Bugs


Fast perfekt. Die Sessions werden nur nicht auf die verschiedenen accounts geteilt (live) (z.B. wenn man eine erstellt hat, eine serie hinzugefügt hat, etc)

## Server

* Sportler account


## Ideas

* KI zum auswerten 



* **Vergleichstool:** Vergleich der Leistung verschiedener Athleten oder Zeiträume. Mit zeitskalen
* **Rhythmus-Analyse:** Darstellung der Zeitabstände zwischen den einzelnen Schüssen (Splits), um einen stabilen Schießrhythmus zu visualisieren.
* **Wind-Einfluss-Matrix:** (Falls Winddaten erfasst) Visualisierung der Treffpunktverlagerung in Relation zur Windstärke/Richtung.

* **Cloud-Synchronisation:** Speicherung der Daten in einer Cloud, um sie auf mehreren Geräten zu nutzen. --> benötigt Anmeldung

---

## Implementation Plan: Server-Verbindung & Synchronisation

Die App bleibt vollständig lokal nutzbar. Über die Einstellungen kann man sich optional mit einem Server verbinden.

### Phase 1: Auth-Guard für lokalen Modus anpassen
- [x] `auth-guard.js` – Wenn kein `b_server_url` gespeichert → **kein** Redirect zu login.html (lokaler Modus erlaubt)
- [x] `auth-guard.js` – Wenn `b_server_url` vorhanden UND Token fehlt → redirect zu login.html (Server-Modus)
- [x] `auth-guard.js` – Wenn Token vorhanden → wie bisher Server-Verifizierung

### Phase 2: Server-Konfiguration in den Settings
- [x] `settings.html` – Neue Section "Server-Verbindung" vor "Account"
  - IP-Eingabefeld mit Default-Platzhalter (`192.168.178.69:3001`)
  - Verbindungsstatus-Anzeige (grün/rot/gelb)
  - Button "Mit Server verbinden"
  - Button "Verbindung trennen" (wenn verbunden)
- [x] `settings.js` – Neue Funktionen:
  - `loadServerConfig()` – Gespeicherte IP laden und Status anzeigen
  - `connectToServer()` – IP speichern → redirect zu login.html
  - `disconnectFromServer()` – Token löschen, server_url löschen → lokaler Modus
  - `checkServerConnection()` – Health-Check auf eingegebene IP

### Phase 3: API-Service für Dual-Modus updaten
- [x] `api-service.js` – `isServerMode()` Methode → true wenn `b_server_url` gesetzt
- [x] `api-service.js` – `clearServerUrl()` zum Trennen
- [x] `api-service.js` – checkConnection nur im Server-Modus

### Phase 4: Login-Flow für Server-Verbindung
- [x] `login.js` – Nach erfolgreichem Login: initiale Synchronisation starten
- [x] `login.js` – `syncAfterLogin()` – Alle Athleten + Sessions + Settings vom Server laden
- [x] `login.js` – Redirect zu settings.html wenn kein Server konfiguriert

### Phase 5: Account-Section bedingt anzeigen
- [x] `settings.html` / `settings.js` – Account-Section nur anzeigen wenn im Server-Modus
- [x] Wenn nicht verbunden → Account-Section ausblenden

### Dateien die geändert werden:
1. `src/js/services/auth-guard.js` – Lokaler Modus ohne Login
2. `src/settings.html` – Server-Verbindung UI
3. `src/js/pages/settings.js` – Server-Verbindung Logik
4. `src/js/services/api-service.js` – `isServerMode()`, detectBaseUrl
5. `src/js/pages/login.js` – Sync nach Login
