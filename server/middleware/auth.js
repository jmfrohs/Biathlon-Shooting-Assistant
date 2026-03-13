const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'biathlon-shooting-assistant-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Kein Token vorhanden. Bitte einloggen.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token ungültig oder abgelaufen.' });
  }
}

function generateToken(userId, email) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

module.exports = { authenticateToken, generateToken, JWT_SECRET };
