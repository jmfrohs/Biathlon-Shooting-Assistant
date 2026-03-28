const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { formatAthlete } = require('../utils/formatters');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/athletes — Get all athletes for current user
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const athletes = db.prepare('SELECT * FROM athletes WHERE user_id = ? ORDER BY name').all(req.user.userId);

    res.json(athletes.map(formatAthlete));
  } catch (err) {
    console.error('Get athletes error:', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// GET /api/athletes/:id — Get single athlete
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const athlete = db.prepare('SELECT * FROM athletes WHERE id = ? AND user_id = ?').get(
      req.params.id,
      req.user.userId
    );

    if (!athlete) {
      return res.status(404).json({ error: 'Athlet nicht gefunden.' });
    }

    res.json(formatAthlete(athlete));
  } catch (err) {
    console.error('Get athlete error:', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// POST /api/athletes — Create a new athlete
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const data = req.body;

    const result = db.prepare(`
      INSERT INTO athletes (user_id, name, first_name, last_name, date_of_birth, age,
        age_group, squad, gender, prone_start, standing_start, click_value,
        use_default_times, prone_time_add, standing_time_add)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.userId,
      data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      data.firstName || '',
      data.lastName || '',
      data.dateOfBirth || '',
      data.age || 0,
      data.ageGroup || '',
      data.squad || '',
      data.gender || 'm',
      data.proneStart || '',
      data.standingStart || '',
      data.clickValue || 6.0,
      data.useDefaultTimes !== undefined ? (data.useDefaultTimes ? 1 : 0) : 1,
      data.proneTimeAdd || 0,
      data.standingTimeAdd || 0
    );

    const athlete = db.prepare('SELECT * FROM athletes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(formatAthlete(athlete));
  } catch (err) {
    console.error('Create athlete error:', err);
    res.status(500).json({ error: 'Serverfehler beim Anlegen des Athleten.' });
  }
});

// PUT /api/athletes/:id — Update athlete
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM athletes WHERE id = ? AND user_id = ?').get(
      req.params.id,
      req.user.userId
    );

    if (!existing) {
      return res.status(404).json({ error: 'Athlet nicht gefunden.' });
    }

    const data = req.body;
    db.prepare(`
      UPDATE athletes SET
        name = ?, first_name = ?, last_name = ?, date_of_birth = ?, age = ?,
        age_group = ?, squad = ?, gender = ?, prone_start = ?, standing_start = ?,
        click_value = ?, use_default_times = ?, prone_time_add = ?, standing_time_add = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      data.firstName || existing.first_name,
      data.lastName || existing.last_name,
      data.dateOfBirth !== undefined ? data.dateOfBirth : existing.date_of_birth,
      data.age !== undefined ? data.age : existing.age,
      data.ageGroup !== undefined ? data.ageGroup : existing.age_group,
      data.squad !== undefined ? data.squad : existing.squad,
      data.gender !== undefined ? data.gender : existing.gender,
      data.proneStart !== undefined ? data.proneStart : existing.prone_start,
      data.standingStart !== undefined ? data.standingStart : existing.standing_start,
      data.clickValue !== undefined ? data.clickValue : existing.click_value,
      data.useDefaultTimes !== undefined ? (data.useDefaultTimes ? 1 : 0) : existing.use_default_times,
      data.proneTimeAdd !== undefined ? data.proneTimeAdd : existing.prone_time_add,
      data.standingTimeAdd !== undefined ? data.standingTimeAdd : existing.standing_time_add,
      req.params.id,
      req.user.userId
    );

    const updated = db.prepare('SELECT * FROM athletes WHERE id = ?').get(req.params.id);
    res.json(formatAthlete(updated));
  } catch (err) {
    console.error('Update athlete error:', err);
    res.status(500).json({ error: 'Serverfehler beim Aktualisieren.' });
  }
});

// DELETE /api/athletes/:id — Delete athlete
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM athletes WHERE id = ? AND user_id = ?').get(
      req.params.id,
      req.user.userId
    );

    if (!existing) {
      return res.status(404).json({ error: 'Athlet nicht gefunden.' });
    }

    db.prepare('DELETE FROM athletes WHERE id = ? AND user_id = ?').run(req.params.id, req.user.userId);
    res.json({ message: 'Athlet gelöscht.' });
  } catch (err) {
    console.error('Delete athlete error:', err);
    res.status(500).json({ error: 'Serverfehler beim Löschen.' });
  }
});

module.exports = router;

