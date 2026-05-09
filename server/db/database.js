const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const DatabaseSecurity = require('../utils/database-security');
const logger = require('../utils/logger');

const DB_PATH = path.join(__dirname, 'biathlon.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;
let dbSecurity;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    
    // Initialize database security
    dbSecurity = new DatabaseSecurity(DB_PATH);
    dbSecurity.setPragmas(db);
    
    // Check database integrity
    if (!dbSecurity.checkIntegrity(db)) {
      logger.security('critical', 'Database integrity check failed on startup', {
        dbPath: DB_PATH
      });
    }

    initSchema();
    runMigrations();
    
    // Start automatic backups
    dbSecurity.scheduleAutoBackup();
  }
  return db;
}

function initSchema() {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  console.log('Database schema initialized');
}
function runMigrations() {
  // Add new columns to series table if they don't exist yet
  try {
    db.exec("ALTER TABLE series ADD COLUMN type TEXT DEFAULT 'series'");
  } catch (e) { /* column already exists */ }
  try {
    db.exec("ALTER TABLE series ADD COLUMN meta_json TEXT DEFAULT '{}'");
  } catch (e) { /* column already exists */ }
  // Add intensity column to shots table
  try {
    db.exec("ALTER TABLE shots ADD COLUMN intensity TEXT DEFAULT 'Ruhe'");
  } catch (e) { /* column already exists */ }

  // Add columns for session sharing
  try {
    db.exec("ALTER TABLE sessions ADD COLUMN share_code TEXT");
  } catch (e) { /* column already exists */ }
  try {
    db.exec("ALTER TABLE sessions ADD COLUMN share_expires_at DATETIME");
  } catch (e) { /* column already exists */ }

  // Add role column to users table
  try {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'coach'");
  } catch (e) { /* column already exists */ }

  // Add demo tracking columns to users table
  try {
    db.exec("ALTER TABLE users ADD COLUMN is_demo INTEGER DEFAULT 0");
  } catch (e) { /* column already exists */ }
  try {
    db.exec("ALTER TABLE users ADD COLUMN demo_expires_at DATETIME");
  } catch (e) { /* column already exists */ }

  // Create session_collaborators table
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_collaborators (
      session_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (session_id, user_id),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Add country and federation columns to athletes table
  try {
    db.exec("ALTER TABLE athletes ADD COLUMN country TEXT DEFAULT ''");
  } catch (e) { /* column already exists */ }
  try {
    db.exec("ALTER TABLE athletes ADD COLUMN federation TEXT DEFAULT ''");
  } catch (e) { /* column already exists */ }
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function cleanupExpiredDemoAccounts() {
  const db = getDb();
  try {
    const result = db.prepare(`
      DELETE FROM users 
      WHERE is_demo = 1 AND demo_expires_at < datetime('now')
    `).run();
    
    if (result.changes > 0) {
      console.log(`🗑️  Gelöschte abgelaufene Demo-Accounts: ${result.changes}`);
    }
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}

module.exports = { getDb, closeDb, cleanupExpiredDemoAccounts };
