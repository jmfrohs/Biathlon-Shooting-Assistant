const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'biathlon.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
    runMigrations();
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
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };
