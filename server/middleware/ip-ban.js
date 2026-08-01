const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const BAN_FILE_PATH = process.env.IP_BAN_FILE
  ? path.resolve(process.env.IP_BAN_FILE)
  : path.join(__dirname, '..', 'db', 'ip-bans.json');

let bannedIps = new Set();

function normalizeIp(ip) {
  if (!ip || typeof ip !== 'string') return '';

  let normalized = ip.trim();
  if (!normalized) return '';

  if (normalized.includes(',')) {
    normalized = normalized.split(',')[0].trim();
  }

  if (normalized.startsWith('::ffff:')) {
    normalized = normalized.slice(7);
  }

  if (normalized === '::1') {
    return '127.0.0.1';
  }

  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    normalized = normalized.slice(1, -1);
  }

  return normalized;
}

function ensureBanFileExists() {
  const dir = path.dirname(BAN_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(BAN_FILE_PATH)) {
    fs.writeFileSync(BAN_FILE_PATH, '[]\n', 'utf8');
  }
}

function persistBanList() {
  ensureBanFileExists();
  const payload = JSON.stringify(Array.from(bannedIps).sort(), null, 2);
  fs.writeFileSync(BAN_FILE_PATH, `${payload}\n`, 'utf8');
}

function loadBanList() {
  try {
    ensureBanFileExists();
    const raw = fs.readFileSync(BAN_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error('IP ban list must be an array');
    }

    bannedIps = new Set(parsed.map(normalizeIp).filter(Boolean));
  } catch (error) {
    bannedIps = new Set();
    logger.error(`IP-Ban-Liste konnte nicht geladen werden: ${error.message}`, error);
  }
}

function getRequestIp(req) {
  return normalizeIp(req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || req.headers['x-forwarded-for']);
}

function getSocketIp(socket) {
  return normalizeIp(
    socket.handshake?.address ||
    socket.request?.socket?.remoteAddress ||
    socket.handshake?.headers?.['x-forwarded-for']
  );
}

function isIpBanned(ip) {
  const normalized = normalizeIp(ip);
  return normalized ? bannedIps.has(normalized) : false;
}

function getBannedIps() {
  return Array.from(bannedIps).sort();
}

function addBannedIp(ip) {
  const normalized = normalizeIp(ip);
  if (!normalized) {
    return { ok: false, error: 'Ungueltige IP-Adresse' };
  }

  if (bannedIps.has(normalized)) {
    return { ok: false, error: 'IP ist bereits gebannt' };
  }

  bannedIps.add(normalized);
  persistBanList();
  return { ok: true, ip: normalized };
}

function removeBannedIp(ip) {
  const normalized = normalizeIp(ip);
  if (!normalized) {
    return { ok: false, error: 'Ungueltige IP-Adresse' };
  }

  if (!bannedIps.has(normalized)) {
    return { ok: false, error: 'IP ist nicht gebannt' };
  }

  bannedIps.delete(normalized);
  persistBanList();
  return { ok: true, ip: normalized };
}

function ipBanMiddleware(req, res, next) {
  const ip = getRequestIp(req);

  if (isIpBanned(ip)) {
    logger.security('warning', 'Gebannte IP hat HTTP-Zugriff versucht', {
      ip,
      method: req.method,
      path: req.path
    });

    return res.status(403).json({ error: 'Access denied' });
  }

  return next();
}

module.exports = {
  BAN_FILE_PATH,
  normalizeIp,
  loadBanList,
  isIpBanned,
  getBannedIps,
  addBannedIp,
  removeBannedIp,
  getRequestIp,
  getSocketIp,
  ipBanMiddleware
};