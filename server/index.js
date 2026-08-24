#!/usr/bin/env node
/*
MIT License

Copyright (c) 2026 jmfrohs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { cookieParser, csrfProtection, csrfErrorHandler } = require('./middleware/csrf');
const { apiLimiter } = require('./middleware/rateLimit');
const {
  loadBanList,
  ipBanMiddleware,
  getRequestIp,
  getBannedIps,
  addBannedIp,
  removeBannedIp,
  BAN_FILE_PATH
} = require('./middleware/ip-ban');
const { getDb, closeDb, cleanupExpiredDemoAccounts } = require('./db/database');
const { initSocket } = require('./socket-handler');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const athleteRoutes = require('./routes/athletes');
const sessionRoutes = require('./routes/sessions');
const settingsRoutes = require('./routes/settings');
const emailRoutes = require('./routes/email');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  contentSecurityPolicy: false
}));

app.set('trust proxy', process.env.TRUST_PROXY === 'true');

const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:8000').split(',').map(o => o.trim());

if (!isProduction) {
  app.use(cors({
    origin: true, 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Type'],
    maxAge: 86400
  }));
} else {
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(cookieParser());

app.use(ipBanMiddleware);

app.use((req, res, next) => {
  if (!req.path.startsWith('/api/') || req.path === '/api/health') return next();

  const cleanIp = getRequestIp(req) || '?';

  let userEmail = null;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
      if (payload.email) userEmail = payload.email;
    } catch { /* ignore */ }
  }

  logger.requestStart(userEmail, req.method, req.path, cleanIp);

  const originalSend = res.send;
  res.send = function (data) {
    const statusCode = res.statusCode;
    
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

app.use(express.static(path.join(__dirname, '..', 'src')));

app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/athletes', athleteRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(csrfErrorHandler);

getDb();
loadBanList();

cleanupExpiredDemoAccounts();
setInterval(cleanupExpiredDemoAccounts, 60 * 60 * 1000); // Every hour

const server = http.createServer(app);
initSocket(server);

function printBanHelp() {
  logger.info('Ban Commands:');
  logger.info('  ban list');
  logger.info('  ban add <ip>');
  logger.info('  ban remove <ip>');
}

function handleBanCommand(input) {
  const line = input.trim();
  if (!line) return;
  if (!line.startsWith('ban')) return;

  const parts = line.split(/\s+/);
  const command = parts[1];

  if (!command || command === 'help') {
    printBanHelp();
    return;
  }

  if (command === 'list') {
    const banned = getBannedIps();
    if (banned.length === 0) {
      logger.info('No IPs banned.');
      return;
    }

    logger.info(`Banned IPs (${banned.length}) in ${BAN_FILE_PATH}:`);
    banned.forEach((ip, index) => {
      logger.info(`  ${index + 1}. ${ip}`);
    });
    return;
  }

  if (command === 'add') {
    const ip = parts[2];
    const result = addBannedIp(ip);
    if (!result.ok) {
      logger.warn(`Ban add failed: ${result.error}`);
      return;
    }

    logger.security('warning', 'IP banned', { ip: result.ip, source: 'cli' });
    return;
  }

  if (command === 'remove') {
    const ip = parts[2];
    const result = removeBannedIp(ip);
    if (!result.ok) {
      logger.warn(`Ban remove failed: ${result.error}`);
      return;
    }

    logger.info(`IP unbanned: ${result.ip}`);
    return;
  }

  logger.warn(`Unknown ban command: ${line}`);
  printBanHelp();
}

function restartServer() {
  logger.info('Restarting server...');
  closeDb();

  process.stdin.removeAllListeners('data');
  process.stdin.pause();

  server.close(() => {
    logger.info('Server instance stopped. Starting new process...');

    const child = spawn(process.argv[0], process.argv.slice(1), {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
      detached: true
    });

    child.unref();
    process.exit(0);
  });
}

function shutdown(reason = 'Shutting down server...') {
  logger.shutdown(reason);
  closeDb();
  server.close(() => {
    logger.shutdown('Server stopped');
    process.exit(0);
  });
}

process.stdin.on('error', (err) => {
  if (err.code === 'EIO' || err.code === 'EOF') {
    return;
  }
  logger.error(`STDIN error: ${err.message}`);
});

if (process.stdin.isTTY) {
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    const lines = chunk.split(/\r?\n/).filter(Boolean);
    lines.forEach((rawLine) => {
      const line = rawLine.trim().toLowerCase();

      if (line === 'stop' || line === 'exit') {
        shutdown('Stop command received via console...');
        return;
      }

      if (line === 'restart' || line === 'reboot') {
        restartServer();
        return;
      }

      handleBanCommand(rawLine);
    });
  });
  process.stdin.resume();
}

server.listen(PORT, '0.0.0.0', () => {
  const separator = '─'.repeat(52);

  const nets = os.networkInterfaces();
  const lanIps = [];
  const tailscaleIps = [];
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) {
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
  console.log(`Biathlon Shooting Assistant — Server`);
  console.log(separator);
  logger.startup(`Server running on http://localhost:${PORT}`);
  if (lanIps.length > 0) {
    lanIps.forEach((ip) => {
      logger.startup(`Network: http://${ip}:${PORT}`);
    });
  } else {
    logger.warn('No LAN interface found');
  }
  if (tailscaleIps.length > 0) {
    tailscaleIps.forEach((ip) => {
      logger.startup(`Tailscale: http://${ip}:${PORT}`);
    });
  }
  if (tailscaleIps.length === 0 && lanIps.length === 0) {
    logger.warn('Only accessible within local network');
  }
  console.log(`${separator}\n`);
});

process.on('SIGINT', () => shutdown('Shutting down server (SIGINT)...'));
process.on('SIGTERM', () => shutdown('SIGTERM received, shutting down...'));
