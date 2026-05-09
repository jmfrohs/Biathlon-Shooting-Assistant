const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { authenticateToken, generateToken } = require('../middleware/auth');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimit');
const {
  registerValidationRules,
  loginValidationRules,
  passwordChangeValidationRules,
  validationErrorHandler
} = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();
const SALT_ROUNDS = 10;

// POST /api/auth/register
router.post(
  '/register',
  registerLimiter,
  registerValidationRules(),
  validationErrorHandler,
  async (req, res) => {
    try {
      const { email, password, trainerName, role } = req.body;
      const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

      const db = getDb();
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        logger.suspicious('Duplicate registration attempt', email, ip);
        return res.status(409).json({ error: 'Diese E-Mail ist bereits registriert.' });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, trainer_name, role) VALUES (?, ?, ?, ?)'
      ).run(email, passwordHash, trainerName || '', role || 'coach');

      const token = generateToken(result.lastInsertRowid, email);

      logger.database(email, 'INSERT', `User registered with role ${role || 'coach'}`);
      logger.authAttempt(email, ip, true, 'Registration successful');

      res.status(201).json({
        token,
        user: {
          id: result.lastInsertRowid,
          email,
          trainerName: trainerName || '',
          role: role || 'coach',
        },
      });
    } catch (err) {
      const email = req.body?.email || 'unknown';
      const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
      logger.error(`Register error for ${email}`, err);
      logger.suspicious('Registration error', email, ip, { error: err.message });
      res.status(500).json({ error: 'Serverfehler bei der Registrierung.' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  loginLimiter,
  loginValidationRules(),
  validationErrorHandler,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        logger.authAttempt(email, ip, false, 'User not found');
        return res.status(401).json({ error: 'E-Mail oder Passwort falsch.' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        logger.authAttempt(email, ip, false, 'Wrong password');
        return res.status(401).json({ error: 'E-Mail oder Passwort falsch.' });
      }

      const token = generateToken(user.id, user.email);
      logger.authAttempt(email, ip, true, 'Login successful');
      logger.database(email, 'SELECT', 'User logged in');

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          trainerName: user.trainer_name,
          role: user.role,
        },
      });
    } catch (err) {
      const email = req.body?.email || 'unknown';
      const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
      logger.error('Login error', err);
      logger.suspicious('Login error', email, ip, { error: err.message });
      res.status(500).json({ error: 'Serverfehler beim Login.' });
    }
  }
);

// GET /api/auth/me — Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, email, trainer_name, role, created_at FROM users WHERE id = ?').get(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    res.json({
      id: user.id,
      email: user.email,
      trainerName: user.trainer_name,
      role: user.role,
      createdAt: user.created_at,
    });
  } catch (err) {
    logger.error('Get profile error', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// PUT /api/auth/password — Change password
router.put(
  '/password',
  authenticateToken,
  passwordChangeValidationRules(),
  validationErrorHandler,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) {
        logger.suspicious('Failed password change attempt', user.email, ip);
        return res.status(401).json({ error: 'Aktuelles Passwort ist falsch.' });
      }

      const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.userId);

      logger.database(user.email, 'UPDATE', 'Password changed');
      logger.security('warning', 'User password changed', { email: user.email, ip });

      res.json({ message: 'Passwort erfolgreich geändert.' });
    } catch (err) {
      logger.error('Change password error', err);
      res.status(500).json({ error: 'Serverfehler.' });
    }
  }
);

