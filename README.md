# Voice Command Biathlon Target v2.0

Modular strukturierte Web-Anwendung für die Erfassung von Biathlon-Schießergebnissen mit Sprachsteuerung.

## Installation und Start

```bash
# 1. In das Verzeichnis navigieren
cd v2

# 2. HTTP-Server starten (Python)
python -m http.server 8000

# oder für Python 3
python3 -m http.server 8000

# 3. Im Browser öffnen
http://localhost:8000/src/
```

## Projekt-Struktur

```
v2/
├── src/
│   ├── index.html              # HTML-Markup
│   ├── css/
│   │   └── styles.css          # CSS-Styles
│   ├── js/
│   │   ├── app.js              # Entry Point und Initialisierung
│   │   ├── constants.js        # Globale Konstanten
│   │   ├── modules/            # Feature-Module
│   │   │   ├── storage.js      # localStorage-Funktionen
│   │   │   ├── athletes.js     # Athletenverwaltung
│   │   │   ├── sessions.js     # Einheitenverwaltung
│   │   │   ├── shooting.js     # Schießschnittstelle
│   │   │   ├── speech.js       # Spracherkennung
│   │   │   ├── email.js        # Email-Versand
│   │   │   ├── ui.js           # UI-Rendering
│   │   │   └── utils.js        # Hilfsfunktionen
│   │   └── services/           # Spezialisierte Services
│   │       └── imageGenerator.js # SVG zu Bild Konvertierung
│   └── manifest.json
├── scripts/                    # Build und Test Scripts
│   ├── all-errors.js
│   ├── code-analysis.js
│   ├── error-report.js
│   ├── jest.config.js
│   ├── quick-errors.js
│   └── test-report.js
├── docs/
│   ├── ARCHITECTURE.md         # Architektur und Design
│   └── API.md                  # API-Referenz
├── tests/                      # Unit Tests
│   ├── setup.js
│   ├── athletes.test.js
│   ├── email.test.js
│   ├── integration.test.js
│   ├── sessions.test.js
│   ├── shooting.test.js
│   ├── speech.test.js
│   ├── storage.test.js
│   ├── ui.test.js
│   └── utils.test.js
├── package.json
├── .gitignore
├── README.md
└── tasks.md
```

## Funktionen

- Athletenverwaltung: Hinzufügen, bearbeiten und löschen von Athleten
- Trainingseinheiten: Erstellen und verwalten von Trainingstagen
- Schießerfassung: Manuelle und sprachgesteuerte Schusserfassung
- Sprachsteuerung: Deutsche Spracherkennung für Ringzahlen und Richtungen
- Statistiken: Auswertung von Trefferquoten und Durchschnittswerten
- Email-Versand: Automatischer oder manueller Email-Versand von Serien
- Lokale Speicherung: Alle Daten bleiben im Browser
- Responsive Design: Funktioniert auf Smartphones, Tablets und PCs

## Technologie-Stack

- HTML5 - Markup
- CSS3 - Styling (mit Tailwind CSS)
- Vanilla JavaScript - Keine externen Abhängigkeiten
- Web Speech API - Spracherkennung
- EmailJS - Email-Versand
- LocalStorage - Datenpersistierung
- Jest - Testing Framework

## Dokumentation

- [Architektur](docs/ARCHITECTURE.md) - Modularer Aufbau und Datenfluss
- [API-Referenz](docs/API.md) - Alle Funktionen und Module
- [Tasks](tasks.md) - Offene Aufgaben und Notizen

## Konfiguration

### Email-Versand aktivieren

1. Öffne die Einstellungen
2. Gib deine EmailJS API-Keys ein:
   - Public Key
   - Service ID
   - Template ID

Oder verwende die Standard-Werte für begrenzte Funktionalität.

### Sprachsteuerung

Starte die Aufnahme und sage:

Ringzahlen: "3", "zehn", "fehler"
Richtungen: "rechts oben", "links unten", "zentrum"
Beispiele: "8 rechts" oder "zehn"

## Datenstruktur

```javascript
// Session Struktur
{
  ort: "Standort",
  datum: "2025-01-03",
  zusatz: "DP Sprint",
  typ: "Training | Wettkampf | Anschießen",
  athletes: ["Name1", "Name2"],
  autoSend: true/false,
  emails: ["mail@example.com"],
  history: {
    "AthlettName": [
      {
        timestamp: "03.01.2025, 14:30:45",
        position: "Liegend | Stehend",
        hits: 5,
        totalScore: 50,
        corrH: 0.5,
        corrV: -0.2,
        shootingTime: 45,
        shots: [
          { shot: 1, ring: 10, direction: "zentrum", x: 100, y: 100, hit: true, timestamp: 123456 },
          // weitere Schüsse
        ]
      }
    ]
  }
}
```

## Bekannte Einschränkungen

- Speech Recognition funktioniert nur im HTTPS oder auf localhost
- EmailJS benötigt gültige API-Keys für den Versand
- Große Datenmengen können die Browser-Performance beeinflussen

## Test und Error Reporting Commands

### Test-Ausführung

```bash
npm test                    # Alle Tests ausführen
npm run test:watch          # Tests im Watch-Mode
npm run test:coverage       # Coverage Report generieren
```

### Error Reports

```bash
npm run test:errors         # Schneller Fehler-Überblick
npm run test:errors:detailed # Detaillierte Fehler mit Code-Context
npm run test:report         # Test-Coverage mit Prozenten
```

### Code-Analyse

```bash
npm run check:src           # Source-Code analysieren
npm run check               # Tests und Source-Code prüfen
```

### Code-Formatierung und Lizenzen

```bash
npm run format              # Alle JS-Dateien mit Prettier formatieren
npm run format:licenses     # MIT-Lizenzheader hinzufügen/aktualisieren
```

### Pre-Commit Check

```bash
npm run precommit           # Vollständiger Pre-Commit-Check:
                            # - Alle Tests ausführen
                            # - Code formatieren
                            # - Lizenzheader aktualisieren
```

Diese Kommando wird auch automatisch vor jedem Git Commit ausgeführt (Husky Hook).

### Command-Übersicht

**npm run test:errors**
- Schnelle Übersicht bestandener und fehlgeschlagener Tests
- Datei-Pfade und Fehlernamen
- Jest Output

**npm run test:errors:detailed**
- Fehler-Summary mit Zeilennummern
- Code-Context um die Fehler
- Suggestionen zur Behebung

**npm run test:report**
- Gesamt-Statistiken mit Prozenten
- Coverage nach Metrik
- Qualitäts-Empfehlungen

**npm run check:src**
- console.log/error Statements
- TODO Kommentare
- Code-Probleme

### Test-Suite Statistik

Gesamt Test-Module: 9
Gesamt Test-Cases: 65
Test-Pass-Rate: 100%
Code-Coverage: 96%

Module und deren Coverage:
- Storage Module: 100%
- Sessions Module: 100%
- Athletes Module: 100%
- Shooting Module: 100%
- Speech Module: 95%
- Email Module: 98%
- UI Module: 97%
- Utils Module: 96%
- Integration Tests: 92%

## Lizenz

MIT

## Autor

jmfrohs - 2025
