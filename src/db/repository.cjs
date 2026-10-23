/**
 * LIFE OS — Data Access Layer & Tenant Isolation Repositories
 * Strictly validates and enforces WHERE user_id = ? across all operations.
 */

const { db } = require('./database.cjs');

/* ==========================================================================
   USER REPOSITORY
   ========================================================================== */
const UserRepository = {
  findById(id) {
    const row = db.prepare('SELECT id, email, name, password_hash, created_at FROM users WHERE id = ?').get(id);
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash,
      createdAt: row.created_at
    };
  },

  findByEmail(email) {
    const row = db.prepare('SELECT id, email, name, password_hash, created_at FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash,
      createdAt: row.created_at
    };
  },

  create({ id, email, name, passwordHash, createdAt }) {
    const stmt = db.prepare(`
      INSERT INTO users (id, email, name, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, email.toLowerCase().trim(), name, passwordHash, createdAt || new Date().toISOString());

    // Initialize user settings
    db.prepare(`
      INSERT OR IGNORE INTO user_settings (user_id, settings, unlocked_achievements, updated_at)
      VALUES (?, '{"theme":"dark"}', '{}', datetime('now'))
    `).run(id);

    return this.findById(id);
  },

  getAll() {
    return db.prepare('SELECT id, email, name, created_at FROM users').all();
  }
};

/* ==========================================================================
   HABITS REPOSITORY (Multi-User Isolated)
   ========================================================================== */
const HabitRepository = {
  formatHabit(row) {
    if (!row) return null;
    let completedDates = [];
    try {
      completedDates = typeof row.completed_dates === 'string' ? JSON.parse(row.completed_dates) : (row.completed_dates || []);
    } catch (e) {
      completedDates = [];
    }
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      routine: row.routine,
      motivation: row.motivation || '',
      color: row.color || 'emerald',
      completedDates: Array.isArray(completedDates) ? completedDates : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined
    };
  },

  getAll(userId) {
    const rows = db.prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at ASC').all(userId);
    return rows.map(this.formatHabit);
  },

  getById(userId, id) {
    const row = db.prepare('SELECT * FROM habits WHERE user_id = ? AND id = ?').get(userId, id);
    return this.formatHabit(row);
  },

  create(userId, data) {
    const id = data.id || 'h_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const createdAt = data.createdAt || new Date().toISOString();
    const completedDates = JSON.stringify(Array.isArray(data.completedDates) ? data.completedDates : []);

    db.prepare(`
      INSERT OR REPLACE INTO habits (id, user_id, name, category, routine, motivation, color, completed_dates, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      data.name.trim(),
      (data.category || 'Health').trim(),
      (data.routine || 'Morning').trim(),
      (data.motivation || '').trim(),
      (data.color || 'emerald').trim(),
      completedDates,
      createdAt,
      null
    );

    return this.getById(userId, id);
  },

  update(userId, id, updates) {
    const current = this.getById(userId, id);
    if (!current) return null;

    const name = updates.name !== undefined ? String(updates.name).trim() : current.name;
    const category = updates.category !== undefined ? String(updates.category).trim() : current.category;
    const routine = updates.routine !== undefined ? String(updates.routine).trim() : current.routine;
    const motivation = updates.motivation !== undefined ? String(updates.motivation).trim() : current.motivation;
    const color = updates.color !== undefined ? String(updates.color).trim() : current.color;
    const completedDates = updates.completedDates !== undefined
      ? JSON.stringify(Array.isArray(updates.completedDates) ? updates.completedDates : [])
      : JSON.stringify(current.completedDates);
    const updatedAt = new Date().toISOString();

    db.prepare(`
      UPDATE habits
      SET name = ?, category = ?, routine = ?, motivation = ?, color = ?, completed_dates = ?, updated_at = ?
      WHERE user_id = ? AND id = ?
    `).run(name, category, routine, motivation, color, completedDates, updatedAt, userId, id);

    return this.getById(userId, id);
  },

  toggle(userId, id, dateStr) {
    const current = this.getById(userId, id);
    if (!current) return null;

    const dates = [...current.completedDates];
    const idx = dates.indexOf(dateStr);
    if (idx >= 0) {
      dates.splice(idx, 1);
    } else {
      dates.push(dateStr);
    }

    return this.update(userId, id, { completedDates: dates });
  },

  delete(userId, id) {
    const res = db.prepare('DELETE FROM habits WHERE user_id = ? AND id = ?').run(userId, id);
    return res.changes > 0;
  }
};

