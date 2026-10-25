/**
 * LIFE OS — Database Connection & Dual-Engine Adapter
 * Supports Supabase / PostgreSQL (Production Cloud) & SQLite WAL (Local / Fallback)
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const Database = require('better-sqlite3');
const { DB_PATH, DATABASE_URL, NODE_ENV } = require('../config/env.cjs');

const isPg = Boolean(DATABASE_URL) && (NODE_ENV !== 'test' || process.env.TEST_PG === 'true');

let pool = null;
let sqliteDb = null;

if (isPg) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
  console.log('[LIFE OS Database] Active Engine: Cloud PostgreSQL (Supabase)');
} else {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  sqliteDb = new Database(DB_PATH);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
  sqliteDb.pragma('synchronous = NORMAL');
  console.log('[LIFE OS Database] Active Engine: Embedded SQLite (' + DB_PATH + ')');
}

function toPgSql(sql) {
  let idx = 1;
  let s = sql.replace(/\?/g, () => '$' + (idx++));
  s = s.replace(/datetime\('now'\)/gi, 'NOW()');
  s = s.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO');
  if (s.includes('INSERT OR REPLACE INTO habits')) {
    s = s.replace('INSERT OR REPLACE INTO habits', 'INSERT INTO habits') + 
      ' ON CONFLICT (user_id, id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, routine = EXCLUDED.routine, motivation = EXCLUDED.motivation, color = EXCLUDED.color, completed_dates = EXCLUDED.completed_dates, updated_at = NOW()';
  } else if (s.includes('INSERT OR REPLACE INTO tasks')) {
    s = s.replace('INSERT OR REPLACE INTO tasks', 'INSERT INTO tasks') +
      ' ON CONFLICT (user_id, id) DO UPDATE SET title = EXCLUDED.title, priority = EXCLUDED.priority, category = EXCLUDED.category, due_date = EXCLUDED.due_date, completed = EXCLUDED.completed, completed_at = EXCLUDED.completed_at';
  } else if (s.includes('INSERT OR REPLACE INTO calendar_events')) {
    s = s.replace('INSERT OR REPLACE INTO calendar_events', 'INSERT INTO calendar_events') +
      ' ON CONFLICT (user_id, id) DO UPDATE SET title = EXCLUDED.title, date = EXCLUDED.date, hour = EXCLUDED.hour, start_hour = EXCLUDED.start_hour, duration = EXCLUDED.duration, duration_hours = EXCLUDED.duration_hours, category = EXCLUDED.category, recurrence = EXCLUDED.recurrence, repeat_days = EXCLUDED.repeat_days, completed = EXCLUDED.completed, completed_dates = EXCLUDED.completed_dates, updated_at = NOW()';
  } else if (s.includes('INSERT OR REPLACE INTO financial_records')) {
    s = s.replace('INSERT OR REPLACE INTO financial_records', 'INSERT INTO financial_records') +
      ' ON CONFLICT (user_id, id) DO UPDATE SET description = EXCLUDED.description, amount = EXCLUDED.amount, type = EXCLUDED.type, category = EXCLUDED.category, payment_method = EXCLUDED.payment_method, date = EXCLUDED.date';
  } else if (s.includes('INSERT OR REPLACE INTO journal_entries')) {
    s = s.replace('INSERT OR REPLACE INTO journal_entries', 'INSERT INTO journal_entries') +
      ' ON CONFLICT (user_id, id) DO UPDATE SET title = EXCLUDED.title, category = EXCLUDED.category, content = EXCLUDED.content, date = EXCLUDED.date';
  } else if (s.includes('INSERT OR REPLACE INTO goals')) {
    s = s.replace('INSERT OR REPLACE INTO goals', 'INSERT INTO goals') +
      ' ON CONFLICT (user_id, id) DO UPDATE SET title = EXCLUDED.title, category = EXCLUDED.category, target_date = EXCLUDED.target_date, progress = EXCLUDED.progress, status = EXCLUDED.status, metrics = EXCLUDED.metrics, description = EXCLUDED.description, milestones = EXCLUDED.milestones';
  } else if (s.includes('INSERT OR REPLACE INTO lifescore_logs')) {
    s = s.replace('INSERT OR REPLACE INTO lifescore_logs', 'INSERT INTO lifescore_logs') +
      ' ON CONFLICT (user_id, period_key) DO UPDATE SET period_type = EXCLUDED.period_type, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, scores = EXCLUDED.scores, formula_version = EXCLUDED.formula_version, is_baseline = EXCLUDED.is_baseline, calculated_at = NOW()';
  }
  return s;
}

const db = {
  isPg,
  pool,
  sqlite: sqliteDb,

  async query(sql, params = []) {
    if (isPg) {
      const res = await pool.query(toPgSql(sql), params);
      return res.rows;
    } else {
      return sqliteDb.prepare(sql).all(...params);
    }
  },

  async get(sql, params = []) {
    if (isPg) {
      const res = await pool.query(toPgSql(sql), params);
      return res.rows[0] || null;
    } else {
      return sqliteDb.prepare(sql).get(...params) || null;
    }
  },

  async all(sql, params = []) {
    if (isPg) {
      const res = await pool.query(toPgSql(sql), params);
      return res.rows;
    } else {
      return sqliteDb.prepare(sql).all(...params);
    }
  },

  async run(sql, params = []) {
    if (isPg) {
      const res = await pool.query(toPgSql(sql), params);
      return { changes: res.rowCount };
    } else {
      return sqliteDb.prepare(sql).run(...params);
    }
  },

  prepare(sql) {
    if (!isPg && sqliteDb) {
      return sqliteDb.prepare(sql);
    }
    return {
      get: async (...params) => {
        const res = await pool.query(toPgSql(sql), params);
        return res.rows[0] || null;
      },
      all: async (...params) => {
        const res = await pool.query(toPgSql(sql), params);
        return res.rows;
      },
      run: async (...params) => {
        const res = await pool.query(toPgSql(sql), params);
        return { changes: res.rowCount };
      }
    };
  },

  transaction(fn) {
    if (!isPg && sqliteDb) {
      return sqliteDb.transaction(fn);
    }
    return async (...args) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const res = await fn(...args);
        await client.query('COMMIT');
        return res;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    };
  }
};

async function initSchema() {
  if (isPg) {
    const pgSchema = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE TABLE IF NOT EXISTS habits (
        id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'Health',
        routine TEXT DEFAULT 'Morning',
        motivation TEXT DEFAULT '',
        color TEXT DEFAULT 'emerald',
        completed_dates TEXT DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ,
        PRIMARY KEY (user_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        category TEXT DEFAULT 'Work',
        due_date TEXT DEFAULT 'Today',
        completed INTEGER DEFAULT 0,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

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
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ,
        PRIMARY KEY (user_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);

      CREATE TABLE IF NOT EXISTS financial_records (
        id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        payment_method TEXT DEFAULT 'UPI',
        date TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_financial_records_user_id ON financial_records(user_id);

      CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'Reflection',
        content TEXT DEFAULT '',
        date TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);

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
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

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
        calculated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_lifescore_logs_user_id ON lifescore_logs(user_id);

      CREATE TABLE IF NOT EXISTS mood_logs (
        id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        score INTEGER NOT NULL,
        energy INTEGER DEFAULT 3,
        note TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, date)
      );
      CREATE INDEX IF NOT EXISTS idx_mood_logs_user_id ON mood_logs(user_id);

      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        settings TEXT DEFAULT '{"theme":"dark"}',
        unlocked_achievements TEXT DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      INSERT INTO users (id, email, name, password_hash, created_at)
      VALUES ('default', 'guest@lifeos.local', 'Guest User', '', NOW())
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO user_settings (user_id, settings, unlocked_achievements, updated_at)
      VALUES ('default', '{"theme":"dark"}', '{}', NOW())
      ON CONFLICT (user_id) DO NOTHING;
    `;
    try {
      await pool.query(pgSchema);
      console.log('[LIFE OS Database] Cloud PostgreSQL schema verified.');
    } catch (e) {
      console.error('[LIFE OS Database] Schema error:', e.message);
    }
  } else {
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

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

      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        settings TEXT DEFAULT '{"theme":"dark"}',
        unlocked_achievements TEXT DEFAULT '{}',
        updated_at TEXT NOT NULL
      );

      INSERT OR IGNORE INTO users (id, email, name, password_hash, created_at)
      VALUES ('default', 'guest@lifeos.local', 'Guest User', '', datetime('now'));

      INSERT OR IGNORE INTO user_settings (user_id, settings, unlocked_achievements, updated_at)
      VALUES ('default', '{"theme":"dark"}', '{}', datetime('now'));
    `);
  }
}

// Auto initialize schema
initSchema().catch(() => {});

module.exports = {
  db,
  initSchema
};
