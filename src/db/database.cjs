/**
 * LIFE OS — SQLite Database Connection & Schema Initialization
 * Uses better-sqlite3 with WAL mode and foreign key constraints for ACID compliance.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { DB_PATH } = require('../config/env.cjs');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite connection
const db = new Database(DB_PATH);

// Enable WAL mode and foreign keys for high-performance ACID compliance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

/**
 * Initialize all database tables and indexes
 */
function initSchema() {
  db.exec(`
    -- 1. Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    -- 2. Habits table (isolated per user_id)
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Health',
      routine TEXT DEFAULT 'Morning',
      motivation TEXT DEFAULT '',
      color TEXT DEFAULT 'emerald',
      completed_dates TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT,
      PRIMARY KEY (user_id, id)
    );
    CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);

    -- 3. Tasks table (isolated per user_id)
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      category TEXT DEFAULT 'Work',
      due_date TEXT DEFAULT 'Today',
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, id)
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);

    -- 4. Calendar Events table (schedule, isolated per user_id)
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      hour REAL DEFAULT 9,
      start_hour REAL DEFAULT 9,
      duration REAL DEFAULT 1,
      duration_hours REAL DEFAULT 1,
      category TEXT DEFAULT 'Work',
      recurrence TEXT DEFAULT 'once',
      repeat_days TEXT DEFAULT '[]',
      completed INTEGER DEFAULT 0,
      completed_dates TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT,
      PRIMARY KEY (user_id, id)
    );
    CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);

    -- 5. Financial Records table (transactions, isolated per user_id)
    CREATE TABLE IF NOT EXISTS financial_records (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      payment_method TEXT DEFAULT 'UPI',
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, id)
    );
    CREATE INDEX IF NOT EXISTS idx_financial_records_user_id ON financial_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_financial_records_date ON financial_records(date);
    CREATE INDEX IF NOT EXISTS idx_financial_records_type ON financial_records(type);

    -- 6. Journal Entries table (isolated per user_id)
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'Reflection',
      content TEXT DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, id)
    );
    CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);

    -- 7. Goals table (isolated per user_id)
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'Career',
      target_date TEXT,
      progress REAL DEFAULT 0,
      status TEXT DEFAULT 'in-progress',
      metrics TEXT DEFAULT '',
      description TEXT DEFAULT '',
      milestones TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, id)
    );
    CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
    CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);

    -- 8. LifeScore Logs table (scoreSnapshots, isolated per user_id)
    CREATE TABLE IF NOT EXISTS lifescore_logs (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period_type TEXT NOT NULL,
      period_key TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      scores TEXT NOT NULL,
      formula_version TEXT DEFAULT '2.0-5pillar',
      is_baseline INTEGER DEFAULT 0,
      calculated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, id)
    );
    CREATE INDEX IF NOT EXISTS idx_lifescore_logs_user_id ON lifescore_logs(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_lifescore_logs_user_period ON lifescore_logs(user_id, period_key);

    -- 9. Mood Logs table (isolated per user_id and date)
    CREATE TABLE IF NOT EXISTS mood_logs (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      score INTEGER NOT NULL,
      energy INTEGER DEFAULT 3,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_mood_logs_user_id ON mood_logs(user_id);

    -- 10. User Settings & Achievements metadata
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      settings TEXT DEFAULT '{"theme":"dark"}',
      unlocked_achievements TEXT DEFAULT '{}',
      updated_at TEXT NOT NULL
    );
  `);

  // Ensure default guest tenant exists for unauthenticated legacy/guest mode
  const ensureDefaultUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, name, password_hash, created_at)
    VALUES ('default', 'guest@lifeos.local', 'Guest User', '', datetime('now'))
  `);
  ensureDefaultUser.run();

  const ensureDefaultSettings = db.prepare(`
    INSERT OR IGNORE INTO user_settings (user_id, settings, unlocked_achievements, updated_at)
    VALUES ('default', '{"theme":"dark"}', '{}', datetime('now'))
  `);
  ensureDefaultSettings.run();
}

// Auto-initialize schema on load
initSchema();

module.exports = {
  db,
  initSchema
};