// PUT /api/auth/email — Change email
router.put('/email', authenticateToken, async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

    // Validate email format
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ error: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Passwort ist erforderlich.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      logger.suspicious('Failed email change attempt', user.email, ip);
      return res.status(401).json({ error: 'Passwort ist falsch.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(newEmail, req.user.userId);
    if (existing) {
      logger.suspicious('Email change to existing email', user.email, ip, { newEmail });
      return res.status(409).json({ error: 'Diese E-Mail wird bereits verwendet.' });
    }

    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(newEmail, req.user.userId);
    const token = generateToken(req.user.userId, newEmail);

    logger.database(user.email, 'UPDATE', `Email changed to ${newEmail}`);
    logger.security('warning', 'User email changed', { oldEmail: user.email, newEmail, ip });

    res.json({ message: 'E-Mail erfolgreich geändert.', token, email: newEmail });
  } catch (err) {
    logger.error('Change email error', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// PUT /api/auth/trainer-name — Update trainer name
router.put('/trainer-name', authenticateToken, (req, res) => {
  try {
    const { trainerName } = req.body;
    
    // Validate trainer name
    if (trainerName && trainerName.length > 100) {
      return res.status(400).json({ error: 'Name darf nicht länger als 100 Zeichen sein.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.user.userId);
    
    db.prepare('UPDATE users SET trainer_name = ? WHERE id = ?').run(trainerName || '', req.user.userId);
    logger.database(user.email, 'UPDATE', 'Trainer name updated');

    res.json({ message: 'Name erfolgreich aktualisiert.' });
    res.json({ message: 'Trainername aktualisiert.', trainerName });
  } catch (err) {
    console.error('Update trainer name error:', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});
// PUT /api/auth/role — Update role
router.put('/role', authenticateToken, (req, res) => {
  try {
    const { role } = req.body;
    if (!['coach', 'athlete'].includes(role)) {
      return res.status(400).json({ error: 'Ungültige Rolle.' });
    }
    const db = getDb();
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.user.userId);
    res.json({ message: 'Rolle aktualisiert.', role });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});
// DELETE /api/auth/account — Delete account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Passwort zur Bestätigung erforderlich.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Passwort ist falsch.' });
    }

    // CASCADE will delete all related data (athletes, sessions, settings, etc.)
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user.userId);

    res.json({ message: 'Account und alle Daten wurden gelöscht.' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// Helper function to create demo data
function createDemoData(userId) {
  const db = getDb();
  
  // Create demo athletes
  const athlete1 = db.prepare(`
    INSERT INTO athletes (user_id, name, first_name, last_name, age_group, squad, gender)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, 'Max Mustermann', 'Max', 'Mustermann', 'M20', 'Testgruppe', 'm');

  const athlete2 = db.prepare(`
    INSERT INTO athletes (user_id, name, first_name, last_name, age_group, squad, gender)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, 'Anna Testerin', 'Anna', 'Testerin', 'W20', 'Testgruppe', 'w');

  // Create demo sessions with sample data
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 5);

  // Session 1: Prone test
  const session1 = db.prepare(`
    INSERT INTO sessions (user_id, name, location, type, date, time)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, 'Demo Session 1 - Liegend', 'Testschießstand', 'training', dateStr, timeStr);

  // Session 2: Standing test
  const session2 = db.prepare(`
    INSERT INTO sessions (user_id, name, location, type, date, time)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, 'Demo Session 2 - Stehend', 'Testschießstand', 'training', dateStr, timeStr);

  // Add athletes to sessions
  db.prepare('INSERT INTO session_athletes (session_id, athlete_id) VALUES (?, ?)').run(session1.lastInsertRowid, athlete1.lastInsertRowid);
  db.prepare('INSERT INTO session_athletes (session_id, athlete_id) VALUES (?, ?)').run(session2.lastInsertRowid, athlete2.lastInsertRowid);

  // Create sample series and shots for session 1
  const series1 = db.prepare(`
    INSERT INTO series (session_id, athlete_id, athlete_name, stance)
    VALUES (?, ?, ?, ?)
  `).run(session1.lastInsertRowid, athlete1.lastInsertRowid, 'Max Mustermann', 'prone');

  // Add sample shots (10 schuss)
  const shots = [
    {x: 8.5, y: 8.2, ring: 8, hit: 1},
    {x: 9.1, y: 9.3, ring: 9, hit: 1},
    {x: 9.8, y: 9.6, ring: 10, hit: 1},
    {x: 8.9, y: 8.8, ring: 9, hit: 1},
    {x: 9.2, y: 9.5, ring: 9, hit: 1},
    {x: 9.4, y: 9.2, ring: 9, hit: 1},
    {x: 8.7, y: 8.6, ring: 8, hit: 1},
    {x: 9.5, y: 9.4, ring: 9, hit: 1},
    {x: 9.3, y: 9.1, ring: 9, hit: 1},
    {x: 9.6, y: 9.7, ring: 10, hit: 1},
  ];

  shots.forEach((shot, idx) => {
    db.prepare(`
      INSERT INTO shots (series_id, x, y, ring, hit, shot_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(series1.lastInsertRowid, shot.x, shot.y, shot.ring, shot.hit, idx + 1);
  });

  // Create sample series and shots for session 2
  const series2 = db.prepare(`
    INSERT INTO series (session_id, athlete_id, athlete_name, stance)
    VALUES (?, ?, ?, ?)
  `).run(session2.lastInsertRowid, athlete2.lastInsertRowid, 'Anna Testerin', 'standing');

  shots.forEach((shot, idx) => {
    db.prepare(`
      INSERT INTO shots (series_id, x, y, ring, hit, shot_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(series2.lastInsertRowid, shot.x, shot.y, shot.ring, shot.hit, idx + 1);
  });
}

// POST /api/auth/demo-start — Start demo account
router.post('/demo-start', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const cleanIp = ip.replace('::ffff:', '');

    const db = getDb();

    // Check if this IP already has an active demo session
    const existing = db.prepare(`
      SELECT ds.*, u.id, u.email, u.trainer_name, u.role
      FROM demo_sessions ds
      JOIN users u ON ds.user_id = u.id
      WHERE ds.ip_address = ? AND ds.expires_at > datetime('now')
    `).get(cleanIp);

    if (existing) {
      // Reuse existing demo account
      const token = generateToken(existing.id, existing.email);
      return res.json({
        token,
        user: {
          id: existing.id,
          email: existing.email,
          trainerName: existing.trainer_name,
          role: existing.role,
          isDemo: true,
        },
      });
    }

    // Create new demo account
    const demoEmail = `demo_${Date.now()}@biathlon-demo.local`;
    const demoPassword = 'DemoPassword2026!';
    const passwordHash = await bcrypt.hash(demoPassword, SALT_ROUNDS);

    const result = db.prepare(`
      INSERT INTO users (email, password_hash, trainer_name, role, is_demo, demo_expires_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', '+30 days'))
    `).run(demoEmail, passwordHash, 'Demo Benutzer', 'coach', 1);

    const userId = result.lastInsertRowid;

    // Create demo data (athletes, sessions, shots)
    createDemoData(userId);

    // Create demo session tracking entry
    db.prepare(`
      INSERT INTO demo_sessions (user_id, ip_address, expires_at)
      VALUES (?, ?, datetime('now', '+30 days'))
    `).run(userId, cleanIp);

    const token = generateToken(userId, demoEmail);

    res.status(201).json({
      token,
      user: {
        id: userId,
        email: demoEmail,
        trainerName: 'Demo Benutzer',
        role: 'coach',
        isDemo: true,
      },
      message: 'Demo-Account erstellt. Gültig für 30 Tage.',
    });
  } catch (err) {
    console.error('Demo start error:', err);
    res.status(500).json({ error: 'Serverfehler beim Demo-Start.' });
  }
});

module.exports = router;