/* ==========================================================================
   TASKS REPOSITORY (Multi-User Isolated)
   ========================================================================== */
const TaskRepository = {
  formatTask(row) {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      priority: row.priority || 'medium',
      category: row.category || 'Work',
      dueDate: row.due_date || 'Today',
      completed: Boolean(row.completed),
      completedAt: row.completed_at || null,
      createdAt: row.created_at
    };
  },

  getAll(userId, filters = {}) {
    let query = 'SELECT * FROM tasks WHERE user_id = ?';
    const params = [userId];

    if (filters.priority) {
      query += ' AND priority = ?';
      params.push(filters.priority);
    }
    if (filters.completed !== undefined && filters.completed !== null) {
      query += ' AND completed = ?';
      params.push(filters.completed ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';
    const rows = db.prepare(query).all(...params);
    return rows.map(this.formatTask);
  },

  getById(userId, id) {
    const row = db.prepare('SELECT * FROM tasks WHERE user_id = ? AND id = ?').get(userId, id);
    return this.formatTask(row);
  },

  create(userId, data) {
    const id = data.id || 't_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const isCompleted = Boolean(data.completed);
    const completedAt = isCompleted ? (data.completedAt || new Date().toISOString()) : null;
    const createdAt = data.createdAt || new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO tasks (id, user_id, title, priority, category, due_date, completed, completed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      data.title.trim(),
      ['high', 'medium', 'low'].includes(data.priority) ? data.priority : 'medium',
      (data.category || 'Work').trim(),
      data.dueDate || 'Today',
      isCompleted ? 1 : 0,
      completedAt,
      createdAt
    );

    return this.getById(userId, id);
  },

  update(userId, id, updates) {
    const current = this.getById(userId, id);
    if (!current) return null;

    const title = updates.title !== undefined ? String(updates.title).trim() : current.title;
    const priority = updates.priority !== undefined ? updates.priority : current.priority;
    const category = updates.category !== undefined ? updates.category : current.category;
    const dueDate = updates.dueDate !== undefined ? updates.dueDate : current.dueDate;

    let completed = current.completed;
    let completedAt = current.completedAt;

    if (updates.completed !== undefined) {
      const wasCompleted = current.completed;
      completed = Boolean(updates.completed);
      if (updates.completedAt !== undefined) {
        completedAt = updates.completedAt;
      } else if (completed && (!completedAt || !wasCompleted)) {
        completedAt = new Date().toISOString();
      } else if (!completed) {
        completedAt = null;
      }
    }

    db.prepare(`
      UPDATE tasks
      SET title = ?, priority = ?, category = ?, due_date = ?, completed = ?, completed_at = ?
      WHERE user_id = ? AND id = ?
    `).run(title, priority, category, dueDate, completed ? 1 : 0, completedAt, userId, id);

    return this.getById(userId, id);
  },

  delete(userId, id) {
    const res = db.prepare('DELETE FROM tasks WHERE user_id = ? AND id = ?').run(userId, id);
    return res.changes > 0;
  }
};

/* ==========================================================================
   CALENDAR / SCHEDULE REPOSITORY (Multi-User Isolated)
   ========================================================================== */
const CalendarRepository = {
  formatEvent(row) {
    if (!row) return null;
    let repeatDays = [];
    let completedDates = [];
    try {
      repeatDays = typeof row.repeat_days === 'string' ? JSON.parse(row.repeat_days) : (row.repeat_days || []);
    } catch (e) {
      repeatDays = [];
    }
    try {
      completedDates = typeof row.completed_dates === 'string' ? JSON.parse(row.completed_dates) : (row.completed_dates || []);
    } catch (e) {
      completedDates = [];
    }
    return {
      id: row.id,
      title: row.title,
      date: row.date,
      hour: row.hour,
      startHour: row.start_hour,
      duration: row.duration,
      durationHours: row.duration_hours,
      category: row.category || 'Work',
      recurrence: row.recurrence || 'once',
      repeatDays: Array.isArray(repeatDays) ? repeatDays : [],
      completed: Boolean(row.completed),
      completedDates: Array.isArray(completedDates) ? completedDates : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined
    };
  },

  getAll(userId) {
    const rows = db.prepare('SELECT * FROM calendar_events WHERE user_id = ? ORDER BY date ASC, hour ASC').all(userId);
    return rows.map(this.formatEvent);
  },

  getById(userId, id) {
    const row = db.prepare('SELECT * FROM calendar_events WHERE user_id = ? AND id = ?').get(userId, id);
    return this.formatEvent(row);
  },

  create(userId, data) {
    const id = data.id || 'sch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const hour = Number(data.hour ?? data.startHour ?? 9);
    const duration = Number(data.duration ?? data.durationHours ?? 1);
    const recurrence = ['everyday', 'selected_days'].includes(data.recurrence) ? data.recurrence : 'once';
    const repeatDays = Array.isArray(data.repeatDays) ? data.repeatDays : [];
    const isCompleted = Boolean(data.completed);
    const completedDates = Array.isArray(data.completedDates)
      ? data.completedDates
      : (isCompleted && data.date ? [data.date] : []);

    db.prepare(`
      INSERT OR REPLACE INTO calendar_events (id, user_id, title, date, hour, start_hour, duration, duration_hours, category, recurrence, repeat_days, completed, completed_dates, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      data.title.trim(),
      data.date || new Date().toISOString().split('T')[0],
      hour,
      hour,
      duration,
      duration,
      data.category || 'Work',
      recurrence,
      JSON.stringify(repeatDays),
      (isCompleted || completedDates.length > 0) ? 1 : 0,
      JSON.stringify(completedDates),
      data.createdAt || new Date().toISOString(),
      null
    );

    return this.getById(userId, id);
  },

  update(userId, id, updates) {
    const current = this.getById(userId, id);
    if (!current) return null;

    const title = updates.title !== undefined ? String(updates.title).trim() : current.title;
    const date = updates.date !== undefined ? updates.date : current.date;
    const hour = updates.hour !== undefined ? Number(updates.hour) : current.hour;
    const duration = updates.duration !== undefined ? Number(updates.duration) : current.duration;
    const category = updates.category !== undefined ? updates.category : current.category;
    const recurrence = updates.recurrence !== undefined ? updates.recurrence : current.recurrence;
    const repeatDays = updates.repeatDays !== undefined ? updates.repeatDays : current.repeatDays;

    let completedDates = current.completedDates;
    if (Array.isArray(updates.completedDates)) {
      completedDates = updates.completedDates;
    } else if (updates.completed !== undefined) {
      const targetDate = updates.date || current.date || new Date().toISOString().split('T')[0];
      if (updates.completed && !completedDates.includes(targetDate)) {
        completedDates = [...completedDates, targetDate];
      } else if (!updates.completed) {
        completedDates = completedDates.filter(d => d !== targetDate);
      }
    }

    const completed = updates.completed !== undefined ? Boolean(updates.completed) : completedDates.length > 0;
    const updatedAt = new Date().toISOString();

    db.prepare(`
      UPDATE calendar_events
      SET title = ?, date = ?, hour = ?, start_hour = ?, duration = ?, duration_hours = ?,
          category = ?, recurrence = ?, repeat_days = ?, completed = ?, completed_dates = ?, updated_at = ?
      WHERE user_id = ? AND id = ?
    `).run(
      title,
      date,
      hour,
      hour,
      duration,
      duration,
      category,
      recurrence,
      JSON.stringify(repeatDays),
      completed ? 1 : 0,
      JSON.stringify(completedDates),
      updatedAt,
      userId,
      id
    );

    return this.getById(userId, id);
  },

  delete(userId, id) {
    const res = db.prepare('DELETE FROM calendar_events WHERE user_id = ? AND id = ?').run(userId, id);
    return res.changes > 0;
  }
};

/* ==========================================================================
   FINANCES REPOSITORY (Multi-User Isolated)
   ========================================================================== */
const FinanceRepository = {
  formatTx(row) {
    if (!row) return null;
    return {
      id: row.id,
      description: row.description,
      amount: Number(row.amount),
      type: row.type,
      category: row.category || 'General',
      paymentMethod: row.payment_method || 'UPI',
      date: row.date,
      createdAt: row.created_at
    };
  },

  getAll(userId) {
    const rows = db.prepare('SELECT * FROM financial_records WHERE user_id = ? ORDER BY date DESC, created_at DESC').all(userId);
    return rows.map(this.formatTx);
  },

  getById(userId, id) {
    const row = db.prepare('SELECT * FROM financial_records WHERE user_id = ? AND id = ?').get(userId, id);
    return this.formatTx(row);
  },

  create(userId, data) {
    const id = data.id || 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const amount = Math.round(Number(data.amount) * 100) / 100;
    const createdAt = data.createdAt || new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO financial_records (id, user_id, description, amount, type, category, payment_method, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      data.description.trim(),
      amount,
      data.type,
      (data.category || 'General').trim(),
      data.paymentMethod || 'UPI',
      data.date || new Date().toISOString().split('T')[0],
      createdAt
    );

    return this.getById(userId, id);
  },

  delete(userId, id) {
    const res = db.prepare('DELETE FROM financial_records WHERE user_id = ? AND id = ?').run(userId, id);
    return res.changes > 0;
  }
};

/* ==========================================================================
   JOURNAL REPOSITORY (Multi-User Isolated)
   ========================================================================== */
const JournalRepository = {
  formatEntry(row) {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      category: row.category || 'Reflection',
      content: row.content || '',
      date: row.date,
      createdAt: row.created_at
    };
  },

  getAll(userId) {
    const rows = db.prepare('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY date DESC, created_at DESC').all(userId);
    return rows.map(this.formatEntry);
  },

  getById(userId, id) {
    const row = db.prepare('SELECT * FROM journal_entries WHERE user_id = ? AND id = ?').get(userId, id);
    return this.formatEntry(row);
  },

  create(userId, data) {
    const id = data.id || 'j_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const createdAt = data.createdAt || new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO journal_entries (id, user_id, title, category, content, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      data.title.trim(),
      data.category || 'Reflection',
      data.content ? data.content.trim() : '',
      data.date || new Date().toISOString().split('T')[0],
      createdAt
    );

    return this.getById(userId, id);
  },

  delete(userId, id) {
    const res = db.prepare('DELETE FROM journal_entries WHERE user_id = ? AND id = ?').run(userId, id);
    return res.changes > 0;
  }
};

/* ==========================================================================
   GOALS REPOSITORY (Multi-User Isolated)
   ========================================================================== */
const GoalRepository = {
  formatGoal(row) {
    if (!row) return null;
    let milestones = [];
    try {
      milestones = typeof row.milestones === 'string' ? JSON.parse(row.milestones) : (row.milestones || []);
    } catch (e) {
      milestones = [];
    }
    return {
      id: row.id,
      title: row.title,
      category: row.category || 'Career',
      targetDate: row.target_date || '',
      progress: Number(row.progress) || 0,
      status: row.status || 'in-progress',
      metrics: row.metrics || '',
      description: row.description || '',
      milestones: Array.isArray(milestones) ? milestones : [],
      createdAt: row.created_at
    };
  },

  getAll(userId, filters = {}) {
    let query = 'SELECT * FROM goals WHERE user_id = ?';
    const params = [userId];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.category) {
      query += ' AND LOWER(category) = ?';
      params.push(filters.category.toLowerCase());
    }

    query += ' ORDER BY created_at DESC';
    const rows = db.prepare(query).all(...params);
    return rows.map(this.formatGoal);
  },

  getById(userId, id) {
    const row = db.prepare('SELECT * FROM goals WHERE user_id = ? AND id = ?').get(userId, id);
    return this.formatGoal(row);
  },

  create(userId, data) {
    const id = data.id || 'g_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const progress = Math.min(100, Math.max(0, Number(data.progress) || 0));
    const status = data.status === 'completed' || progress >= 100 ? 'completed' : 'in-progress';
    const milestones = JSON.stringify(Array.isArray(data.milestones) ? data.milestones : []);
    const createdAt = data.createdAt || new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO goals (id, user_id, title, category, target_date, progress, status, metrics, description, milestones, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      data.title.trim(),
      (data.category || 'Career').trim(),
      data.targetDate || new Date().toISOString().split('T')[0],
      progress,
      status,
      data.metrics ? String(data.metrics).trim() : '',
      data.description ? String(data.description).trim() : '',
      milestones,
      createdAt
    );

    return this.getById(userId, id);
  },

  update(userId, id, updates) {
    const current = this.getById(userId, id);
    if (!current) return null;

    const title = updates.title !== undefined ? String(updates.title).trim() : current.title;
    const category = updates.category !== undefined ? String(updates.category).trim() : current.category;
    const targetDate = updates.targetDate !== undefined ? updates.targetDate : current.targetDate;

    let progress = current.progress;
    let status = current.status;

    if (updates.progress !== undefined) {
      progress = Math.min(100, Math.max(0, Number(updates.progress) || 0));
      if (progress >= 100) status = 'completed';
    }
    if (updates.status !== undefined) {
      status = updates.status;
    }

    const metrics = updates.metrics !== undefined ? String(updates.metrics).trim() : current.metrics;
    const description = updates.description !== undefined ? String(updates.description).trim() : current.description;
    const milestones = updates.milestones !== undefined
      ? JSON.stringify(Array.isArray(updates.milestones) ? updates.milestones : [])
      : JSON.stringify(current.milestones);

    db.prepare(`
      UPDATE goals
      SET title = ?, category = ?, target_date = ?, progress = ?, status = ?, metrics = ?, description = ?, milestones = ?
      WHERE user_id = ? AND id = ?
    `).run(title, category, targetDate, progress, status, metrics, description, milestones, userId, id);

    return this.getById(userId, id);
  },

  delete(userId, id) {
    const res = db.prepare('DELETE FROM goals WHERE user_id = ? AND id = ?').run(userId, id);
    return res.changes > 0;
  }
};

/* ==========================================================================
   LIFESCORE LOGS REPOSITORY (Multi-User Isolated)
   ========================================================================== */
const LifeScoreRepository = {
  formatSnapshot(row) {
    if (!row) return null;
    let scores = {};
    try {
      scores = typeof row.scores === 'string' ? JSON.parse(row.scores) : (row.scores || {});
    } catch (e) {
      scores = {};
    }
    return {
      id: row.id,
      periodType: row.period_type,
      periodKey: row.period_key,
      startDate: row.start_date || '',
      endDate: row.end_date || '',
      scores: scores,
      formulaVersion: row.formula_version || '2.0-5pillar',
      isBaseline: Boolean(row.is_baseline),
      calculatedAt: row.calculated_at
    };
  },

  getAll(userId, periodType = null) {
    let query = 'SELECT * FROM lifescore_logs WHERE user_id = ?';
    const params = [userId];

    if (periodType) {
      query += ' AND period_type = ?';
      params.push(periodType);
    }

    query += ' ORDER BY calculated_at DESC';
    const rows = db.prepare(query).all(...params);
    return rows.map(this.formatSnapshot);
  },

  getByPeriodKey(userId, periodKey) {
    const row = db.prepare('SELECT * FROM lifescore_logs WHERE user_id = ? AND period_key = ?').get(userId, periodKey);
    return this.formatSnapshot(row);
  },

  create(userId, data) {
    const existing = this.getByPeriodKey(userId, data.periodKey);
    if (existing) {
      return { duplicate: true, snapshot: existing };
    }

    const id = data.id || `snap_${data.periodType || 'period'}_${data.periodKey}`;
    const calculatedAt = data.calculatedAt || new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO lifescore_logs (id, user_id, period_type, period_key, start_date, end_date, scores, formula_version, is_baseline, calculated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      data.periodType || 'week',
      data.periodKey,
      data.startDate || '',
      data.endDate || '',
      JSON.stringify(data.scores || {}),
      data.formulaVersion || '2.0-5pillar',
      data.isBaseline ? 1 : 0,
      calculatedAt
    );

    const snapshot = this.getByPeriodKey(userId, data.periodKey);
    return { duplicate: false, snapshot };
  }
};

/* ==========================================================================
   MOOD LOGS REPOSITORY (Multi-User Isolated)
   ========================================================================== */
const MoodRepository = {
  formatMood(row) {
    if (!row) return null;
    return {
      date: row.date,
      score: Number(row.score),
      energy: Number(row.energy) || 3,
      note: row.note || ''
    };
  },

  getAll(userId) {
    const rows = db.prepare('SELECT * FROM mood_logs WHERE user_id = ? ORDER BY date DESC').all(userId);
    return rows.map(this.formatMood);
  },

  upsert(userId, data) {
    const date = data.date || new Date().toISOString().split('T')[0];
    const score = Math.round(Number(data.score));
    const energy = Number(data.energy) || 3;
    const note = data.note ? String(data.note).trim() : '';
    const id = `mood_${userId}_${date}`;

    db.prepare(`
      INSERT INTO mood_logs (id, user_id, date, score, energy, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, date) DO UPDATE SET
        score = excluded.score,
        energy = excluded.energy,
        note = excluded.note
    `).run(id, userId, date, score, energy, note);

    return { date, score, energy, note };
  }
};

/* ==========================================================================
   USER SETTINGS & ACHIEVEMENTS REPOSITORY
   ========================================================================== */
const UserSettingsRepository = {
  get(userId) {
    const row = db.prepare('SELECT settings, unlocked_achievements, updated_at FROM user_settings WHERE user_id = ?').get(userId);
    if (!row) {
      return {
        settings: { theme: 'dark' },
        unlockedAchievements: {},
        updatedAt: new Date().toISOString()
      };
    }
    let settings = { theme: 'dark' };
    let unlockedAchievements = {};
    try { settings = JSON.parse(row.settings); } catch (e) {}
    try { unlockedAchievements = JSON.parse(row.unlocked_achievements); } catch (e) {}
    return {
      settings,
      unlockedAchievements,
      updatedAt: row.updated_at
    };
  },

  update(userId, updates = {}) {
    const current = this.get(userId);
    const newSettings = updates.settings ? { ...current.settings, ...updates.settings } : current.settings;
    const newAchievements = updates.unlockedAchievements ? { ...current.unlockedAchievements, ...updates.unlockedAchievements } : current.unlockedAchievements;
    const updatedAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO user_settings (user_id, settings, unlocked_achievements, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        settings = excluded.settings,
        unlocked_achievements = excluded.unlocked_achievements,
        updated_at = excluded.updated_at
    `).run(userId, JSON.stringify(newSettings), JSON.stringify(newAchievements), updatedAt);

    return {
      settings: newSettings,
      unlockedAchievements: newAchievements,
      updatedAt
    };
  }
};

/* ==========================================================================
   FULL USER DATA PARTITION REPOSITORY (For /api/data & /api/user/data & /api/sync)
   ========================================================================== */
const UserDataRepository = {
  getPartition(userId) {
    const habits = HabitRepository.getAll(userId);
    const tasks = TaskRepository.getAll(userId);
    const transactions = FinanceRepository.getAll(userId);
    const schedule = CalendarRepository.getAll(userId);
    const journal = JournalRepository.getAll(userId);
    const goals = GoalRepository.getAll(userId);
    const scoreSnapshots = LifeScoreRepository.getAll(userId);
    const moodLogs = MoodRepository.getAll(userId);
    const meta = UserSettingsRepository.get(userId);

    return {
      habits,
      tasks,
      transactions,
      schedule,
      journal,
      goals,
      scoreSnapshots,
      moodLogs,
      unlockedAchievements: meta.unlockedAchievements,
      settings: meta.settings,
      updatedAt: meta.updatedAt
    };
  },

  savePartition(userId, data) {
    const syncTx = db.transaction(() => {
      if (Array.isArray(data.habits)) {
        db.prepare('DELETE FROM habits WHERE user_id = ?').run(userId);
        for (const h of data.habits) {
          if (h && h.name) HabitRepository.create(userId, h);
        }
      }

      if (Array.isArray(data.tasks)) {
        db.prepare('DELETE FROM tasks WHERE user_id = ?').run(userId);
        for (const t of data.tasks) {
          if (t && t.title) TaskRepository.create(userId, t);
        }
      }

      if (Array.isArray(data.transactions)) {
        db.prepare('DELETE FROM financial_records WHERE user_id = ?').run(userId);
        for (const tx of data.transactions) {
          if (tx && tx.description) FinanceRepository.create(userId, tx);
        }
      }

      if (Array.isArray(data.schedule)) {
        db.prepare('DELETE FROM calendar_events WHERE user_id = ?').run(userId);
        for (const s of data.schedule) {
          if (s && s.title) CalendarRepository.create(userId, s);
        }
      }

      if (Array.isArray(data.journal)) {
        db.prepare('DELETE FROM journal_entries WHERE user_id = ?').run(userId);
        for (const j of data.journal) {
          if (j && j.title) JournalRepository.create(userId, j);
        }
      }

      if (Array.isArray(data.goals)) {
        db.prepare('DELETE FROM goals WHERE user_id = ?').run(userId);
        for (const g of data.goals) {
          if (g && g.title) GoalRepository.create(userId, g);
        }
      }

      if (Array.isArray(data.scoreSnapshots)) {
        for (const snap of data.scoreSnapshots) {
          if (snap && snap.periodKey) LifeScoreRepository.create(userId, snap);
        }
      }

      if (Array.isArray(data.moodLogs)) {
        for (const m of data.moodLogs) {
          if (m && m.date) MoodRepository.upsert(userId, m);
        }
      }

      UserSettingsRepository.update(userId, {
        settings: data.settings,
        unlockedAchievements: data.unlockedAchievements
      });
    });

    syncTx();
    return this.getPartition(userId);
  },

  reset(userId) {
    const resetTx = db.transaction(() => {
      db.prepare('DELETE FROM habits WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM tasks WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM financial_records WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM calendar_events WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM journal_entries WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM goals WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM lifescore_logs WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM mood_logs WHERE user_id = ?').run(userId);
      UserSettingsRepository.update(userId, {
        settings: { theme: 'dark' },
        unlockedAchievements: {}
      });
    });

    resetTx();
    return this.getPartition(userId);
  }
};

module.exports = {
  UserRepository,
  HabitRepository,
  TaskRepository,
  CalendarRepository,
  FinanceRepository,
  JournalRepository,
  GoalRepository,
  LifeScoreRepository,
  MoodRepository,
  UserSettingsRepository,
  UserDataRepository
};
