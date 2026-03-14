-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  trainer_name TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Athletes (belong to a user)
CREATE TABLE IF NOT EXISTS athletes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  date_of_birth TEXT DEFAULT '',
  age INTEGER DEFAULT 0,
  age_group TEXT DEFAULT '',
  squad TEXT DEFAULT '',
  gender TEXT DEFAULT 'm',
  prone_start TEXT DEFAULT '',
  standing_start TEXT DEFAULT '',
  click_value REAL DEFAULT 6.0,
  use_default_times INTEGER DEFAULT 1,
  prone_time_add INTEGER DEFAULT 0,
  standing_time_add INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  location TEXT DEFAULT '',
  type TEXT DEFAULT 'training',
  date TEXT DEFAULT '',
  time TEXT DEFAULT '',
  competition_category TEXT DEFAULT '',
  competition_type TEXT DEFAULT '',
  weather_json TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Session-Athlete mapping
CREATE TABLE IF NOT EXISTS session_athletes (
  session_id INTEGER NOT NULL,
  athlete_id INTEGER NOT NULL,
  PRIMARY KEY (session_id, athlete_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
);

-- Series (belong to a session)
CREATE TABLE IF NOT EXISTS series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  athlete_id INTEGER,
  athlete_name TEXT DEFAULT '',
  stance TEXT DEFAULT '',
  clicks_x INTEGER DEFAULT 0,
  clicks_y INTEGER DEFAULT 0,
  is_placeholder INTEGER DEFAULT 0,
  timestamp TEXT DEFAULT '',
  type TEXT DEFAULT 'series',
  meta_json TEXT DEFAULT '{}',
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE SET NULL
);

-- Shots (belong to a series)
CREATE TABLE IF NOT EXISTS shots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id INTEGER NOT NULL,
  x REAL DEFAULT 0,
  y REAL DEFAULT 0,
  ring INTEGER DEFAULT 0,
  hit INTEGER DEFAULT 0,
  shot_order INTEGER DEFAULT 0,
  FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
);

-- User settings (key-value per user)
CREATE TABLE IF NOT EXISTS settings (
  user_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  value TEXT DEFAULT '',
  PRIMARY KEY (user_id, key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
