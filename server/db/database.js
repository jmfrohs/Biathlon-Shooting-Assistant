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
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };
