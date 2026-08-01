const express = require('express');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { getIo } = require('../socket-handler');
const logger = require('../utils/logger');

const router = express.Router();

// Helper to log administrative actions to the DB
function logAdminAction(adminUserId, action, details, ipAddress) {
  try {
    const db = getDb();
    db.prepare(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)'
    ).run(adminUserId, action, details || '', ipAddress || '');
  } catch (e) {
    logger.error('Failed to log admin action to DB', e);
  }
}

// Middleware to verify the user has the 'admin' role
function isAdmin(req, res, next) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: 'Nicht authentifiziert.' });
  }

  try {
    const db = getDb();
    const user = db.prepare('SELECT role, is_blocked FROM users WHERE id = ?').get(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }
    
    if (user.is_blocked === 1) {
      return res.status(403).json({ error: 'Ihr Account ist gesperrt.' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Zugriff verweigert. Admin-Rechte erforderlich.' });
    }
    
    next();
  } catch (err) {
    logger.error('Admin middleware check error', err);
    res.status(500).json({ error: 'Serverfehler bei der Rechteprüfung.' });
  }
}

// Apply authentication and admin-check globally to this router
router.use(authenticateToken);
router.use(isAdmin);

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const blockedCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_blocked = 1').get().count;
    const athleteCount = db.prepare('SELECT COUNT(*) as count FROM athletes').get().count;
    const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get().count;
    
    // Get DB file size
    const dbPath = path.join(__dirname, '..', 'db', 'biathlon.db');
    let dbSizeMb = 0;
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      dbSizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    }
    
    // Active websocket connections
    const io = getIo();
    let activeSockets = 0;
    if (io) {
      activeSockets = io.sockets.sockets.size;
    }
    
    res.json({
      userCount,
      blockedCount,
      athleteCount,
      sessionCount,
      dbSizeMb,
      activeSockets,
      uptime: process.uptime()
    });
  } catch (err) {
    logger.error('Error fetching admin stats', err);
    res.status(500).json({ error: 'Serverfehler bei der Statistikabfrage.' });
  }
});

// GET /api/admin/users
router.get('/users', (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare(`
      SELECT id, email, trainer_name, role, created_at, is_blocked, api_limit 
      FROM users 
      ORDER BY id DESC
    `).all();
    
    res.json(users);
  } catch (err) {
    logger.error('Error fetching admin users', err);
    res.status(500).json({ error: 'Serverfehler beim Laden der Benutzerliste.' });
  }
});

// POST /api/admin/users/:id/block
router.post('/users/:id/block', (req, res) => {
  const { id } = req.params;
  const { block } = req.body; // boolean: true to block, false to unblock
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

  if (Number(id) === Number(req.user.userId)) {
    return res.status(400).json({ error: 'Sie können sich nicht selbst sperren.' });
  }

  try {
    const db = getDb();
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const blockVal = block ? 1 : 0;
    db.prepare('UPDATE users SET is_blocked = ? WHERE id = ?').run(blockVal, id);
    
    const actionText = block ? 'USER_BLOCKED' : 'USER_UNBLOCKED';
    logAdminAction(req.user.userId, actionText, `User ${user.email} (ID: ${id})`, ip);
    logger.security('warning', `Admin ${req.user.email} ${block ? 'blocked' : 'unblocked'} user ${user.email}`, { adminId: req.user.userId, userId: id });

    // Disconnect active socket of blocked user if blocking
    if (block) {
      const io = getIo();
      if (io) {
        for (const [socketId, socket] of io.sockets.sockets.entries()) {
          if (socket.user && Number(socket.user.userId) === Number(id)) {
            socket.disconnect(true);
            logger.info(`Disconnected socket ${socketId} of blocked user ID: ${id}`);
          }
        }
      }
    }

    res.json({ success: true, is_blocked: blockVal });
  } catch (err) {
    logger.error(`Error toggling block state for user ${id}`, err);
    res.status(500).json({ error: 'Serverfehler beim Ändern des Sperrstatus.' });
  }
});

// POST /api/admin/users/:id/api-limit
router.post('/users/:id/api-limit', (req, res) => {
  const { id } = req.params;
  const { limit } = req.body;
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

  if (limit === undefined || isNaN(limit) || limit < 5) {
    return res.status(400).json({ error: 'Ungültiges API-Limit (Mindestens 5 erforderlich).' });
  }

  try {
    const db = getDb();
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    db.prepare('UPDATE users SET api_limit = ? WHERE id = ?').run(limit, id);
    
    logAdminAction(req.user.userId, 'USER_LIMIT_CHANGE', `User ${user.email} limit set to ${limit}`, ip);
    logger.info(`Admin set API limit for user ${user.email} to ${limit}`);

    res.json({ success: true, api_limit: limit });
  } catch (err) {
    logger.error(`Error setting API limit for user ${id}`, err);
    res.status(500).json({ error: 'Serverfehler beim Ändern des API-Limits.' });
  }
});

