# Server Security Implementation Guide

Diese Datei dokumentiert alle implementierten Sicherheitsverbesserungen für den Biathlon Shooting Assistant Server.

## ✅ Implementierte Sicherheitsfeatures

### 1. **Rate Limiting & Brute-Force Protection** 🚫

**Datei:** `server/middleware/rateLimit.js`

- **Login Protection:** Max 5 Versuche pro 15 Minuten pro IP
- **Registration Protection:** Max 3 Registrierungen pro Stunde pro IP
- **General API Rate Limiting:** Max 100 Anfragen pro 15 Minuten

```javascript
// Automatisch aktiviert in allen Auth-Routes
router.post('/login', loginLimiter, ...);
router.post('/register', registerLimiter, ...);
```

**Konfiguration in `.env`:**
```env
RATE_LIMIT_WINDOW_MS=900000  # 15 Minuten
RATE_LIMIT_MAX_REQUESTS=5
```

---

### 2. **Input Validation & SQL Injection Prevention** 🛡️

**Datei:** `server/middleware/validation.js`

Alle API-Eingaben werden validiert:
- **Email:** Must valid email format
- **Password:** Min 8 Zeichen, Großbuchstaben, Kleinbuchstaben, Zahlen
- **Namen:** Max 100 Zeichen, keine Sonderzeichen
- **Role:** Nur erlaubte Werte ('coach', 'athlete', 'admin')

```javascript
// In Auth Routes
router.post('/register',
  registerValidationRules(),
  validationErrorHandler,
  ...
);
```

**Vorteile:**
- XSS-Protection durch Input-Validierung
- SQL Injection wird verhindert (prepared statements sind bereits in Verwendung)
- Fehlerhafte Eingaben werden mit aussagekräftigen Fehlermeldungen abgelehnt

---

### 3. **CORS Security** 🌐

**Datei:** `server/index.js`

CORS ist jetzt auf bestimmte Origins beschränkt:

```javascript
app.use(cors({
  origin: allowedOrigins,  // Aus ALLOWED_ORIGINS Env-Variable
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600
}));
```

**Konfiguration in `.env`:**
```env
ALLOWED_ORIGINS=http://localhost:3001,https://yourdomain.com
```

---

### 4. **CSRF Protection** 🔒

**Datei:** `server/middleware/csrf.js`

CSRF Token Middleware implementiert:

```javascript
const { cookieParser, csrfProtection, csrfErrorHandler } = require('./middleware/csrf');

app.use(cookieParser());
app.use(csrfErrorHandler); // Error Handler am Ende
```

**Features:**
- HTTP-Only Cookies für CSRF Tokens
- Sichere SameSite Attribute
- Automatische Token-Validierung bei State-changing Operations

---

### 5. **Enhanced Logging & Security Monitoring** 📊

**Datei:** `server/utils/logger.js`

Neue Logging-Funktionen:

```javascript
logger.authAttempt(email, ip, success, reason);
logger.suspicious(activity, email, ip, metadata);
logger.security(level, message, metadata);
```

**Beispiele:**
```javascript
logger.authAttempt('user@example.com', '192.168.1.1', true, 'Login successful');
logger.suspicious('Duplicate registration attempt', 'user@example.com', '192.168.1.1');
logger.security('warning', 'User password changed', { email: 'user@example.com', ip: '192.168.1.1' });
```

**Wichtig:** Passwörter und Tokens werden NIEMALS geloggt!

---

### 6. **Logging Security & Privacy** 🔐

**Datei:** `server/utils/logging-security.js`

Utilities zur Sicherung von Logs:

```javascript
const { sanitize, maskEmail, maskIP } = require('./utils/logging-security');

// Sensitive Daten automatisch entfernen
const safeData = sanitize(requestBody);

// Email maskieren: user@example.com → u***@example.com
const maskedEmail = maskEmail('user@example.com');

// IP maskieren: 192.168.1.100 → 192.168.1.***
const maskedIP = maskIP('192.168.1.100');
```

**Geschützte Felder:**
- password, newPassword, currentPassword
- token, authorization, jwt, secret, key, api_key
- creditCard, ssn, passport

---

### 7. **Database Security & Backups** 💾

**Datei:** `server/utils/database-security.js`

Automatische Datenbanksicherheit:

```javascript
const dbSecurity = new DatabaseSecurity(DB_PATH);

// Automatische tägliche Backups
dbSecurity.scheduleAutoBackup();

// Integritätsprüfung
dbSecurity.checkIntegrity(db);

// Sichere Datenlöschung (mehrfaches Überschreiben)
dbSecurity.secureDelete(filePath, passes = 3);
```

**Features:**
- ✅ Tägliche automatische Backups in `server/db/backups/`
- ✅ Alte Backups werden nach 7 Tagen gelöscht
- ✅ PRAGMA-Einstellungen für bessere Sicherheit:
  - Foreign Keys aktiviert
  - Write-Ahead Logging (WAL) aktiviert
  - Synchronization auf NORMAL
  - Temp Store im Memory

