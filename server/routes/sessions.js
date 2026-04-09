const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { emitSessionUpdate } = require('../socket-handler');
const { formatAthlete, formatSession } = require('../utils/formatters');


const router = express.Router();
router.use(authenticateToken);


// GET /api/sessions
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const sessions = db.prepare(`
      SELECT DISTINCT s.* FROM sessions s
      LEFT JOIN session_collaborators sc ON s.id = sc.session_id
      WHERE s.user_id = ? OR sc.user_id = ?
      ORDER BY s.date DESC
    `).all(req.user.userId, req.user.userId);
    const result = sessions.map((session) => {
      const series = getSeriesForSession(db, session.id);
      const sessionAthletes = db.prepare(`
        SELECT a.* FROM athletes a
        JOIN session_athletes sa ON a.id = sa.athlete_id
        WHERE sa.session_id = ?
      `).all(session.id);
      const athleteIds = sessionAthletes.map((a) => a.id);
      const athleteData = sessionAthletes.map(formatAthlete);
      return formatSession(session, series, athleteIds, athleteData);
    });
    res.json(result);

  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// GET /api/sessions/:id
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const session = db.prepare(`
      SELECT DISTINCT s.* FROM sessions s
      LEFT JOIN session_collaborators sc ON s.id = sc.session_id
      WHERE s.id = ? AND (s.user_id = ? OR sc.user_id = ?)
    `).get(req.params.id, req.user.userId, req.user.userId);
    if (!session) return res.status(404).json({ error: 'Session nicht gefunden.' });
    const series = getSeriesForSession(db, session.id);
    const sessionAthletes = db.prepare(`
        SELECT a.* FROM athletes a
        JOIN session_athletes sa ON a.id = sa.athlete_id
        WHERE sa.session_id = ?
    `).all(session.id);
    const athleteIds = sessionAthletes.map((a) => a.id);
    const athleteData = sessionAthletes.map(formatAthlete);
    res.json(formatSession(session, series, athleteIds, athleteData));

  } catch (err) {
    console.error('Get session error:', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// POST /api/sessions
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const data = req.body;
    const doInsert = db.transaction(() => {
      const r = db.prepare(
        'INSERT INTO sessions (user_id, name, location, type, date, time, competition_category, competition_type, weather_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        req.user.userId, data.name || '', data.location || '', data.type || 'training',
        data.date || '', data.time || '', data.competitionCategory || '',
        data.competitionType || '', JSON.stringify(data.weather || {})
      );
      const sid = r.lastInsertRowid;
      if (Array.isArray(data.athletes)) {
        const stmt = db.prepare('INSERT OR IGNORE INTO session_athletes (session_id, athlete_id) VALUES (?, ?)');
        data.athletes.forEach((id) => stmt.run(sid, id));
      }
      if (Array.isArray(data.series)) insertSeriesWithShots(db, sid, data.series);
      return sid;
    });
    const sid = doInsert();
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sid);
    const series = getSeriesForSession(db, sid);
    const sessionAthletes = db.prepare(`
        SELECT a.* FROM athletes a
        JOIN session_athletes sa ON a.id = sa.athlete_id
        WHERE sa.session_id = ?
    `).all(sid);
    const athleteIds = sessionAthletes.map((a) => a.id);
    const athleteData = sessionAthletes.map(formatAthlete);
    res.status(201).json(formatSession(session, series, athleteIds, athleteData));

  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Serverfehler beim Anlegen der Session.' });
  }
});

// PUT /api/sessions/:id
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
    if (!existing) return res.status(404).json({ error: 'Session nicht gefunden.' });
    const data = req.body;
    const doUpdate = db.transaction(() => {
      db.prepare(
        'UPDATE sessions SET name=?,location=?,type=?,date=?,time=?,competition_category=?,competition_type=?,weather_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?'
      ).run(
        data.name !== undefined ? data.name : existing.name,
        data.location !== undefined ? data.location : existing.location,
        data.type !== undefined ? data.type : existing.type,
        data.date !== undefined ? data.date : existing.date,
        data.time !== undefined ? data.time : existing.time,
        data.competitionCategory !== undefined ? data.competitionCategory : existing.competition_category,
        data.competitionType !== undefined ? data.competitionType : existing.competition_type,
        data.weather ? JSON.stringify(data.weather) : existing.weather_json,
        req.params.id, req.user.userId
      );
      if (Array.isArray(data.series)) {
        db.prepare('DELETE FROM series WHERE session_id = ?').run(req.params.id);
        insertSeriesWithShots(db, req.params.id, data.series);
      }
      if (Array.isArray(data.athletes)) {
        db.prepare('DELETE FROM session_athletes WHERE session_id = ?').run(req.params.id);
        const stmt = db.prepare('INSERT OR IGNORE INTO session_athletes (session_id, athlete_id) VALUES (?, ?)');
        data.athletes.forEach((id) => stmt.run(req.params.id, id));
      }
    });
    doUpdate();
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
    const series = getSeriesForSession(db, session.id);
    const sessionAthletes = db.prepare(`
        SELECT a.* FROM athletes a
        JOIN session_athletes sa ON a.id = sa.athlete_id
        WHERE sa.session_id = ?
    `).all(session.id);
    const athleteIds = sessionAthletes.map((a) => a.id);
    const athleteData = sessionAthletes.map(formatAthlete);

    const formatted = formatSession(session, series, athleteIds, athleteData);
    emitSessionUpdate(session.id, formatted);
    res.json(formatted);

  } catch (err) {
    console.error('Update session error:', err);
    res.status(500).json({ error: 'Serverfehler beim Aktualisieren.' });
  }
});

