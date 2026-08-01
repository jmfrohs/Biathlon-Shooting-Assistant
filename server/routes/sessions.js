const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../db/database');
const { authenticateToken, generateGuestSessionToken } = require('../middleware/auth');
const { emitSessionUpdate } = require('../socket-handler');
const { formatAthlete, formatSession } = require('../utils/formatters');


const router = express.Router();

function hashInviteToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function generateInviteToken() {
  return crypto.randomBytes(32).toString('hex');
}

function isGuestSessionUser(req) {
  return req.user && req.user.role === 'session_guest' && Number.isInteger(req.user.guestSessionId);
}

function ensureGuestSessionAccess(db, req, sessionId) {
  if (!isGuestSessionUser(req)) {
    return { ok: true };
  }

  const requestedSessionId = Number(sessionId);
  if (!Number.isInteger(requestedSessionId) || requestedSessionId !== Number(req.user.guestSessionId)) {
    return { ok: false, status: 403, error: 'Gastzugriff nur auf die freigegebene Session erlaubt.' };
  }

  const row = db.prepare('SELECT share_invite_hash, share_expires_at FROM sessions WHERE id = ?').get(requestedSessionId);
  if (!row || !row.share_invite_hash || row.share_invite_hash !== req.user.inviteHash) {
    return { ok: false, status: 403, error: 'Freigabe ist nicht mehr gueltig.' };
  }

  const now = new Date();
  const expiresAt = new Date(row.share_expires_at);
  if (expiresAt < now) {
    return { ok: false, status: 410, error: 'Freigabe-Link ist abgelaufen.' };
  }

  return { ok: true };
}

// POST /api/sessions/invite/resolve
router.post('/invite/resolve', (req, res) => {
  try {
    const rawToken = (req.body && req.body.token) || '';
    if (!rawToken || typeof rawToken !== 'string') {
      return res.status(400).json({ error: 'Invite-Token fehlt.' });
    }

    const db = getDb();
    const inviteHash = hashInviteToken(rawToken);
    const session = db.prepare(
      'SELECT id, share_expires_at, share_invite_hash FROM sessions WHERE share_invite_hash = ?'
    ).get(inviteHash);

    if (!session) {
      return res.status(404).json({ error: 'Invite-Link ungueltig.' });
    }

    const now = new Date();
    const expiresAt = new Date(session.share_expires_at);
    if (expiresAt < now) {
      return res.status(410).json({ error: 'Invite-Link ist abgelaufen.' });
    }

    const token = generateGuestSessionToken(session.id, inviteHash, session.share_expires_at);
    res.json({
      token,
      sessionId: session.id,
      expiresAt: session.share_expires_at,
    });
  } catch (err) {
    console.error('Resolve invite error:', err);
    res.status(500).json({ error: 'Fehler beim Oeffnen des Invite-Links.' });
  }
});

router.use(authenticateToken);

function parseConditionsPayload(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw || {};
    let notes = [];
    if (Array.isArray(parsed.notes)) {
      notes = parsed.notes;
    } else if (parsed.note) {
      notes = [{ id: '1', text: String(parsed.note), timestamp: new Date().toISOString() }];
    }
    if (parsed && typeof parsed === 'object' && ('weather' in parsed || 'track' in parsed || 'notes' in parsed)) {
      return {
        weather: parsed.weather && typeof parsed.weather === 'object' ? parsed.weather : {},
        track: parsed.track && typeof parsed.track === 'object' ? parsed.track : {},
        notes: notes,
      };
    }

    return {
      weather: parsed && typeof parsed === 'object' ? parsed : {},
      track: {},
      notes: notes,
    };
  } catch (e) {
    return { weather: {}, track: {}, notes: [] };
  }
}


