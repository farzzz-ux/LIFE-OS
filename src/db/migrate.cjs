/**
 * LIFE OS — Database Migration Script
 * Migrates data from flat JSON storage (data/db.json) into SQLite ACID database.
 */

const fs = require('fs');
const path = require('path');
const { db, initSchema } = require('./database.cjs');

function runMigration() {
  console.log('[Migration] Ensuring SQLite schema...');
  initSchema();

  const jsonDbPath = path.resolve(process.cwd(), 'data', 'db.json');
  if (!fs.existsSync(jsonDbPath)) {
    console.log('[Migration] No data/db.json found. SQLite initialized with empty default schema.');
    return;
  }

  console.log(`[Migration] Reading JSON database from ${jsonDbPath}...`);
  let rawData;
  try {
    rawData = JSON.parse(fs.readFileSync(jsonDbPath, 'utf8'));
  } catch (err) {
    console.error('[Migration] Failed to parse data/db.json:', err.message);
    return;
  }

  const users = Array.isArray(rawData.users) ? rawData.users : [];
  const userData = (rawData.userData && typeof rawData.userData === 'object') ? rawData.userData : {};

  // If legacy db has top-level items and no default userData partition, construct it
  if (!userData.default) {
    userData.default = {
      habits: Array.isArray(rawData.habits) ? rawData.habits : [],
      tasks: Array.isArray(rawData.tasks) ? rawData.tasks : [],
      transactions: Array.isArray(rawData.transactions) ? rawData.transactions : [],
      moodLogs: Array.isArray(rawData.moodLogs) ? rawData.moodLogs : [],
      schedule: Array.isArray(rawData.schedule) ? rawData.schedule : [],
      journal: Array.isArray(rawData.journal) ? rawData.journal : [],
      goals: Array.isArray(rawData.goals) ? rawData.goals : [],
      scoreSnapshots: Array.isArray(rawData.scoreSnapshots) ? rawData.scoreSnapshots : [],
      unlockedAchievements: rawData.unlockedAchievements || {},
      settings: rawData.settings || { theme: 'dark' },
      updatedAt: rawData.updatedAt || new Date().toISOString()
    };
  }

  const migrateTx = db.transaction(() => {
    // 1. Migrate Users
    const insertUser = db.prepare(`
      INSERT OR REPLACE INTO users (id, email, name, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const u of users) {
      if (!u.id || !u.email) continue;
      insertUser.run(
        u.id,
        u.email.trim().toLowerCase(),
        u.name || u.email.split('@')[0],
        u.passwordHash || '',
        u.createdAt || new Date().toISOString()
      );
    }

    // Always ensure default guest user
    insertUser.run('default', 'guest@lifeos.local', 'Guest User', '', new Date().toISOString());

    // Prepared statements for entities
    const insertHabit = db.prepare(`
      INSERT OR REPLACE INTO habits (id, user_id, name, category, routine, motivation, color, completed_dates, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTask = db.prepare(`
      INSERT OR REPLACE INTO tasks (id, user_id, title, priority, category, due_date, completed, completed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertEvent = db.prepare(`
      INSERT OR REPLACE INTO calendar_events (id, user_id, title, date, hour, start_hour, duration, duration_hours, category, recurrence, repeat_days, completed, completed_dates, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertFinance = db.prepare(`
      INSERT OR REPLACE INTO financial_records (id, user_id, description, amount, type, category, payment_method, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertJournal = db.prepare(`
      INSERT OR REPLACE INTO journal_entries (id, user_id, title, category, content, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertGoal = db.prepare(`
      INSERT OR REPLACE INTO goals (id, user_id, title, category, target_date, progress, status, metrics, description, milestones, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertLifescore = db.prepare(`
      INSERT OR REPLACE INTO lifescore_logs (id, user_id, period_type, period_key, start_date, end_date, scores, formula_version, is_baseline, calculated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMood = db.prepare(`
      INSERT OR REPLACE INTO mood_logs (id, user_id, date, score, energy, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertSettings = db.prepare(`
      INSERT OR REPLACE INTO user_settings (user_id, settings, unlocked_achievements, updated_at)
      VALUES (?, ?, ?, ?)
    `);

    let totalMigrated = 0;

    // 2. Iterate each tenant partition
    for (const [userId, partition] of Object.entries(userData)) {
      if (!partition || typeof partition !== 'object') continue;

      // Ensure user exists if userId is not in users list
      db.prepare(`
        INSERT OR IGNORE INTO users (id, email, name, password_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, `${userId}@lifeos.local`, userId, '', new Date().toISOString());

      // Habits
      if (Array.isArray(partition.habits)) {
        for (const h of partition.habits) {
          if (!h.id || !h.name) continue;
          insertHabit.run(
            h.id,
            userId,
            h.name,
            h.category || 'Health',
            h.routine || 'Morning',
            h.motivation || '',
            h.color || 'emerald',
            JSON.stringify(Array.isArray(h.completedDates) ? h.completedDates : []),
            h.createdAt || new Date().toISOString(),
            h.updatedAt || null
          );
          totalMigrated++;
        }
      }

      // Tasks
      if (Array.isArray(partition.tasks)) {
        for (const t of partition.tasks) {
          if (!t.id || !t.title) continue;
          insertTask.run(
            t.id,
            userId,
            t.title,
            t.priority || 'medium',
            t.category || 'Work',
            t.dueDate || 'Today',
            t.completed ? 1 : 0,
            t.completedAt || null,
            t.createdAt || new Date().toISOString()
          );
          totalMigrated++;
        }
      }

      // Calendar Events (Schedule)
      if (Array.isArray(partition.schedule)) {
        for (const s of partition.schedule) {
          if (!s.id || !s.title) continue;
          insertEvent.run(
            s.id,
            userId,
            s.title,
            s.date || new Date().toISOString().split('T')[0],
            Number(s.hour ?? s.startHour ?? 9),
            Number(s.startHour ?? s.hour ?? 9),
            Number(s.duration ?? s.durationHours ?? 1),
            Number(s.durationHours ?? s.duration ?? 1),
            s.category || 'Work',
            s.recurrence || 'once',
            JSON.stringify(Array.isArray(s.repeatDays) ? s.repeatDays : []),
            s.completed ? 1 : 0,
            JSON.stringify(Array.isArray(s.completedDates) ? s.completedDates : []),
            s.createdAt || new Date().toISOString(),
            s.updatedAt || null
          );
          totalMigrated++;
        }
      }

      // Financial Records (Transactions)
      if (Array.isArray(partition.transactions)) {
        for (const tx of partition.transactions) {
          if (!tx.id || !tx.description) continue;
          insertFinance.run(
            tx.id,
            userId,
            tx.description,
            Number(tx.amount) || 0,
            tx.type || 'expense',
            tx.category || 'General',
            tx.paymentMethod || 'UPI',
            tx.date || new Date().toISOString().split('T')[0],
            tx.createdAt || new Date().toISOString()
          );
          totalMigrated++;
        }
      }

      // Journal Entries
      if (Array.isArray(partition.journal)) {
        for (const j of partition.journal) {
          if (!j.id || !j.title) continue;
          insertJournal.run(
            j.id,
            userId,
            j.title,
            j.category || 'Reflection',
            j.content || '',
            j.date || new Date().toISOString().split('T')[0],
            j.createdAt || new Date().toISOString()
          );
          totalMigrated++;
        }
      }

      // Goals
      if (Array.isArray(partition.goals)) {
        for (const g of partition.goals) {
          if (!g.id || !g.title) continue;
          insertGoal.run(
            g.id,
            userId,
            g.title,
            g.category || 'Career',
            g.targetDate || null,
            Number(g.progress) || 0,
            g.status || 'in-progress',
            g.metrics || '',
            g.description || '',
            JSON.stringify(Array.isArray(g.milestones) ? g.milestones : []),
            g.createdAt || new Date().toISOString()
          );
          totalMigrated++;
        }
      }

      // LifeScore Logs (Snapshots)
      if (Array.isArray(partition.scoreSnapshots)) {
        for (const snap of partition.scoreSnapshots) {
          if (!snap.id || !snap.periodKey) continue;
          try {
            insertLifescore.run(
              snap.id,
              userId,
              snap.periodType || 'week',
              snap.periodKey,
              snap.startDate || '',
              snap.endDate || '',
              JSON.stringify(snap.scores || {}),
              snap.formulaVersion || '2.0-5pillar',
              snap.isBaseline ? 1 : 0,
              snap.calculatedAt || new Date().toISOString()
            );
            totalMigrated++;
          } catch (e) {
            // Ignore duplicate period key in migration if present
          }
        }
      }

      // Mood Logs
      if (Array.isArray(partition.moodLogs)) {
        for (const m of partition.moodLogs) {
          if (!m.date) continue;
          const moodId = `mood_${userId}_${m.date}`;
          insertMood.run(
            moodId,
            userId,
            m.date,
            Number(m.score) || 3,
            Number(m.energy) || 3,
            m.note || '',
            m.createdAt || new Date().toISOString()
          );
          totalMigrated++;
        }
      }

      // Settings & Achievements
      insertSettings.run(
        userId,
        JSON.stringify(partition.settings || { theme: 'dark' }),
        JSON.stringify(partition.unlockedAchievements || {}),
        partition.updatedAt || new Date().toISOString()
      );
    }

    console.log(`[Migration] Migration completed successfully. ${totalMigrated} items imported across ${Object.keys(userData).length} tenant partitions.`);
  });

  migrateTx();
}

if (require.main === module) {
  runMigration();
  console.log('[Migration] Done.');
}

module.exports = {
  runMigration
};
