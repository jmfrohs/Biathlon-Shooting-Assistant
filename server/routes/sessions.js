const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// GET /api/sessions — Get all sessions for current user
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const sessions = db.prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC').all(req.user.userId);

    const result = sessions.map((session) => {
      const series = getSeriesForSession(db, session.id);
      const athleteIds = db.prepare('SELECT athlete_id FROM session_athletes WHERE session_id = ?')
        .all(session.id)
        .map((r) => r.athlete_id);

      return formatSession(session, series, athleteIds);
    });

    res.json(result);
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// GET /api/sessions/:id — Get single session with all data
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const session = db.prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?').get(
      req.params.id,
      req.user.userId
    );

    if (!session) {
      return res.status(404).json({ error: 'Session nicht gefunden.' });
    }

    const series = getSeriesForSession(db, session.id);
    const athleteIds = db.prepare('SELECT athlete_id FROM session_athletes WHERE session_id = ?')
      .all(session.id)
      .map((r) => r.athlete_id);

    res.json(formatSession(session, series, athleteIds));
  } catch (err) {
    console.error('Get session error:', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

// POST /api/sessions — Create session with series and shots
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const data = req.body;

    const insertSession = db.transaction(() => {
      // Insert session
      const sessionResult = db.prepare(`
        INSERT INTO sessions (user_id, name, location, type, date, time,
          competition_category, competition_type, weather_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.userId,
        data.name || '',
        data.location || '',
        data.type || 'training',
        data.date || '',
        data.time || '',
        data.competitionCategory || '',
        data.competitionType || '',
        JSON.stringify(data.weather || {})
      );

      const sessionId = sessionResult.lastInsertRowid;

      // Insert athlete associations
      if (data.athletes && Array.isArray(data.athletes)) {
        const insertAthleteStmt = db.prepare(
          'INSERT OR IGNORE INTO session_athletes (session_id, athlete_id) VALUES (?, ?)'
        );
        data.athletes.forEach((athleteId) => {
          insertAthleteStmt.run(sessionId, athleteId);
        });
      }

      // Insert series with shots
      if (data.series && Array.isArray(data.series)) {
        const insertSeriesStmt = db.prepare(`
          INSERT INTO series (session_id, athlete_id, athlete_name, stance, clicks_x, clicks_y, is_placeholder, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertShotStmt = db.prepare(`
          INSERT INTO shots (series_id, x, y, ring, hit, shot_order) VALUES (?, ?, ?, ?, ?, ?)
        `);

        data.series.forEach((s) => {
          const seriesResult = insertSeriesStmt.run(
            sessionId,
            s.athleteId || null,
            s.athleteName || '',
            s.stance || '',
            s.clicksX || 0,
            s.clicksY || 0,
            s.isPlaceholder ? 1 : 0,
            s.timestamp || new Date().toISOString()
          );

          if (s.shots && Array.isArray(s.shots)) {
            s.shots.forEach((shot, index) => {
              if (shot) {
                insertShotStmt.run(
                  seriesResult.lastInsertRowid,
                  shot.x || 0,
                  shot.y || 0,
                  shot.ring || 0,
                  shot.hit ? 1 : 0,
                  index
                );
              }
            });
          }
        });
      }

      return sessionId;
    });

    const sessionId = insertSession();

    // Return the full session
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    const series = getSeriesForSession(db, sessionId);
    const athleteIds = db.prepare('SELECT athlete_id FROM session_athletes WHERE session_id = ?')
      .all(sessionId)
      .map((r) => r.athlete_id);

    res.status(201).json(formatSession(session, series, athleteIds));
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Serverfehler beim Anlegen der Session.' });
  }
});

