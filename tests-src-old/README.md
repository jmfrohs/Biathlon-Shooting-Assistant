# Test Suite für Voice Command Biathlon Target

Diese Test-Suite bietet umfassende Tests für alle Module der Anwendung.

## Installation

```bash
npm install
```

## Test-Befehle

### Alle Tests ausführen
```bash
npm test
```

### Tests im Watch-Modus (auto-reload bei Änderungen)
```bash
npm run test:watch
```

### Test Coverage Report
```bash
npm run test:coverage
```

## Test-Struktur

### Setup-Datei
- `tests/setup.js` - Konfiguration von Jest, Mocking von Browser-APIs

### Test-Dateien

#### 1. **storage.test.js**
Tests für die Persistierung von Daten im localStorage:
- Session-Speicherung
- Athleten-Speicherung
- Email-Speicherung
- Trainer-Name-Speicherung
- Gerätekonfiguration

#### 2. **sessions.test.js**
Tests für Session-Management:
- Session-Anzeige und Rendering
- Session-Erstellung mit Athleten
- Session-Löschung
- Ansicht-Navigation (Sessions ↔ Athleten)
- Session-Typen (Training, Wettkampf, Anschießen)

#### 3. **athletes.test.js**
Tests für Athleten-Verwaltung:
- Globale Athleten-Liste
- Athleten-Hinzufügen/-Löschen
- Duplikat-Prävention
- Athleten-Auswahl in Sessions
- Alle Athleten auswählen/abwählen

#### 4. **shooting.test.js**
Tests für Schießfunktionalität:
- Schuss-Aufzeichnung
- Position-Management (Liegend/Stehend)
- Target-Click-Handling
- Korrektur-Verwaltung
- Schuss-Validierung
- Schuss-Zähler
- Durchschnittliche Schussposition

#### 5. **speech.test.js**
Tests für Sprachsteuerung:
- Speech Recognition Setup
- Steuerung (Start/Stop/Abort)
- Ergebnisverarbeitung
- Deutsche Zahlenwort-Konvertierung
- Richtungserkennung
- Fehlerbehandlung
- Transkriptions-Anzeige

#### 6. **email.test.js**
Tests für Email-Funktionalität:
- Email-Verwaltung (Hinzufügen/Löschen)
- Email-Validierung
- EmailJS-Konfiguration
- Session Email-Einstellungen
- Auto-Send Aktivierung
- Email-Rendering
- Email-Inhalts-Formatierung

#### 7. **ui.test.js**
Tests für Benutzeroberfläche:
- Trainer-Name-Anzeige
- Modal-Management
- Ansicht-Navigation
- Athleten-Verlauf-Anzeige
- Toast-Benachrichtigungen
- Statistik-Berechnung (Hit-Rate, Durchschnittliche Ringe)

#### 8. **utils.test.js**
Tests für Utility-Funktionen:
- Deutsche Zahlenwort-Konvertierung
- Zufallszahlen-Generierung
- Ring-Berechnung aus Entfernung
- Winkelbias-Berechnung
- Durchschnittliche Schussposition
- Korrektur-Management
- Textfeld-Eingabe-Behandlung
- Swipe-Erkennung

#### 9. **integration.test.js**
Integrierte Tests für komplexe Workflows:
- Kompletter Session-Workflow
- Multi-Athlet-Session-Management
- Datenpersistenz-Workflow
- Fehlerbehandlung und Recovery
- UI-Zustand-Konsistenz

## Test-Abdeckung

Die Test-Suite deckt folgende Bereiche ab:

- ✅ Datenpersistenz (localStorage)
- ✅ Session-Management
- ✅ Athleten-Verwaltung
- ✅ Schießfunktionalität
- ✅ Sprachsteuerung
- ✅ Email-Versand
- ✅ Benutzeroberfläche
- ✅ Utility-Funktionen
- ✅ Integrierte Workflows

## Neue Tests hinzufügen

1. Erstelle eine neue Test-Datei im `tests/` Verzeichnis
2. Nutze die vorhandene Struktur als Template
3. Beschreibe Tests mit `describe()` Blöcken
4. Schreibe einzelne Tests mit `test()` oder `it()`
5. Nutze `expect()` für Assertions

Beispiel:
```javascript
describe('My Feature', () => {
  test('should do something', () => {
    expect(result).toBe(expectedValue);
  });
});
```

## Debugging

### Debug-Output in Tests
```javascript
console.log('Debug info:', variable);
```

### Jest Debug-Modus
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Einen einzelnen Test ausführen
```bash
npx jest tests/storage.test.js -t "should save sessions"
```

## CI/CD Integration

Die Test-Suite kann leicht in CI/CD-Pipelines integriert werden:

```yaml
test:
  script:
    - npm install
    - npm run test:coverage
```

## Bekannte Einschränkungen

- Tests verwenden jsdom für DOM-Simulation
- Browser-spezifische APIs (SpeechRecognition) sind gemockt
- Echte HTTP-Requests sind nicht enthalten (nur localStorage)
- EmailJS ist gemockt und nicht funktional

## Zukünftige Verbesserungen

- [ ] E2E Tests mit Puppeteer/Playwright
- [ ] Performance-Tests
- [ ] Accessibility Tests
- [ ] Visual Regression Tests
- [ ] Load-Tests

---

**Letztes Update:** Januar 2025
**Autor:** jmfrohs
**Lizenz:** MIT
