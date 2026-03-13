const express = require('express');
const bcrypt = require('bcrypt');
const { getDb } = require('../db/database');
const { authenticateToken, generateToken } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, trainerName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein.' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Diese E-Mail ist bereits registriert.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, trainer_name) VALUES (?, ?, ?)'
    ).run(email, passwordHash, trainerName || '');

    const token = generateToken(result.lastInsertRowid, email);

    res.status(201).json({
      token,
      user: {
        id: result.lastInsertRowid,
        email,
        trainerName: trainerName || '',
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Serverfehler bei der Registrierung.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'E-Mail oder Passwort falsch.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'E-Mail oder Passwort falsch.' });
    }

    const token = generateToken(user.id, user.email);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        trainerName: user.trainer_name,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Serverfehler beim Login.' });
  }
});

// GET /api/auth/me — Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, email, trainer_name, created_at FROM users WHERE id = ?').get(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    res.json({
      id: user.id,
      email: user.email,
      trainerName: user.trainer_name,
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// PUT /api/auth/password — Change password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Neues Passwort muss mindestens 6 Zeichen lang sein.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Aktuelles Passwort ist falsch.' });
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.userId);

    res.json({ message: 'Passwort erfolgreich geändert.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// PUT /api/auth/email — Change email
router.put('/email', authenticateToken, async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
      return res.status(400).json({ error: 'Neue E-Mail und Passwort erforderlich.' });
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

    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(newEmail, req.user.userId);
    if (existing) {
      return res.status(409).json({ error: 'Diese E-Mail wird bereits verwendet.' });
    }

    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(newEmail, req.user.userId);
    const token = generateToken(req.user.userId, newEmail);

    res.json({ message: 'E-Mail erfolgreich geändert.', token, email: newEmail });
  } catch (err) {
    console.error('Change email error:', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// PUT /api/auth/trainer-name — Update trainer name
router.put('/trainer-name', authenticateToken, (req, res) => {
  try {
    const { trainerName } = req.body;
    const db = getDb();
    db.prepare('UPDATE users SET trainer_name = ? WHERE id = ?').run(trainerName || '', req.user.userId);
    res.json({ message: 'Trainername aktualisiert.', trainerName });
  } catch (err) {
    console.error('Update trainer name error:', err);
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

module.exports = router;