// GET /api/sessions
router.get('/', (req, res) => {
  try {
    const db = getDb();
    let sessions = [];

    if (isGuestSessionUser(req)) {
      const access = ensureGuestSessionAccess(db, req, req.user.guestSessionId);
      if (!access.ok) return res.status(access.status).json({ error: access.error });
      const single = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.user.guestSessionId);
      sessions = single ? [single] : [];
    } else {
      sessions = db.prepare(`
        SELECT DISTINCT s.* FROM sessions s
        LEFT JOIN session_collaborators sc ON s.id = sc.session_id
        WHERE s.user_id = ? OR sc.user_id = ?
        ORDER BY s.date DESC
      `).all(req.user.userId, req.user.userId);
    }

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
    let session;

    if (isGuestSessionUser(req)) {
      const access = ensureGuestSessionAccess(db, req, req.params.id);
      if (!access.ok) return res.status(access.status).json({ error: access.error });
      session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
    } else {
      session = db.prepare(`
        SELECT DISTINCT s.* FROM sessions s
        LEFT JOIN session_collaborators sc ON s.id = sc.session_id
        WHERE s.id = ? AND (s.user_id = ? OR sc.user_id = ?)
      `).get(req.params.id, req.user.userId, req.user.userId);
    }

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
    if (isGuestSessionUser(req)) {
      return res.status(403).json({ error: 'Gastzugriff darf keine neuen Sessions anlegen.' });
    }

    const db = getDb();
    const data = req.body;
    let initialNotes = [];
    if (Array.isArray(data.notes)) {
      initialNotes = data.notes;
    } else if (data.note) {
      initialNotes = [{ id: String(Date.now()), text: String(data.note), timestamp: new Date().toISOString() }];
    }
    const conditionsPayload = {
      weather: data.weather && typeof data.weather === 'object' ? data.weather : {},
      track: data.track && typeof data.track === 'object' ? data.track : {},
      notes: initialNotes,
    };
    const doInsert = db.transaction(() => {
      const r = db.prepare(
        'INSERT INTO sessions (user_id, name, location, type, date, time, competition_category, competition_type, weather_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        req.user.userId, data.name || '', data.location || '', data.type || 'training',
        data.date || '', data.time || '', data.competitionCategory || '',
        data.competitionType || '', JSON.stringify(conditionsPayload)
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
    let existing;

    if (isGuestSessionUser(req)) {
      const access = ensureGuestSessionAccess(db, req, req.params.id);
      if (!access.ok) return res.status(access.status).json({ error: access.error });
      existing = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
    } else {
      existing = db.prepare(`
        SELECT DISTINCT s.* FROM sessions s
        LEFT JOIN session_collaborators sc ON s.id = sc.session_id
        WHERE s.id = ? AND (s.user_id = ? OR sc.user_id = ?)
      `).get(req.params.id, req.user.userId, req.user.userId);
    }

    if (!existing) return res.status(404).json({ error: 'Session nicht gefunden.' });
    const data = req.body;
    const existingConditions = parseConditionsPayload(existing.weather_json);

    let updatedNotes = existingConditions.notes;
    if (data.notes !== undefined && Array.isArray(data.notes)) {
      updatedNotes = data.notes;
    } else if (data.note !== undefined) {
      updatedNotes = data.note ? [{ id: String(Date.now()), text: String(data.note), timestamp: new Date().toISOString() }] : [];
    }

    const nextConditions = {
      weather:
        data.weather !== undefined && data.weather !== null && typeof data.weather === 'object'
          ? data.weather
          : existingConditions.weather,
      track:
        data.track !== undefined && data.track !== null && typeof data.track === 'object'
          ? data.track
          : existingConditions.track,
      notes: updatedNotes,
    };
    const doUpdate = db.transaction(() => {
      db.prepare(
        'UPDATE sessions SET name=?,location=?,type=?,date=?,time=?,competition_category=?,competition_type=?,weather_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?'
      ).run(
        data.name !== undefined ? data.name : existing.name,
        data.location !== undefined ? data.location : existing.location,
        data.type !== undefined ? data.type : existing.type,
        data.date !== undefined ? data.date : existing.date,
        data.time !== undefined ? data.time : existing.time,
        data.competitionCategory !== undefined ? data.competitionCategory : existing.competition_category,
        data.competitionType !== undefined ? data.competitionType : existing.competition_type,
        JSON.stringify(nextConditions),
        req.params.id
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
    if (isGuestSessionUser(req)) {
      return res.status(403).json({ error: 'Gastzugriff darf keine Session loeschen.' });
    }

    const db = getDb();
    const existing = db.prepare(`
      SELECT DISTINCT s.id FROM sessions s
      LEFT JOIN session_collaborators sc ON s.id = sc.session_id
      WHERE s.id = ? AND (s.user_id = ? OR sc.user_id = ?)
    `).get(req.params.id, req.user.userId, req.user.userId);
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
    if (isGuestSessionUser(req)) {
      return res.status(403).json({ error: 'Gastzugriff darf keine Freigaben verwalten.' });
    }

    const db = getDb();
    const session = db.prepare('SELECT id FROM sessions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
    if (!session) return res.status(404).json({ error: 'Session nicht gefunden oder keine Berechtigung.' });

    const shareCode = Math.floor(10000 + Math.random() * 90000).toString();
    const inviteToken = generateInviteToken();
    const inviteHash = hashInviteToken(inviteToken);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    db.prepare('UPDATE sessions SET share_code = ?, share_expires_at = ?, share_invite_hash = ? WHERE id = ?').run(
      shareCode,
      expiresAt,
      inviteHash,
      req.params.id
    );

    res.json({ shareCode, inviteToken, expiresAt });
  } catch (err) {
    console.error('Share session error:', err);
    res.status(500).json({ error: 'Fehler beim Teilen.' });
  }
});

// POST /api/sessions/:id/share-link
router.post('/:id/share-link', (req, res) => {
  try {
    if (isGuestSessionUser(req)) {
      return res.status(403).json({ error: 'Gastzugriff darf keine Freigaben verwalten.' });
    }

    const db = getDb();
    const session = db
      .prepare('SELECT id, share_code, share_expires_at FROM sessions WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.userId);

    if (!session) {
      return res.status(404).json({ error: 'Session nicht gefunden oder keine Berechtigung.' });
    }

    if (!session.share_code) {
      return res.status(400).json({ error: 'Session ist aktuell nicht geteilt.' });
    }

    const now = Date.now();
    const existingExpiresAtMs = new Date(session.share_expires_at || 0).getTime();
    const expiresAt =
      Number.isFinite(existingExpiresAtMs) && existingExpiresAtMs > now
        ? new Date(existingExpiresAtMs).toISOString()
        : new Date(now + 2 * 60 * 60 * 1000).toISOString();

    const inviteToken = generateInviteToken();
    const inviteHash = hashInviteToken(inviteToken);

    db.prepare('UPDATE sessions SET share_invite_hash = ?, share_expires_at = ? WHERE id = ?').run(
      inviteHash,
      expiresAt,
      req.params.id
    );

    return res.json({
      shareCode: session.share_code,
      inviteToken,
      expiresAt,
    });
  } catch (err) {
    console.error('Share link error:', err);
    return res.status(500).json({ error: 'Fehler beim Erstellen des Share-Links.' });
  }
});

// POST /api/sessions/:id/unshare
router.post('/:id/unshare', (req, res) => {
  try {
    if (isGuestSessionUser(req)) {
      return res.status(403).json({ error: 'Gastzugriff darf keine Freigaben verwalten.' });
    }

    const db = getDb();
    const session = db.prepare('SELECT id FROM sessions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
    if (!session) return res.status(404).json({ error: 'Session nicht gefunden.' });

    db.prepare('UPDATE sessions SET share_code = NULL, share_expires_at = NULL, share_invite_hash = NULL WHERE id = ?').run(req.params.id);
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
    if (isGuestSessionUser(req)) {
      return res.status(403).json({ error: 'Gastzugriff darf keiner Session per Code beitreten.' });
    }

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

