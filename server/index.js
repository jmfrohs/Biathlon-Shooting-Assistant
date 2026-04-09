const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { getDb, closeDb } = require('./db/database');

const authRoutes = require('./routes/auth');
const athleteRoutes = require('./routes/athletes');
const sessionRoutes = require('./routes/sessions');
const settingsRoutes = require('./routes/settings');
const emailRoutes = require('./routes/email');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Connection logger
const connectedIps = new Map(); // ip -> { count, lastSeen, user }

app.use((req, res, next) => {
  // Skip static file requests and health checks to keep output clean
  if (!req.path.startsWith('/api/') || req.path === '/api/health') return next();

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '?';
  const cleanIp = ip.replace('::ffff:', ''); // normalize IPv4-mapped IPv6

  const now = new Date();
  const time = now.toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const method = req.method.padEnd(6);
  const route = req.path;

  // Extract user info from JWT if present (without verifying — just for display)
  let userHint = '';
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
      if (payload.email) userHint = ` [${payload.email}]`;
    } catch { /* ignore */ }
  }

  const isNew = !connectedIps.has(cleanIp);
  connectedIps.set(cleanIp, { lastSeen: now });

  if (isNew) {
    console.log(`  🔌 [${time}] Neue Verbindung: ${cleanIp}${userHint}`);
  }
  console.log(`  📡 [${time}] ${method} ${route}  ← ${cleanIp}${userHint}`);

  next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'src')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/athletes', athleteRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/email', emailRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database on startup
getDb();

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  const separator = '─'.repeat(52);

  // Collect all non-internal IPv4 addresses
  const nets = os.networkInterfaces();
  const lanIps = [];
  const tailscaleIps = [];
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) {
        // Tailscale IPs are in the 100.64.0.0/10 range (100.64.x.x – 100.127.x.x)
        const parts = net.address.split('.').map(Number);
        if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) {
          tailscaleIps.push(net.address);
        } else {
          lanIps.push(net.address);
        }
      }
    }
  }

  console.log(`\n${separator}`);
  console.log(`  🎯 Biathlon Shooting Assistant — Server`);
  console.log(separator);
  console.log(`  Lokal:        http://localhost:${PORT}`);
  if (lanIps.length > 0) {
    lanIps.forEach((ip) => {
      console.log(`  Netzwerk:     http://${ip}:${PORT}`);
    });
  } else {
    console.log(`  Netzwerk:     Keine LAN-Schnittstelle gefunden`);
  }
  if (tailscaleIps.length > 0) {
    tailscaleIps.forEach((ip) => {
      console.log(`  Tailscale:    http://${ip}:${PORT}`);
    });
    console.log(`\n  ➜ Tailscale-URL in den App-Einstellungen eintragen:`);
    console.log(`    http://${tailscaleIps[0]}:${PORT}`);
  } else if (lanIps.length > 0) {
    console.log(`\n  ➜ Diese IP in den App-Einstellungen eintragen:`);
    console.log(`    ${lanIps[0]}:${PORT}`);
  }
  if (tailscaleIps.length === 0) {
    console.log(`\n  ⚠️  Nur im lokalen Netzwerk erreichbar.`);
    console.log(`     Tailscale installieren für sicheren Fernzugriff.`);
  }
  console.log(`${separator}\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  closeDb();
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  closeDb();
  server.close(() => process.exit(0));
});
