const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// GET /api/settings — Get all settings for current user
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings WHERE user_id = ?').all(req.user.userId);

    const settings = {};
    rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    res.json(settings);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// PUT /api/settings — Save settings (key-value pairs)
router.put('/', (req, res) => {
  try {
    const db = getDb();
    const data = req.body; // { key1: value1, key2: value2, ... }

    const upsert = db.prepare(`
      INSERT INTO settings (user_id, key, value)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value
    `);

    const saveAll = db.transaction(() => {
      for (const [key, value] of Object.entries(data)) {
        upsert.run(req.user.userId, key, String(value));
      }
    });

    saveAll();

    res.json({ message: 'Einstellungen gespeichert.', count: Object.keys(data).length });
  } catch (err) {
    console.error('Save settings error:', err);
    res.status(500).json({ error: 'Serverfehler beim Speichern.' });
  }
});

// DELETE /api/settings/:key — Delete a single setting
router.delete('/:key', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM settings WHERE user_id = ? AND key = ?').run(req.user.userId, req.params.key);
    res.json({ message: 'Einstellung gelöscht.' });
  } catch (err) {
    console.error('Delete setting error:', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

module.exports = router;