---

### 8. **Data Privacy & GDPR Compliance** 👤

**Datei:** `server/utils/data-privacy.js`

Funktionen für Datenschutz:

```javascript
const DataPrivacy = require('./utils/data-privacy');

// GDPR: Recht auf Vergessenwerden
DataPrivacy.deleteUserData(db, userId);

// GDPR: Datenportabilität
const userData = DataPrivacy.exportUserData(db, userId);

// Anonymisierung statt Löschung
DataPrivacy.anonymizeUserData(db, userId);

// Datenspeicherrichtlinien durchsetzen
const stats = DataPrivacy.enforceDataRetention(db, 365); // 365 Tage Aufbewahrung
```

---

### 9. **Environment Variable Security** 🔑

**Datei:** `server/.env.example`

Wichtige Sicherheitsvariablen:

```env
# JWT Security
JWT_SECRET=<min-64-chars-random>  # MUSS zufällig sein!
JWT_EXPIRES_IN=15m                # Short-lived Access Tokens
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5

# Session Management
MAX_ACTIVE_SESSIONS=3

# Database
DB_PATH=./db/biathlon.db
DB_BACKUP_PATH=./db/backups

# CSRF
ENABLE_CSRF=true

# Logging
LOG_LEVEL=info
```

---

## 🚀 Getting Started

### 1. Pakete Installieren
```bash
cd server
npm install
```

### 2. .env Konfigurieren
```bash
# Kopiere das Template
cp .env.example .env

# Generiere einen JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Trage den Secret in .env ein
JWT_SECRET=<generated-secret>
```

### 3. Server Starten
```bash
npm run start
```

---

## 🔒 Security Best Practices

### Passwort-Anforderungen
- Mindestens 8 Zeichen
- Muss Großbuchstaben enthalten
- Muss Kleinbuchstaben enthalten
- Muss Zahlen enthalten

### IP-basierte Sicherheit
- Verdächtige IPs werden logged
- Mehrfache Fehlversuche triggern Alerts
- Rate Limiting schützt vor Brute-Force

### Datenbank-Sicherheit
- Foreign Keys sind aktiviert
- WAL (Write-Ahead Logging) ist aktiviert
- Tägliche Backups in `server/db/backups/`
- Datenbankintegrität wird on startup überprüft

### Logging
- Keine Passwörter in Logs
- Keine Tokens in Logs
- Verdächtige Aktivitäten werden separat geloggt
- Alle Failed Login Attempts werden recorded

---

## 📋 Checklist für Production

- [ ] `JWT_SECRET` auf zufälligen, langen String ändern
- [ ] `ALLOWED_ORIGINS` auf tatsächliche Domain(s) setzen
- [ ] `NODE_ENV=production` in `.env` setzen
- [ ] HTTPS auf dem Server aktivieren (Lets Encrypt empfohlen)
- [ ] Regelmäßige Datenbank-Backups überprüfen
- [ ] Logs regelmäßig überprüfen auf verdächtige Aktivitäten
- [ ] `npm audit` regelmäßig laufen für Vulnerabilities
- [ ] Firewall-Regeln für den Server einrichten
- [ ] Rate Limiting Grenzen basierend auf erwarteter Last anpassen
- [ ] Data Retention Policy definieren (siehe DataPrivacy.enforceDataRetention)

---

## 🧪 Testing

### Rate Limiting testen
```bash
# Mehrfache Login-Versuche hintereinander machen
# Nach 5 Versuchen sollte 429 (Too Many Requests) zurückkommen
```

### Validation testen
```bash
# Mit ungültigen Eingaben testen:
POST /api/auth/register
{
  "email": "invalid",
  "password": "short"
}
# Sollte 400 mit Validierungsfehlern zurückkommen
```

### Logging überprüfen
```bash
tail -f logs/security.log
# Sollte verdächtige Aktivitäten zeigen
```

---

## 📚 Zusätzliche Ressourcen

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [GDPR Compliance](https://gdpr-info.eu/)

---

## ❓ Häufig Gestellte Fragen

### Q: Was ist Rate Limiting?
**A:** Rate Limiting beschränkt die Anzahl der Anfragen von einer IP pro Zeitraum. Das schützt vor Brute-Force Angriffen und DoS.

### Q: Warum sind Backups wichtig?
**A:** Backups ermöglichen Wiederherstellung bei Datenverlust, Ransomware oder Corruption. Daily Backups sind ein Muss.

### Q: Was ist CSRF?
**A:** Cross-Site Request Forgery ist ein Angriff, bei dem ein Attacker eine Aktion im Namen des Users ausführt. CSRF Tokens verhindern das.

### Q: Wie stelle ich sicher, dass mein JWT_SECRET sicher ist?
**A:** Nutze Crypto für Zufallsgenerierung: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

Für Fragen oder Issues, siehe den Support Contact im Projekt-README.