// DELETE /api/sessions/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM sessions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
    if (!existing) return res.status(404).json({ error: 'Session nicht gefunden oder keine Berechtigung zum Löschen.' });
    db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').run(req.params.id, req.user.userId);
    res.json({ message: 'Session geloescht.' });
  } catch (err) {
    console.error('Delete session error:', err);
    res.status(500).json({ error: 'Serverfehler beim Loeschen.' });
  }
});

// POST /api/sessions/:id/share
router.post('/:id/share', (req, res) => {
  try {
    const db = getDb();
    const session = db.prepare('SELECT id FROM sessions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
    if (!session) return res.status(404).json({ error: 'Session nicht gefunden oder keine Berechtigung.' });

    const shareCode = Math.floor(10000 + Math.random() * 90000).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    db.prepare('UPDATE sessions SET share_code = ?, share_expires_at = ? WHERE id = ?').run(shareCode, expiresAt, req.params.id);

    res.json({ shareCode, expiresAt });
  } catch (err) {
    console.error('Share session error:', err);
    res.status(500).json({ error: 'Fehler beim Teilen.' });
  }
});

// POST /api/sessions/:id/unshare
router.post('/:id/unshare', (req, res) => {
  try {
    const db = getDb();
    const session = db.prepare('SELECT id FROM sessions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
    if (!session) return res.status(404).json({ error: 'Session nicht gefunden.' });

    db.prepare('UPDATE sessions SET share_code = NULL, share_expires_at = NULL WHERE id = ?').run(req.params.id);
    db.prepare('DELETE FROM session_collaborators WHERE session_id = ?').run(req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error('Unshare error:', err);
    res.status(500).json({ error: 'Fehler beim Stoppen des Teilens.' });
  }
});

// POST /api/sessions/join
router.post('/join', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code fehlt.' });

    const db = getDb();
    const session = db.prepare('SELECT id, user_id, share_expires_at FROM sessions WHERE share_code = ?').get(code);

    if (!session) return res.status(404).json({ error: 'Ungültiger Code.' });

    const now = new Date();
    const expiresAt = new Date(session.share_expires_at);
    if (expiresAt < now) {
      return res.status(410).json({ error: 'Dieser Code ist bereits abgelaufen (Gültigkeit 2h).' });
    }
    
    if (session.user_id === req.user.userId) return res.status(400).json({ error: 'Du bist bereits Besitzer dieser Session.' });

    db.prepare('INSERT OR IGNORE INTO session_collaborators (session_id, user_id) VALUES (?, ?)').run(session.id, req.user.userId);

    res.json({ sessionId: session.id });
  } catch (err) {
    console.error('Join error:', err);
    res.status(500).json({ error: 'Fehler beim Beitreten.' });
  }
});

// Helper: insert series with shots
function insertSeriesWithShots(db, sessionId, seriesArray) {
  const iSeries = db.prepare(
    'INSERT INTO series (session_id, athlete_id, athlete_name, stance, clicks_x, clicks_y, is_placeholder, timestamp, type, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const iShot = db.prepare('INSERT INTO shots (series_id, x, y, ring, hit, shot_order, intensity) VALUES (?, ?, ?, ?, ?, ?, ?)');
  seriesArray.forEach((s) => {
    const meta = {
      wind: s.wind,
      totalTime: s.totalTime,
      rangeTime: s.rangeTime,
      timeOffset: s.timeOffset,
      splits: s.splits,
      stats: s.stats,
    };
    const sr = iSeries.run(
      sessionId, s.athleteId || null, s.athleteName || '', s.stance || '',
      s.clicksX || 0, s.clicksY || 0, s.isPlaceholder ? 1 : 0,
      s.timestamp || new Date().toISOString(), s.type || 'series', JSON.stringify(meta)
    );
    if (Array.isArray(s.shots)) {
      s.shots.forEach((shot, i) => {
        if (shot) iShot.run(sr.lastInsertRowid, shot.x || 0, shot.y || 0, shot.ring || 0, shot.hit ? 1 : 0, i, shot.intensity || 'Ruhe');
      });
    }
  });
}

// Helper: read all series (with shots) for a session
function getSeriesForSession(db, sessionId) {
  return db.prepare('SELECT * FROM series WHERE session_id = ? ORDER BY id').all(sessionId).map((s) => {
    const shots = db.prepare('SELECT * FROM shots WHERE series_id = ? ORDER BY shot_order').all(s.id);
    let meta = {};
    try { meta = JSON.parse(s.meta_json || '{}'); } catch (e) {}
    return {
      id: s.id,
      athleteId: s.athlete_id,
      athleteName: s.athlete_name,
      type: s.type || 'series',
      stance: s.stance,
      clicksX: s.clicks_x,
      clicksY: s.clicks_y,
      isPlaceholder: !!s.is_placeholder,
      timestamp: s.timestamp,
      wind: meta.wind,
      totalTime: meta.totalTime,
      rangeTime: meta.rangeTime,
      timeOffset: meta.timeOffset,
      splits: meta.splits,
      stats: meta.stats,
      shots: shots.map((sh) => ({ id: sh.id, shot: sh.shot_order + 1, x: sh.x, y: sh.y, ring: sh.ring, hit: !!sh.hit, intensity: sh.intensity || 'Ruhe' })),
    };
  });
}

module.exports = router;

