const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('\x1b[31m[FATAL] JWT_SECRET ist nicht gesetzt! Server wird nicht gestartet.\x1b[0m');
  console.error('Bitte JWT_SECRET in server/.env setzen (mindestens 32 zufällige Zeichen).');
  process.exit(1);
}
const JWT_EXPIRES_IN = '7d';

function authenticateToken(req, res, next) {
  // Allow OPTIONS preflight requests without authentication
  if (req.method === 'OPTIONS') {
    return next();
  }

  let token = null;

  // 1. Try to read from Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. Try to read from cookies if not in header
  if (!token && req.cookies) {
    token = req.cookies['b_auth_token'];
  }

  if (!token) {
    return res.status(401).json({ error: 'Kein Token vorhanden. Bitte einloggen.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Check if user is blocked in database
    if (decoded.userId) {
      const { getDb } = require('../db/database');
      const db = getDb();
      const user = db.prepare('SELECT is_blocked FROM users WHERE id = ?').get(decoded.userId);
      if (user && user.is_blocked === 1) {
        return res.status(403).json({ error: 'Ihr Account wurde gesperrt. Bitte kontaktieren Sie den Administrator.' });
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token ungültig oder abgelaufen.' });
  }
}

function generateToken(userId, email) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function setAuthCookie(res, token) {
  res.cookie('b_auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

function generateGuestSessionToken(sessionId, inviteHash, expiresAtIso) {
  const now = Date.now();
  const expiresAtMs = new Date(expiresAtIso).getTime();
  const fallbackSeconds = 2 * 60 * 60;
  const ttlSeconds = Number.isFinite(expiresAtMs)
    ? Math.max(60, Math.floor((expiresAtMs - now) / 1000))
    : fallbackSeconds;

  return jwt.sign(
    {
      role: 'session_guest',
      guestSessionId: Number(sessionId),
      inviteHash,
      email: 'guest@invite.local',
    },
    JWT_SECRET,
    { expiresIn: ttlSeconds }
  );
}

module.exports = {
  authenticateToken,
  generateToken,
  setAuthCookie,
  generateGuestSessionToken,
  JWT_SECRET
};