// PUT /api/sessions/:id — Update session
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?').get(
      req.params.id,
      req.user.userId
    );

    if (!existing) {
      return res.status(404).json({ error: 'Session nicht gefunden.' });
    }

    const data = req.body;

    const updateSession = db.transaction(() => {
      // Update session metadata
      db.prepare(`
        UPDATE sessions SET name = ?, location = ?, type = ?, date = ?, time = ?,
          competition_category = ?, competition_type = ?, weather_json = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `).run(
        data.name !== undefined ? data.name : existing.name,
        data.location !== undefined ? data.location : existing.location,
        data.type !== undefined ? data.type : existing.type,
        data.date !== undefined ? data.date : existing.date,
        data.time !== undefined ? data.time : existing.time,
        data.competitionCategory !== undefined ? data.competitionCategory : existing.competition_category,
        data.competitionType !== undefined ? data.competitionType : existing.competition_type,
        data.weather ? JSON.stringify(data.weather) : existing.weather_json,
        req.params.id,
        req.user.userId
      );

      // If series are provided, replace them entirely
      if (data.series && Array.isArray(data.series)) {
        // Delete old series (CASCADE will delete shots)
        db.prepare('DELETE FROM series WHERE session_id = ?').run(req.params.id);

        const insertSeriesStmt = db.prepare(`
          INSERT INTO series (session_id, athlete_id, athlete_name, stance, clicks_x, clicks_y, is_placeholder, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertShotStmt = db.prepare(`
          INSERT INTO shots (series_id, x, y, ring, hit, shot_order) VALUES (?, ?, ?, ?, ?, ?)
        `);

        data.series.forEach((s) => {
          const seriesResult = insertSeriesStmt.run(
            req.params.id,
            s.athleteId || null,
            s.athleteName || '',
            s.stance || '',
            s.clicksX || 0,
            s.clicksY || 0,
            s.isPlaceholder ? 1 : 0,
            s.timestamp || ''
          );

          if (s.shots && Array.isArray(s.shots)) {
            s.shots.forEach((shot, index) => {
              if (shot) {
                insertShotStmt.run(
                  seriesResult.lastInsertRowid,
                  shot.x || 0,
                  shot.y || 0,
                  shot.ring || 0,
                  shot.hit ? 1 : 0,
                  index
                );
              }
            });
          }
        });
      }

      // Update athlete associations if provided
      if (data.athletes && Array.isArray(data.athletes)) {
        db.prepare('DELETE FROM session_athletes WHERE session_id = ?').run(req.params.id);
        const insertAthleteStmt = db.prepare(
          'INSERT OR IGNORE INTO session_athletes (session_id, athlete_id) VALUES (?, ?)'
        );
        data.athletes.forEach((athleteId) => {
          insertAthleteStmt.run(req.params.id, athleteId);
        });
      }
    });

    updateSession();

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
    const series = getSeriesForSession(db, session.id);
    const athleteIds = db.prepare('SELECT athlete_id FROM session_athletes WHERE session_id = ?')
      .all(session.id)
      .map((r) => r.athlete_id);

    res.json(formatSession(session, series, athleteIds));
  } catch (err) {
    console.error('Update session error:', err);
    res.status(500).json({ error: 'Serverfehler beim Aktualisieren.' });
  }
});

// DELETE /api/sessions/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?').get(
      req.params.id,
      req.user.userId
    );

    if (!existing) {
      return res.status(404).json({ error: 'Session nicht gefunden.' });
    }

    db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').run(req.params.id, req.user.userId);
    res.json({ message: 'Session gelöscht.' });
  } catch (err) {
    console.error('Delete session error:', err);
    res.status(500).json({ error: 'Serverfehler beim Löschen.' });
  }
});

// Helper: get all series (with shots) for a session
function getSeriesForSession(db, sessionId) {
  const seriesRows = db.prepare('SELECT * FROM series WHERE session_id = ? ORDER BY id').all(sessionId);

  return seriesRows.map((s) => {
    const shots = db.prepare('SELECT * FROM shots WHERE series_id = ? ORDER BY shot_order').all(s.id);

    return {
      id: s.id,
      athleteId: s.athlete_id,
      athleteName: s.athlete_name,
      type: 'series',
      stance: s.stance,
      clicksX: s.clicks_x,
      clicksY: s.clicks_y,
      isPlaceholder: !!s.is_placeholder,
      timestamp: s.timestamp,
      shots: shots.map((shot) => ({
        x: shot.x,
        y: shot.y,
        ring: shot.ring,
        hit: !!shot.hit,
      })),
    };
  });
}

// Format DB row to frontend-compatible JSON
function formatSession(session, series, athleteIds) {
  let weather = {};
  try {
    weather = JSON.parse(session.weather_json || '{}');
  } catch (e) {
    weather = {};
  }

  return {
    id: session.id,
    name: session.name,
    location: session.location,
    type: session.type,
    date: session.date,
    time: session.time,
    competitionCategory: session.competition_category,
    competitionType: session.competition_type,
    weather,
    athletes: athleteIds,
    series,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
}

module.exports = router;
