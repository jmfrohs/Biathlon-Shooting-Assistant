const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const { cookieParser, csrfProtection, csrfErrorHandler } = require('./middleware/csrf');
const { getDb, closeDb, cleanupExpiredDemoAccounts } = require('./db/database');
const { initSocket } = require('./socket-handler');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const athleteRoutes = require('./routes/athletes');
const sessionRoutes = require('./routes/sessions');
const settingsRoutes = require('./routes/settings');
const emailRoutes = require('./routes/email');

const app = express();
const PORT = process.env.PORT || 3001;

// Security Middleware
// CORS: Restrict to allowed origins
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3001,http://localhost:8000').split(',').map(o => o.trim());

// Development: Allow all origins. Production: Use whitelist
if (!isProduction) {
  // Development mode - allow all origins (explicit, not wildcard to support credentials)
  app.use(cors({
    origin: function(origin, callback) {
      // Allow any origin (including null) in development
      callback(null, origin || true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Type'],
    maxAge: 86400
  }));
} else {
  // Production mode - strict whitelist
  app.use(cors({
    origin: function(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS rejected origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Type'],
    maxAge: 86400
  }));
}

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Cookie Parser for CSRF
app.use(cookieParser());

// Middleware for logging requests with response time tracking
app.use((req, res, next) => {
  // Skip static file requests and health checks to keep output clean
  if (!req.path.startsWith('/api/') || req.path === '/api/health') return next();

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '?';
  const cleanIp = ip.replace('::ffff:', ''); // normalize IPv4-mapped IPv6

  // Extract user info from JWT if present (without verifying — just for display)
  let userEmail = null;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
      if (payload.email) userEmail = payload.email;
    } catch { /* ignore */ }
  }

  // Log request start
  logger.requestStart(userEmail, req.method, req.path, cleanIp);

  // Capture response status
  const originalSend = res.send;
  res.send = function (data) {
    const statusCode = res.statusCode;
    
    // Log based on status code
    if (statusCode >= 200 && statusCode < 400) {
      logger.requestSuccess(userEmail, req.method, req.path, statusCode);
    } else if (statusCode >= 400 && statusCode < 500) {
      logger.requestWarning(userEmail, req.method, req.path, statusCode);
    } else if (statusCode >= 500) {
      logger.requestError(userEmail, req.method, req.path, statusCode);
    }

    return originalSend.call(this, data);
  };

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

// CSRF Error Handler (must be after routes)
app.use(csrfErrorHandler);

// Initialize database on startup
getDb();

// Run cleanup for expired demo accounts on startup and every hour
cleanupExpiredDemoAccounts();
setInterval(cleanupExpiredDemoAccounts, 60 * 60 * 1000); // Every hour

// Start server with socket.io
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, '0.0.0.0', () => {
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
  logger.startup(`Server läuft auf http://localhost:${PORT}`);
  if (lanIps.length > 0) {
    lanIps.forEach((ip) => {
      logger.startup(`Netzwerk: http://${ip}:${PORT}`);
    });
  } else {
    logger.warn('Keine LAN-Schnittstelle gefunden');
  }
  if (tailscaleIps.length > 0) {
    tailscaleIps.forEach((ip) => {
      logger.startup(`Tailscale: http://${ip}:${PORT}`);
    });
  }
  if (tailscaleIps.length === 0 && lanIps.length === 0) {
    logger.warn('Nur im lokalen Netzwerk erreichbar');
  }
  console.log(`${separator}\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.shutdown('Server wird heruntergefahren...');
  closeDb();
  server.close(() => {
    logger.shutdown('Server gestoppt');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.shutdown('SIGTERM empfangen, fahre herunter...');
  closeDb();
  server.close(() => process.exit(0));
});