// POST /api/admin/users/:id/role
router.post('/users/:id/role', (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

  if (!['admin', 'coach', 'athlete'].includes(role)) {
    return res.status(400).json({ error: 'Ungültige Rolle. Erlaubt sind: admin, coach, athlete' });
  }

  if (Number(id) === Number(req.user.userId) && role !== 'admin') {
    return res.status(400).json({ error: 'Sie können sich nicht selbst Ihre Admin-Rolle entziehen.' });
  }

  try {
    const db = getDb();
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    
    logAdminAction(req.user.userId, 'USER_ROLE_CHANGE', `User ${user.email} role set to ${role}`, ip);
    logger.security('warning', `Admin set role for user ${user.email} to ${role}`, { adminId: req.user.userId, userId: id });

    res.json({ success: true, role });
  } catch (err) {
    logger.error(`Error setting role for user ${id}`, err);
    res.status(500).json({ error: 'Serverfehler beim Ändern der Rolle.' });
  }
});

// GET /api/admin/users/:id/backup
router.get('/users/:id/backup', (req, res) => {
  const { id } = req.params;
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

  try {
    const db = getDb();
    const user = db.prepare('SELECT id, email, trainer_name, role, created_at FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    // Load user settings
    const settings = db.prepare('SELECT key, value FROM settings WHERE user_id = ?').all(id);
    
    // Load athletes
    const athletes = db.prepare('SELECT * FROM athletes WHERE user_id = ?').all(id);
    
    // Load sessions
    const sessions = db.prepare('SELECT * FROM sessions WHERE user_id = ?').all(id);
    
    // Load all series for user sessions
    const series = db.prepare(`
      SELECT * FROM series 
      WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ?)
    `).all(id);
    
    // Load all shots for user series
    const shots = db.prepare(`
      SELECT * FROM shots 
      WHERE series_id IN (
        SELECT id FROM series WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ?)
      )
    `).all(id);

    const backupData = {
      version: '1.3-admin-backup',
      timestamp: new Date().toISOString(),
      user,
      settings,
      athletes,
      sessions,
      series,
      shots
    };

    logAdminAction(req.user.userId, 'USER_BACKUP_DOWNLOAD', `User ${user.email} (ID: ${id})`, ip);
    logger.info(`Admin downloaded backup for user ${user.email}`);

    res.setHeader('Content-disposition', `attachment; filename=Biathlon_Backup_User_${id}_${new Date().toISOString().slice(0, 10)}.json`);
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    logger.error(`Error generating backup for user ${id}`, err);
    res.status(500).json({ error: 'Serverfehler beim Generieren des Backups.' });
  }
});

// POST /api/admin/system-message
router.post('/system-message', (req, res) => {
  const { message } = req.body;
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Nachricht darf nicht leer sein.' });
  }

  try {
    const io = getIo();
    if (io) {
      io.emit('system_message', { message: message.trim() });
      logAdminAction(req.user.userId, 'SYSTEM_MESSAGE_BROADCAST', `Message: "${message.trim()}"`, ip);
      logger.security('info', `Admin broadcasted system message: "${message.trim()}"`, { adminId: req.user.userId });
      res.json({ success: true });
    } else {
      res.status(503).json({ error: 'WebSocket-Dienst nicht verfügbar.' });
    }
  } catch (err) {
    logger.error('Error broadcasting system message', err);
    res.status(500).json({ error: 'Serverfehler beim Senden der Systemnachricht.' });
  }
});

// POST /api/admin/cleanup
router.post('/cleanup', (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

  try {
    const db = getDb();
    
    // Delete expired demo accounts
    const resultDemo = db.prepare(`
      DELETE FROM users 
      WHERE is_demo = 1 AND demo_expires_at < datetime('now')
    `).run();

    logAdminAction(req.user.userId, 'DB_CLEANUP', `Cleaned ${resultDemo.changes} expired demo accounts`, ip);
    logger.info(`Admin triggered DB Cleanup. Cleared ${resultDemo.changes} demo accounts.`);

    res.json({ 
      success: true, 
      details: `Gelöschte abgelaufene Demo-Accounts: ${resultDemo.changes}` 
    });
  } catch (err) {
    logger.error('Error executing DB cleanup', err);
    res.status(500).json({ error: 'Serverfehler bei der Datenbank-Bereinigung.' });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', (req, res) => {
  try {
    const db = getDb();
    const logs = db.prepare(`
      SELECT a.id, a.action, a.details, a.ip_address, a.created_at, u.email as admin_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.id DESC
      LIMIT 50
    `).all();
    
    res.json(logs);
  } catch (err) {
    logger.error('Error fetching audit logs', err);
    res.status(500).json({ error: 'Serverfehler beim Laden des Aktivitätsprotokolls.' });
  }
});

module.exports = router;
