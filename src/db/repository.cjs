/**
 * LIFE OS — Dual-Engine Data Access Layer & Tenant Isolation Repositories
 * Works transparently with PostgreSQL (Supabase) and SQLite (Local / Fallback).
 * Strictly validates and enforces WHERE user_id = ? across all operations.
 */

const { db } = require('./database.cjs');

/* ==========================================================================
   USER REPOSITORY
   ========================================================================== */
const UserRepository = {
  async findById(id) {
    const row = await db.get('SELECT id, email, name, password_hash, created_at FROM users WHERE id = ?', [id]);
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash,
      createdAt: row.created_at
    };
  },

  async findByEmail(email) {
    const row = await db.get('SELECT id, email, name, password_hash, created_at FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash,
      createdAt: row.created_at
    };
  },

  async create({ id, email, name, passwordHash, createdAt }) {
    await db.run(
      'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, email.toLowerCase().trim(), name, passwordHash, createdAt || new Date().toISOString()]
    );

    await db.run(
      'INSERT OR IGNORE INTO user_settings (user_id, settings, unlocked_achievements, updated_at) VALUES (?, ?, ?, datetime(\'now\'))',
      [id, '{"theme":"dark"}', '{}']
    );

    return await this.findById(id);
  },

  async getAll() {
    return await db.all('SELECT id, email, name, created_at FROM users');
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

  async getAll(userId) {
    const rows = await db.all('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at ASC', [userId]);
    return rows.map(this.formatHabit);
  },

  async getById(userId, id) {
    const row = await db.get('SELECT * FROM habits WHERE user_id = ? AND id = ?', [userId, id]);
    return this.formatHabit(row);
  },

  async create(userId, data) {
    const id = data.id || 'h_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const createdAt = data.createdAt || new Date().toISOString();
    const completedDates = JSON.stringify(Array.isArray(data.completedDates) ? data.completedDates : []);

    await db.run(`
      INSERT OR REPLACE INTO habits (id, user_id, name, category, routine, motivation, color, completed_dates, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
    ]);

    return await this.getById(userId, id);
  },

  async update(userId, id, updates) {
    const current = await this.getById(userId, id);
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

    await db.run(`
      UPDATE habits
      SET name = ?, category = ?, routine = ?, motivation = ?, color = ?, completed_dates = ?, updated_at = ?
      WHERE user_id = ? AND id = ?
    `, [name, category, routine, motivation, color, completedDates, updatedAt, userId, id]);

    return await this.getById(userId, id);
  },

  async toggle(userId, id, dateStr) {
    const current = await this.getById(userId, id);
    if (!current) return null;

    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    let dates = [...current.completedDates];

    if (dates.includes(targetDate)) {
      dates = dates.filter(d => d !== targetDate);
    } else {
      dates.push(targetDate);
    }

    return await this.update(userId, id, { completedDates: dates });
  },

  async delete(userId, id) {
    const res = await db.run('DELETE FROM habits WHERE user_id = ? AND id = ?', [userId, id]);
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

  async getAll(userId, filters = {}) {
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
    const rows = await db.all(query, params);
    return rows.map(this.formatTask);
  },

  async getById(userId, id) {
    const row = await db.get('SELECT * FROM tasks WHERE user_id = ? AND id = ?', [userId, id]);
    return this.formatTask(row);
  },

  async create(userId, data) {
    const id = data.id || 't_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const createdAt = data.createdAt || new Date().toISOString();
    const completed = data.completed ? 1 : 0;
    const completedAt = completed ? (data.completedAt || createdAt) : null;

    await db.run(`
      INSERT OR REPLACE INTO tasks (id, user_id, title, priority, category, due_date, completed, completed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      data.title.trim(),
      data.priority || 'medium',
      data.category || 'Work',
      data.dueDate || 'Today',
      completed,
      completedAt,
      createdAt
    ]);

    return await this.getById(userId, id);
  },

  async update(userId, id, updates) {
    const current = await this.getById(userId, id);
    if (!current) return null;

    const title = updates.title !== undefined ? String(updates.title).trim() : current.title;
    const priority = updates.priority !== undefined ? updates.priority : current.priority;
    const category = updates.category !== undefined ? updates.category : current.category;
    const dueDate = updates.dueDate !== undefined ? updates.dueDate : current.dueDate;

    let completed = current.completed;
    let completedAt = current.completedAt;

    if (updates.completed !== undefined) {
      completed = Boolean(updates.completed);
      completedAt = completed ? (current.completedAt || new Date().toISOString()) : null;
    }

    await db.run(`
      UPDATE tasks
      SET title = ?, priority = ?, category = ?, due_date = ?, completed = ?, completed_at = ?
      WHERE user_id = ? AND id = ?
    `, [title, priority, category, dueDate, completed ? 1 : 0, completedAt, userId, id]);

    return await this.getById(userId, id);
  },

  async toggle(userId, id) {
    const current = await this.getById(userId, id);
    if (!current) return null;
    return await this.update(userId, id, { completed: !current.completed });
  },

  async delete(userId, id) {
    const res = await db.run('DELETE FROM tasks WHERE user_id = ? AND id = ?', [userId, id]);
    return res.changes > 0;
  }
};

/* ==========================================================================
   CALENDAR & SCHEDULE REPOSITORY (Multi-User Isolated)
   ========================================================================== */
const CalendarRepository = {
  formatEvent(row) {
    if (!row) return null;
    let repeatDays = [];
    let completedDates = [];
    try { repeatDays = typeof row.repeat_days === 'string' ? JSON.parse(row.repeat_days) : (row.repeat_days || []); } catch (e) {}
    try { completedDates = typeof row.completed_dates === 'string' ? JSON.parse(row.completed_dates) : (row.completed_dates || []); } catch (e) {}

    return {
      id: row.id,
      title: row.title,
      date: row.date,
      hour: Number(row.hour !== undefined ? row.hour : row.start_hour),
      startHour: Number(row.start_hour !== undefined ? row.start_hour : row.hour),
      duration: Number(row.duration !== undefined ? row.duration : row.duration_hours),
      durationHours: Number(row.duration_hours !== undefined ? row.duration_hours : row.duration),
      category: row.category || 'Work',
      recurrence: row.recurrence || 'once',
      repeatDays: Array.isArray(repeatDays) ? repeatDays : [],
      completed: Boolean(row.completed),
      completedDates: Array.isArray(completedDates) ? completedDates : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined
    };
  },

  async getAll(userId, date = null) {
    let query = 'SELECT * FROM calendar_events WHERE user_id = ?';
    const params = [userId];

    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }

    query += ' ORDER BY date ASC, hour ASC';
    const rows = await db.all(query, params);
    return rows.map(this.formatEvent);
  },

  async getById(userId, id) {
    const row = await db.get('SELECT * FROM calendar_events WHERE user_id = ? AND id = ?', [userId, id]);
    return this.formatEvent(row);
  },

  async create(userId, data) {
    const id = data.id || 'sch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const hour = Number(data.hour !== undefined ? data.hour : (data.startHour || 9));
    const duration = Number(data.duration !== undefined ? data.duration : (data.durationHours || 1));
    const recurrence = data.recurrence || 'once';
    const repeatDays = JSON.stringify(Array.isArray(data.repeatDays) ? data.repeatDays : []);
    const completedDates = JSON.stringify(Array.isArray(data.completedDates) ? data.completedDates : []);
    const createdAt = data.createdAt || new Date().toISOString();

    await db.run(`
      INSERT OR REPLACE INTO calendar_events (id, user_id, title, date, hour, start_hour, duration, duration_hours, category, recurrence, repeat_days, completed, completed_dates, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
      repeatDays,
      data.completed ? 1 : 0,
      completedDates,
      createdAt,
      null
    ]);

    return await this.getById(userId, id);
  },

  async update(userId, id, updates) {
    const current = await this.getById(userId, id);
    if (!current) return null;

    const title = updates.title !== undefined ? String(updates.title).trim() : current.title;
    const date = updates.date !== undefined ? updates.date : current.date;
    const hour = Number(updates.hour !== undefined ? updates.hour : (updates.startHour !== undefined ? updates.startHour : current.hour));
    const duration = Number(updates.duration !== undefined ? updates.duration : (updates.durationHours !== undefined ? updates.durationHours : current.duration));
    const category = updates.category !== undefined ? updates.category : current.category;
    const recurrence = updates.recurrence !== undefined ? updates.recurrence : current.recurrence;
    const repeatDays = updates.repeatDays !== undefined ? updates.repeatDays : current.repeatDays;
    const completed = updates.completed !== undefined ? Boolean(updates.completed) : current.completed;
    const completedDates = updates.completedDates !== undefined ? updates.completedDates : current.completedDates;
    const updatedAt = new Date().toISOString();

    await db.run(`
      UPDATE calendar_events
      SET title = ?, date = ?, hour = ?, start_hour = ?, duration = ?, duration_hours = ?, category = ?, recurrence = ?, repeat_days = ?, completed = ?, completed_dates = ?, updated_at = ?
      WHERE user_id = ? AND id = ?
    `, [
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
    ]);

    return await this.getById(userId, id);
  },

  async delete(userId, id) {
    const res = await db.run('DELETE FROM calendar_events WHERE user_id = ? AND id = ?', [userId, id]);
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

  async getAll(userId) {
    const rows = await db.all('SELECT * FROM financial_records WHERE user_id = ? ORDER BY date DESC, created_at DESC', [userId]);
    return rows.map(this.formatTx);
  },

  async getById(userId, id) {
    const row = await db.get('SELECT * FROM financial_records WHERE user_id = ? AND id = ?', [userId, id]);
    return this.formatTx(row);
  },

  async create(userId, data) {
    const id = data.id || 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const amount = Math.round(Number(data.amount) * 100) / 100;
    const createdAt = data.createdAt || new Date().toISOString();

    await db.run(`
      INSERT OR REPLACE INTO financial_records (id, user_id, description, amount, type, category, payment_method, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      data.description.trim(),
      amount,
      data.type,
      (data.category || 'General').trim(),
      data.paymentMethod || 'UPI',
      data.date || new Date().toISOString().split('T')[0],
      createdAt
    ]);

    return await this.getById(userId, id);
  },

  async delete(userId, id) {
    const res = await db.run('DELETE FROM financial_records WHERE user_id = ? AND id = ?', [userId, id]);
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

  async getAll(userId) {
    const rows = await db.all('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY date DESC, created_at DESC', [userId]);
    return rows.map(this.formatEntry);
  },

  async getById(userId, id) {
    const row = await db.get('SELECT * FROM journal_entries WHERE user_id = ? AND id = ?', [userId, id]);
    return this.formatEntry(row);
  },

  async create(userId, data) {
    const id = data.id || 'j_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const createdAt = data.createdAt || new Date().toISOString();

    await db.run(`
      INSERT OR REPLACE INTO journal_entries (id, user_id, title, category, content, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      data.title ? data.title.trim() : 'Reflection',
      data.category || 'Reflection',
      data.content || '',
      data.date || new Date().toISOString().split('T')[0],
      createdAt
    ]);

    return await this.getById(userId, id);
  },

  async update(userId, id, updates) {
    const current = await this.getById(userId, id);
    if (!current) return null;

    const title = updates.title !== undefined ? String(updates.title).trim() : current.title;
    const category = updates.category !== undefined ? String(updates.category).trim() : current.category;
    const content = updates.content !== undefined ? String(updates.content) : current.content;
    const date = updates.date !== undefined ? updates.date : current.date;

    await db.run(`
      UPDATE journal_entries
      SET title = ?, category = ?, content = ?, date = ?
      WHERE user_id = ? AND id = ?
    `, [title, category, content, date, userId, id]);

    return await this.getById(userId, id);
  },

  async delete(userId, id) {
    const res = await db.run('DELETE FROM journal_entries WHERE user_id = ? AND id = ?', [userId, id]);
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
    try { milestones = typeof row.milestones === 'string' ? JSON.parse(row.milestones) : (row.milestones || []); } catch (e) {}
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

  async getAll(userId, filters = {}) {
    let query = 'SELECT * FROM goals WHERE user_id = ?';
    const params = [userId];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    query += ' ORDER BY created_at DESC';
    const rows = await db.all(query, params);
    return rows.map(this.formatGoal);
  },

  async getById(userId, id) {
    const row = await db.get('SELECT * FROM goals WHERE user_id = ? AND id = ?', [userId, id]);
    return this.formatGoal(row);
  },

  async create(userId, data) {
    const id = data.id || 'g_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const progress = Math.min(100, Math.max(0, Number(data.progress) || 0));
    const status = data.status === 'completed' || progress >= 100 ? 'completed' : 'in-progress';
    const milestones = JSON.stringify(Array.isArray(data.milestones) ? data.milestones : []);
    const createdAt = data.createdAt || new Date().toISOString();

    await db.run(`
      INSERT OR REPLACE INTO goals (id, user_id, title, category, target_date, progress, status, metrics, description, milestones, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
    ]);

    return await this.getById(userId, id);
  },

  async update(userId, id, updates) {
    const current = await this.getById(userId, id);
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

    await db.run(`
      UPDATE goals
      SET title = ?, category = ?, target_date = ?, progress = ?, status = ?, metrics = ?, description = ?, milestones = ?
      WHERE user_id = ? AND id = ?
    `, [title, category, targetDate, progress, status, metrics, description, milestones, userId, id]);

    return await this.getById(userId, id);
  },

  async delete(userId, id) {
    const res = await db.run('DELETE FROM goals WHERE user_id = ? AND id = ?', [userId, id]);
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
    try { scores = typeof row.scores === 'string' ? JSON.parse(row.scores) : (row.scores || {}); } catch (e) {}
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

  async getAll(userId) {
    const rows = await db.all('SELECT * FROM lifescore_logs WHERE user_id = ? ORDER BY calculated_at DESC', [userId]);
    return rows.map(this.formatSnapshot);
  },

  async getLogs(userId) {
    return await this.getAll(userId);
  },

  async getByPeriod(userId, periodKey) {
    const row = await db.get('SELECT * FROM lifescore_logs WHERE user_id = ? AND period_key = ?', [userId, periodKey]);
    return this.formatSnapshot(row);
  },

  async saveSnapshot(userId, data) {
    const id = data.id || 'ls_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const scores = JSON.stringify(data.scores || {});
    const calculatedAt = data.calculatedAt || new Date().toISOString();

    await db.run(`
      INSERT OR REPLACE INTO lifescore_logs (id, user_id, period_type, period_key, start_date, end_date, scores, formula_version, is_baseline, calculated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      data.periodType || 'overall',
      data.periodKey,
      data.startDate || '',
      data.endDate || '',
      scores,
      data.formulaVersion || '2.0-5pillar',
      data.isBaseline ? 1 : 0,
      calculatedAt
    ]);

    return await this.getByPeriod(userId, data.periodKey);
  },

  async create(userId, data) {
    return await this.saveSnapshot(userId, data);
  }
};

/* ==========================================================================
   MOOD LOGS REPOSITORY (Multi-User Isolated)
   ========================================================================== */
const MoodRepository = {
  formatMood(row) {
    if (!row) return null;
    return {
      id: row.id,
      date: row.date,
      score: Number(row.score),
      energy: Number(row.energy),
      note: row.note || '',
      createdAt: row.created_at
    };
  },

  async getAll(userId) {
    const rows = await db.all('SELECT * FROM mood_logs WHERE user_id = ? ORDER BY date DESC', [userId]);
    return rows.map(this.formatMood);
  },

  async upsert(userId, data) {
    const date = data.date || new Date().toISOString().split('T')[0];
    const score = Math.round(Number(data.score));
    const energy = Number(data.energy) || 3;
    const note = data.note ? String(data.note).trim() : '';
    const id = `mood_${userId}_${date}`;

    await db.run(`
      INSERT INTO mood_logs (id, user_id, date, score, energy, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, date) DO UPDATE SET
        score = excluded.score,
        energy = excluded.energy,
        note = excluded.note
    `, [id, userId, date, score, energy, note]);

    return { date, score, energy, note };
  }
};

/* ==========================================================================
   USER SETTINGS & ACHIEVEMENTS REPOSITORY
   ========================================================================== */
const UserSettingsRepository = {
  async get(userId) {
    const row = await db.get('SELECT settings, unlocked_achievements, updated_at FROM user_settings WHERE user_id = ?', [userId]);
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

  async update(userId, updates = {}) {
    const current = await this.get(userId);
    const newSettings = updates.settings ? { ...current.settings, ...updates.settings } : current.settings;
    const newAchievements = updates.unlockedAchievements ? { ...current.unlockedAchievements, ...updates.unlockedAchievements } : current.unlockedAchievements;
    const updatedAt = new Date().toISOString();

    await db.run(`
      INSERT INTO user_settings (user_id, settings, unlocked_achievements, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        settings = excluded.settings,
        unlocked_achievements = excluded.unlocked_achievements,
        updated_at = excluded.updated_at
    `, [userId, JSON.stringify(newSettings), JSON.stringify(newAchievements), updatedAt]);

    return {
      settings: newSettings,
      unlockedAchievements: newAchievements,
      updatedAt
    };
  }
};

/* ==========================================================================
   FULL USER DATA PARTITION REPOSITORY
   ========================================================================== */
const UserDataRepository = {
  async getPartition(userId) {
    const habits = await HabitRepository.getAll(userId);
    const tasks = await TaskRepository.getAll(userId);
    const transactions = await FinanceRepository.getAll(userId);
    const schedule = await CalendarRepository.getAll(userId);
    const journal = await JournalRepository.getAll(userId);
    const goals = await GoalRepository.getAll(userId);
    const scoreSnapshots = await LifeScoreRepository.getAll(userId);
    const moodLogs = await MoodRepository.getAll(userId);
    const meta = await UserSettingsRepository.get(userId);

    return {
      habits: habits || [],
      tasks: tasks || [],
      transactions: transactions || [],
      schedule: schedule || [],
      journal: journal || [],
      goals: goals || [],
      scoreSnapshots: scoreSnapshots || [],
      moodLogs: moodLogs || [],
      unlockedAchievements: meta.unlockedAchievements || {},
      settings: meta.settings || { theme: 'dark' },
      updatedAt: meta.updatedAt || new Date().toISOString()
    };
  },

  async savePartition(userId, data) {
    if (Array.isArray(data.habits)) {
      await db.run('DELETE FROM habits WHERE user_id = ?', [userId]);
      for (const h of data.habits) {
        if (h && h.name) await HabitRepository.create(userId, h);
      }
    }

    if (Array.isArray(data.tasks)) {
      await db.run('DELETE FROM tasks WHERE user_id = ?', [userId]);
      for (const t of data.tasks) {
        if (t && t.title) await TaskRepository.create(userId, t);
      }
    }

    if (Array.isArray(data.transactions)) {
      await db.run('DELETE FROM financial_records WHERE user_id = ?', [userId]);
      for (const tx of data.transactions) {
        if (tx && tx.description) await FinanceRepository.create(userId, tx);
      }
    }

    if (Array.isArray(data.schedule)) {
      await db.run('DELETE FROM calendar_events WHERE user_id = ?', [userId]);
      for (const s of data.schedule) {
        if (s && s.title) await CalendarRepository.create(userId, s);
      }
    }

    if (Array.isArray(data.journal)) {
      await db.run('DELETE FROM journal_entries WHERE user_id = ?', [userId]);
      for (const j of data.journal) {
        if (j && (j.content || j.title)) await JournalRepository.create(userId, j);
      }
    }

    if (Array.isArray(data.goals)) {
      await db.run('DELETE FROM goals WHERE user_id = ?', [userId]);
      for (const g of data.goals) {
        if (g && g.title) await GoalRepository.create(userId, g);
      }
    }

    if (Array.isArray(data.scoreSnapshots)) {
      for (const snap of data.scoreSnapshots) {
        if (snap && snap.periodKey) await LifeScoreRepository.create(userId, snap);
      }
    }

    if (Array.isArray(data.moodLogs)) {
      for (const m of data.moodLogs) {
        if (m && m.date) await MoodRepository.upsert(userId, m);
      }
    }

    await UserSettingsRepository.update(userId, {
      settings: data.settings,
      unlockedAchievements: data.unlockedAchievements
    });

    return await this.getPartition(userId);
  },

  async reset(userId) {
    await db.run('DELETE FROM habits WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM tasks WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM financial_records WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM calendar_events WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM journal_entries WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM goals WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM lifescore_logs WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM mood_logs WHERE user_id = ?', [userId]);

    await UserSettingsRepository.update(userId, {
      settings: { theme: 'dark' },
      unlockedAchievements: {}
    });

    return await this.getPartition(userId);
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
