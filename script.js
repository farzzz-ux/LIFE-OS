/**
 * LIFE OS — Full-Stack Multi-Page Life Command Center
 * All-Time Overall Life Score Engine, Modern Interactive Calendar & Time-Block Planner,
 * Habits, Tasks, Finances (₹), Reflections & Dual-Layer Persistence.
 */

// Storage & API Configuration
const STORAGE_KEY = 'life_os_state_v6';
const API_BASE = (() => {
  if (typeof window !== 'undefined' && window.location) {
    if ((window.location.protocol === 'http:' || window.location.protocol === 'https:') && (window.location.port === '3000' || !window.location.port)) {
      return window.location.origin;
    }
  }
  return 'http://localhost:3000';
})();

/**
 * Defensive DOM Query Pattern
 * Guards every single DOM query and listener to prevent null pointer exceptions.
 */
const safeListener = (id, event, handler) => {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
};

/**
 * Global Authenticated Fetch Utility
 * Centralizes API requests, automatically includes the JWT token, and handles errors gracefully.
 */
async function apiRequest(endpoint, options = {}) {
  const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('token') : null;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  options.headers = { ...defaultHeaders, ...options.headers };
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const res = await fetch(url, options);
    if (res.status === 401) {
      console.warn('Unauthorized session. Redirecting to login...');
      if (typeof openAuthModal === 'function') openAuthModal();
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    return null;
  }
}

// Global Baseline Sample Dataset Fallback
const getStarterBaseline = () => {
  if (typeof window !== 'undefined' && window.DEFAULT_SAMPLE_DATA) return window.DEFAULT_SAMPLE_DATA;
  if (typeof DEFAULT_SAMPLE_DATA !== 'undefined') return DEFAULT_SAMPLE_DATA;
  if (typeof require !== 'undefined') {
    try { return require('./js/sampleData.js').DEFAULT_SAMPLE_DATA; } catch (e) {}
  }
  return { habits: [], tasks: [], schedule: [], goals: [], transactions: [], journal: [] };
};

// Application State
let appState = {
  habits: [],
  tasks: [],
  transactions: [],
  moodLogs: [],
  schedule: [],
  journal: [],
  goals: [],
  scoreSnapshots: [],
  selectedCalendarDate: getLocalDateString(new Date()),
  calendarViewDate: new Date(),
  calendarMode: 'month', // 'month' or 'agenda'
  soundEnabled: (typeof localStorage !== 'undefined' && localStorage.getItem('life_os_sound') !== null) ? localStorage.getItem('life_os_sound') === 'true' : true,
  theme: 'dark',
  lifeScorePeriod: 'overall', // 'week' | 'month' | 'overall'
  starChartBenchmark: false, // boolean target benchmark overlay
  unlockedAchievements: {} // Map of achievement ID -> { unlockedAt: ISO }
};

let habitCategoryFilter = 'All';
let taskStatusFilter = 'all';
let taskSearchQuery = '';
let journalCategoryFilter = 'All';
let journalSearchQuery = '';
let financeTypeFilter = 'all';
let financeSearchQuery = '';
let goalStatusFilter = 'all';
let goalCategoryFilter = 'all';
let goalSearchQuery = '';
let currentReadingJournalId = null;
let isOnline = true;

// Web Audio API Synthesizer
let audioCtx = null;

function initAudio() {
  if (!audioCtx && typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    } catch (e) {
      audioCtx = null;
    }
  }
}

function playSound(type) {
  if (!appState.soundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'success') {
      const freqNotes = [523.25, 659.25, 783.99]; // C5, E5, G5
      freqNotes.forEach((f, idx) => {
        const subOsc = audioCtx.createOscillator();
        const subGain = audioCtx.createGain();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(f, now + idx * 0.08);
        subGain.gain.setValueAtTime(0.1, now + idx * 0.08);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
        subOsc.connect(subGain);
        subGain.connect(audioCtx.destination);
        subOsc.start(now + idx * 0.08);
        subOsc.stop(now + idx * 0.08 + 0.35);
      });
    } else if (type === 'achievement') {
      const achNotes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 fanfare
      achNotes.forEach((f, idx) => {
        const subOsc = audioCtx.createOscillator();
        const subGain = audioCtx.createGain();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(f, now + idx * 0.1);
        subGain.gain.setValueAtTime(0.14, now + idx * 0.1);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.45);
        subOsc.connect(subGain);
        subGain.connect(audioCtx.destination);
        subOsc.start(now + idx * 0.1);
        subOsc.stop(now + idx * 0.1 + 0.5);
      });
    }
  } catch (err) {
    // Audio context suspended or gesture required
  }
}

/* ==========================================================================
   Theme & Sound Controls
   ========================================================================== */
function applyTheme(theme = 'dark') {
  appState.theme = 'dark';
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('life_os_theme', 'dark');
    }
  } catch (e) {}

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (document.body) {
      document.body.setAttribute('data-theme', 'dark');
    }
    // Refresh Star Chart canvas if present
    if (typeof renderStarChartAnalytics === 'function') {
      try {
        renderStarChartAnalytics();
      } catch (e) {}
    }
  }
}

function toggleSound() {
  appState.soundEnabled = !appState.soundEnabled;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('life_os_sound', appState.soundEnabled ? 'true' : 'false');
    }
  } catch (e) {}
  const soundIcon = document.getElementById('sound-icon');
  const soundLabel = document.getElementById('sound-label');
  if (soundIcon && soundLabel) {
    if (appState.soundEnabled) {
      soundIcon.className = 'fa-solid fa-volume-high';
      soundLabel.textContent = 'Sound On';
    } else {
      soundIcon.className = 'fa-solid fa-volume-xmark';
      soundLabel.textContent = 'Muted';
    }
  }
  if (appState.soundEnabled) {
    playSound('click');
  }
  if (typeof showToast === 'function') {
    showToast(appState.soundEnabled ? '🔊 Sound enabled' : '🔇 Audio muted', 'info');
  }
}

/* ==========================================================================
   Date & Streak Utility Functions
   ========================================================================== */
function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format dates across the entire app: First Date, then Month, then Year (DD-MM-YYYY)
 * or 'text' mode: DD MMM YYYY (e.g. 23 Oct 2026)
 */
function formatAppDate(dateInput, mode = 'numeric') {
  if (!dateInput) return '';
  if (dateInput === 'Today' || dateInput === 'Ongoing' || dateInput === 'Note') return dateInput;

  let day, month, year;
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    day = String(dateInput.getDate()).padStart(2, '0');
    month = String(dateInput.getMonth() + 1).padStart(2, '0');
    year = String(dateInput.getFullYear());
  } else if (typeof dateInput === 'string') {
    const clean = dateInput.trim();
    const parts = clean.split('T')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      year = parts[0];
      month = parts[1].padStart(2, '0');
      day = parts[2].padStart(2, '0');
    } else {
      const d = new Date(clean);
      if (isNaN(d.getTime())) return clean;
      day = String(d.getDate()).padStart(2, '0');
      month = String(d.getMonth() + 1).padStart(2, '0');
      year = String(d.getFullYear());
    }
  } else {
    return String(dateInput);
  }

  if (mode === 'text') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(month, 10) - 1;
    const mStr = (mIdx >= 0 && mIdx < 12) ? months[mIdx] : month;
    return `${parseInt(day, 10)} ${mStr} ${year}`;
  }

  return `${day}-${month}-${year}`;
}

/**
 * Format currency in Indian Numbering System without trailing .00 for whole numbers
 */
function formatINR(val, includeSign = false) {
  const num = Number(val) || 0;
  const absVal = Math.abs(num);
  const isWhole = absVal % 1 === 0;
  const formatted = absVal.toLocaleString('en-IN', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2
  });
  if (includeSign) {
    if (num > 0) return '+₹' + formatted;
    if (num < 0) return '-₹' + formatted;
    return '₹' + formatted;
  }
  return '₹' + formatted;
}

function getValidCalendarDate() {
  if (appState.calendarViewDate instanceof Date && !isNaN(appState.calendarViewDate.getTime())) {
    return appState.calendarViewDate;
  }
  if (typeof appState.calendarViewDate === 'string' || typeof appState.calendarViewDate === 'number') {
    const d = new Date(appState.calendarViewDate);
    if (!isNaN(d.getTime())) {
      appState.calendarViewDate = d;
      return d;
    }
  }
  appState.calendarViewDate = new Date();
  return appState.calendarViewDate;
}

function shiftDate(date, days) {
  const res = new Date(date);
  res.setDate(res.getDate() + days);
  return res;
}

/**
 * Calculates strict Monday to Sunday weekly boundaries for any given reference date.
 */
function calculateWeeklyBounds(refDate = new Date()) {
  const d = new Date(refDate);
  const day = d.getDay();
  // In JS getDay(): 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const startDateStr = getLocalDateString(monday);
  const endDateStr = getLocalDateString(sunday);

  // Compute ISO-8601 week number
  const target = new Date(monday.valueOf());
  const dayNr = (monday.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
  const periodKey = `${monday.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

  return {
    startDateStr,
    endDateStr,
    periodKey,
    monday,
    sunday,
    daysInPeriod: 7
  };
}

/**
 * Calculates strict 1st-day to last-day calendar month boundaries for any given reference date.
 */
function calculateMonthlyBounds(refDate = new Date()) {
  const d = new Date(refDate);
  const year = d.getFullYear();
  const month = d.getMonth();

  const firstDay = new Date(year, month, 1, 0, 0, 0, 0);
  const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const startDateStr = getLocalDateString(firstDay);
  const endDateStr = getLocalDateString(lastDay);
  const periodKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  return {
    startDateStr,
    endDateStr,
    periodKey,
    firstDay,
    lastDay,
    daysInPeriod: lastDay.getDate()
  };
}

/**
 * Determines whether a schedule event occurs on a target calendar date.
 * Supports:
 * - Single-date events (event.date === dateStr)
 * - Everyday recurrence (event.recurrence === 'everyday')
 * - Selected days of week recurrence (event.recurrence === 'selected_days' with repeatDays array)
 */
function doesScheduleEventOccurOnDate(event, dateStr) {
  if (!event || !dateStr) return false;

  // 1. Everyday recurrence occurs on any calendar day
  if (event.recurrence === 'everyday' || event.repeat === 'everyday') {
    return true;
  }

  // 2. Direct single date match
  if (event.date === dateStr) return true;

  // 3. Selected days of week recurrence
  if (event.recurrence === 'selected_days' || event.recurrence === 'days' || (Array.isArray(event.repeatDays) && event.repeatDays.length > 0)) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayName = dayNames[d.getDay()];
      const days = (Array.isArray(event.repeatDays) && event.repeatDays.length > 0)
        ? event.repeatDays
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      if (days.includes(dayName)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks whether a schedule block is recorded as completed on a specific target date.
 */
function isScheduleEventCompletedOnDate(event, dateStr) {
  if (!event || !dateStr) return false;
  if (Array.isArray(event.completedDates)) {
    return event.completedDates.includes(dateStr);
  }
  if (event.completed && event.date === dateStr) {
    return true;
  }
  return false;
}

function calculateHabitStreak(completedDates) {
  if (!completedDates || !Array.isArray(completedDates) || completedDates.length === 0) {
    return 0;
  }
  const set = new Set(completedDates);
  const today = new Date();
  const todayStr = getLocalDateString(today);
  const yestStr = getLocalDateString(shiftDate(today, -1));

  let streak = 0;
  let cursor;

  if (set.has(todayStr)) {
    streak = 1;
    cursor = shiftDate(today, -1);
    while (set.has(getLocalDateString(cursor))) {
      streak++;
      cursor = shiftDate(cursor, -1);
    }
  } else if (set.has(yestStr)) {
    streak = 1;
    cursor = shiftDate(today, -2);
    while (set.has(getLocalDateString(cursor))) {
      streak++;
      cursor = shiftDate(cursor, -1);
    }
  }

  return streak;
}

function calculateBestHabitStreak(completedDates) {
  if (!completedDates || completedDates.length === 0) return 0;
  const sorted = Array.from(new Set(completedDates)).sort();
  let max = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const nextExpected = getLocalDateString(shiftDate(prev, 1));
    if (sorted[i] === nextExpected) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 1;
    }
  }
  return max;
}
/**
 * Returns the 7 days of the current calendar week, strictly Monday to Sunday.
 * Day letters: ['M', 'T', 'W', 'T', 'F', 'S', 'S']
 * Guaranteed to align with Life OS weekly scoring and standard calendar week.
 */
function getCurrentWeekDays() {
  const today = new Date();
  const todayStr = getLocalDateString(today);
  const dayOfWeek = today.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
  const distanceToMon = (dayOfWeek + 6) % 7; // Mon -> 0, Tue -> 1, ..., Sun -> 6
  const monday = new Date(today);
  monday.setDate(today.getDate() - distanceToMon);

  const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const days = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = getLocalDateString(d);
    days.push({
      dateStr,
      dayLetter: dayLetters[i],
      dayName: dayNames[i],
      isToday: dateStr === todayStr,
      isFuture: d > today && dateStr !== todayStr
    });
  }
  return days;
}

function getLast7Days() {
  const days = [];
  const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  const todayStr = getLocalDateString(today);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = getLocalDateString(d);
    const dayOfWeek = d.getDay();
    days.push({
      dateStr,
      dayLetter: dayLetters[dayOfWeek],
      dayName: dayNames[dayOfWeek],
      isToday: dateStr === todayStr,
      isFuture: false
    });
  }
  return days;
}

function formatHourLabel(hour) {
  const h = Number(hour);
  const timeFormat = (typeof localStorage !== 'undefined' && localStorage.getItem('life_os_time_format')) || '12h';
  if (timeFormat === '24h') {
    return `${String(h).padStart(2, '0')}:00`;
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayHour).padStart(2, '0')}:00 ${period}`;
}

function escapeHtml(str) {
  if (!str) return '';
  const clean = String(str).replace(/&amp;/g, '&');
  return clean.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

/**
 * Universal Debounce Utility
 * Delays invoking fn until after wait milliseconds have elapsed since the last call.
 */
function debounce(fn, wait = 200) {
  let timeoutId = null;
  return function(...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, wait);
  };
}

/* ==========================================================================
   Toast Notification System
   ========================================================================== */
function showToast(message, type = 'info', title = null) {
  if (typeof document === 'undefined') return;
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  
  if (type === 'achievement') {
    toast.className = 'toast toast-achievement';
    toast.innerHTML = `
      <div class="achievement-toast-icon">
        <i class="fa-solid fa-trophy"></i>
      </div>
      <div class="achievement-toast-content">
        <span class="achievement-toast-tag">ACHIEVEMENT UNLOCKED</span>
        <span class="achievement-toast-title">${escapeHtml(title || 'Milestone Reached!')}</span>
        <span class="achievement-toast-desc">${escapeHtml(message)}</span>
      </div>
    `;
  } else {
    toast.className = `toast toast-${type}`;
    let icon = 'fa-circle-info text-cyan';
    if (type === 'success') icon = 'fa-circle-check text-emerald';
    if (type === 'warning') icon = 'fa-triangle-exclamation text-amber';
    if (type === 'error') icon = 'fa-circle-exclamation text-rose';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <div class="toast-text-wrap">
        ${title ? `<strong class="toast-title">${escapeHtml(title)}</strong>` : ''}
        <span>${escapeHtml(message)}</span>
      </div>
    `;
  }

  container.appendChild(toast);
  const displayDuration = type === 'achievement' ? 5000 : 3200;
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  }, displayDuration);
}

/* ==========================================================================
   Full-Stack Persistence & Sync
   ========================================================================== */
// Authentication & Cloud Sync State Helpers
function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('life_os_auth_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {}
  return headers;
}

function getCurrentUser() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('life_os_auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function updateSyncStatus(online, message = null) {
  if (typeof document === 'undefined') return;
  const indicator = document.getElementById('sync-indicator');
  const label = document.getElementById('sync-label');
  const sub = document.getElementById('sync-sub');
  const avatar = document.getElementById('sidebar-account-avatar');

  if (!indicator || !label || !sub) return;

  const user = getCurrentUser();

  if (avatar) {
    if (user) {
      avatar.innerHTML = '<i class="fa-solid fa-user-check text-emerald"></i>';
    } else {
      avatar.innerHTML = '<i class="fa-solid fa-circle-user text-cyan"></i>';
    }
  }

  if (online) {
    indicator.className = 'sync-indicator online';
    indicator.title = 'Connected';
    if (user) {
      const displayName = user.name || (user.email ? user.email.split('@')[0] : 'Commander');
      label.textContent = displayName;
      sub.textContent = message || (user.email || 'Cloud Active');
    } else {
      label.textContent = 'Account';
      sub.textContent = message || 'Local Workspace • Sign In';
    }
  } else {
    indicator.className = 'sync-indicator offline';
    indicator.title = 'Offline';
    if (user) {
      const displayName = user.name || (user.email ? user.email.split('@')[0] : 'Commander');
      label.textContent = displayName;
      sub.textContent = message || 'Offline • Local Cache';
    } else {
      label.textContent = 'Account';
      sub.textContent = message || 'Local Storage Only';
    }
  }

  updateAuthNavButton();
}

function updateAuthNavButton() {
  if (typeof document === 'undefined') return;
  const user = getCurrentUser();
  const labels = document.querySelectorAll('#nav-user-label');
  const btns = document.querySelectorAll('#open-auth-modal-btn');

  btns.forEach(btn => {
    const icon = btn.querySelector('i');
    if (user) {
      btn.classList.add('logged-in');
      const rawName = (user.name || (user.email ? user.email.split('@')[0] : 'Commander')).trim();
      // Enforce max 6 letters strictly to forcefully fit in account button
      const _compatCheck = rawName.length > 8 ? rawName.slice(0, 7) + '…' : rawName;
      const shortName = rawName.slice(0, 6);
      labels.forEach(l => { l.textContent = shortName; });
      btn.title = `Signed in as ${user.email} (${rawName})`;
      if (icon) icon.className = 'fa-solid fa-cloud text-emerald';
    } else {
      btn.classList.remove('logged-in');
      labels.forEach(l => { l.textContent = 'Account'; });
      btn.title = 'Account & Cloud Sync';
      if (icon) icon.className = 'fa-solid fa-circle-user text-cyan';
    }
  });

  const sidebarAvatar = document.getElementById('sidebar-account-avatar');
  const sidebarLabel = document.getElementById('sync-label');
  const sidebarSub = document.getElementById('sync-sub');
  if (sidebarAvatar) {
    if (user) {
      sidebarAvatar.innerHTML = '<i class="fa-solid fa-user-check text-emerald"></i>';
    } else {
      sidebarAvatar.innerHTML = '<i class="fa-solid fa-circle-user text-cyan"></i>';
    }
  }
  if (sidebarLabel) {
    if (user) {
      sidebarLabel.textContent = user.name || (user.email ? user.email.split('@')[0] : 'Commander');
    } else {
      sidebarLabel.textContent = 'Account';
    }
  }
  if (sidebarSub) {
    if (user) {
      if (!sidebarSub.textContent || sidebarSub.textContent.includes('Local Workspace') || sidebarSub.textContent.includes('Sign In')) {
        sidebarSub.textContent = user.email || 'Cloud Active';
      }
    } else {
      if (!sidebarSub.textContent || sidebarSub.textContent.includes('Cloud Active') || sidebarSub.textContent.includes('@')) {
        sidebarSub.textContent = 'Local Workspace • Sign In';
      }
    }
  }
}

function saveStateLocally() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (err) {
    console.error('LocalStorage save error:', err);
  }
}

async function syncWithBackend() {
  saveStateLocally();
  try {
    const headers = getAuthHeaders();
    const isAuth = Boolean(headers['Authorization']);
    const endpoint = isAuth ? `${API_BASE}/api/user/data` : `${API_BASE}/api/sync`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        habits: appState.habits,
        tasks: appState.tasks,
        transactions: appState.transactions,
        moodLogs: appState.moodLogs,
        schedule: appState.schedule,
        journal: appState.journal,
        goals: appState.goals,
        scoreSnapshots: appState.scoreSnapshots || [],
        unlockedAchievements: appState.unlockedAchievements || {},
        settings: { theme: appState.theme }
      })
    });

    if (res.ok) {
      const user = getCurrentUser();
      updateSyncStatus(true, user ? 'cloud synchronized' : 'db.json synchronized');
      return true;
    } else {
      if (res.status === 401 && isAuth) {
        logoutUser();
        showToast('Your session has expired. Please sign in again.', 'warning');
        if (typeof ensureAuthModal === 'function' && typeof openAuthModal === 'function') {
          ensureAuthModal();
          openAuthModal('login');
        }
      }
      updateSyncStatus(false, 'Saved to localStorage');
      return true;
    }
  } catch (err) {
    // Network offline fallback: keep local changes active
    updateSyncStatus(false, 'Saved to localStorage (offline)');
    return true;
  }
}

async function saveFullStateToServer() {
  return await syncWithBackend();
}

/**
 * Optimistic UI Mutation Pipeline:
 * 1. Takes an immutable deep snapshot of appState.
 * 2. Executes the local mutation immediately, re-rendering the DOM and saving locally (0ms perceived latency).
 * 3. Asynchronously sends the update to the backend.
 * 4. If the server call rejects, gracefully rolls back the local state to the snapshot,
 *    re-renders the UI, and alerts the user with an actionable toast notification.
 */
async function optimisticMutation(actionName, mutateFn, remoteApiCall) {
  const snapshot = JSON.parse(JSON.stringify(appState));

  try {
    // Immediate local mutation & UI update
    mutateFn();
    saveStateLocally();
    renderPage();

    // Asynchronous backend persistence
    let success = true;
    if (typeof remoteApiCall === 'function') {
      const res = await remoteApiCall();
      success = res !== false;
    } else {
      success = await syncWithBackend();
    }

    if (!success) {
      throw new Error(`Backend rejected ${actionName}`);
    }
    return true;
  } catch (err) {
    console.error(`Optimistic update failed for [${actionName}]. Rolling back:`, err);
    // Rollback to pristine snapshot
    appState = snapshot;
    saveStateLocally();
    renderPage();
    showToast(`Failed to save: ${actionName}. Changes reverted.`, 'warning');
    updateSyncStatus(false, 'Sync failed — rolled back');
    return false;
  }
}

async function loadFullState() {
  // 1. Instant load from localStorage
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      appState = { ...appState, ...parsed };
      if (!Array.isArray(appState.schedule)) appState.schedule = [];
      if (!Array.isArray(appState.journal)) appState.journal = [];
      getValidCalendarDate();
      renderPage();
    } catch (e) {
      console.error('Error parsing localStorage:', e);
    }
  }

  // 2. Fetch latest from Backend
  try {
    const headers = getAuthHeaders();
    const isAuth = Boolean(headers['Authorization']);
    const endpoint = isAuth ? `${API_BASE}/api/user/data` : `${API_BASE}/api/data`;

    const res = await fetch(endpoint, { headers });
    if (res.ok) {
      const serverData = await res.json();
      if (serverData && Array.isArray(serverData.habits)) {
        appState.habits = serverData.habits;
        appState.tasks = serverData.tasks || [];
        appState.transactions = serverData.transactions || [];
        appState.moodLogs = serverData.moodLogs || [];
        appState.schedule = Array.isArray(serverData.schedule) ? serverData.schedule : [];
        appState.journal = Array.isArray(serverData.journal) ? serverData.journal : [];
        appState.goals = Array.isArray(serverData.goals) ? serverData.goals : (appState.goals || []);
        appState.scoreSnapshots = Array.isArray(serverData.scoreSnapshots) ? serverData.scoreSnapshots : (appState.scoreSnapshots || []);
        if (serverData.unlockedAchievements && typeof serverData.unlockedAchievements === 'object') {
          appState.unlockedAchievements = serverData.unlockedAchievements;
        }
        if (serverData.settings && serverData.settings.theme) {
          applyTheme(serverData.settings.theme);
        }
        getValidCalendarDate();
        saveStateLocally();
        const user = getCurrentUser();
        updateSyncStatus(true, user ? 'cloud up to date' : 'db.json up to date');
        renderPage();
        evaluateAchievements(true);
        checkAndPromptDailyMood();
        return;
      }
    }
    updateSyncStatus(false);
  } catch (err) {
    updateSyncStatus(false, 'Running locally');
  }

  // Clean baseline data guarantees
  if (!Array.isArray(appState.habits)) appState.habits = [];
  if (!Array.isArray(appState.tasks)) appState.tasks = [];
  if (!Array.isArray(appState.goals)) appState.goals = [];
  if (!Array.isArray(appState.transactions)) appState.transactions = [];
  if (!Array.isArray(appState.schedule)) appState.schedule = [];
  if (!Array.isArray(appState.journal)) appState.journal = [];
  if (!Array.isArray(appState.moodLogs)) appState.moodLogs = [];
  if (!Array.isArray(appState.scoreSnapshots)) appState.scoreSnapshots = [];
  if (!appState.unlockedAchievements || typeof appState.unlockedAchievements !== 'object') {
    appState.unlockedAchievements = {};
  }

  // Populate rich starter baseline if first launch and not deliberately wiped
  const isWiped = typeof localStorage !== 'undefined' && localStorage.getItem('life_os_wiped') === 'true';
  if (!cached && !isWiped && appState.habits.length === 0 && appState.tasks.length === 0) {
    const source = (typeof DEFAULT_SAMPLE_DATA !== 'undefined' ? DEFAULT_SAMPLE_DATA : (typeof DEFAULT_STATE !== 'undefined' ? DEFAULT_STATE : getStarterBaseline()));
    if (source && Array.isArray(source.habits) && source.habits.length > 0) {
      appState.habits = JSON.parse(JSON.stringify(source.habits));
      appState.tasks = JSON.parse(JSON.stringify(source.tasks || []));
      appState.transactions = JSON.parse(JSON.stringify(source.transactions || []));
      appState.schedule = JSON.parse(JSON.stringify(source.schedule || []));
      appState.goals = JSON.parse(JSON.stringify(source.goals || []));
      appState.journal = JSON.parse(JSON.stringify(source.journal || []));
      if (source.unlockedAchievements) {
        appState.unlockedAchievements = JSON.parse(JSON.stringify(source.unlockedAchievements));
      }
    }
  }

  saveStateLocally();
  renderPage();
  evaluateAchievements(true);
  checkAndPromptDailyMood();
}

/* ==========================================================================
   LIFE SCORE MATHEMATICAL ENGINE (5-Pillar Architecture)
   Exact Weights:
   - Habits: 25% (0.25)
   - Tasks: 25% (0.25)
   - Finances: 20% (0.20)
   - Goals: 15% (0.15)
   - Schedule: 15% (0.15)
   Total = 100%
   Life Score = round(Habits * 0.25 + Tasks * 0.25 + Finances * 0.20 + Goals * 0.15 + Schedule * 0.15)
   ========================================================================== */
function calculateLifeScore(timeframe = (typeof appState !== 'undefined' ? (appState.lifeScorePeriod || 'overall') : 'overall'), refDate = new Date(), customState = null) {
  const state = customState || (typeof appState !== 'undefined' ? appState : {
    habits: [], tasks: [], transactions: [], schedule: [], goals: [], scoreSnapshots: []
  });

  const habits = Array.isArray(state.habits) ? state.habits : [];
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const transactions = Array.isArray(state.transactions) ? state.transactions : [];
  const schedule = Array.isArray(state.schedule) ? state.schedule : [];
  const goals = Array.isArray(state.goals) ? state.goals : [];
  const scoreSnapshots = Array.isArray(state.scoreSnapshots) ? state.scoreSnapshots : [];

  const ref = new Date(refDate);
  const today = new Date();
  const todayStr = getLocalDateString(today);

  let startDateStr = null;
  let endDateStr = null;
  let periodKey = null;
  let timeframeLabel = 'ALL-TIME';
  let title = 'Overall Lifetime Performance';
  let isBaseline = false;
  let unavailableHistory = false;
  let activeDays = 1;

  const refStr = getLocalDateString(ref);

  if (timeframe === 'week') {
    const bounds = calculateWeeklyBounds(ref);
    startDateStr = bounds.startDateStr;
    endDateStr = bounds.endDateStr;
    periodKey = bounds.periodKey;
    timeframeLabel = 'THIS WEEK';
    title = 'Weekly Life Score Performance';

    if (refStr >= startDateStr && refStr <= endDateStr) {
      const dayIdx = (ref.getDay() + 6) % 7; // Mon=0 .. Sun=6
      activeDays = Math.max(1, dayIdx + 1);
    } else if (refStr < startDateStr) {
      activeDays = 1;
    } else {
      activeDays = 7;
    }
  } else if (timeframe === 'month') {
    const bounds = calculateMonthlyBounds(ref);
    startDateStr = bounds.startDateStr;
    endDateStr = bounds.endDateStr;
    periodKey = bounds.periodKey;
    timeframeLabel = 'THIS MONTH';
    title = 'Monthly Life Score Performance';

    if (refStr >= startDateStr && refStr <= endDateStr) {
      activeDays = Math.max(1, ref.getDate());
    } else if (refStr < startDateStr) {
      activeDays = 1;
    } else {
      activeDays = bounds.daysInPeriod;
    }
  } else {
    timeframe = 'overall';
    timeframeLabel = 'ALL-TIME';
    title = 'Overall Lifetime Performance';
    periodKey = 'all-time';
    if (scoreSnapshots.length === 0) {
      isBaseline = true;
      unavailableHistory = true;
    }
  }

  // 1. HABITS PILLAR (25% Weight: 0 - 100 score)
  let habitCompletionsInPeriod = 0;
  let totalHabitCompletionsAllTime = 0;
  let maxStreakAllTime = 0;
  let currentStreakMax = 0;

  habits.forEach(h => {
    const dates = Array.isArray(h.completedDates) ? h.completedDates : [];
    totalHabitCompletionsAllTime += dates.length;
    const bStreak = typeof calculateBestHabitStreak === 'function' ? calculateBestHabitStreak(dates) : dates.length;
    if (bStreak > maxStreakAllTime) maxStreakAllTime = bStreak;
    const cStreak = typeof calculateHabitStreak === 'function' ? calculateHabitStreak(dates) : dates.length;
    if (cStreak > currentStreakMax) currentStreakMax = cStreak;

    if (timeframe === 'overall') {
      habitCompletionsInPeriod += dates.length;
    } else {
      habitCompletionsInPeriod += dates.filter(d => d >= startDateStr && d <= endDateStr).length;
    }
  });

  let habitScore = 0;
  let habitDetail = '';
  let habitPillarTitle = timeframe === 'week' ? '🎯 Weekly Habits' : timeframe === 'month' ? '🎯 Monthly Habits' : '🎯 Lifetime Habits';

  if (habits.length === 0 || habitCompletionsInPeriod === 0) {
    habitScore = 0;
    habitDetail = habits.length === 0 ? 'No habits logged yet' : '0 check-ins in period';
  } else {
    const expectedCheckIns = habits.length * (timeframe === 'overall' ? Math.max(14, habits.length * 7) : activeDays);
    const basePct = Math.min(100, Math.round((habitCompletionsInPeriod / Math.max(1, expectedCheckIns)) * 100));
    // Capped streak bonus: up to 15 points
    const streakBonus = Math.min(15, currentStreakMax * 2);
    habitScore = Math.min(100, Math.max(0, Math.round(basePct + streakBonus)));
    habitDetail = `${habitCompletionsInPeriod}/${expectedCheckIns} check-ins (${currentStreakMax}d streak)`;
  }
  const habitPct = habitScore;
  const habitPillarScore = Math.round((habitScore * 0.25) * 10) / 10;

  // 2. TASK EXECUTION PILLAR (25% Weight: 0 - 100 score)
  let taskPillarTitle = timeframe === 'week' ? '⚡ Weekly Tasks' : timeframe === 'month' ? '⚡ Monthly Tasks' : '⚡ All-Time Tasks';

  const eligibleTasks = tasks.filter(t => {
    if (timeframe === 'overall') return true;
    if (t.createdAt) {
      const createdDate = t.createdAt.split('T')[0];
      if (createdDate > endDateStr) return false;
    }
    if (t.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)) {
      if (t.dueDate > endDateStr) return false;
    }
    return true;
  });

  let completedTasksInPeriod = 0;
  eligibleTasks.forEach(t => {
    if (t.completedAt) {
      const cDate = t.completedAt.split('T')[0];
      if (timeframe === 'overall' || (cDate >= startDateStr && cDate <= endDateStr)) {
        completedTasksInPeriod++;
      }
    } else if (t.completed) {
      if (timeframe === 'overall' || (refStr >= startDateStr && refStr <= endDateStr)) {
        completedTasksInPeriod++;
      }
    }
  });

  let taskScore = 0;
  let taskDetail = '';
  if (eligibleTasks.length === 0 || completedTasksInPeriod === 0) {
    taskScore = 0;
    taskDetail = eligibleTasks.length === 0 ? 'No eligible tasks' : '0 tasks closed';
  } else {
    taskScore = Math.min(100, Math.max(0, Math.round((completedTasksInPeriod / eligibleTasks.length) * 100)));
    taskDetail = `${completedTasksInPeriod}/${eligibleTasks.length} tasks closed`;
  }
  const taskPct = taskScore;
  const taskPillarScore = Math.round((taskScore * 0.25) * 10) / 10;

  // 3. FINANCIAL HEALTH PILLAR (20% Weight: 0 - 100 score)
  let financePillarTitle = timeframe === 'week' ? '💰 Weekly Budget' : timeframe === 'month' ? '💰 Monthly Budget' : '💰 Financial Health';
  let totalIncome = 0;
  let totalExpense = 0;
  let txCountInWindow = 0;

  transactions.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    const txDate = tx.date || '';
    if (timeframe === 'overall' || (txDate >= startDateStr && txDate <= endDateStr)) {
      txCountInWindow++;
      if (tx.type === 'income') totalIncome += amt;
      else totalExpense += amt;
    }
  });

  let financeScore = 0;
  let financeDetail = '';
  const netBalance = totalIncome - totalExpense;

  if (txCountInWindow === 0 || (totalIncome === 0 && totalExpense === 0)) {
    financeScore = 0;
    financeDetail = 'No transactions recorded';
  } else if (totalIncome > 0) {
    const savingsRate = netBalance / totalIncome;
    if (savingsRate >= 0.50) {
      financeScore = Math.min(100, 85 + Math.round(((savingsRate - 0.50) / 0.50) * 15));
    } else if (savingsRate >= 0.20) {
      financeScore = Math.min(85, 70 + Math.round(((savingsRate - 0.20) / 0.30) * 15));
    } else if (savingsRate >= 0.00) {
      financeScore = Math.min(70, 50 + Math.round((savingsRate / 0.20) * 20));
    } else {
      const deficitRatio = (totalExpense - totalIncome) / totalIncome;
      financeScore = Math.max(5, Math.round(50 - Math.min(45, deficitRatio * 25)));
    }
    const netSign = netBalance >= 0 ? '+' : '';
    financeDetail = `₹${netSign}${Math.round(netBalance).toLocaleString('en-IN')} net (${Math.round(savingsRate * 100)}% saved)`;
  } else {
    financeScore = Math.max(10, Math.round(40 - Math.min(30, totalExpense / 1000)));
    financeDetail = `-₹${Math.round(totalExpense).toLocaleString('en-IN')} expenses (no income)`;
  }
  const financePct = financeScore;
  const financePillarScore = Math.round((financeScore * 0.20) * 10) / 10;

  // 4. STRATEGIC GOALS VELOCITY (15% Weight: 0 - 100 score)
  let goalScore = 0;
  let goalDetail = '';
  const completedGoals = goals.filter(g => g.status === 'completed' || Number(g.progress) >= 100).length;

  if (goals.length === 0) {
    goalScore = 0;
    goalDetail = 'No goals defined';
  } else if (timeframe !== 'overall' && refStr > endDateStr) {
    const matchingSnapshot = scoreSnapshots.find(s => s.periodKey === periodKey);
    if (matchingSnapshot && matchingSnapshot.scores && typeof matchingSnapshot.scores.goals === 'number') {
      goalScore = matchingSnapshot.scores.goals;
      goalDetail = `Recorded snapshot: ${goalScore}%`;
    } else {
      goalScore = 0;
      goalDetail = 'Historical progress unrecorded';
      unavailableHistory = true;
    }
  } else {
    const sumProgress = goals.reduce((acc, g) => acc + (Number(g.progress) || 0), 0);
    if (sumProgress === 0) {
      goalScore = 0;
      goalDetail = `0/${goals.length} completed (0% avg)`;
    } else {
      goalScore = Math.min(100, Math.max(0, Math.round(sumProgress / goals.length)));
      goalDetail = `${completedGoals}/${goals.length} completed (${goalScore}% avg)`;
    }
  }
  const goalPct = goalScore;
  const goalPillarScore = Math.round((goalScore * 0.15) * 10) / 10;

  // 5. SCHEDULE & FOCUS DIMENSION (15% Weight: 0 - 100 score)
  let totalEligibleBlocks = 0;
  let completedScheduleBlocks = 0;

  if (timeframe === 'overall') {
    schedule.forEach(s => {
      totalEligibleBlocks++;
      if (Array.isArray(s.completedDates) && s.completedDates.length > 0) {
        completedScheduleBlocks++;
      } else if (s.completed) {
        completedScheduleBlocks++;
      }
    });
  } else {
    let checkStart = startDateStr;
    let checkEnd = endDateStr;
    if (refStr < checkEnd) checkEnd = refStr;

    const sDateObj = new Date(startDateStr);
    const eDateObj = new Date(checkEnd);
    for (let cur = new Date(sDateObj); cur <= eDateObj; cur.setDate(cur.getDate() + 1)) {
      const dStr = getLocalDateString(cur);
      schedule.forEach(s => {
        if (doesScheduleEventOccurOnDate(s, dStr)) {
          totalEligibleBlocks++;
          if (isScheduleEventCompletedOnDate(s, dStr)) {
            completedScheduleBlocks++;
          }
        }
      });
    }
  }

  let scheduleScore = 0;
  let scheduleDetail = '';
  if (totalEligibleBlocks === 0 || completedScheduleBlocks === 0) {
    scheduleScore = 0;
    scheduleDetail = totalEligibleBlocks === 0 ? 'No scheduled blocks' : '0 blocks completed';
  } else {
    scheduleScore = Math.min(100, Math.max(0, Math.round((completedScheduleBlocks / totalEligibleBlocks) * 100)));
    scheduleDetail = `${completedScheduleBlocks}/${totalEligibleBlocks} blocks completed (${scheduleScore}%)`;
  }
  const schedulePct = scheduleScore;
  const schedulePillarScore = Math.round((scheduleScore * 0.15) * 10) / 10;

  // TOTAL 5-PILLAR LIFE SCORE (Formula: H*0.25 + T*0.25 + F*0.20 + G*0.15 + S*0.15)
  let totalScore = 0;
  if (timeframe === 'overall' && scoreSnapshots.length > 0) {
    const snapshotTotals = scoreSnapshots.map(s => Number(s.scores?.total || 0));
    const currentBaselineTotal = Math.round(
      habitScore * 0.25 +
      taskScore * 0.25 +
      financeScore * 0.20 +
      goalScore * 0.15 +
      scheduleScore * 0.15
    );
    const allTotals = [...snapshotTotals, currentBaselineTotal];
    const avgScore = allTotals.reduce((a, b) => a + b, 0) / allTotals.length;
    totalScore = Math.min(100, Math.max(0, Math.round(avgScore)));
  } else {
    totalScore = Math.min(100, Math.max(0, Math.round(
      habitScore * 0.25 +
      taskScore * 0.25 +
      financeScore * 0.20 +
      goalScore * 0.15 +
      scheduleScore * 0.15
    )));
  }

  // TIER EVALUATION & DYNAMIC COACHING
  let tierName = 'Building Momentum 🚀';
  let tierDesc = '';

  if (totalScore >= 90) {
    tierName = timeframe === 'week' ? 'Weekly Flow Master ⚡' : timeframe === 'month' ? 'Monthly Titan 👑' : 'Lifetime Flow Master 👑';
    tierDesc = 'Elite performance across habits, task execution, disciplined finances, goals, and schedule focus.';
  } else if (totalScore >= 75) {
    tierName = timeframe === 'week' ? 'High Weekly Output 🔥' : timeframe === 'month' ? 'Monthly Achiever 🌟' : 'High Achiever 🌟';
    tierDesc = 'Strong consistency. Solid routines, positive financial surplus, and steady milestone completion.';
  } else if (totalScore >= 58) {
    tierName = 'Consistent Rhythm 📈';
    tierDesc = 'Good balanced progress. Key milestones and daily routines tracking steadily.';
  } else if (totalScore >= 40) {
    tierName = 'Building Foundations 🌱';
    tierDesc = 'Foundational pacing. Habits, tasks, and schedule blocks are in progress.';
  } else {
    tierName = totalScore === 0 ? 'Baseline Horizon ✨' : 'Fresh Cycle 🌱';
    tierDesc = totalScore === 0 
      ? 'No recorded progress in this period. Start daily habits, tasks, or budget logging to score.'
      : 'Initial activity tracked. Keep executing daily commitments to elevate your score.';
  }

  // 5 DIMENSIONS FOR STAR CHART (5-Axis Pentagon Geometry)
  const dimensions = [
    {
      id: 'habits',
      name: 'Habits & Routine',
      icon: '🎯',
      color: '#10b981',
      score: habitPct,
      rawValue: habitDetail,
      tip: 'Build an unbroken daily streak on your anchor morning habit.'
    },
    {
      id: 'tasks',
      name: 'Task Execution',
      icon: '⚡',
      color: '#06b6d4',
      score: taskPct,
      rawValue: taskDetail,
      tip: 'Execute high-priority commitments first to drive maximum progress.'
    },
    {
      id: 'finances',
      name: 'Financial Health',
      icon: '💰',
      color: '#f59e0b',
      score: financePct,
      rawValue: financeDetail,
      tip: 'Maintain a 20%+ savings surplus and track all daily outflow.'
    },
    {
      id: 'focus',
      name: 'Time & Schedule',
      icon: '⏰',
      color: '#8b5cf6',
      score: schedulePct,
      rawValue: scheduleDetail,
      tip: 'Complete your planned focus blocks in the interactive calendar.'
    },
    {
      id: 'goals',
      name: 'Strategic Goals',
      icon: '🎯',
      color: '#a855f7',
      score: goalPct,
      rawValue: goalDetail,
      tip: 'Advance key milestones on your active long-term goals.'
    }
  ];

  // STAR RATING (0.0 to 5.0)
  const avgDimensionScore = dimensions.reduce((acc, d) => acc + d.score, 0) / dimensions.length;
  const starRatingNum = (avgDimensionScore / 20).toFixed(1);
  let starRatingStars = '★★★☆☆';
  const rNum = parseFloat(starRatingNum);
  if (rNum >= 4.7) starRatingStars = '★★★★★';
  else if (rNum >= 4.0) starRatingStars = '★★★★☆';
  else if (rNum >= 3.0) starRatingStars = '★★★☆☆';
  else if (rNum >= 2.0) starRatingStars = '★★☆☆☆';
  else starRatingStars = '★☆☆☆☆';

  // HARMONY INDEX (0 to 100%)
  const variance = dimensions.reduce((acc, d) => acc + Math.pow(d.score - avgDimensionScore, 2), 0) / dimensions.length;
  const stdDev = Math.sqrt(variance);
  const harmonyScore = avgDimensionScore === 0 ? 0 : Math.max(15, Math.min(100, Math.round(100 - (stdDev * 1.5))));
  let harmonyEvaluation = 'Harmonious equilibrium across all 5 core pillars';
  let harmonyBadge = 'Well-Balanced ⚖️';
  if (harmonyScore >= 88) {
    harmonyEvaluation = 'Exceptional equilibrium. All life dimensions are flourishing together.';
    harmonyBadge = 'Master Harmony 👑';
  } else if (harmonyScore >= 72) {
    harmonyEvaluation = 'Strong steady balance. Most areas are aligned with healthy output.';
    harmonyBadge = 'Well-Balanced ⚖️';
  } else if (harmonyScore >= 52) {
    harmonyEvaluation = 'Moderate asymmetry. Growth is concentrated in specific pillars.';
    harmonyBadge = 'Developing Balance 🌟';
  } else {
    harmonyEvaluation = 'Lopsided distribution. Focus on underperforming dimensions to restore balance.';
    harmonyBadge = 'Imbalance Warning ⚠️';
  }

  // SUPERPOWER & GROWTH FOCUS
  const sortedDims = [...dimensions].sort((a, b) => b.score - a.score);
  const superpower = {
    name: sortedDims[0].name,
    score: sortedDims[0].score,
    desc: sortedDims[0].score === 0 ? 'Log your first daily win to ignite momentum.' : 'Your highest anchor driving your current momentum.'
  };
  const growthArea = {
    name: sortedDims[sortedDims.length - 1].name,
    score: sortedDims[sortedDims.length - 1].score,
    desc: sortedDims[sortedDims.length - 1].tip
  };

  const breakdown = {
    habits: { score: habitScore, weighted: habitPillarScore, weight: 25 },
    tasks: { score: taskScore, weighted: taskPillarScore, weight: 25 },
    finances: { score: financeScore, weighted: financePillarScore, weight: 20 },
    goals: { score: goalScore, weighted: goalPillarScore, weight: 15 },
    schedule: { score: scheduleScore, weighted: schedulePillarScore, weight: 15 }
  };

  return {
    totalScore,
    totalAllTimeScore: totalScore,
    timeframe,
    timeframeLabel,
    title,
    periodKey,
    startDateStr,
    endDateStr,
    tierName,
    tierDesc,
    habitPillarScore,
    taskPillarScore,
    financePillarScore,
    schedulePillarScore,
    goalPillarScore,
    habitPct,
    taskPct,
    financePct,
    schedulePct,
    goalPct,
    habitPillarTitle,
    habitDetail,
    taskPillarTitle,
    taskDetail,
    financePillarTitle,
    financeDetail,
    schedulePillarTitle: '⏰ Schedule & Focus',
    scheduleBlocksInWindow: totalEligibleBlocks,
    scheduleDetail,
    completedGoals,
    totalGoals: goals.length,
    goalDetail,
    goalPillarTitle: '🎯 Strategic Goals',
    totalHabitCompletionsAllTime,
    maxStreakAllTime,
    completedTasks: completedTasksInPeriod,
    totalTasks: eligibleTasks.length,
    totalIncome,
    totalExpense,
    breakdown,
    dimensions,
    starRatingNum,
    starRatingStars,
    harmonyScore,
    harmonyEvaluation,
    harmonyBadge,
    superpower,
    growthArea,
    isBaseline,
    unavailableHistory
  };
}

function calculateAllTimeLifeScore() {
  return calculateLifeScore('overall');
}

/**
 * Creates and stores a persistent historical score snapshot for a week or month.
 * Avoids duplicate snapshots for the same periodKey.
 */
async function createScoreSnapshot(periodType = 'week', refDate = new Date(), customState = null) {
  const state = customState || appState;
  const scoreData = calculateLifeScore(periodType, refDate, state);

  if (!Array.isArray(state.scoreSnapshots)) {
    state.scoreSnapshots = [];
  }

  const existing = state.scoreSnapshots.find(s => s.periodKey === scoreData.periodKey);
  if (existing) {
    return { duplicate: true, snapshot: existing };
  }

  const snapshot = {
    id: `snap_${periodType}_${scoreData.periodKey}`,
    periodType,
    periodKey: scoreData.periodKey,
    startDate: scoreData.startDateStr,
    endDate: scoreData.endDateStr,
    calculatedAt: new Date().toISOString(),
    scores: {
      habits: scoreData.habitPct,
      tasks: scoreData.taskPct,
      finances: scoreData.financePct,
      goals: scoreData.goalPct,
      schedule: scoreData.schedulePct,
      total: scoreData.totalScore
    },
    formulaVersion: '2.0-5pillar',
    isBaseline: scoreData.isBaseline
  };

  state.scoreSnapshots.push(snapshot);
  if (typeof saveStateLocally === 'function') saveStateLocally();

  try {
    if (typeof API_BASE !== 'undefined') {
      await fetch(`${API_BASE}/api/scores/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot)
      });
    }
  } catch (err) {
    // Retained locally in state and localStorage
  }

  return { duplicate: false, snapshot };
}

/* ==========================================================================
   ACHIEVEMENTS SYSTEM & PRESTIGE ENGINE
   ========================================================================== */
const ACHIEVEMENTS_LIST = [
  // ==========================================
  // SIMPLE TIER (Entry-level Milestones)
  // ==========================================
  {
    id: 'habit_1',
    category: 'habits',
    difficulty: 'Simple',
    title: 'First Step',
    desc: 'Complete your first habit check-in',
    tier: 'Bronze',
    xp: 50,
    icon: '🌱',
    metric: 'habits_completed',
    target: 1
  },
  {
    id: 'habit_10',
    category: 'habits',
    difficulty: 'Simple',
    title: 'Habit Builder',
    desc: 'Complete 10 habit check-ins',
    tier: 'Bronze',
    xp: 100,
    icon: '🧱',
    metric: 'habits_completed',
    target: 10
  },
  {
    id: 'task_1',
    category: 'tasks',
    difficulty: 'Simple',
    title: 'Mission Begun',
    desc: 'Complete your first task',
    tier: 'Bronze',
    xp: 50,
    icon: '🎯',
    metric: 'tasks_completed',
    target: 1
  },
  {
    id: 'task_10',
    category: 'tasks',
    difficulty: 'Simple',
    title: 'Productivity Pulse',
    desc: 'Complete 10 tasks in your workspace',
    tier: 'Bronze',
    xp: 100,
    icon: '⏱️',
    metric: 'tasks_completed',
    target: 10
  },
  {
    id: 'schedule_1',
    category: 'schedule',
    difficulty: 'Simple',
    title: 'Time Architect',
    desc: 'Schedule your first calendar block',
    tier: 'Bronze',
    xp: 75,
    icon: '📅',
    metric: 'schedule_count',
    target: 1
  },
  {
    id: 'finance_1',
    category: 'finances',
    difficulty: 'Simple',
    title: 'First Ledger Entry',
    desc: 'Log your first income or expense transaction',
    tier: 'Bronze',
    xp: 50,
    icon: '🪙',
    metric: 'transactions_count',
    target: 1
  },
  {
    id: 'journal_1',
    category: 'journal',
    difficulty: 'Simple',
    title: 'Inner Scribe',
    desc: 'Pen your first reflective journal note',
    tier: 'Bronze',
    xp: 50,
    icon: '✍️',
    metric: 'journal_count',
    target: 1
  },

  // ==========================================
  // MEDIUM TIER (Consistency & Routines)
  // ==========================================
  {
    id: 'habit_25',
    category: 'habits',
    difficulty: 'Medium',
    title: 'Consistent Spark',
    desc: 'Complete 25 habit check-ins',
    tier: 'Silver',
    xp: 250,
    icon: '⚡',
    metric: 'habits_completed',
    target: 25
  },
  {
    id: 'habit_50',
    category: 'habits',
    difficulty: 'Medium',
    title: 'Discipline Disciple',
    desc: 'Complete 50 habit check-ins',
    tier: 'Silver',
    xp: 500,
    icon: '⚔️',
    metric: 'habits_completed',
    target: 50
  },
  {
    id: 'streak_7',
    category: 'streaks',
    difficulty: 'Medium',
    title: '7-Day Streak Master',
    desc: 'Maintain a 7-day active habit streak',
    tier: 'Silver',
    xp: 350,
    icon: '🔥',
    metric: 'habit_streak',
    target: 7
  },
  {
    id: 'task_25',
    category: 'tasks',
    difficulty: 'Medium',
    title: 'Execution Specialist',
    desc: 'Complete 25 tasks in your workspace',
    tier: 'Silver',
    xp: 300,
    icon: '🛠️',
    metric: 'tasks_completed',
    target: 25
  },
  {
    id: 'task_50',
    category: 'tasks',
    difficulty: 'Medium',
    title: 'Workflow Warrior',
    desc: 'Complete 50 tasks',
    tier: 'Silver',
    xp: 500,
    icon: '🛡️',
    metric: 'tasks_completed',
    target: 50
  },
  {
    id: 'schedule_everyday',
    category: 'schedule',
    difficulty: 'Medium',
    title: 'Daily Rhythm',
    desc: 'Create an everyday recurring schedule routine',
    tier: 'Gold',
    xp: 500,
    icon: '🔄',
    metric: 'schedule_everyday',
    target: 1
  },
  {
    id: 'finance_25',
    category: 'finances',
    difficulty: 'Medium',
    title: 'Budget Sentinel',
    desc: 'Log 25 transactions in your financial ledger',
    tier: 'Silver',
    xp: 350,
    icon: '💎',
    metric: 'transactions_count',
    target: 25
  },
  {
    id: 'journal_10',
    category: 'journal',
    difficulty: 'Medium',
    title: 'Deep Thinker',
    desc: 'Archive 10 reflective journal entries',
    tier: 'Silver',
    xp: 300,
    icon: '📖',
    metric: 'journal_count',
    target: 10
  },
  {
    id: 'score_70',
    category: 'score',
    difficulty: 'Medium',
    title: 'Thriving Life OS',
    desc: 'Attain a 70%+ overall Life Score',
    tier: 'Gold',
    xp: 750,
    icon: '📈',
    metric: 'life_score',
    target: 70
  },

  // ==========================================
  // HARDER TIER (Epic Lifetime Mastery: 100, 250, 500 Milestones)
  // ==========================================
  {
    id: 'habit_100',
    category: 'habits',
    difficulty: 'Harder',
    title: 'Habit Centurion',
    desc: 'Complete 100 habit check-ins',
    tier: 'Gold',
    xp: 1000,
    icon: '🏅',
    metric: 'habits_completed',
    target: 100
  },
  {
    id: 'habit_250',
    category: 'habits',
    difficulty: 'Harder',
    title: 'Habit Legend',
    desc: 'Complete 250 habit check-ins',
    tier: 'Platinum',
    xp: 2500,
    icon: '🛡️',
    metric: 'habits_completed',
    target: 250
  },
  {
    id: 'habit_500',
    category: 'habits',
    difficulty: 'Harder',
    title: 'Habit Titan',
    desc: 'Complete 500 habit check-ins',
    tier: 'Diamond',
    xp: 5000,
    icon: '👑',
    metric: 'habits_completed',
    target: 500
  },
  {
    id: 'habit_1000',
    category: 'habits',
    difficulty: 'Harder',
    title: 'Millennium Titan',
    desc: 'Complete 1,000 habit check-ins across your lifetime',
    tier: 'Diamond',
    xp: 10000,
    icon: '🏆',
    metric: 'habits_completed',
    target: 1000
  },
  {
    id: 'streak_30',
    category: 'streaks',
    difficulty: 'Harder',
    title: 'Unbreakable Momentum',
    desc: 'Maintain an iron 30-day active habit streak',
    tier: 'Platinum',
    xp: 1500,
    icon: '🚀',
    metric: 'habit_streak',
    target: 30
  },
  {
    id: 'streak_90',
    category: 'streaks',
    difficulty: 'Harder',
    title: 'Titanium Discipline (90 Days)',
    desc: 'Maintain a 90-day unbroken habit streak',
    tier: 'Diamond',
    xp: 5000,
    icon: '⚡',
    metric: 'habit_streak',
    target: 90
  },
  {
    id: 'streak_180',
    category: 'streaks',
    difficulty: 'Harder',
    title: 'Half-Year Immortal (180 Days)',
    desc: 'Maintain an ironclad habit streak for 180 consecutive days',
    tier: 'Diamond',
    xp: 10000,
    icon: '👑',
    metric: 'habit_streak',
    target: 180
  },
  {
    id: 'goal_1',
    category: 'goals',
    difficulty: 'Simple',
    title: 'Visionary Horizon',
    desc: 'Set your first strategic life goal',
    tier: 'Bronze',
    xp: 100,
    icon: '🎯',
    metric: 'goals_created',
    target: 1
  },
  {
    id: 'goal_completed_1',
    category: 'goals',
    difficulty: 'Medium',
    title: 'Summit Reached',
    desc: 'Successfully conquer and achieve a life goal',
    tier: 'Silver',
    xp: 500,
    icon: '🏆',
    metric: 'goals_completed',
    target: 1
  },
  {
    id: 'goal_completed_5',
    category: 'goals',
    difficulty: 'Harder',
    title: 'Ascendant Visionary',
    desc: 'Achieve 5 major strategic life goals',
    tier: 'Diamond',
    xp: 2500,
    icon: '⭐',
    metric: 'goals_completed',
    target: 5
  },
  {
    id: 'task_100',
    category: 'tasks',
    difficulty: 'Harder',
    title: 'Task Centurion',
    desc: 'Complete 100 tasks',
    tier: 'Gold',
    xp: 1000,
    icon: '🎖️',
    metric: 'tasks_completed',
    target: 100
  },
  {
    id: 'task_250',
    category: 'tasks',
    difficulty: 'Harder',
    title: 'Task Commander',
    desc: 'Complete 250 tasks',
    tier: 'Platinum',
    xp: 2500,
    icon: '⭐',
    metric: 'tasks_completed',
    target: 250
  },
  {
    id: 'task_500',
    category: 'tasks',
    difficulty: 'Harder',
    title: 'Grand Taskmaster',
    desc: 'Complete 500 tasks',
    tier: 'Diamond',
    xp: 5000,
    icon: '🌌',
    metric: 'tasks_completed',
    target: 500
  },
  {
    id: 'finance_50',
    category: 'finances',
    difficulty: 'Harder',
    title: 'Financial Sovereign',
    desc: 'Log 50 transactions in your financial ledger',
    tier: 'Platinum',
    xp: 1000,
    icon: '🪙',
    metric: 'transactions_count',
    target: 50
  },
  {
    id: 'finance_100',
    category: 'finances',
    difficulty: 'Harder',
    title: 'Financial Mastermind',
    desc: 'Log 100 transactions in your financial records',
    tier: 'Diamond',
    xp: 2500,
    icon: '💎',
    metric: 'transactions_count',
    target: 100
  },
  {
    id: 'journal_25',
    category: 'journal',
    difficulty: 'Harder',
    title: 'Wisdom Archivist',
    desc: 'Archive 25 reflective journal entries',
    tier: 'Platinum',
    xp: 1000,
    icon: '📚',
    metric: 'journal_count',
    target: 25
  },
  {
    id: 'journal_50',
    category: 'journal',
    difficulty: 'Harder',
    title: 'Grand Chronicler',
    desc: 'Archive 50 reflective journal notes',
    tier: 'Diamond',
    xp: 2500,
    icon: '📜',
    metric: 'journal_count',
    target: 50
  },
  {
    id: 'score_85',
    category: 'score',
    difficulty: 'Harder',
    title: 'Mastery Zone',
    desc: 'Attain an 85%+ overall Life Score',
    tier: 'Platinum',
    xp: 2000,
    icon: '🌟',
    metric: 'life_score',
    target: 85
  },
  {
    id: 'score_95',
    category: 'score',
    difficulty: 'Harder',
    title: 'Apex Human',
    desc: 'Attain a 95%+ overall Life Score',
    tier: 'Diamond',
    xp: 5000,
    icon: '🔱',
    metric: 'life_score',
    target: 95
  }
];

function getHabitTotalCheckIns(state = appState) {
  if (!state || !Array.isArray(state.habits)) return 0;
  return state.habits.reduce((sum, h) => sum + (Array.isArray(h.completedDates) ? h.completedDates.length : 0), 0);
}

function getCompletedTaskCount(state = appState) {
  if (!state || !Array.isArray(state.tasks)) return 0;
  return state.tasks.filter(t => t.completed).length;
}

function getMaxHabitStreak(state = appState) {
  if (!state || !Array.isArray(state.habits) || state.habits.length === 0) return 0;
  let max = 0;
  state.habits.forEach(h => {
    const dates = Array.isArray(h.completedDates) ? h.completedDates : [];
    const s1 = calculateHabitStreak(dates);
    const s2 = calculateBestHabitStreak(dates);
    if (s1 > max) max = s1;
    if (s2 > max) max = s2;
  });
  return max;
}

function getMetricValueForAchievement(ach, state = appState) {
  if (ach.metric === 'habits_completed') return getHabitTotalCheckIns(state);
  if (ach.metric === 'tasks_completed') return getCompletedTaskCount(state);
  if (ach.metric === 'habit_streak') return getMaxHabitStreak(state);
  if (ach.metric === 'schedule_count') return (state.schedule || []).length;
  if (ach.metric === 'schedule_everyday') {
    return (state.schedule || []).some(s => s.recurrence === 'everyday' || s.repeat === 'everyday') ? 1 : 0;
  }
  if (ach.metric === 'transactions_count') return (state.transactions || []).length;
  if (ach.metric === 'journal_count') return (state.journal || []).length;
  if (ach.metric === 'goals_created') return (state.goals || []).length;
  if (ach.metric === 'goals_completed') {
    return (state.goals || []).filter(g => g.status === 'completed' || Number(g.progress) >= 100).length;
  }
  if (ach.metric === 'life_score') {
    try {
      const d = calculateLifeScore('overall');
      return d ? (d.totalScore || d.overallScore || 0) : 0;
    } catch (e) {
      return 0;
    }
  }
  return 0;
}

function evaluateAchievements(silent = false) {
  if (!appState.unlockedAchievements) {
    appState.unlockedAchievements = {};
  }

  let newlyUnlocked = [];

  ACHIEVEMENTS_LIST.forEach(ach => {
    const currentVal = getMetricValueForAchievement(ach, appState);
    if (currentVal >= ach.target && !appState.unlockedAchievements[ach.id]) {
      appState.unlockedAchievements[ach.id] = {
        unlockedAt: new Date().toISOString()
      };
      newlyUnlocked.push(ach);
    }
  });

  if (newlyUnlocked.length > 0) {
    saveStateLocally();
    syncWithBackend();
    updateAchievementsBadge();

    if (!silent) {
      newlyUnlocked.forEach((ach, index) => {
        setTimeout(() => {
          playSound('achievement');
          showToast(ach.desc, 'achievement', `${ach.icon} ${ach.title}`);
        }, index * 1200);
      });
    }
  } else {
    updateAchievementsBadge();
  }
}

/* ==========================================================================
   XP RANK SYSTEM & PRESTIGE TIERS
   ========================================================================== */
const XP_RANKS = [
  { rank: 1, id: 'novice', minXp: 0, maxXp: 499, title: 'Novice Initiate', badge: '🥉', color: '#94a3b8', desc: 'The starting threshold of your conscious life discipline journey.' },
  { rank: 2, id: 'bronze', minXp: 500, maxXp: 1499, title: 'Bronze Achiever', badge: '🥉', color: '#cd7f32', desc: 'Forming positive daily habits and completing core task priorities.' },
  { rank: 3, id: 'silver', minXp: 1500, maxXp: 3499, title: 'Silver Practitioner', badge: '🥈', color: '#94a3b8', desc: 'Consistent day-to-day momentum across habits, schedule, and tasks.' },
  { rank: 4, id: 'gold', minXp: 3500, maxXp: 6999, title: 'Gold Virtuoso', badge: '🥇', color: '#f59e0b', desc: 'True mastery over routines, time-blocking focus, and cash flow.' },
  { rank: 5, id: 'platinum', minXp: 7000, maxXp: 11999, title: 'Platinum Vanguard', badge: '💠', color: '#38bdf8', desc: 'Advanced life optimizer operating with relentless clarity and drive.' },
  { rank: 6, id: 'diamond', minXp: 12000, maxXp: 19999, title: 'Diamond Paragon', badge: '💎', color: '#a855f7', desc: 'Resilient and unwavering. Long habit streaks and peak productivity.' },
  { rank: 7, id: 'master', minXp: 20000, maxXp: 34999, title: 'Master Strategist', badge: '🔮', color: '#ec4899', desc: 'Exceptional executive function and sustained multi-month momentum.' },
  { rank: 8, id: 'grandmaster', minXp: 35000, maxXp: 49999, title: 'Grandmaster Titan', badge: '👑', color: '#eab308', desc: 'Top 1% discipline. Conquering major half-year milestones.' },
  { rank: 9, id: 'mythic', minXp: 50000, maxXp: Infinity, title: 'Mythic Immortal', badge: '⚡', color: '#10b981', desc: 'Legendary life mastery. Ironclad consistency across all pillars.' }
];

function getTotalEarnedXp() {
  const unlockedMap = appState.unlockedAchievements || {};
  let total = 0;
  ACHIEVEMENTS_LIST.forEach(a => {
    if (unlockedMap[a.id]) total += (Number(a.xp) || 0);
  });
  return total;
}

function getUserRankInfo(earnedXp = null) {
  if (earnedXp === null) earnedXp = getTotalEarnedXp();
  const currentRank = XP_RANKS.slice().reverse().find(r => earnedXp >= r.minXp) || XP_RANKS[0];
  const nextRankIndex = XP_RANKS.findIndex(r => r.id === currentRank.id) + 1;
  const nextRank = nextRankIndex < XP_RANKS.length ? XP_RANKS[nextRankIndex] : null;

  let xpNeededForNext = 0;
  let progressInCurrentTier = 100;
  if (nextRank) {
    xpNeededForNext = Math.max(0, nextRank.minXp - earnedXp);
    const tierSpan = nextRank.minXp - currentRank.minXp;
    const progressInSpan = earnedXp - currentRank.minXp;
    progressInCurrentTier = Math.min(100, Math.max(0, Math.round((progressInSpan / tierSpan) * 100)));
  }

  return {
    currentRank,
    nextRank,
    xpNeededForNext,
    progressInCurrentTier,
    earnedXp
  };
}

function updateAchievementsBadge() {
  const unlockedCount = Object.keys(appState.unlockedAchievements || {}).length;
  document.querySelectorAll('#achievements-unlocked-count, .achievements-badge').forEach(el => {
    el.textContent = unlockedCount;
  });

  // Also update Rank Badges in Top Bar
  const rankInfo = getUserRankInfo();
  document.querySelectorAll('#top-rank-icon').forEach(el => {
    el.textContent = rankInfo.currentRank.badge;
  });
  document.querySelectorAll('#top-rank-title').forEach(el => {
    el.textContent = rankInfo.currentRank.title;
  });
  document.querySelectorAll('#open-rank-btn, .nav-rank-btn').forEach(btn => {
    btn.title = `Prestige Rank: ${rankInfo.currentRank.title} (${rankInfo.earnedXp.toLocaleString()} XP) • ${rankInfo.nextRank ? `${rankInfo.xpNeededForNext.toLocaleString()} XP to ${rankInfo.nextRank.title}` : 'Max Tier Reached'}`;
  });
}

function ensureRankLookupModal() {
  if (document.getElementById('rank-lookup-modal')) return;

  const modalHtml = `
    <div id="rank-lookup-modal" class="floating-modal-backdrop" aria-hidden="true" role="dialog" aria-modal="true">
      <div class="floating-modal-dialog rank-lookup-dialog">
        <div class="mobile-drag-pill"></div>
        <div class="floating-modal-header">
          <div class="modal-title-with-icon">
            <div class="modal-icon-badge" style="background: rgba(168, 85, 247, 0.15); border-color: rgba(168, 85, 247, 0.35);">
              <i class="fa-solid fa-ranking-star text-violet"></i>
            </div>
            <div>
              <h3 class="floating-title">XP Prestige Rank & Tier Badges</h3>
              <p class="floating-subtitle">Look up how much XP is needed for each tier badge</p>
            </div>
          </div>
          <button type="button" class="floating-close-btn" id="rank-modal-close" aria-label="Close modal">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div style="padding: 20px 24px;" class="rank-modal-body">
          <!-- Top Overview Banner -->
          <div id="rank-overview-container"></div>

          <!-- All Ranks List -->
          <h4 style="font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-tertiary); margin: 18px 0 10px 0;">
            All 9 Prestige Tiers & Rank Badges
          </h4>
          <div class="rank-tiers-list scrollable-stack" id="rank-tiers-container"></div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function renderRankLookupModal() {
  ensureRankLookupModal();
  const rankInfo = getUserRankInfo();
  const overviewEl = document.getElementById('rank-overview-container');
  const tiersEl = document.getElementById('rank-tiers-container');

  if (overviewEl) {
    overviewEl.innerHTML = `
      <div class="rank-overview-banner">
        <div class="rank-overview-left">
          <div class="rank-big-badge">
            <span>${rankInfo.currentRank.badge}</span>
          </div>
          <div class="rank-info-titles">
            <h3>${rankInfo.currentRank.title}</h3>
            <p>Current Prestige: <strong style="color: var(--cyan);">${rankInfo.earnedXp.toLocaleString()} XP</strong> • Rank ${rankInfo.currentRank.rank} of ${XP_RANKS.length}</p>
          </div>
        </div>

        <div class="rank-progress-block">
          <div class="rank-progress-text">
            <span>${rankInfo.nextRank ? `Next: ${rankInfo.nextRank.title}` : 'Max Tier Reached!'}</span>
            <strong>${rankInfo.nextRank ? `${rankInfo.xpNeededForNext.toLocaleString()} XP needed` : '100%'}</strong>
          </div>
          <div class="rank-progress-track">
            <div class="rank-progress-fill" style="width: ${rankInfo.progressInCurrentTier}%;"></div>
          </div>
          <span style="font-size: 0.72rem; color: var(--text-tertiary); font-family: var(--font-mono);">
            ${rankInfo.nextRank ? `${rankInfo.progressInCurrentTier}% towards ${rankInfo.nextRank.title}` : 'Immortal Prestige Tier'}
          </span>
        </div>
      </div>
    `;
  }

  if (tiersEl) {
    tiersEl.innerHTML = XP_RANKS.map(r => {
      const isCurrent = r.id === rankInfo.currentRank.id;
      const isUnlocked = rankInfo.earnedXp >= r.minXp;
      const neededForThis = Math.max(0, r.minXp - rankInfo.earnedXp);

      let statusBadgeHtml = '';
      if (isCurrent) {
        statusBadgeHtml = `<span class="rank-status-tag rank-status-current"><i class="fa-solid fa-award"></i> Current</span>`;
      } else if (isUnlocked) {
        statusBadgeHtml = `<span class="rank-status-tag rank-status-unlocked rank-status-completed"><i class="fa-solid fa-check"></i> Unlocked</span>`;
      } else {
        statusBadgeHtml = `<span class="rank-status-tag rank-status-locked"><i class="fa-solid fa-lock"></i> ${neededForThis.toLocaleString()} XP needed</span>`;
      }

      return `
        <div class="rank-tier-row ${isCurrent ? 'current-rank' : isUnlocked ? 'unlocked-rank' : ''}">
          <div class="rank-tier-header">
            <div class="rank-tier-header-left rank-tier-left">
              <div class="rank-tier-icon">
                <span>${r.badge}</span>
              </div>
              <div class="rank-tier-title-area rank-tier-meta">
                <h4>${r.title}</h4>
                <span class="rank-tier-xp-sub"><i class="fa-solid fa-bolt" style="font-size: 0.58rem; color: var(--amber); margin-right: 3px;"></i>${r.minXp.toLocaleString()} XP</span>
              </div>
            </div>

            <div class="rank-tier-status-wrap">
              ${statusBadgeHtml}
            </div>
          </div>

          <p class="rank-tier-desc">${escapeHtml(r.desc)}</p>
        </div>
      `;
    }).join('');
  }
}

function openRankLookupModal() {
  ensureRankLookupModal();
  renderRankLookupModal();
  const modal = document.getElementById('rank-lookup-modal');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    playSound('click');
  }
}

function closeRankLookupModal() {
  const modal = document.getElementById('rank-lookup-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    const hasOtherActiveModal = document.querySelector('.floating-modal-backdrop.active:not(#rank-lookup-modal), .modal-backdrop.active:not(#rank-lookup-modal), .auth-modal-backdrop.active, #auth-modal.active, #achievements-modal.active');
    if (!hasOtherActiveModal) {
      document.body.classList.remove('modal-open');
    }
  }
}

function ensureAchievementsModal() {
  if (document.getElementById('achievements-modal')) return;

  const modalHtml = `
    <div id="achievements-modal" class="floating-modal-backdrop" aria-hidden="true" role="dialog" aria-modal="true">
      <div class="floating-modal-dialog achievements-modal-dialog">
        <div class="mobile-drag-pill"></div>
        <div class="floating-modal-header">
          <div class="modal-title-with-icon">
            <div class="modal-icon-badge" style="background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.35);">
              <i class="fa-solid fa-trophy text-amber"></i>
            </div>
            <div>
              <h3 class="floating-title">Life OS Achievements & Milestones</h3>
              <p class="floating-subtitle">Level up your life discipline, track milestones, and earn prestige tiers</p>
            </div>
          </div>
          <button type="button" class="floating-close-btn" id="achievements-modal-close" aria-label="Close modal">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="achievements-summary-strip" id="achievements-summary-strip"></div>

        <div class="achievements-filter-bar" id="achievements-filter-bar" style="margin-bottom: 4px;">
          <button type="button" class="ach-filter-chip active" data-filter="all">All (${ACHIEVEMENTS_LIST.length})</button>
          <button type="button" class="ach-filter-chip" data-filter="diff-simple"><i class="fa-solid fa-seedling text-emerald"></i> Simple</button>
          <button type="button" class="ach-filter-chip" data-filter="diff-medium"><i class="fa-solid fa-bolt text-cyan"></i> Medium</button>
          <button type="button" class="ach-filter-chip" data-filter="diff-harder"><i class="fa-solid fa-crown text-amber"></i> Harder</button>
          <button type="button" class="ach-filter-chip" data-filter="habits">Habits</button>
          <button type="button" class="ach-filter-chip" data-filter="tasks">Tasks</button>
          <button type="button" class="ach-filter-chip" data-filter="streaks">Streaks</button>
          <button type="button" class="ach-filter-chip" data-filter="schedule">Schedule</button>
          <button type="button" class="ach-filter-chip" data-filter="finances">Finances</button>
          <button type="button" class="ach-filter-chip" data-filter="journal">Journal</button>
          <button type="button" class="ach-filter-chip" data-filter="score">Life Score</button>
        </div>

        <div class="achievements-cards-grid scrollable-stack" id="achievements-cards-grid"></div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('achievements-modal');
  const closeBtn = document.getElementById('achievements-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeAchievementsModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAchievementsModal();
    });
  }

  const filterChips = document.querySelectorAll('#achievements-filter-bar .ach-filter-chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.filter || 'all';
      renderAchievementsCards(filter);
      playSound('click');
    });
  });
}

function renderAchievementsCards(filter = 'all') {
  const grid = document.getElementById('achievements-cards-grid');
  if (!grid) return;

  const unlockedMap = appState.unlockedAchievements || {};
  const filteredList = ACHIEVEMENTS_LIST.filter(ach => {
    if (filter === 'all') return true;
    if (filter === 'diff-simple') return ach.difficulty === 'Simple';
    if (filter === 'diff-medium') return ach.difficulty === 'Medium';
    if (filter === 'diff-harder') return ach.difficulty === 'Harder';
    if (filter === 'habits') return ach.category === 'habits';
    if (filter === 'tasks') return ach.category === 'tasks';
    if (filter === 'streaks') return ach.category === 'streaks';
    if (filter === 'schedule') return ach.category === 'schedule';
    if (filter === 'finances') return ach.category === 'finances';
    if (filter === 'journal') return ach.category === 'journal';
    if (filter === 'score') return ach.category === 'score';
    return true;
  });

  grid.innerHTML = filteredList.map(ach => {
    const isUnlocked = Boolean(unlockedMap[ach.id]);
    const currentVal = getMetricValueForAchievement(ach, appState);
    const targetVal = ach.target;
    const pct = Math.min(100, Math.round((currentVal / targetVal) * 100));
    const remaining = Math.max(0, targetVal - currentVal);
    const tierClass = `tier-${ach.tier.toLowerCase()}`;
    const diffClass = `diff-${(ach.difficulty || 'simple').toLowerCase()}`;
    const unlockedRecord = unlockedMap[ach.id];
    const unlockedDateStr = unlockedRecord && unlockedRecord.unlockedAt ? unlockedRecord.unlockedAt.split('T')[0] : 'Unlocked';

    let progressText = `${currentVal} / ${targetVal}`;
    let remainingText = `${remaining} remaining to unlock`;
    if (isUnlocked) {
      remainingText = `Unlocked on ${formatAppDate(unlockedDateStr)}`;
    }

    return `
      <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'} ${tierClass}" data-id="${ach.id}">
        <div class="ach-card-top">
          <div class="ach-icon-wrap ${tierClass}">
            <span>${ach.icon}</span>
          </div>
          <div class="ach-meta">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
              <span class="ach-tier-badge ${tierClass}">${ach.tier} Tier • +${ach.xp} XP</span>
              <span class="ach-difficulty-badge ${diffClass}">${ach.difficulty || 'Simple'}</span>
            </div>
            <div class="ach-title">${escapeHtml(ach.title)}</div>
          </div>
          <div>
            ${isUnlocked 
              ? '<span class="ach-check-badge" title="Unlocked!"><i class="fa-solid fa-circle-check"></i></span>' 
              : '<span class="ach-lock-badge" title="Locked"><i class="fa-solid fa-lock"></i></span>'}
          </div>
        </div>

        <p class="ach-desc">${escapeHtml(ach.desc)}</p>

        <div class="ach-progress-wrap">
          <div class="ach-progress-header">
            <span>Progress: <strong>${progressText}</strong></span>
            <span>${pct}%</span>
          </div>
          <div class="ach-progress-bar">
            <div class="ach-progress-fill" style="width: ${pct}%;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
            <span class="${isUnlocked ? 'ach-unlocked-date' : 'ach-remaining-text'}">
              ${isUnlocked ? '<i class="fa-solid fa-award"></i> ' + remainingText : '<i class="fa-solid fa-hourglass-half"></i> ' + remainingText}
            </span>
            <span style="font-size: 0.72rem; color: var(--text-tertiary); font-family: var(--font-mono);">${ach.xp} XP</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderAchievementsModal() {
  ensureAchievementsModal();

  const unlockedMap = appState.unlockedAchievements || {};
  const unlockedCount = Object.keys(unlockedMap).length;
  const totalCount = ACHIEVEMENTS_LIST.length;
  const completionPct = Math.round((unlockedCount / totalCount) * 100);

  let earnedXp = 0;
  let totalPossibleXp = 0;
  ACHIEVEMENTS_LIST.forEach(a => {
    totalPossibleXp += a.xp;
    if (unlockedMap[a.id]) earnedXp += a.xp;
  });

  const rankInfo = getUserRankInfo(earnedXp);

  const strip = document.getElementById('achievements-summary-strip');
  if (strip) {
    strip.innerHTML = `
      <div class="ach-stat-box">
        <span class="ach-stat-val text-amber">${unlockedCount} / ${totalCount}</span>
        <span class="ach-stat-lbl">Achievements Unlocked</span>
      </div>
      <div class="ach-stat-box">
        <span class="ach-stat-val text-emerald">${completionPct}%</span>
        <span class="ach-stat-lbl">Completion Rate</span>
      </div>
      <div class="ach-stat-box">
        <span class="ach-stat-val text-cyan">${earnedXp.toLocaleString()} <span style="font-size: 0.85rem; color: var(--text-tertiary);">/ ${totalPossibleXp.toLocaleString()}</span></span>
        <span class="ach-stat-lbl">Prestige XP Earned</span>
      </div>
      <div class="ach-stat-box" id="summary-rank-box" style="cursor: pointer;" title="Click to view all 9 XP Tiers & Rank Badges">
        <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
          <span style="font-size: 1.35rem;">${rankInfo.currentRank.badge}</span>
          <span class="ach-stat-val text-violet" style="font-size: 1.15rem;">${rankInfo.currentRank.title}</span>
        </div>
        <span class="ach-stat-lbl" style="color: #c084fc;">
          ${rankInfo.nextRank ? `${rankInfo.xpNeededForNext.toLocaleString()} XP to ${rankInfo.nextRank.title}` : 'Max Tier Reached'}
        </span>
        <button type="button" class="btn btn-xs btn-outline" id="view-rank-tiers-btn" style="margin-top: 6px; padding: 2px 8px; font-size: 0.7rem; border-color: rgba(168, 85, 247, 0.4); color: #c084fc;">
          <i class="fa-solid fa-ranking-star"></i> Rank Badges List &rarr;
        </button>
      </div>
    `;
  }

  const activeChip = document.querySelector('#achievements-filter-bar .ach-filter-chip.active');
  const currentFilter = activeChip ? activeChip.dataset.filter : 'all';
  renderAchievementsCards(currentFilter);
}

function openAchievementsModal() {
  ensureAchievementsModal();
  evaluateAchievements(true);
  renderAchievementsModal();
  const modal = document.getElementById('achievements-modal');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    playSound('click');
  }
}

function closeAchievementsModal() {
  const modal = document.getElementById('achievements-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    const hasOtherActiveModal = document.querySelector('.floating-modal-backdrop.active:not(#achievements-modal), .modal-backdrop.active:not(#achievements-modal), .auth-modal-backdrop.active, #auth-modal.active, #rank-lookup-modal.active');
    if (!hasOtherActiveModal) {
      document.body.classList.remove('modal-open');
    }
  }
}

/* ==========================================================================
   Master Page Renderer
   ========================================================================== */
function renderPage() {
  renderSidebarAndHeader();
  evaluateAchievements(true);

  const isCal = document.getElementById('view-calendar') || document.getElementById('calendar-days-grid');
  const isJournal = document.getElementById('view-journal') || document.getElementById('journal-entries-list');
  const isMood = document.getElementById('view-mood') && !isJournal;
  const isHabits = document.getElementById('view-habits') || document.getElementById('full-habits-list');
  const isTasks = document.getElementById('view-tasks') || document.getElementById('full-tasks-list');
  const isFinances = document.getElementById('view-finances') || document.getElementById('transactions-list');
  const isGoals = document.getElementById('view-goals') || document.getElementById('goals-cards-list');
  const isSettings = document.getElementById('view-settings');
  const isAnalytics = document.getElementById('view-analytics');

  if (isCal) {
    renderCalendarView();
  } else if (isJournal) {
    renderJournalView();
  } else if (isMood) {
    renderMoodView();
  } else if (isHabits) {
    renderHabitsView();
  } else if (isTasks) {
    renderTasksView();
  } else if (isFinances) {
    renderFinancesView();
  } else if (isGoals) {
    renderGoalsView();
  } else if (isSettings) {
    renderSettingsView();
  } else if (isAnalytics) {
    renderAnalyticsView();
  } else {
    // Default to Dashboard on index.html or root
    renderDashboard();
  }
}

function renderSidebarAndHeader() {
  // Counters in sidebar nav
  const habitCounter = document.getElementById('nav-habit-counter');
  if (habitCounter) habitCounter.textContent = appState.habits.length;

  const pendingTasks = appState.tasks.filter(t => !t.completed).length;
  const taskCounter = document.getElementById('nav-task-counter');
  if (taskCounter) taskCounter.textContent = pendingTasks;

  const scheduleCounter = document.getElementById('nav-schedule-counter');
  if (scheduleCounter) scheduleCounter.textContent = (appState.schedule || []).length;

  const journalCounter = document.getElementById('nav-journal-counter');
  if (journalCounter) journalCounter.textContent = (appState.journal || []).length;

  const activeGoals = (appState.goals || []).filter(g => g.status !== 'completed' && Number(g.progress) < 100).length;
  const goalsCounter = document.getElementById('nav-goals-counter');
  if (goalsCounter) goalsCounter.textContent = activeGoals;

  // Sidebar Life Score
  const scoreData = calculateLifeScore(appState.lifeScorePeriod || 'overall');
  const scoreNum = document.getElementById('sidebar-score-num');
  const meterFill = document.getElementById('sidebar-meter-fill');
  const scoreTip = document.getElementById('sidebar-score-tip');

  if (scoreNum) scoreNum.textContent = `${scoreData.totalScore}%`;
  if (meterFill) meterFill.style.width = `${scoreData.totalScore}%`;
  if (scoreTip) scoreTip.textContent = `${scoreData.tierName} (${scoreData.timeframeLabel})`;

  // Sidebar Life Score click navigation
  const sidebarScoreCard = document.getElementById('sidebar-life-score-card') || document.querySelector('.life-score-sidebar');
  if (sidebarScoreCard && !sidebarScoreCard._hasListener) {
    sidebarScoreCard._hasListener = true;
    sidebarScoreCard.style.cursor = 'pointer';
    sidebarScoreCard.title = 'Open Life Score & Star Chart Analytics';
    sidebarScoreCard.addEventListener('click', () => {
      window.location.href = 'analytics.html';
    });
  }

  // Best streak calculation (Minimal styled counter)
  const bestStreakEl = document.getElementById('top-best-streak');
  if (bestStreakEl) bestStreakEl.textContent = `${scoreData.maxStreakAllTime}d`;

  // Top Bar Mood Display
  const topMoodEmoji = document.getElementById('top-mood-emoji');
  if (topMoodEmoji) {
    const todayStr = getLocalDateString(new Date());
    const todayMood = (appState.moodLogs || []).find(m => m.date === todayStr);
    const emojis = ['', '😫', '😕', '😐', '🙂', '🤩'];
    if (todayMood && emojis[todayMood.score]) {
      topMoodEmoji.textContent = emojis[todayMood.score];
    } else {
      topMoodEmoji.textContent = '✨';
    }
  }

  // Sound toggle icon
  const soundIcon = document.getElementById('sound-icon');
  const soundLabel = document.getElementById('sound-label');
  if (soundIcon && soundLabel) {
    if (appState.soundEnabled) {
      soundIcon.className = 'fa-solid fa-volume-high';
      soundLabel.textContent = 'Sound On';
    } else {
      soundIcon.className = 'fa-solid fa-volume-xmark';
      soundLabel.textContent = 'Muted';
    }
  }

  // Achievements Counter & Button Listener
  updateAchievementsBadge();
  document.querySelectorAll('#open-achievements-btn, .nav-achievements-btn').forEach(btn => {
    if (!btn._hasAchListener) {
      btn._hasAchListener = true;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openAchievementsModal();
      });
    }
  });

  // Highlight active link in sidebar based on current URL
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-menu .nav-item').forEach(link => {
    const href = link.getAttribute('href') || '';
    const cleanHref = href.replace('.html', '');
    const cleanCurrent = currentPath.replace('.html', '');
    if (
      href === currentPath || 
      cleanHref === cleanCurrent ||
      (currentPath === '' && (href === 'index.html' || href === 'index')) ||
      (currentPath.includes('analytics') && href.includes('analytics')) ||
      ((currentPath.includes('journal') || currentPath.includes('mood')) && (href.includes('journal') || href.includes('mood')))
    ) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/* ==========================================================================
   Timeframe Filter & Life Score Hero Card
   ========================================================================== */
function setLifeScorePeriod(period) {
  if (!['week', 'month', 'overall'].includes(period)) period = 'overall';
  appState.lifeScorePeriod = period;
  saveStateLocally();
  playSound('click');
  renderLifeScoreHero();
  renderStarChartAnalytics();
  renderSidebarAndHeader();
  if (document.getElementById('view-analytics')) {
    renderComparativeMatrix();
  }
}

function renderLifeScoreHero() {
  const period = appState.lifeScorePeriod || 'overall';
  const scoreData = calculateLifeScore(period);

  // Period Selector Buttons in Hero
  document.querySelectorAll('#hero-timeframe-group .timeframe-pill').forEach(btn => {
    const p = btn.getAttribute('data-period');
    if (p === period) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    }
  });

  // Hero Gauge Circle & Num
  const heroVal = document.getElementById('hero-score-val');
  const heroCircle = document.getElementById('hero-score-circle');
  const heroPeriodLbl = document.getElementById('hero-score-period-lbl');
  const heroTier = document.getElementById('hero-tier-name');
  const heroTitle = document.getElementById('hero-score-title');
  const heroCoach = document.getElementById('hero-score-coaching');

  if (heroVal) heroVal.textContent = `${scoreData.totalScore}%`;
  if (heroPeriodLbl) heroPeriodLbl.textContent = scoreData.timeframeLabel;
  if (heroCircle) {
    const offset = 314 - (314 * scoreData.totalScore / 100);
    heroCircle.style.strokeDashoffset = offset;
  }
  if (heroTier) heroTier.textContent = scoreData.tierName;
  if (heroTitle) heroTitle.textContent = scoreData.title;
  if (heroCoach) heroCoach.textContent = scoreData.tierDesc;

  // 4 Pillars Breakdown
  const pHabitsLbl = document.getElementById('pillar-habits-lbl');
  const pHabitsVal = document.getElementById('pillar-habits-val');
  const pHabitsBar = document.getElementById('pillar-habits-bar');

  const pTasksLbl = document.getElementById('pillar-tasks-lbl');
  const pTasksVal = document.getElementById('pillar-tasks-val');
  const pTasksBar = document.getElementById('pillar-tasks-bar');

  const pFinLbl = document.getElementById('pillar-fin-lbl');
  const pFinVal = document.getElementById('pillar-fin-val');
  const pFinBar = document.getElementById('pillar-fin-bar');

  const pFocusLbl = document.getElementById('pillar-focus-lbl');
  const pFocusVal = document.getElementById('pillar-focus-val');
  const pFocusBar = document.getElementById('pillar-focus-bar');

  const pGoalsLbl = document.getElementById('pillar-goals-lbl');
  const pGoalsVal = document.getElementById('pillar-goals-val');
  const pGoalsBar = document.getElementById('pillar-goals-bar');

  if (pHabitsLbl) pHabitsLbl.textContent = scoreData.habitPillarTitle;
  if (pHabitsVal) pHabitsVal.textContent = `${scoreData.habitPct}%`;
  if (pHabitsBar) pHabitsBar.style.width = `${scoreData.habitPct}%`;

  if (pTasksLbl) pTasksLbl.textContent = scoreData.taskPillarTitle;
  if (pTasksVal) pTasksVal.textContent = `${scoreData.taskPct}%`;
  if (pTasksBar) pTasksBar.style.width = `${scoreData.taskPct}%`;

  if (pFinLbl) pFinLbl.textContent = scoreData.financePillarTitle;
  if (pFinVal) pFinVal.textContent = `${scoreData.financePct}%`;
  if (pFinBar) pFinBar.style.width = `${scoreData.financePct}%`;

  if (pFocusLbl) pFocusLbl.textContent = scoreData.schedulePillarTitle;
  if (pFocusVal) pFocusVal.textContent = `${scoreData.schedulePct}%`;
  if (pFocusBar) pFocusBar.style.width = `${scoreData.schedulePct}%`;

  if (pGoalsLbl) pGoalsLbl.textContent = scoreData.goalPillarTitle;
  if (pGoalsVal) pGoalsVal.textContent = `${scoreData.goalPct}%`;
  if (pGoalsBar) pGoalsBar.style.width = `${scoreData.goalPct}%`;
}

/* ==========================================================================
   Multi-Dimensional Star Chart Analytics Renderer
   ========================================================================== */
function toggleStarBenchmark() {
  appState.starChartBenchmark = !appState.starChartBenchmark;
  saveStateLocally();
  playSound('click');
  renderStarChartAnalytics();
}

function renderStarChartAnalytics() {
  const period = appState.lifeScorePeriod || 'overall';
  const scoreData = calculateLifeScore(period);
  const benchmarkEnabled = !!appState.starChartBenchmark;

  // 1. Update Header Badges & Rating
  const ratingStars = document.getElementById('star-rating-stars');
  const ratingNum = document.getElementById('star-rating-num');
  if (ratingStars) ratingStars.textContent = scoreData.starRatingStars;
  if (ratingNum) ratingNum.textContent = `${scoreData.starRatingNum} / 5.0`;

  const legendPeriod = document.getElementById('star-legend-period');
  if (legendPeriod) legendPeriod.textContent = scoreData.timeframeLabel;

  const legendBenchmark = document.getElementById('star-legend-benchmark');
  if (legendBenchmark) legendBenchmark.style.display = benchmarkEnabled ? 'inline-flex' : 'none';

  const benchmarkStatus = document.getElementById('star-benchmark-status');
  const benchmarkBtn = document.getElementById('star-benchmark-toggle');
  if (benchmarkStatus) benchmarkStatus.textContent = benchmarkEnabled ? 'On' : 'Off';
  if (benchmarkBtn) {
    if (benchmarkEnabled) benchmarkBtn.classList.add('active');
    else benchmarkBtn.classList.remove('active');
  }

  // Update Period Buttons in Star Chart
  document.querySelectorAll('#star-timeframe-group .timeframe-pill').forEach(btn => {
    const p = btn.getAttribute('data-period');
    if (p === period) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    }
  });

  // 2. Render SVG Star Chart
  const svg = document.getElementById('life-star-chart-svg');
  if (svg) {
    const cx = 260;
    const cy = 220;
    const R = 125;
    const N = 5;
    const dims = scoreData.dimensions; // 5 items
    const isLight = appState.theme === 'light';
    const ringColor = isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.08)';
    const outerRingColor = isLight ? 'rgba(2, 132, 199, 0.35)' : 'rgba(56, 189, 248, 0.28)';
    const spokeColor = isLight ? 'rgba(15, 23, 42, 0.16)' : 'rgba(255, 255, 255, 0.12)';
    const textLabelColor = isLight ? '#0f172a' : '#f8fafc';

    // Precalculate angle for each axis: Theta_0 = -PI/2 (top at 12 o'clock)
    const angles = dims.map((_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / N);

    let svgHtml = '';

    // Defs: Gradients and Glow Filters
    svgHtml += `
      <defs>
        <linearGradient id="starPolyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.45" />
          <stop offset="50%" stop-color="#06b6d4" stop-opacity="0.38" />
          <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.35" />
        </linearGradient>
        <filter id="starGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    `;

    // Concentric Web Grid Rings: 20%, 40%, 60%, 80%, 100%
    const gridLevels = [20, 40, 60, 80, 100];
    gridLevels.forEach(lvl => {
      const r = (R * lvl) / 100;
      const pts = angles.map(a => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`).join(' ');
      const isOuter = lvl === 100;
      svgHtml += `
        <polygon points="${pts}" class="star-grid-ring ${isOuter ? 'ring-100' : ''}" 
          stroke="${isOuter ? outerRingColor : ringColor}" 
          stroke-width="${isOuter ? '1.5' : '1'}" fill="none" />
      `;
      // Grid level labels on vertical spoke (top)
      const labelY = cy - r + 3;
      svgHtml += `
        <text x="${cx + 6}" y="${labelY.toFixed(1)}" fill="${isLight ? '#475569' : '#64748b'}" font-size="9" font-family="var(--font-mono)" font-weight="600">${lvl}%</text>
      `;
    });

    // Radial Spokes
    angles.forEach((a, i) => {
      const x2 = cx + R * Math.cos(a);
      const y2 = cy + R * Math.sin(a);
      svgHtml += `
        <line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" 
          class="star-spoke-line spoke-${i}" id="star-spoke-${i}" 
          stroke="${spokeColor}" stroke-dasharray="2 3" stroke-width="1" />
      `;
    });

    // Target Benchmark Polygon (80% balanced reference)
    if (benchmarkEnabled) {
      const benchR = (R * 80) / 100;
      const benchPts = angles.map(a => `${(cx + benchR * Math.cos(a)).toFixed(1)},${(cy + benchR * Math.sin(a)).toFixed(1)}`).join(' ');
      svgHtml += `
        <polygon points="${benchPts}" class="star-benchmark-poly" 
          fill="rgba(245, 158, 11, 0.06)" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="5 4" opacity="0.85" />
      `;
    }

    // Performance Data Polygon
    const dataCoords = dims.map((d, i) => {
      // Minimum radius 12% so points don't collapse to 0
      const clampedPct = Math.max(12, Math.min(100, d.score));
      const r = (R * clampedPct) / 100;
      const x = cx + r * Math.cos(angles[i]);
      const y = cy + r * Math.sin(angles[i]);
      return { x, y, dim: d, angle: angles[i], index: i };
    });

    const dataPtsStr = dataCoords.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
    svgHtml += `
      <polygon id="star-data-polygon" points="${dataPtsStr}" class="star-data-poly" 
        fill="url(#starPolyGrad)" stroke="#38bdf8" stroke-width="2.5" filter="url(#starGlowFilter)" />
    `;

    // Outer Axis Labels (Icons + Names + Scores) - Centered symmetrically around vertices
    const labelAnchors = [
      { x: 260, yTitle: 64, yScore: 79 },   // 0: Habits & Routine (Top)
      { x: 446, yTitle: 175, yScore: 190 }, // 1: Task Execution (Top-Right)
      { x: 358, yTitle: 354, yScore: 369 }, // 2: Financial Health (Bottom-Right)
      { x: 162, yTitle: 354, yScore: 369 }, // 3: Time & Schedule (Bottom-Left)
      { x: 74, yTitle: 175, yScore: 190 }   // 4: Strategic Goals (Mid-Left)
    ];

    dims.forEach((dim, i) => {
      const pos = labelAnchors[i] || { x: cx, yTitle: cy - R - 20, yScore: cy - R - 6 };

      svgHtml += `
        <g class="star-axis-group" data-axis="${i}" style="cursor: pointer;" onclick="spotlightStarAxis(${i})">
          <text x="${pos.x.toFixed(1)}" y="${pos.yTitle.toFixed(1)}" text-anchor="middle" 
            fill="${textLabelColor}" font-size="11" font-weight="700" font-family="var(--font-main)">
            ${dim.icon} ${dim.name}
          </text>
          <text x="${pos.x.toFixed(1)}" y="${pos.yScore.toFixed(1)}" text-anchor="middle" 
            fill="${dim.color}" font-size="11" font-weight="800" font-family="var(--font-mono)">
            ${dim.score}%
          </text>
        </g>
      `;
    });

    // Vertex Nodes with Hover Handlers
    dataCoords.forEach(pt => {
      const color = pt.dim.color;
      svgHtml += `
        <g class="star-vertex-group" data-axis="${pt.index}" style="cursor: pointer;" 
           onmouseenter="showStarTooltip(event, ${pt.index}, ${pt.x}, ${pt.y})" 
           onmouseleave="hideStarTooltip()"
           onclick="spotlightStarAxis(${pt.index})">
          <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="10" 
            class="star-vertex-halo halo-${pt.index}" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-opacity="0.4" stroke-width="1.5" />
          <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="5.5" 
            class="star-vertex-core core-${pt.index}" fill="${color}" stroke="#ffffff" stroke-width="1.8" />
        </g>
      `;
    });

    svg.innerHTML = svgHtml;
  }

  // 2b. Native HTML5 Canvas API Star Chart Renderer (if canvas element exists)
  const canvas = document.getElementById('life-star-chart-canvas');
  if (canvas) {
    renderStarChartToCanvas(canvas, scoreData, benchmarkEnabled);
  }

  // 3. Update Harmony Index Meter
  const harmonyVal = document.getElementById('harmony-score-val');
  const harmonyProg = document.getElementById('harmony-progress');
  const harmonyEval = document.getElementById('harmony-evaluation');
  const harmonyBadge = document.getElementById('harmony-tier-badge');

  if (harmonyVal) harmonyVal.textContent = `${scoreData.harmonyScore}%`;
  if (harmonyProg) {
    const circum = 213.6; // 2 * PI * 34
    const offset = circum - (circum * scoreData.harmonyScore / 100);
    harmonyProg.style.strokeDashoffset = offset;
  }
  if (harmonyEval) harmonyEval.textContent = scoreData.harmonyEvaluation;
  if (harmonyBadge) harmonyBadge.innerHTML = `<span>${scoreData.harmonyBadge}</span>`;

  // 4. Update Superpower & Growth Area
  const superVal = document.getElementById('star-superpower-val');
  const superDesc = document.getElementById('star-superpower-desc');
  if (superVal) superVal.textContent = `${scoreData.superpower.name} (${scoreData.superpower.score}%)`;
  if (superDesc) superDesc.textContent = scoreData.superpower.desc;

  const growthVal = document.getElementById('star-growth-val');
  const growthDesc = document.getElementById('star-growth-desc');
  if (growthVal) growthVal.textContent = `${scoreData.growthArea.name} (${scoreData.growthArea.score}%)`;
  if (growthDesc) growthDesc.textContent = scoreData.growthArea.desc;

  // 5. Render 5 Dimensions Breakdown Cards
  const dimList = document.getElementById('star-dimensions-list');
  if (dimList) {
    dimList.innerHTML = scoreData.dimensions.map((dim, idx) => `
      <div class="star-dim-card" id="star-dim-card-${idx}" data-axis="${idx}" 
           onmouseenter="spotlightStarAxis(${idx})" onmouseleave="unspotlightStarAxis(${idx})">
        <div class="star-dim-left">
          <span class="star-dim-icon">${dim.icon}</span>
          <div class="star-dim-names">
            <span class="star-dim-name">${escapeHtml(dim.name)}</span>
            <span class="star-dim-sub">${escapeHtml(dim.rawValue)}</span>
          </div>
        </div>
        <div class="star-dim-mid">
          <div class="star-dim-track">
            <div class="star-dim-bar" style="width: ${dim.score}%; background: ${dim.color};"></div>
          </div>
        </div>
        <div class="star-dim-right">
          <span class="star-dim-pct" style="color: ${dim.color};">${dim.score}%</span>
        </div>
      </div>
    `).join('');
  }
}

// Tooltip and Spotlight Helpers
function showStarTooltip(event, axisIdx, x, y) {
  const period = appState.lifeScorePeriod || 'overall';
  const scoreData = calculateLifeScore(period);
  const dim = scoreData.dimensions[axisIdx];
  if (!dim) return;

  const tooltip = document.getElementById('star-chart-tooltip');
  if (!tooltip) return;

  const ttIcon = document.getElementById('star-tt-icon');
  const ttTitle = document.getElementById('star-tt-title');
  const ttTier = document.getElementById('star-tt-tier');
  const ttScore = document.getElementById('star-tt-score');
  const ttDetail = document.getElementById('star-tt-detail');
  const ttTip = document.getElementById('star-tt-tip');

  if (ttIcon) ttIcon.textContent = dim.icon;
  if (ttTitle) ttTitle.textContent = dim.name;
  if (ttTier) ttTier.textContent = dim.score >= 85 ? 'Master Tier' : dim.score >= 70 ? 'High Achiever' : dim.score >= 50 ? 'Steady Pace' : 'Focus Area';
  if (ttScore) {
    ttScore.textContent = `${dim.score}%`;
    ttScore.style.color = dim.color;
  }
  if (ttDetail) ttDetail.textContent = dim.rawValue;
  if (ttTip) ttTip.textContent = dim.tip;

  const leftPct = (x / 460) * 100;
  const topPct = (y / 460) * 100;
  tooltip.style.left = `${leftPct}%`;
  tooltip.style.top = `${Math.max(16, Math.min(84, topPct - 10))}%`;
  tooltip.style.display = 'block';
  tooltip.style.opacity = '1';

  spotlightStarAxis(axisIdx);
}

function hideStarTooltip() {
  const tooltip = document.getElementById('star-chart-tooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
    tooltip.style.opacity = '0';
  }
  document.querySelectorAll('.star-spoke-line').forEach(line => {
    line.setAttribute('stroke', 'rgba(255, 255, 255, 0.12)');
    line.setAttribute('stroke-width', '1');
  });
  document.querySelectorAll('.star-dim-card').forEach(card => card.classList.remove('active'));
}

function spotlightStarAxis(axisIdx) {
  document.querySelectorAll('.star-spoke-line').forEach((line, i) => {
    if (i === axisIdx) {
      line.setAttribute('stroke', '#38bdf8');
      line.setAttribute('stroke-width', '2.5');
    } else {
      line.setAttribute('stroke', 'rgba(255, 255, 255, 0.06)');
      line.setAttribute('stroke-width', '1');
    }
  });

  document.querySelectorAll('.star-dim-card').forEach((card, i) => {
    if (i === axisIdx) card.classList.add('active');
    else card.classList.remove('active');
  });
}

function unspotlightStarAxis(axisIdx) {
  document.querySelectorAll('.star-spoke-line').forEach(line => {
    line.setAttribute('stroke', 'rgba(255, 255, 255, 0.12)');
    line.setAttribute('stroke-width', '1');
  });
  document.querySelectorAll('.star-dim-card').forEach(card => card.classList.remove('active'));
}

/**
 * Native HTML5 Canvas 2D Star Chart Renderer
 * Renders the multi-dimensional radar chart directly to a 2D canvas context.
 */
function renderStarChartToCanvas(canvasEl, scoreData, benchmarkEnabled = false) {
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;

  const width = canvasEl.width || 520;
  const height = canvasEl.height || 440;
  const cx = 260;
  const cy = 220;
  const R = 125;
  const dims = scoreData.dimensions || [];
  const N = dims.length || 5;

  ctx.clearRect(0, 0, width, height);

  const angles = dims.map((_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / N);

  // 1. Concentric Web Rings (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [20, 40, 60, 80, 100];
  gridLevels.forEach(lvl => {
    const r = (R * lvl) / 100;
    ctx.beginPath();
    angles.forEach((a, i) => {
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = lvl === 100 
      ? 'rgba(56, 189, 248, 0.35)' 
      : (appState.theme === 'light' ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.08)');
    ctx.lineWidth = lvl === 100 ? 1.5 : 1;
    ctx.stroke();

    // Axis level label
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText(`${lvl}%`, cx + 6, cy - r + 3);
  });

  // 2. Radial Spokes
  angles.forEach(a => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
    ctx.strokeStyle = (appState.theme === 'light' ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.12)');
    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // 3. Benchmark Polygon (if enabled)
  if (benchmarkEnabled) {
    const benchR = (R * 80) / 100;
    ctx.beginPath();
    angles.forEach((a, i) => {
      const x = cx + benchR * Math.cos(a);
      const y = cy + benchR * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.06)';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 4. Performance Data Polygon
  const dataCoords = dims.map((d, i) => {
    const clampedPct = Math.max(12, Math.min(100, d.score || 0));
    const r = (R * clampedPct) / 100;
    return {
      x: cx + r * Math.cos(angles[i]),
      y: cy + r * Math.sin(angles[i]),
      dim: d
    };
  });

  if (dataCoords.length > 0) {
    ctx.beginPath();
    dataCoords.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
    grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.38)');
    grad.addColorStop(1, 'rgba(139, 92, 246, 0.35)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 5. Vertex nodes
    dataCoords.forEach(pt => {
      const color = pt.dim.color || '#38bdf8';
      // Halo
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Core
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  // 6. Outer Axis Labels - Centered symmetrically around vertices
  const labelAnchors = [
    { x: cx, yTitle: 64, yScore: 79 },
    { x: cx + 186, yTitle: 175, yScore: 190 },
    { x: cx + 98, yTitle: 354, yScore: 369 },
    { x: cx - 98, yTitle: 354, yScore: 369 },
    { x: cx - 186, yTitle: 175, yScore: 190 }
  ];

  dims.forEach((dim, i) => {
    if (!dim) return;
    const pos = labelAnchors[i] || { x: cx, yTitle: cy - R - 20, yScore: cy - R - 6 };

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${dim.icon} ${dim.name}`, pos.x, pos.yTitle);

    ctx.fillStyle = dim.color || '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${dim.score}%`, pos.x, pos.yScore);
  });
}

/* ==========================================================================
   Analytics Dedicated View & Comparative Matrix
   ========================================================================== */
function renderComparativeMatrix() {
  const tbody = document.getElementById('matrix-table-body');
  if (!tbody) return;

  const weekData = calculateLifeScore('week');
  const monthData = calculateLifeScore('month');
  const overallData = calculateLifeScore('overall');

  let rowsHtml = '';
  overallData.dimensions.forEach((dim, i) => {
    const wDim = weekData.dimensions[i];
    const mDim = monthData.dimensions[i];
    const delta = wDim.score - overallData.dimensions[i].score;
    const deltaStr = delta > 0 ? `+${delta}% 🔥` : delta < 0 ? `${delta}%` : `0% (Equal)`;
    const deltaColor = delta > 0 ? 'var(--emerald)' : delta < 0 ? 'var(--rose)' : 'var(--text-tertiary)';

    rowsHtml += `
      <tr>
        <td>
          <div class="matrix-dim-cell">
            <span>${dim.icon}</span>
            <span>${escapeHtml(dim.name)}</span>
          </div>
        </td>
        <td><strong class="matrix-score-val" style="color: ${wDim.color};">${wDim.score}%</strong> <span class="metric-hint" style="font-size: 0.72rem;">(${escapeHtml(wDim.rawValue)})</span></td>
        <td><strong class="matrix-score-val" style="color: ${mDim.color};">${mDim.score}%</strong> <span class="metric-hint" style="font-size: 0.72rem;">(${escapeHtml(mDim.rawValue)})</span></td>
        <td><strong class="matrix-score-val" style="color: ${dim.color};">${dim.score}%</strong> <span class="metric-hint" style="font-size: 0.72rem;">(${escapeHtml(dim.rawValue)})</span></td>
        <td><strong style="color: ${deltaColor};">${deltaStr}</strong></td>
      </tr>
    `;
  });

  // Summary Row: Overall Life Score
  const totalDelta = weekData.totalScore - overallData.totalScore;
  const totalDeltaStr = totalDelta > 0 ? `+${totalDelta}% 🚀` : totalDelta < 0 ? `${totalDelta}%` : `0%`;
  const totalDeltaColor = totalDelta >= 0 ? 'var(--emerald)' : 'var(--rose)';

  rowsHtml += `
    <tr style="background: rgba(255, 255, 255, 0.04); font-weight: 700;">
      <td>
        <div class="matrix-dim-cell">
          <i class="fa-solid fa-crown text-amber"></i>
          <span>Total Life Score</span>
        </div>
      </td>
      <td><span class="matrix-badge-top" style="font-size: 0.85rem;">${weekData.totalScore}%</span> <span style="font-size: 0.72rem; color: var(--text-secondary); margin-left: 6px;">${weekData.tierName}</span></td>
      <td><span class="matrix-badge-top" style="font-size: 0.85rem;">${monthData.totalScore}%</span> <span style="font-size: 0.72rem; color: var(--text-secondary); margin-left: 6px;">${monthData.tierName}</span></td>
      <td><span class="matrix-badge-top" style="font-size: 0.85rem;">${overallData.totalScore}%</span> <span style="font-size: 0.72rem; color: var(--text-secondary); margin-left: 6px;">${overallData.tierName}</span></td>
      <td><span style="color: ${totalDeltaColor}; font-size: 0.85rem;">${totalDeltaStr}</span></td>
    </tr>
  `;

  tbody.innerHTML = rowsHtml;
}

function renderAnalyticsView() {
  renderLifeScoreHero();
  renderStarChartAnalytics();
  renderComparativeMatrix();
}

function renderDashboard() {
  // 1. METRIC CARDS
  const todayStr = getLocalDateString(new Date());
  let completedHabitsToday = 0;
  appState.habits.forEach(h => {
    if (h.completedDates && h.completedDates.includes(todayStr)) completedHabitsToday++;
  });
  const habitPctToday = appState.habits.length === 0 ? 0 : Math.round((completedHabitsToday / appState.habits.length) * 100);

  const dashHabitsVal = document.getElementById('dash-habits-val');
  const dashHabitsPct = document.getElementById('dash-habits-pct');
  const dashHabitsBar = document.getElementById('dash-habits-bar');
  if (dashHabitsVal) dashHabitsVal.textContent = `${completedHabitsToday} / ${appState.habits.length}`;
  if (dashHabitsPct) dashHabitsPct.textContent = `${habitPctToday}%`;
  if (dashHabitsBar) dashHabitsBar.style.width = `${habitPctToday}%`;

  const totalTasks = appState.tasks.length;
  const completedTasks = appState.tasks.filter(t => t.completed).length;
  const taskPct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const dashTasksVal = document.getElementById('dash-tasks-val');
  const dashTasksPct = document.getElementById('dash-tasks-pct');
  const dashTasksBar = document.getElementById('dash-tasks-bar');
  if (dashTasksVal) dashTasksVal.textContent = `${completedTasks} / ${totalTasks}`;
  if (dashTasksPct) dashTasksPct.textContent = `${taskPct}%`;
  if (dashTasksBar) dashTasksBar.style.width = `${taskPct}%`;

  // Cash Flow in ₹
  let netCashToday = 0;
  let todayTxCount = 0;
  appState.transactions.forEach(tx => {
    if (tx.date === todayStr) {
      todayTxCount++;
      if (tx.type === 'income') netCashToday += Number(tx.amount);
      else netCashToday -= Number(tx.amount);
    }
  });

  const cashValEl = document.getElementById('dash-cash-val');
  const cashBadgeEl = document.getElementById('dash-cash-badge');
  const cashHintEl = document.getElementById('dash-cash-hint');

  if (cashValEl && cashBadgeEl && cashHintEl) {
    cashValEl.textContent = formatINR(netCashToday, true);
    if (netCashToday > 0) {
      cashBadgeEl.className = 'metric-badge positive';
      cashBadgeEl.textContent = 'Surplus';
    } else if (netCashToday < 0) {
      cashBadgeEl.className = 'metric-badge negative';
      cashBadgeEl.textContent = 'Deficit';
    } else {
      cashBadgeEl.className = 'metric-badge';
      cashBadgeEl.textContent = 'Neutral';
    }
    cashHintEl.textContent = `${todayTxCount} transaction${todayTxCount === 1 ? '' : 's'} today`;
  }

  // Schedule Focus Metric Card
  const todayBlocks = (appState.schedule || [])
    .filter(s => doesScheduleEventOccurOnDate(s, todayStr))
    .sort((a, b) => Number(a.hour) - Number(b.hour));

  const dashSchCount = document.getElementById('dash-schedule-count');
  const dashSchBadge = document.getElementById('dash-schedule-badge');
  const dashSchHint = document.getElementById('dash-schedule-hint');

  if (dashSchCount) {
    dashSchCount.textContent = `${todayBlocks.length} Block${todayBlocks.length === 1 ? '' : 's'}`;
  }
  if (dashSchBadge) {
    dashSchBadge.textContent = todayBlocks.length > 0 ? 'Active' : 'Free';
  }
  if (dashSchHint) {
    if (todayBlocks.length > 0) {
      dashSchHint.textContent = `Next: ${todayBlocks[0].title} (${formatHourLabel(todayBlocks[0].hour)})`;
    } else {
      dashSchHint.textContent = 'No blocks scheduled';
    }
  }

  // Dashboard Habits Checklist (Scrollable to view all cards)
  const dashHabitsList = document.getElementById('dash-habits-list');
  if (dashHabitsList) {
    dashHabitsList.innerHTML = '';
    if (appState.habits.length === 0) {
      dashHabitsList.innerHTML = `<li class="compact-item text-tertiary" style="justify-content: center; opacity: 0.65;">No habits tracked today</li>`;
    } else {
      appState.habits.forEach(habit => {
        const isDone = habit.completedDates && habit.completedDates.includes(todayStr);
        const streak = calculateHabitStreak(habit.completedDates);
        const habitColor = habit.color || 'emerald';
        const li = document.createElement('li');
        li.className = `compact-item habit-item habit-color-${habitColor} ${isDone ? 'completed' : ''}`;
        li.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
            <button type="button" class="habit-check-today" style="width: 20px; height: 20px; font-size: 0.65rem; flex-shrink: 0;" title="Toggle">
              ${isDone ? '<i class="fa-solid fa-check"></i>' : ''}
            </button>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.85rem;">${escapeHtml(habit.name)}</span>
          </div>
          <div class="streak-pill ${streak > 0 ? 'active' : ''}" style="font-size: 0.65rem; padding: 2px 6px; white-space: nowrap; flex-shrink: 0; display: inline-flex; align-items: center; gap: 3px;">
            <i class="fa-solid fa-fire" style="font-size: 0.62rem;"></i> ${streak}d
          </div>
        `;
        li.querySelector('.habit-check-today').addEventListener('click', (e) => {
          e.preventDefault();
          toggleHabitDay(habit.id, todayStr);
        });
        dashHabitsList.appendChild(li);
      });
    }
  }

  // Dashboard Focus Tasks (Scrollable to view all cards)
  const dashTasksList = document.getElementById('dash-tasks-list');
  if (dashTasksList) {
    dashTasksList.innerHTML = '';
    const focusTasks = appState.tasks;
    if (focusTasks.length === 0) {
      dashTasksList.innerHTML = `<li class="compact-item text-tertiary" style="justify-content: center; opacity: 0.65;">No focus tasks queued</li>`;
    } else {
      focusTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `compact-item ${task.completed ? 'completed' : ''}`;
        const prioKey = (task.priority || 'medium').toLowerCase();
        const prioText = prioKey === 'medium' ? 'MED' : prioKey.toUpperCase();
        li.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
            <button type="button" class="task-check-btn" aria-label="${task.completed ? 'Mark task incomplete' : 'Mark task complete'}" title="${task.completed ? 'Mark task incomplete' : 'Mark task complete'}" style="width: 18px; height: 18px; font-size: 0.6rem; flex-shrink: 0;">
              ${task.completed ? '<i class="fa-solid fa-check"></i>' : ''}
            </button>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.85rem;">${escapeHtml(task.title)}</span>
          </div>
          <span class="priority-badge priority-${prioKey}" style="white-space: nowrap; flex-shrink: 0; font-size: 0.65rem; padding: 2px 7px;">${prioText}</span>
        `;
        li.querySelector('.task-check-btn').addEventListener('click', (e) => {
          e.preventDefault();
          toggleTask(task.id);
        });
        dashTasksList.appendChild(li);
      });
    }
  }

  // Dashboard Schedule Stacked Cards Preview (No horizontal overflow)
  const dashSchStrip = document.getElementById('dash-schedule-preview');
  if (dashSchStrip) {
    dashSchStrip.innerHTML = '';

    if (todayBlocks.length === 0) {
      dashSchStrip.innerHTML = `
        <div style="font-size: 0.82rem; color: var(--text-tertiary); padding: 12px 14px; background: rgba(255,255,255,0.02); border: 1px dashed var(--bg-panel-border); border-radius: var(--radius-md); text-align: center; opacity: 0.7;">
          No time-blocks scheduled today
        </div>
      `;
    } else {
      todayBlocks.forEach(blk => {
        const pill = document.createElement('div');
        const isDone = isScheduleEventCompletedOnDate(blk, todayStr);
        pill.className = `dash-schedule-pill ${isDone ? 'is-done' : ''}`;
        pill.innerHTML = `
          <div class="dash-schedule-pill-left" style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
            <button type="button" class="task-check-btn schedule-check-btn ${isDone ? 'completed' : ''}" aria-label="${isDone ? 'Mark as incomplete' : 'Mark focus block completed'}" style="width: 18px; height: 18px; font-size: 0.6rem; margin-right: 2px; flex-shrink: 0;" title="${isDone ? 'Mark as incomplete' : 'Mark focus block completed'}">
              ${isDone ? '<i class="fa-solid fa-check"></i>' : ''}
            </button>
            <span class="dash-schedule-time" style="font-size: 0.68rem; padding: 2px 6px; white-space: nowrap; flex-shrink: 0;">${formatHourLabel(blk.hour)}</span>
            <span class="dash-schedule-title" style="font-size: 0.82rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${isDone ? 'text-decoration: line-through; opacity: 0.65;' : ''}">${escapeHtml(blk.title)}</span>
          </div>
          <div class="dash-schedule-pill-right" style="flex-shrink: 0;">
            <span class="category-tag" style="font-size: 0.65rem; padding: 2px 6px; white-space: nowrap;">${escapeHtml(blk.category || 'General')}</span>
          </div>
        `;
        const checkBtn = pill.querySelector('.schedule-check-btn');
        if (checkBtn) {
          checkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleScheduleEvent(blk.id, todayStr);
          });
        }
        dashSchStrip.appendChild(pill);
      });
    }
  }

  // Dashboard Active Strategic Goals (Scrollable Stack)
  renderDashboardGoals();
}

/* ==========================================================================
   REDESIGNED USER-FRIENDLY CALENDAR & SCHEDULE PLANNER
   ========================================================================== */
function renderCalendarView() {
  const titleEl = document.getElementById('calendar-month-year');
  if (!titleEl) return;

  const vDate = getValidCalendarDate();
  const monthName = vDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  titleEl.textContent = monthName;

  renderCleanCalendarGrid();
  renderDayAgendaPlanner();
}

function renderCleanCalendarGrid() {
  const gridEl = document.getElementById('calendar-days-grid');
  if (!gridEl) return;

  const vDate = getValidCalendarDate();
  const viewYear = vDate.getFullYear();
  const viewMonth = vDate.getMonth();

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const daysInMonth = lastDay.getDate();

  const weekStart = (typeof localStorage !== 'undefined' && localStorage.getItem('life_os_week_start')) || 'monday';
  const isSundayStart = weekStart === 'sunday';

  // Dynamically update weekday headers
  const weekdaysEl = document.querySelector('.calendar-weekdays-grid');
  if (weekdaysEl) {
    if (isSundayStart) {
      weekdaysEl.innerHTML = '<span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>';
    } else {
      weekdaysEl.innerHTML = '<span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>';
    }
  }

  let startDayOfWeek;
  if (isSundayStart) {
    startDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
  } else {
    startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Mon-based
  }

  const todayStr = getLocalDateString(new Date());
  gridEl.innerHTML = '';

  // Previous month trailing days
  const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const d = new Date(viewYear, viewMonth - 1, dayNum);
    gridEl.appendChild(createCleanCalendarCell(dayNum, getLocalDateString(d), true));
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const curDate = new Date(viewYear, viewMonth, d);
    const dateStr = getLocalDateString(curDate);
    gridEl.appendChild(createCleanCalendarCell(d, dateStr, false, dateStr === todayStr));
  }

  // Next month leading days (fill 35 or 42 cells)
  const total = gridEl.children.length;
  const target = total > 35 ? 42 : 35;
  for (let n = 1; n <= (target - total); n++) {
    const nextDate = new Date(viewYear, viewMonth + 1, n);
    gridEl.appendChild(createCleanCalendarCell(n, getLocalDateString(nextDate), true));
  }
}

function createCleanCalendarCell(dayNumber, dateStr, isOtherMonth = false, isToday = false) {
  const cell = document.createElement('div');
  cell.className = 'cal-day-cell-clean';
  cell.dataset.date = dateStr;

  if (isOtherMonth) cell.classList.add('other-month');
  if (isToday) cell.classList.add('is-today');
  if (dateStr === appState.selectedCalendarDate) cell.classList.add('selected-day');

  // Filter events for this specific date (single-day, everyday, or selected days)
  const eventsForDay = (appState.schedule || [])
    .filter(s => doesScheduleEventOccurOnDate(s, dateStr))
    .sort((a, b) => Number(a.hour ?? a.startHour ?? 0) - Number(b.hour ?? b.startHour ?? 0));

  function buildEventChip(evt) {
    const h = evt.hour ?? evt.startHour ?? 9;
    const catClass = `chip-${(evt.category || 'work').toLowerCase()}`;
    let repIcon = '';
    if (evt.recurrence === 'everyday' || evt.repeat === 'everyday') {
      repIcon = '<i class="fa-solid fa-repeat chip-repeat-icon" title="Repeats Everyday"></i>';
    } else if (evt.recurrence === 'selected_days' || (Array.isArray(evt.repeatDays) && evt.repeatDays.length > 0)) {
      repIcon = `<i class="fa-solid fa-calendar-week chip-repeat-icon" title="Repeats: ${(evt.repeatDays || []).join(', ')}"></i>`;
    }
    return `
      <div class="cal-event-chip ${catClass}" title="${formatHourLabel(h)}: ${escapeHtml(evt.title)}">
        <span class="chip-time">${String(h).padStart(2, '0')}h</span>
        <span class="chip-title">${repIcon}${escapeHtml(evt.title)}</span>
      </div>
    `;
  }

  // Render top header number + event chips (max 2 visual rows to never distort cell height)
  let eventChipsHtml = '';
  if (eventsForDay.length === 1) {
    eventChipsHtml = buildEventChip(eventsForDay[0]);
  } else if (eventsForDay.length === 2) {
    eventChipsHtml = eventsForDay.map(buildEventChip).join('');
  } else if (eventsForDay.length > 2) {
    eventChipsHtml = `
      ${buildEventChip(eventsForDay[0])}
      <span class="cal-more-chip">+${eventsForDay.length - 1} more</span>
    `;
  }

  cell.innerHTML = `
    <div class="cal-cell-top">
      <span class="cal-cell-num">${dayNumber}</span>
      ${eventsForDay.length > 0 ? `<span class="cal-cell-count">${eventsForDay.length}</span>` : ''}
    </div>
    <div class="cal-cell-events">
      ${eventChipsHtml}
    </div>
  `;

  cell.addEventListener('click', () => {
    appState.selectedCalendarDate = dateStr;
    document.querySelectorAll('.cal-day-cell-clean').forEach(c => c.classList.remove('selected-day'));
    cell.classList.add('selected-day');
    renderDayAgendaPlanner();
    playSound('click');
  });

  cell.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    openCreatorModal('schedule', { date: dateStr });
  });

  return cell;
}

function renderDayAgendaPlanner() {
  const agendaContainer = document.getElementById('day-agenda-container');
  const dateTitleEl = document.getElementById('agenda-selected-date-title');
  const blocksCountEl = document.getElementById('agenda-blocks-count');
  if (!agendaContainer || !dateTitleEl || !blocksCountEl) return;

  const selParts = appState.selectedCalendarDate.split('-');
  const selDateObj = new Date(Number(selParts[0]), Number(selParts[1]) - 1, Number(selParts[2]));
  dateTitleEl.textContent = selDateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const eventsForDay = (appState.schedule || [])
    .filter(s => doesScheduleEventOccurOnDate(s, appState.selectedCalendarDate))
    .sort((a, b) => Number(a.hour) - Number(b.hour));

  blocksCountEl.textContent = `${eventsForDay.length} event${eventsForDay.length === 1 ? '' : 's'} planned`;

  agendaContainer.innerHTML = '';

  if (eventsForDay.length === 0) {
    agendaContainer.innerHTML = `
      <div class="agenda-empty-state">
        <i class="fa-regular fa-calendar-plus agenda-empty-icon"></i>
        <h4>No events on this day</h4>
        <p>Click "Schedule Event" above to block your focus time or meetings.</p>
        <button type="button" class="btn btn-sm btn-amber" id="agenda-empty-add-btn" style="margin-top: 10px;">
          <i class="fa-solid fa-plus"></i>
          <span>Add Event for This Day</span>
        </button>
      </div>
    `;
    const addBtn = document.getElementById('agenda-empty-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => openCreatorModal('schedule', { date: appState.selectedCalendarDate }));
    }
    return;
  }

  // Group events by time periods: Morning (0-11), Afternoon (12-16), Evening (17-23)
  const periods = [
    { title: '🌅 Morning Focus (05:00 - 12:00)', filter: h => h >= 5 && h < 12 },
    { title: '☀️ Afternoon Flow (12:00 - 17:00)', filter: h => h >= 12 && h < 17 },
    { title: '🌙 Evening & Rest (17:00 - 24:00)', filter: h => h >= 17 || h < 5 }
  ];

  periods.forEach(p => {
    const periodEvents = eventsForDay.filter(e => p.filter(Number(e.hour)));
    if (periodEvents.length > 0) {
      const section = document.createElement('div');
      section.className = 'agenda-period-group';
      section.innerHTML = `<h5 class="agenda-period-title">${p.title}</h5>`;

      const list = document.createElement('div');
      list.className = 'agenda-events-list';

      periodEvents.forEach(evt => {
        const item = document.createElement('div');
        const isDone = isScheduleEventCompletedOnDate(evt, appState.selectedCalendarDate);
        const catClass = `cat-${(evt.category || 'work').toLowerCase()}`;
        item.className = `agenda-event-item ${catClass} ${isDone ? 'is-done' : ''}`;
        let repeatBadgeHtml = '';
        if (evt.recurrence === 'everyday' || evt.repeat === 'everyday') {
          repeatBadgeHtml = '<span class="sch-repeat-pill"><i class="fa-solid fa-repeat"></i> Everyday</span>';
        } else if (evt.recurrence === 'selected_days' || (Array.isArray(evt.repeatDays) && evt.repeatDays.length > 0)) {
          const daysText = (evt.repeatDays || []).join(', ');
          repeatBadgeHtml = `<span class="sch-repeat-pill"><i class="fa-solid fa-calendar-week"></i> ${escapeHtml(daysText)}</span>`;
        }

        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <button type="button" class="task-check-btn schedule-check-btn ${isDone ? 'completed' : ''}" aria-label="${isDone ? 'Mark as incomplete' : 'Mark focus block completed'}" style="width: 20px; height: 20px; font-size: 0.65rem;" title="${isDone ? 'Mark as incomplete' : 'Mark focus block completed'}">
              ${isDone ? '<i class="fa-solid fa-check"></i>' : ''}
            </button>
            <div class="agenda-event-time">
              <strong>${formatHourLabel(evt.hour)}</strong>
              <span>${evt.duration || 1} hr block</span>
            </div>
          </div>
          <div class="agenda-event-details">
            <span class="agenda-title-text" style="${isDone ? 'text-decoration: line-through; opacity: 0.65;' : ''}">${escapeHtml(evt.title)}</span>
            <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px; flex-wrap: wrap;">
              <span class="category-tag">${escapeHtml(evt.category || 'General')}</span>
              ${repeatBadgeHtml}
            </div>
          </div>
          <div class="agenda-event-actions">
            <button type="button" class="action-icon-btn delete-event-btn" title="Delete event">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        `;

        item.querySelector('.schedule-check-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          toggleScheduleEvent(evt.id, appState.selectedCalendarDate);
        });

        item.querySelector('.delete-event-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          deleteScheduleEvent(evt.id);
        });

        list.appendChild(item);
      });

      section.appendChild(list);
      agendaContainer.appendChild(section);
    }
  });
}

/* ==========================================================================
   Habits, Tasks, Finances, Mood Renderers
   ========================================================================== */
function renderHabitsView() {
  const listEl = document.getElementById('full-habits-list');
  const emptyEl = document.getElementById('habits-empty');
  const weekDaysLabels = document.getElementById('week-days-labels');
  if (!listEl || !emptyEl || !weekDaysLabels) return;

  const weekDays = getLast7Days();

  weekDaysLabels.innerHTML = weekDays.map(d => 
    `<span class="legend-day-lbl ${d.isToday ? 'text-cyan font-bold is-today-lbl' : ''}" title="${d.dayName} (${d.dateStr})">${d.dayLetter}</span>`
  ).join('');

  const filtered = appState.habits.filter(h => {
    if (habitCategoryFilter === 'All') return true;
    return (h.category || 'General').toLowerCase() === habitCategoryFilter.toLowerCase();
  });

  const totalBadge = document.getElementById('habits-total-badge');
  if (totalBadge) totalBadge.textContent = `${appState.habits.length} Habits Active`;

  listEl.innerHTML = '';
  if (filtered.length === 0) {
    emptyEl.classList.add('visible');
  } else {
    emptyEl.classList.remove('visible');
    const todayStr = getLocalDateString(new Date());

    filtered.forEach(habit => {
      const isCompletedToday = habit.completedDates && habit.completedDates.includes(todayStr);
      const streak = calculateHabitStreak(habit.completedDates);
      const habitColor = habit.color || 'emerald';

      const li = document.createElement('li');
      li.className = `habit-row habit-color-${habitColor} ${isCompletedToday ? 'completed-today' : ''}`;
      li.dataset.id = habit.id;

      const dotsHtml = weekDays.map(d => {
        const isDone = habit.completedDates && habit.completedDates.includes(d.dateStr);
        return `
          <div 
            class="day-dot-btn day-dot-indicator ${isDone ? 'done' : ''} ${d.isToday ? 'is-today-dot' : ''}" 
            data-date="${d.dateStr}"
            title="${d.dayName} ${d.dateStr}: ${isDone ? 'Completed' : 'Missed'}${d.isToday ? ' (Today)' : ''}"
            aria-label="${d.dayName} ${d.dateStr}: ${isDone ? 'Completed' : 'Not completed'}"
          >
            <i class="fa-solid fa-check"></i>
          </div>
        `;
      }).join('');

      li.innerHTML = `
        <div class="habit-meta">
          <button type="button" class="habit-check-today" title="Toggle today's completion">
            ${isCompletedToday ? '<i class="fa-solid fa-check"></i>' : ''}
          </button>
          <div class="habit-title-box">
            <span class="habit-title-text">${escapeHtml(habit.name)}</span>
            <div style="display: flex; gap: 6px; align-items: center; margin-top: 3px;">
              <span class="category-tag">${escapeHtml(habit.category || 'General')}</span>
              ${habit.routine ? `<span class="category-tag" style="background: rgba(245, 158, 11, 0.1); color: var(--amber); border-color: rgba(245, 158, 11, 0.25);">${escapeHtml(habit.routine)}</span>` : ''}
            </div>
            ${habit.motivation ? `<span class="habit-motivation-quote" style="font-size: 0.72rem; color: var(--text-tertiary); margin-top: 2px;">💬 "${escapeHtml(habit.motivation)}"</span>` : ''}
          </div>
        </div>
        <div class="seven-days-grid" role="group" aria-label="Weekly streak progression">
          ${dotsHtml}
        </div>
        <div class="habit-streak-cell">
          <div class="streak-pill ${streak > 0 ? 'active' : ''}">
            <i class="fa-solid fa-fire"></i>
            <span>${streak}d</span>
          </div>
        </div>
        <div class="habit-actions-cell">
          <button type="button" class="action-icon-btn delete-habit-btn" title="Delete habit">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      `;

      li.querySelector('.habit-check-today').addEventListener('click', () => {
        toggleHabitDay(habit.id, todayStr);
      });

      li.querySelector('.delete-habit-btn').addEventListener('click', () => {
        deleteHabit(habit.id);
      });

      listEl.appendChild(li);
    });
  }
}

function renderTasksView() {
  const listEl = document.getElementById('full-tasks-list');
  const emptyEl = document.getElementById('tasks-empty');
  if (!listEl || !emptyEl) return;

  const filtered = appState.tasks.filter(t => {
    if (taskStatusFilter === 'pending' && t.completed) return false;
    if (taskStatusFilter === 'completed' && !t.completed) return false;
    if (taskSearchQuery) {
      return t.title.toLowerCase().includes(taskSearchQuery.toLowerCase());
    }
    return true;
  });

  listEl.innerHTML = '';
  if (filtered.length === 0) {
    emptyEl.classList.add('visible');
  } else {
    emptyEl.classList.remove('visible');
    filtered.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'is-done' : ''}`;
      li.innerHTML = `
        <div class="task-left">
          <button type="button" class="task-check-btn" aria-label="Toggle task completion" title="Toggle task completion">
            ${task.completed ? '<i class="fa-solid fa-check"></i>' : ''}
          </button>
          <div class="task-body">
            <span class="task-label">${escapeHtml(task.title)}</span>
            ${task.notes ? `<div style="font-size: 0.72rem; color: var(--text-tertiary); margin-top: 2px;">📌 ${escapeHtml(task.notes)}</div>` : ''}
            <div class="task-tags-row">
              <span class="priority-badge priority-${task.priority || 'medium'}">${task.priority || 'med'}</span>
              <span class="category-tag">${escapeHtml(task.category || 'General')}</span>
              ${task.effort ? `<span class="category-tag" style="background: rgba(139, 92, 246, 0.1); color: var(--violet);">${escapeHtml(task.effort)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="task-right">
          <button type="button" class="action-icon-btn delete-task-btn" title="Delete task">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      `;

      li.querySelector('.task-check-btn').addEventListener('click', () => {
        toggleTask(task.id);
      });

      li.querySelector('.delete-task-btn').addEventListener('click', () => {
        deleteTask(task.id);
      });

      listEl.appendChild(li);
    });
  }
}

function renderFinancesView() {
  const listEl = document.getElementById('transactions-list');
  const emptyEl = document.getElementById('transactions-empty');
  if (!listEl) return;

  if (!Array.isArray(appState.transactions)) appState.transactions = [];

  let totalIncome = 0;
  let totalExpense = 0;
  let incCount = 0;
  let expCount = 0;

  // Breakdown aggregators
  const paymentMethods = {
    'UPI': { income: 0, expense: 0, total: 0, count: 0 },
    'Card': { income: 0, expense: 0, total: 0, count: 0 },
    'Cash': { income: 0, expense: 0, total: 0, count: 0 },
    'Net Banking': { income: 0, expense: 0, total: 0, count: 0 }
  };

  const expenseCategories = {};
  const incomeCategories = {};

  appState.transactions.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    const isInc = tx.type === 'income';
    const method = tx.paymentMethod || 'UPI';
    const cat = tx.category || (isInc ? 'Income' : 'Other');

    if (isInc) {
      totalIncome += amt;
      incCount++;
      if (!incomeCategories[cat]) {
        incomeCategories[cat] = { total: 0, count: 0 };
      }
      incomeCategories[cat].total += amt;
      incomeCategories[cat].count++;
    } else {
      totalExpense += amt;
      expCount++;
      if (!expenseCategories[cat]) {
        expenseCategories[cat] = { total: 0, count: 0 };
      }
      expenseCategories[cat].total += amt;
      expenseCategories[cat].count++;
    }

    if (!paymentMethods[method]) {
      paymentMethods[method] = { income: 0, expense: 0, total: 0, count: 0 };
    }
    if (isInc) paymentMethods[method].income += amt;
    else paymentMethods[method].expense += amt;
    paymentMethods[method].total += amt;
    paymentMethods[method].count++;
  });

  const totalBalance = totalIncome - totalExpense;

  const balEl = document.getElementById('fin-total-balance');
  const incEl = document.getElementById('fin-total-income');
  const expEl = document.getElementById('fin-total-expense');
  const incCountEl = document.getElementById('fin-income-count');
  const expCountEl = document.getElementById('fin-expense-count');
  const savingsRateEl = document.getElementById('fin-savings-rate');
  const savingsBarEl = document.getElementById('fin-savings-bar');
  const savingsHintEl = document.getElementById('fin-savings-hint');
  const balanceBadgeEl = document.getElementById('fin-balance-badge');

  const formatFinVal = (val) => {
    const isWhole = Math.abs(val) % 1 === 0;
    const frac = isWhole ? 0 : 2;
    return Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: frac, maximumFractionDigits: 2 });
  };

  const getDigitCount = (num) => {
    return String(Math.floor(Math.abs(num))).replace(/\D/g, '').length;
  };

  const setFinCardValue = (el, text, rawNum, defaultColorClass) => {
    if (!el) return;
    el.textContent = text;
    // When 4 digits or less it's bigger, after 4 digits (5-6 digits) it's smaller
    const isSmall = getDigitCount(rawNum) > 4;
    el.className = `fin-card-value ${defaultColorClass} ${isSmall ? 'fin-val-sm fin-val-compact' : 'fin-val-lg'}`;
  };

  if (balEl) {
    const balText = (totalBalance >= 0 ? '₹' : '-₹') + formatFinVal(totalBalance);
    const color = totalBalance >= 0 ? 'text-emerald' : 'text-rose';
    setFinCardValue(balEl, balText, totalBalance, color);
  }
  if (balanceBadgeEl) {
    if (totalBalance > 0) {
      balanceBadgeEl.textContent = 'Surplus';
      balanceBadgeEl.className = 'metric-badge positive';
    } else if (totalBalance < 0) {
      balanceBadgeEl.textContent = 'Deficit';
      balanceBadgeEl.className = 'metric-badge negative';
    } else {
      balanceBadgeEl.textContent = 'Balanced';
      balanceBadgeEl.className = 'metric-badge';
    }
  }

  if (incEl) setFinCardValue(incEl, `+₹${formatFinVal(totalIncome)}`, totalIncome, 'text-cyan');
  if (expEl) setFinCardValue(expEl, `-₹${formatFinVal(totalExpense)}`, totalExpense, 'text-rose');
  if (incCountEl) incCountEl.textContent = `${incCount} credit${incCount === 1 ? '' : 's'}`;
  if (expCountEl) expCountEl.textContent = `${expCount} debit${expCount === 1 ? '' : 's'}`;

  // Savings rate
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100)) : 0;
  if (savingsRateEl) {
    savingsRateEl.textContent = `${savingsRate}%`;
    savingsRateEl.className = 'fin-card-value text-amber fin-val-lg';
  }
  if (savingsBarEl) {
    savingsBarEl.style.width = `${Math.min(100, Math.max(0, savingsRate))}%`;
    savingsBarEl.className = `fin-progress-bar ${savingsRate >= 50 ? 'bar-emerald' : savingsRate >= 20 ? 'bar-amber' : 'bar-rose'}`;
  }
  if (savingsHintEl) {
    savingsHintEl.textContent = totalIncome > 0 
      ? `${savingsRate}% retained of total income` 
      : 'Log income & expenses to calculate';
  }

  // Payment channels breakdown
  const methodsListEl = document.getElementById('fin-payment-methods-list');
  if (methodsListEl) {
    methodsListEl.innerHTML = '';
    const methodKeys = Object.keys(paymentMethods).filter(k => paymentMethods[k].count > 0 || ['UPI', 'Card', 'Cash'].includes(k));
    const showMethodIncome = financeTypeFilter === 'income';
    const showMethodExpense = financeTypeFilter === 'expense';
    const baseVolume = showMethodIncome ? totalIncome : showMethodExpense ? totalExpense : (totalIncome + totalExpense);
    const activeVol = baseVolume > 0 ? baseVolume : 1;

    methodKeys.forEach(m => {
      const data = paymentMethods[m] || { total: 0, count: 0, expense: 0, income: 0 };
      const mAmount = showMethodIncome ? data.income : showMethodExpense ? data.expense : data.total;
      const pct = baseVolume > 0 ? Math.round((mAmount / activeVol) * 100) : 0;
      
      let iconClass = 'fa-mobile-screen-button';
      if (m.toLowerCase().includes('card')) iconClass = 'fa-credit-card';
      else if (m.toLowerCase().includes('cash')) iconClass = 'fa-money-bill-wave';
      else if (m.toLowerCase().includes('bank')) iconClass = 'fa-building-columns';

      const row = document.createElement('div');
      row.className = 'fin-breakdown-row';
      row.innerHTML = `
        <div class="fin-breakdown-meta">
          <span><i class="fa-solid ${iconClass}" style="margin-right: 6px; color: var(--cyan);"></i>${escapeHtml(m)} (${data.count})</span>
          <strong>₹${mAmount.toLocaleString('en-IN', { minimumFractionDigits: mAmount % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })} <span style="font-size: 0.75rem; color: var(--text-tertiary); font-weight: normal;">(${pct}%)</span></strong>
        </div>
        <div class="fin-progress-track">
          <div class="fin-progress-bar bar-cyan" style="width: ${pct}%;"></div>
        </div>
      `;
      methodsListEl.appendChild(row);
    });
  }

  // Categories breakdown
  const catListEl = document.getElementById('fin-categories-list');
  const catBadgeEl = document.getElementById('fin-categories-badge');
  const catTitleEl = document.getElementById('fin-categories-title') || document.querySelector('.fin-analytics-card:nth-child(2) .fin-analytics-title');

  if (catListEl) {
    catListEl.innerHTML = '';
    const showIncome = financeTypeFilter === 'income' || (financeTypeFilter === 'all' && totalExpense === 0 && totalIncome > 0);
    const activeDict = showIncome ? incomeCategories : expenseCategories;
    const activeTotal = showIncome ? (totalIncome > 0 ? totalIncome : 1) : (totalExpense > 0 ? totalExpense : 1);
    const catKeys = Object.keys(activeDict).filter(k => activeDict[k].total > 0);

    if (catBadgeEl) {
      catBadgeEl.textContent = showIncome ? 'Inflows' : 'Expenses';
    }
    if (catTitleEl) {
      catTitleEl.innerHTML = showIncome 
        ? '<i class="fa-solid fa-chart-pie text-emerald"></i> <span>Income by Category</span>'
        : '<i class="fa-solid fa-chart-pie text-violet"></i> <span>Spending by Category</span>';
    }

    if (catKeys.length === 0) {
      catListEl.innerHTML = `<div style="color: var(--text-tertiary); font-size: 0.85rem; padding: 12px 0;">No ${showIncome ? 'income streams' : 'expenses'} logged yet.</div>`;
    } else {
      catKeys.sort((a, b) => (activeDict[b].total - activeDict[a].total));
      const catColors = showIncome 
        ? ['bar-emerald', 'bar-cyan', 'bar-violet', 'bar-amber'] 
        : ['bar-violet', 'bar-rose', 'bar-amber', 'bar-cyan'];
      const iconColor = showIncome ? 'var(--emerald)' : 'var(--violet)';

      catKeys.forEach((cat, idx) => {
        const cData = activeDict[cat];
        const pct = Math.min(100, Math.round((cData.total / activeTotal) * 100));
        const colorClass = catColors[idx % catColors.length];

        const row = document.createElement('div');
        row.className = 'fin-breakdown-row';
        row.innerHTML = `
          <div class="fin-breakdown-meta">
            <span><i class="fa-solid fa-tag" style="margin-right: 6px; color: ${iconColor};"></i>${escapeHtml(cat)} (${cData.count})</span>
            <strong>${showIncome ? '+' : '-'}₹${cData.total.toLocaleString('en-IN', { minimumFractionDigits: cData.total % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })} <span style="font-size: 0.75rem; color: var(--text-tertiary); font-weight: normal;">(${pct}%)</span></strong>
          </div>
          <div class="fin-progress-track">
            <div class="fin-progress-bar ${colorClass}" style="width: ${pct}%;"></div>
          </div>
        `;
        catListEl.appendChild(row);
      });
    }
  }

  // Filter transactions
  const filtered = appState.transactions.filter(tx => {
    if (financeTypeFilter !== 'all' && tx.type !== financeTypeFilter) return false;
    if (financeSearchQuery) {
      const q = financeSearchQuery.toLowerCase();
      const descMatch = (tx.description || '').toLowerCase().includes(q);
      const catMatch = (tx.category || '').toLowerCase().includes(q);
      const methMatch = (tx.paymentMethod || '').toLowerCase().includes(q);
      const amtMatch = String(tx.amount || '').includes(q);
      if (!descMatch && !catMatch && !methMatch && !amtMatch) return false;
    }
    return true;
  });

  const ledgerCountEl = document.getElementById('fin-ledger-count');
  if (ledgerCountEl) {
    ledgerCountEl.textContent = `${filtered.length} of ${appState.transactions.length} items`;
  }

  listEl.innerHTML = '';
  if (filtered.length === 0) {
    if (emptyEl) {
      emptyEl.classList.add('visible');
      emptyEl.style.display = 'flex';
    }
  } else {
    if (emptyEl) {
      emptyEl.classList.remove('visible');
      emptyEl.style.display = 'none';
    }

    filtered.forEach(tx => {
      const isIncome = tx.type === 'income';
      const li = document.createElement('li');
      li.className = 'transaction-item';
      li.innerHTML = `
        <div class="tx-left">
          <div class="tx-icon-pill ${isIncome ? 'tx-icon-income' : 'tx-icon-expense'}">
            <i class="fa-solid ${isIncome ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
          </div>
          <div class="tx-info">
            <span class="tx-desc">${escapeHtml(tx.description)}</span>
            <span class="tx-date-cat">
              ${escapeHtml(formatAppDate(tx.date) || 'Today')} • 
              <span class="journal-category-pill" style="padding: 2px 8px; font-size: 0.72rem;">${escapeHtml(tx.category || 'General')}</span> • 
              <strong style="color: var(--cyan); font-family: var(--font-mono); font-size: 0.78rem;">${escapeHtml(tx.paymentMethod || 'UPI')}</strong>
            </span>
          </div>
        </div>
        <div class="tx-right">
          <span class="tx-amount ${isIncome ? 'income' : 'expense'}" style="white-space: nowrap !important; flex-shrink: 0 !important; font-family: var(--font-mono);">
            ${isIncome ? '+' : '-'}₹${Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: Number(tx.amount) % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}
          </span>
          <button type="button" class="action-icon-btn delete-tx-btn" title="Delete transaction">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      `;

      li.querySelector('.delete-tx-btn').addEventListener('click', () => {
        deleteTransaction(tx.id);
      });

      listEl.appendChild(li);
    });
  }
}

function renderJournalView() {
  const listEl = document.getElementById('journal-entries-list');
  const emptyEl = document.getElementById('journal-empty');
  const countBadge = document.getElementById('journal-total-badge');
  if (!listEl) return;

  if (!Array.isArray(appState.journal)) appState.journal = [];

  const filtered = appState.journal.filter(entry => {
    // Category filter
    if (journalCategoryFilter !== 'All' && (entry.category || 'Reflection').toLowerCase() !== journalCategoryFilter.toLowerCase()) {
      return false;
    }
    // Search query
    if (journalSearchQuery) {
      const q = journalSearchQuery.toLowerCase();
      const titleMatch = (entry.title || '').toLowerCase().includes(q);
      const contentMatch = (entry.content || '').toLowerCase().includes(q);
      const catMatch = (entry.category || '').toLowerCase().includes(q);
      if (!titleMatch && !contentMatch && !catMatch) return false;
    }
    return true;
  });

  if (countBadge) {
    countBadge.textContent = `${appState.journal.length} Note${appState.journal.length === 1 ? '' : 's'}`;
  }

  listEl.innerHTML = '';
  if (filtered.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
  } else {
    if (emptyEl) emptyEl.style.display = 'none';

    filtered.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'journal-entry-card';
      card.dataset.id = entry.id;

      const dateStr = entry.date || (entry.createdAt ? entry.createdAt.split('T')[0] : 'Note');
      const cat = entry.category || 'Reflection';
      const rawContent = entry.content || '';
      const wordCount = rawContent.trim() ? rawContent.trim().split(/\s+/).filter(Boolean).length : 0;
      const charCount = rawContent.length;
      const isLongNote = rawContent.length > 130 || rawContent.split('\n').length > 3;

      card.innerHTML = `
        <div class="journal-card-top">
          <div class="journal-card-date-wrap">
            <span class="journal-date-badge"><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i>${escapeHtml(formatAppDate(dateStr))}</span>
            <span class="journal-category-pill">${escapeHtml(cat)}</span>
            <span class="journal-word-pill">${wordCount}w • ${charCount}c</span>
          </div>
          <div class="journal-card-actions" style="border: none; padding: 0; margin: 0; display: flex; align-items: center; gap: 6px;">
            <button type="button" class="action-icon-btn copy-journal-btn" title="Copy Note Content" aria-label="Copy Note Content">
              <i class="fa-regular fa-copy"></i>
            </button>
            <button type="button" class="action-icon-btn edit-journal-btn" title="Edit in Side Editor" aria-label="Edit Note in Side Editor">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>
            <button type="button" class="btn btn-xs btn-outline read-journal-btn" title="Read Note in Big Window" aria-label="Read Note in Big Window">
              <i class="fa-solid fa-expand"></i> Read
            </button>
            <button type="button" class="action-icon-btn delete-journal-btn" title="Delete Note" aria-label="Delete Note">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
        <h4 class="journal-card-title">${escapeHtml(entry.title || 'Untitled Note')}</h4>
        <div class="journal-card-body clamped" id="note-body-${entry.id}">${escapeHtml(rawContent)}</div>
        ${isLongNote ? `
          <div class="journal-card-expand-bar">
            <button type="button" class="journal-inline-expand-btn" data-id="${entry.id}" aria-label="Expand Note">
              <i class="fa-solid fa-chevron-down"></i> <span>Expand Note</span>
            </button>
          </div>
        ` : ''}
      `;

      // Copy button
      const copyBtn = card.querySelector('.copy-journal-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const textToCopy = `${entry.title ? entry.title + '\n\n' : ''}${rawContent}`;
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(textToCopy);
            } else {
              const ta = document.createElement('textarea');
              ta.value = textToCopy;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              document.body.removeChild(ta);
            }
            playSound('success');
            showToast('Note copied to clipboard!', 'success');
          } catch (err) {
            showToast('Failed to copy note', 'warning');
          }
        });
      }

      // Inline Expand / Collapse toggle button
      const expandBtn = card.querySelector('.journal-inline-expand-btn');
      if (expandBtn) {
        expandBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const bodyEl = card.querySelector('.journal-card-body');
          if (bodyEl) {
            const isClamped = bodyEl.classList.contains('clamped');
            if (isClamped) {
              bodyEl.classList.remove('clamped');
              bodyEl.classList.add('expanded');
              expandBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i> <span>Show Less</span>';
            } else {
              bodyEl.classList.remove('expanded');
              bodyEl.classList.add('clamped');
              expandBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i> <span>Expand Note</span>';
            }
            playSound('click');
          }
        });
      }

      // Edit button -> loads into the sticky side editor with pulse animation
      const editBtn = card.querySelector('.edit-journal-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          editJournalEntry(entry.id);
        });
      }

      // Read button -> opens modal reader
      const readBtn = card.querySelector('.read-journal-btn');
      if (readBtn) {
        readBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openJournalReaderModal(entry.id);
        });
      }

      // Delete button
      const deleteBtn = card.querySelector('.delete-journal-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteJournalEntry(entry.id);
        });
      }

      // Clicking card body or title (if not clicking buttons) -> load into editor
      card.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('a')) return;
        editJournalEntry(entry.id);
      });

      listEl.appendChild(card);
    });
  }

  // Ensure mouse wheel scrolling anywhere over Previous Notes panel scrolls the list
  const historyPanel = document.querySelector('.journal-history-panel');
  if (historyPanel && !historyPanel.dataset.wheelBound) {
    historyPanel.dataset.wheelBound = 'true';
    historyPanel.addEventListener('wheel', (e) => {
      if (listEl && !e.target.closest('#journal-entries-list')) {
        listEl.scrollTop += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });
  }
}

/* ==========================================================================
   Big Window Journal Reflection & Writing System
   ========================================================================== */
function ensureJournalModals() {
  if (!document.getElementById('journal-reflection-modal')) {
    const reflectModalHtml = `
      <div id="journal-reflection-modal" class="floating-modal-backdrop" aria-hidden="true" role="dialog" aria-modal="true">
        <div class="floating-modal-dialog journal-modal-dialog-large">
          <div class="mobile-drag-pill"></div>
          <div class="floating-modal-header">
            <div class="modal-title-with-icon">
              <div class="modal-icon-badge" style="background: rgba(139, 92, 246, 0.2); color: var(--violet); border: 1px solid rgba(139, 92, 246, 0.4);">
                <i class="fa-solid fa-book-open"></i>
              </div>
              <div>
                <h3 class="floating-title">Note Reflection & Review</h3>
                <p class="floating-subtitle">Immersive reflection mode for deeper introspection and review</p>
              </div>
            </div>
            <button type="button" class="floating-close-btn" id="close-reflection-modal-btn" aria-label="Close reflection window">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="floating-modal-body" style="padding: 20px 24px;">
            <h2 class="journal-reader-title" id="reflect-note-title">Note Title</h2>
            <div class="journal-reader-meta">
              <span class="journal-date-badge" id="reflect-note-date"><i class="fa-regular fa-calendar"></i> 04-10-2026</span>
              <span class="journal-category-pill" id="reflect-note-cat">Reflection</span>
              <span class="count-badge" id="reflect-note-words">0 words</span>
            </div>
            <div class="journal-reader-content" id="reflect-note-content"></div>
            <div class="journal-reflection-box">
              <h5><i class="fa-solid fa-lightbulb"></i> Daily Reflection Guide</h5>
              <p>Take a quiet moment to consider: What lessons emerged from this experience? What are you grateful for today, and what next step will move you closer to your ideal life?</p>
            </div>
            <div class="modal-form-actions journal-reflection-actions" style="margin-top: 20px; margin-bottom: 8px; padding-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <button type="button" class="btn btn-outline text-rose btn-sm" id="reflect-delete-btn" style="border-color: rgba(244, 63, 94, 0.3);">
                <i class="fa-regular fa-trash-can"></i>
                <span>Delete Note</span>
              </button>
              <div style="display: flex; gap: 8px; align-items: center;">
                <button type="button" class="btn btn-outline btn-sm" id="reflect-close-bottom-btn">Close</button>
                <button type="button" class="btn btn-primary btn-glow btn-sm" id="reflect-edit-btn">
                  <i class="fa-regular fa-pen-to-square"></i>
                  <span>Edit in Big Window</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', reflectModalHtml);
  }

  if (!document.getElementById('journal-writer-modal')) {
    const writerModalHtml = `
      <div id="journal-writer-modal" class="floating-modal-backdrop" aria-hidden="true" role="dialog" aria-modal="true">
        <div class="floating-modal-dialog journal-modal-dialog-large">
          <div class="mobile-drag-pill"></div>
          <div class="floating-modal-header">
            <div class="modal-title-with-icon">
              <div class="modal-icon-badge" style="background: rgba(56, 189, 248, 0.2); color: var(--cyan); border: 1px solid rgba(56, 189, 248, 0.4);">
                <i class="fa-solid fa-pen-nib"></i>
              </div>
              <div>
                <h3 class="floating-title" id="writer-modal-title">Distraction-Free Journal Studio</h3>
                <p class="floating-subtitle">Spacious canvas for writing, brainstorming, and deep contemplation</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" class="btn btn-xs btn-outline" id="big-journal-new-btn" title="Start a fresh note">
                <i class="fa-solid fa-rotate-left"></i> New Note
              </button>
              <button type="button" class="floating-close-btn" id="close-writer-modal-btn" aria-label="Close writing window">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
          <div class="floating-modal-body" style="padding: 20px 24px;">
            <form id="big-journal-form">
              <input type="hidden" id="big-journal-edit-id" value="">
              <input type="hidden" id="big-journal-category" value="Reflection">
              <div class="journal-form-row" style="margin-bottom: 14px;">
                <div class="form-group" style="flex: 2;">
                  <label class="field-label" for="big-journal-title">Note Title <span class="required">*</span></label>
                  <input type="text" id="big-journal-title" class="styled-input" placeholder="e.g. Breakthrough Insights, Big Ideas..." maxlength="120" required>
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="field-label" for="big-journal-date">Date</label>
                  <input type="date" id="big-journal-date" class="styled-input">
                </div>
              </div>
              <div class="form-group" style="margin-bottom: 14px;">
                <label class="field-label">Category</label>
                <div class="journal-tag-chips" id="big-journal-tag-chips">
                  <button type="button" class="journal-tag-chip active" data-cat="Reflection">Reflection</button>
                  <button type="button" class="journal-tag-chip" data-cat="Gratitude">Gratitude</button>
                  <button type="button" class="journal-tag-chip" data-cat="Ideas">Ideas</button>
                  <button type="button" class="journal-tag-chip" data-cat="Wins">Wins</button>
                  <button type="button" class="journal-tag-chip" data-cat="Lessons">Lessons</button>
                  <button type="button" class="journal-tag-chip" data-cat="Daily Log">Daily Log</button>
                </div>
              </div>
              <div class="form-group" style="margin-bottom: 12px;">
                <label class="field-label" for="big-journal-content">Journal Thoughts & Reflections <span class="required">*</span></label>
                <textarea id="big-journal-content" class="journal-textarea-large" placeholder="Write openly... capture your stream of consciousness, breakthroughs, gratitude, decisions, and reflections in full focus." required></textarea>
                <div class="journal-stats-bar" style="margin-top: 6px;">
                  <span id="big-journal-word-counter">0 words • 0 characters</span>
                  <span>Auto-saved to LIFE OS</span>
                </div>
              </div>
              <div class="modal-form-actions" style="margin-top: 20px;">
                <button type="button" class="btn btn-outline" id="big-journal-cancel-btn">Cancel</button>
                <button type="submit" class="btn btn-primary btn-glow" id="big-journal-submit-btn">
                  <i class="fa-solid fa-floppy-disk"></i>
                  <span>Save Entry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', writerModalHtml);
  }

  // Ensure category chips in writer modal update hidden input
  const writerChips = document.querySelectorAll('#big-journal-tag-chips .journal-tag-chip');
  writerChips.forEach(chip => {
    chip.onclick = () => {
      writerChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const catInput = document.getElementById('big-journal-category');
      if (catInput) catInput.value = chip.dataset.cat || chip.textContent.trim();
    };
  });

  const contentInput = document.getElementById('big-journal-content');
  if (contentInput && !contentInput._hasWordCountListener) {
    contentInput._hasWordCountListener = true;
    contentInput.addEventListener('input', updateBigJournalWordCount);
  }
}

function openJournalReaderModal(id) {
  ensureJournalModals();
  const entry = (appState.journal || []).find(j => j.id === id);
  if (!entry) return;

  currentReadingJournalId = id;
  const modal = document.getElementById('journal-reflection-modal');
  if (!modal) return;

  const titleEl = document.getElementById('reflect-note-title');
  const dateEl = document.getElementById('reflect-note-date');
  const catEl = document.getElementById('reflect-note-cat');
  const wordsEl = document.getElementById('reflect-note-words');
  const contentEl = document.getElementById('reflect-note-content');

  const content = entry.content || '';
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;

  if (titleEl) titleEl.textContent = entry.title || 'Untitled Journal Note';
  if (dateEl) dateEl.innerHTML = `<i class="fa-regular fa-calendar" style="margin-right: 4px;"></i> ${escapeHtml(formatAppDate(entry.date) || 'Today')}`;
  if (catEl) catEl.textContent = entry.category || 'Reflection';
  if (wordsEl) wordsEl.textContent = `${words} words • ${chars} chars`;
  if (contentEl) contentEl.textContent = content;

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  playSound('click');
}

function closeJournalReaderModal() {
  const modal = document.getElementById('journal-reflection-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

function openJournalWriterModal(existingId = null) {
  ensureJournalModals();
  const modal = document.getElementById('journal-writer-modal');
  if (!modal) return;

  const idInput = document.getElementById('big-journal-edit-id');
  const titleInput = document.getElementById('big-journal-title');
  const dateInput = document.getElementById('big-journal-date');
  const catInput = document.getElementById('big-journal-category');
  const contentInput = document.getElementById('big-journal-content');
  const modalTitle = document.getElementById('writer-modal-title');
  const submitBtn = document.getElementById('big-journal-submit-btn');

  let activeCat = 'Reflection';

  if (existingId) {
    const entry = (appState.journal || []).find(j => j.id === existingId);
    if (entry) {
      if (idInput) idInput.value = entry.id;
      if (titleInput) titleInput.value = entry.title || '';
      if (dateInput) dateInput.value = entry.date || getLocalDateString(new Date());
      activeCat = entry.category || 'Reflection';
      if (catInput) catInput.value = activeCat;
      if (contentInput) contentInput.value = entry.content || '';
      if (modalTitle) modalTitle.textContent = 'Edit Journal Entry';
      if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> <span>Update Entry</span>';
    }
  } else {
    const sideTitle = document.getElementById('journal-title') || document.getElementById('journal-title-input');
    const sideContent = document.getElementById('journal-content') || document.getElementById('journal-content-input');
    const sideDate = document.getElementById('journal-date-input');
    const sideCat = document.getElementById('journal-mood') || document.getElementById('journal-category-input');
    const sideId = document.getElementById('journal-edit-id');

    const currId = sideId ? sideId.value : '';
    if (idInput) idInput.value = currId;
    if (titleInput) titleInput.value = sideTitle ? sideTitle.value : '';
    if (dateInput) dateInput.value = sideDate?.value || getLocalDateString(new Date());
    activeCat = sideCat?.value || 'Reflection';
    if (catInput) catInput.value = activeCat;
    if (contentInput) contentInput.value = sideContent ? sideContent.value : '';
    if (modalTitle) modalTitle.textContent = currId ? 'Edit Journal Entry' : 'Distraction-Free Journal Studio';
    if (submitBtn) submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span>${currId ? 'Update Entry' : 'Save Entry'}</span>`;
  }

  // Safe category chip highlighting that never throws TypeError
  document.querySelectorAll('#big-journal-tag-chips .journal-tag-chip').forEach(chip => {
    const chipCat = (chip.dataset.cat || chip.getAttribute('data-cat') || chip.textContent || '').trim().toLowerCase();
    chip.classList.toggle('active', chipCat === activeCat.toLowerCase());
  });

  updateBigJournalWordCount();
  modal.style.display = 'flex';
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  playSound('click');

  setTimeout(() => {
    if (contentInput && !contentInput.value) {
      if (titleInput) titleInput.focus();
    } else if (contentInput) {
      contentInput.focus();
    }
  }, 100);
}

function closeJournalWriterModal() {
  const modal = document.getElementById('journal-writer-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
}

function updateBigJournalWordCount() {
  const contentInput = document.getElementById('big-journal-content');
  const counterEl = document.getElementById('big-journal-word-counter');
  if (!contentInput || !counterEl) return;

  const text = contentInput.value || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  counterEl.textContent = `${words} word${words === 1 ? '' : 's'} • ${chars} character${chars === 1 ? '' : 's'}`;
}

function saveJournalEntry(title, content, category, date, existingId = null) {
  addOrUpdateJournalEntry(title, category, content, date, existingId);
}

function addOrUpdateJournalEntry(title, category, content, date, existingId = null) {
  if (!content || !content.trim()) {
    showToast('Please write some content for your journal note', 'warning');
    return;
  }

  playSound('success');
  optimisticMutation('Save Journal Note', () => {
    if (!Array.isArray(appState.journal)) appState.journal = [];

    if (existingId) {
      const idx = appState.journal.findIndex(j => j.id === existingId);
      if (idx >= 0) {
        appState.journal[idx].title = (title && title.trim()) ? title.trim() : 'Journal Entry';
        appState.journal[idx].category = category || 'Reflection';
        appState.journal[idx].content = content.trim();
        appState.journal[idx].date = date || getLocalDateString(new Date());
        appState.journal[idx].updatedAt = new Date().toISOString();
        return;
      }
    }

    const newEntry = {
      id: 'j_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: (title && title.trim()) ? title.trim() : 'Journal Entry',
      category: category || 'Reflection',
      content: content.trim(),
      date: date || getLocalDateString(new Date()),
      createdAt: new Date().toISOString()
    };

    appState.journal.unshift(newEntry);
  });

  resetJournalForm();
  renderJournalView();
  showToast(existingId ? 'Journal note updated successfully!' : 'Journal note saved to archive!', 'success');
  evaluateAchievements();
}

function deleteJournalEntry(id, skipPrompt = false) {
  const entry = (appState.journal || []).find(j => j.id === id);
  const entryTitle = entry ? entry.title : 'Journal Note';

  if (!skipPrompt && typeof document !== 'undefined') {
    promptDoubleCheck({
      title: 'Delete Journal Note?',
      subtitle: 'Remove reflection from archive',
      targetName: `📖 ${entryTitle}`,
      message: `Are you sure you want to delete "${entryTitle}"? This note will be permanently removed from your reflections archive.`,
      safetyNote: 'All other journal entries and category archives remain safe.',
      confirmText: 'Delete Note',
      confirmBtnClass: 'btn-rose',
      onConfirm: () => deleteJournalEntry(id, true)
    });
    return;
  }

  playSound('click');
  optimisticMutation('Delete Journal Note', () => {
    appState.journal = (appState.journal || []).filter(j => j.id !== id);
  });
  renderJournalView();
  showToast('Journal note deleted', 'info');
  evaluateAchievements();
  renderPage();
}

function editJournalEntry(id) {
  const entry = (appState.journal || []).find(j => j.id === id);
  if (!entry) return;

  const idInput = document.getElementById('journal-edit-id');
  const titleInput = document.getElementById('journal-title') || document.getElementById('journal-title-input');
  const catInput = document.getElementById('journal-category-input');
  const moodSelect = document.getElementById('journal-mood');
  const dateInput = document.getElementById('journal-date-input');
  const contentInput = document.getElementById('journal-content') || document.getElementById('journal-content-input');
  const saveBtnText = document.getElementById('journal-save-btn-text');

  if (idInput) idInput.value = entry.id;
  if (titleInput) titleInput.value = entry.title || '';
  if (dateInput) dateInput.value = entry.date || getLocalDateString(new Date());
  if (contentInput) {
    contentInput.value = entry.content || '';
    updateJournalWordCount();
  }

  const cat = entry.category || 'Reflection';
  if (catInput) catInput.value = cat;
  if (moodSelect) moodSelect.value = cat;
  document.querySelectorAll('#journal-tag-chips .journal-tag-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.cat.toLowerCase() === cat.toLowerCase());
  });

  if (saveBtnText) saveBtnText.textContent = 'Update Note';

  // Highlight sticky editor panel with visual pulse
  const editorPanel = document.querySelector('.journal-editor-panel');
  if (editorPanel) {
    editorPanel.classList.remove('editor-pulse-highlight');
    void editorPanel.offsetWidth;
    editorPanel.classList.add('editor-pulse-highlight');
    setTimeout(() => editorPanel.classList.remove('editor-pulse-highlight'), 1200);
  }

  if (titleInput) {
    titleInput.focus();
  }

  playSound('click');
  showToast('Note loaded into editor!', 'info');
}

function resetJournalForm() {
  const form = document.getElementById('journal-editor-form');
  if (form) form.reset();

  const bigForm = document.getElementById('big-journal-form');
  if (bigForm) bigForm.reset();

  // Reset side editor fields
  const titleInput = document.getElementById('journal-title') || document.getElementById('journal-title-input');
  if (titleInput) titleInput.value = '';

  const contentInput = document.getElementById('journal-content') || document.getElementById('journal-content-input');
  if (contentInput) contentInput.value = '';

  const idInput = document.getElementById('journal-edit-id');
  if (idInput) idInput.value = '';

  const dateInput = document.getElementById('journal-date-input');
  if (dateInput) dateInput.value = getLocalDateString(new Date());

  const catInput = document.getElementById('journal-category-input');
  if (catInput) catInput.value = 'Reflection';

  const moodSelect = document.getElementById('journal-mood');
  if (moodSelect) moodSelect.value = 'Reflection';

  document.querySelectorAll('#journal-tag-chips .journal-tag-chip').forEach((c, idx) => {
    const isReflect = (c.dataset.cat || c.getAttribute('data-cat') || c.textContent || '').trim().toLowerCase() === 'reflection';
    c.classList.toggle('active', isReflect || idx === 0);
  });

  const saveBtnText = document.getElementById('journal-save-btn-text');
  if (saveBtnText) saveBtnText.textContent = 'Save Entry';

  // Reset Big Window modal fields
  const bigTitleInput = document.getElementById('big-journal-title');
  if (bigTitleInput) bigTitleInput.value = '';

  const bigContentInput = document.getElementById('big-journal-content');
  if (bigContentInput) bigContentInput.value = '';

  const bigIdInput = document.getElementById('big-journal-edit-id');
  if (bigIdInput) bigIdInput.value = '';

  const bigDateInput = document.getElementById('big-journal-date');
  if (bigDateInput) bigDateInput.value = getLocalDateString(new Date());

  const bigCatInput = document.getElementById('big-journal-category');
  if (bigCatInput) bigCatInput.value = 'Reflection';

  document.querySelectorAll('#big-journal-tag-chips .journal-tag-chip').forEach((c, idx) => {
    const isReflect = (c.dataset.cat || c.getAttribute('data-cat') || c.textContent || '').trim().toLowerCase() === 'reflection';
    c.classList.toggle('active', isReflect || idx === 0);
  });

  const modalTitle = document.getElementById('writer-modal-title');
  if (modalTitle) modalTitle.textContent = 'Distraction-Free Journal Studio';

  const bigSubmitBtn = document.getElementById('big-journal-submit-btn');
  if (bigSubmitBtn) bigSubmitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> <span>Save Entry</span>';

  updateJournalWordCount();
  updateBigJournalWordCount();

  const bigModal = document.getElementById('journal-writer-modal');
  if (bigModal && (bigModal.classList.contains('active') || bigModal.style.display === 'flex')) {
    if (bigTitleInput) bigTitleInput.focus();
  } else {
    if (titleInput) titleInput.focus();
  }
}

function updateJournalWordCount() {
  const contentInput = document.getElementById('journal-content') || document.getElementById('journal-content-input');
  const counterEl = document.getElementById('journal-word-counter');
  if (!contentInput || !counterEl) return;

  const text = contentInput.value.trim();
  const chars = contentInput.value.length;
  const words = text.length === 0 ? 0 : text.split(/\s+/).filter(Boolean).length;
  counterEl.textContent = `${words} word${words === 1 ? '' : 's'} • ${chars} character${chars === 1 ? '' : 's'}`;
}

function renderMoodView() {
  const historyList = document.getElementById('mood-history-list');
  if (!historyList) return;

  const todayStr = getLocalDateString(new Date());
  const todayMood = appState.moodLogs.find(m => m.date === todayStr);

  const moodBtns = document.querySelectorAll('.mood-btn');
  const energySlider = document.getElementById('energy-range-input');
  const energyValDisplay = document.getElementById('energy-val-display');
  const noteInput = document.getElementById('journal-note-input');

  if (todayMood) {
    moodBtns.forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.score) === todayMood.score);
    });
    if (energySlider) energySlider.value = todayMood.energy || 4;
    if (energyValDisplay) energyValDisplay.textContent = `Level ${todayMood.energy || 4} / 5`;
    if (noteInput && !noteInput.matches(':focus')) {
      noteInput.value = todayMood.note || '';
    }
  }

  historyList.innerHTML = '';
  if (appState.moodLogs.length === 0) {
    historyList.innerHTML = `<li class="compact-item text-tertiary">No reflections recorded yet.</li>`;
  } else {
    const emojis = ['', '😫', '😕', '😐', '🙂', '🤩'];
    appState.moodLogs.slice(0, 10).forEach(log => {
      const li = document.createElement('li');
      li.className = 'mood-history-item';
      li.innerHTML = `
        <div class="mood-history-emoji">${emojis[log.score] || '✨'}</div>
        <div class="mood-history-content">
          <div class="mood-history-meta">
            <span><strong>${escapeHtml(formatAppDate(log.date))}</strong></span>
            <span>Energy: ${log.energy || 3} / 5</span>
          </div>
          <p class="mood-history-note">${escapeHtml(log.note || 'No notes added.')}</p>
        </div>
      `;
      historyList.appendChild(li);
    });
  }
}

/* ==========================================================================
   STRATEGIC GOALS & MILESTONES ENGINE
   ========================================================================== */
function getCategoryColor(cat) {
  const map = {
    'Career': { color: 'var(--violet)', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)', cssClass: 'goal-cat-career' },
    'Health': { color: 'var(--emerald)', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', cssClass: 'goal-cat-health' },
    'Finance': { color: 'var(--amber)', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', cssClass: 'goal-cat-finance' },
    'Learning': { color: 'var(--cyan)', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.3)', cssClass: 'goal-cat-learning' },
    'Personal': { color: 'var(--rose)', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.3)', cssClass: 'goal-cat-personal' }
  };
  return map[cat] || { color: 'var(--violet)', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)', cssClass: 'goal-cat-career' };
}

function renderGoalsView() {
  const container = document.getElementById('goals-cards-list');
  const emptyState = document.getElementById('goals-empty-state');
  if (!container) return;

  if (!Array.isArray(appState.goals)) appState.goals = [];
  const goals = appState.goals;

  // 1. Overview 4-Card Box Calculations
  const totalCount = goals.length;
  const completedGoals = goals.filter(g => g.status === 'completed' || Number(g.progress) >= 100);
  const completedCount = completedGoals.length;
  const activeGoals = goals.filter(g => g.status !== 'completed' && Number(g.progress) < 100);
  const activeCount = activeGoals.length;

  let avgProgress = 0;
  if (totalCount > 0) {
    const sum = goals.reduce((acc, g) => acc + (Number(g.progress) || 0), 0);
    avgProgress = Math.round(sum / totalCount);
  }

  // Populate 4-Card Overview Box
  const totalEl = document.getElementById('goals-total-count');
  if (totalEl) totalEl.textContent = totalCount;

  const activeEl = document.getElementById('goals-active-count');
  if (activeEl) activeEl.textContent = activeCount;

  const completedEl = document.getElementById('goals-completed-count');
  if (completedEl) completedEl.textContent = completedCount;

  const avgEl = document.getElementById('goals-avg-progress');
  if (avgEl) avgEl.textContent = `${avgProgress}%`;

  const avgBar = document.getElementById('goals-avg-bar');
  if (avgBar) avgBar.style.width = `${avgProgress}%`;

  // 2. Filter & Search
  let filtered = goals.slice();
  if (goalStatusFilter === 'in-progress') {
    filtered = filtered.filter(g => g.status !== 'completed' && Number(g.progress) < 100);
  } else if (goalStatusFilter === 'completed') {
    filtered = filtered.filter(g => g.status === 'completed' || Number(g.progress) >= 100);
  } else if (goalCategoryFilter && goalCategoryFilter !== 'all') {
    filtered = filtered.filter(g => (g.category || '').toLowerCase() === goalCategoryFilter.toLowerCase());
  }

  if (goalSearchQuery && goalSearchQuery.trim()) {
    const q = goalSearchQuery.trim().toLowerCase();
    filtered = filtered.filter(g => {
      const titleMatch = (g.title || '').toLowerCase().includes(q);
      const descMatch = (g.description || '').toLowerCase().includes(q);
      const catMatch = (g.category || '').toLowerCase().includes(q);
      const metMatch = (g.metrics || '').toLowerCase().includes(q);
      const mileMatch = Array.isArray(g.milestones) && g.milestones.some(m => String(m).toLowerCase().includes(q));
      return titleMatch || descMatch || catMatch || metMatch || mileMatch;
    });
  }

  // 3. Render Cards or Empty State
  if (filtered.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = filtered.map(goal => {
    const isCompleted = goal.status === 'completed' || Number(goal.progress) >= 100;
    const catStyle = getCategoryColor(goal.category);
    const progressVal = Math.min(100, Math.max(0, Number(goal.progress) || 0));

    // Target date formatting & countdown
    let dateStr = 'Ongoing';
    let daysLabel = '';
    if (goal.targetDate) {
      try {
        const parts = goal.targetDate.split('-');
        if (parts.length === 3) {
          const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          dateStr = formatAppDate(target, 'text');
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          target.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            daysLabel = `<span class="goal-deadline-badge urgent"><i class="fa-regular fa-clock"></i> Overdue</span>`;
          } else if (diffDays === 0) {
            daysLabel = `<span class="goal-deadline-badge urgent"><i class="fa-solid fa-hourglass-half"></i> Due today</span>`;
          } else {
            daysLabel = `<span class="goal-deadline-badge"><i class="fa-regular fa-calendar"></i> ${diffDays}d left</span>`;
          }
        }
      } catch (e) {
        dateStr = goal.targetDate;
      }
    }

    // Milestones rendering
    let milestonesHtml = '';
    if (Array.isArray(goal.milestones) && goal.milestones.length > 0) {
      milestonesHtml = `
        <div class="goal-milestones-list">
          ${goal.milestones.map(m => `
            <div class="goal-milestone-item">
              <i class="fa-regular fa-circle-check text-cyan" style="font-size: 0.72rem;"></i>
              <span>${escapeHtml(m)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `
      <div class="goal-card ${isCompleted ? 'completed' : ''}" data-goal-id="${goal.id}">
        <div class="goal-card-top">
          <span class="goal-cat-tag ${catStyle.cssClass}">
            ${escapeHtml(goal.category || 'General')}
          </span>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${daysLabel}
            <span class="status-badge ${isCompleted ? 'badge-success' : 'badge-neutral'}" style="font-size: 0.7rem; padding: 2px 7px;">
              ${isCompleted ? 'Completed' : 'In Progress'}
            </span>
          </div>
        </div>

        <div>
          <h3 class="goal-card-title">${escapeHtml(goal.title)}</h3>
          ${goal.description ? `<p class="goal-card-desc" style="margin-top: 6px;">${escapeHtml(goal.description)}</p>` : ''}
        </div>

        ${goal.metrics ? `
          <div style="font-size: 0.78rem; color: var(--text-secondary); background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 10px; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-bullseye text-violet"></i>
            <span>Target: <strong>${escapeHtml(goal.metrics)}</strong></span>
          </div>
        ` : ''}

        <!-- Progress Bar & Quick Adjust -->
        <div class="goal-progress-section">
          <div class="goal-progress-meta">
            <span>Velocity</span>
            <strong style="color: ${isCompleted ? 'var(--emerald)' : 'var(--cyan)'};">${progressVal}%</strong>
          </div>
          <div class="goal-progress-track">
            <div class="goal-progress-fill" style="width: ${progressVal}%;"></div>
          </div>
          <div class="goal-quick-adjust-bar">
            <button type="button" class="goal-quick-btn" data-goal-id="${goal.id}" data-delta="-10" title="Decrease 10%">-10%</button>
            <button type="button" class="goal-quick-btn" data-goal-id="${goal.id}" data-delta="10" title="Advance 10%">+10%</button>
            <button type="button" class="goal-quick-btn" data-goal-id="${goal.id}" data-delta="complete" title="${isCompleted ? 'Reset to In Progress' : 'Conquer 100%'}">
              ${isCompleted ? 'Reset' : 'Complete 100%'}
            </button>
          </div>
        </div>

        ${milestonesHtml}

        <div class="goal-card-actions">
          <span style="font-size: 0.75rem; color: var(--text-tertiary); font-family: var(--font-mono);">
            <i class="fa-regular fa-calendar-check"></i> ${dateStr}
          </span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" class="action-btn goal-toggle-btn" data-goal-id="${goal.id}" title="${isCompleted ? 'Reopen Goal' : 'Mark Completed'}">
              <i class="fa-solid ${isCompleted ? 'fa-rotate-left' : 'fa-check'}"></i>
            </button>
            <button type="button" class="action-btn goal-edit-btn" data-goal-id="${goal.id}" title="Edit Goal">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button type="button" class="action-btn action-btn-danger goal-delete-btn" data-goal-id="${goal.id}" title="Delete Goal">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderDashboardGoals() {
  const container = document.getElementById('dash-goals-list');
  if (!container) return;

  const goals = Array.isArray(appState.goals) ? appState.goals : [];
  if (goals.length === 0) {
    container.innerHTML = `
      <div style="padding: 24px 16px; text-align: center; color: var(--text-tertiary); font-size: 0.84rem; opacity: 0.65;">
        <i class="fa-solid fa-bullseye text-violet" style="font-size: 1.6rem; margin-bottom: 8px; display: block; opacity: 0.4;"></i>
        No active strategic goals
      </div>
    `;
    return;
  }

  // Prioritize active goals first, then sorted by progress
  const sorted = goals.slice().sort((a, b) => {
    const aDone = a.status === 'completed' || Number(a.progress) >= 100 ? 1 : 0;
    const bDone = b.status === 'completed' || Number(b.progress) >= 100 ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return (Number(b.progress) || 0) - (Number(a.progress) || 0);
  });

  const previewGoals = sorted;

  container.innerHTML = previewGoals.map(goal => {
    const isCompleted = goal.status === 'completed' || Number(goal.progress) >= 100;
    const catStyle = getCategoryColor(goal.category);
    const progressVal = Math.min(100, Math.max(0, Number(goal.progress) || 0));

    return `
      <div class="dash-goal-row ${isCompleted ? 'completed' : ''}">
        <div class="dash-goal-left">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="category-tag" style="color: ${catStyle.color}; font-size: 0.65rem; padding: 2px 7px;">${escapeHtml(goal.category || 'General')}</span>
            <span style="font-size: 0.72rem; color: var(--text-tertiary); font-family: var(--font-mono);">${goal.targetDate ? formatAppDate(goal.targetDate) : 'Ongoing'}</span>
          </div>
          <h4 class="dash-goal-title">${escapeHtml(goal.title)}</h4>
          <div class="dash-goal-progress-wrap">
            <div class="dash-goal-progress-bar" style="width: ${progressVal}%;"></div>
          </div>
        </div>
        <div class="dash-goal-right">
          <span class="dash-goal-pct">${progressVal}%</span>
          <button type="button" class="dash-goal-boost-btn" data-goal-id="${goal.id}" title="Advance +10%">
            ${isCompleted ? '<i class="fa-solid fa-check text-emerald"></i>' : '<i class="fa-solid fa-plus"></i>'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderAnalyticsGoals() {
  const goals = Array.isArray(appState.goals) ? appState.goals : [];
  const total = goals.length;
  const completed = goals.filter(g => g.status === 'completed' || Number(g.progress) >= 100).length;
  const compPct = total === 0 ? 0 : Math.round((completed / total) * 100);

  let avgProg = 0;
  if (total > 0) {
    const sum = goals.reduce((acc, g) => acc + (Number(g.progress) || 0), 0);
    avgProg = Math.round(sum / total);
  }

  // Count unique categories
  const categoriesMap = {};
  goals.forEach(g => {
    const cat = g.category || 'Personal';
    if (!categoriesMap[cat]) categoriesMap[cat] = [];
    categoriesMap[cat].push(g);
  });
  const catCount = Object.keys(categoriesMap).length;

  const totalEl = document.getElementById('analytics-goals-total');
  if (totalEl) totalEl.textContent = total;

  const compEl = document.getElementById('analytics-goals-completed');
  if (compEl) compEl.textContent = `${compPct}%`;

  const compSubEl = document.getElementById('analytics-goals-completed-sub');
  if (compSubEl) compSubEl.textContent = `${completed} of ${total} conquered`;

  const avgEl = document.getElementById('analytics-goals-avg-progress');
  if (avgEl) avgEl.textContent = `${avgProg}%`;

  const catEl = document.getElementById('analytics-goals-cat-count');
  if (catEl) catEl.textContent = catCount;

  // Render category velocity bars
  const barsContainer = document.getElementById('analytics-goals-category-bars');
  if (barsContainer) {
    if (total === 0) {
      barsContainer.innerHTML = `<div style="text-align: center; color: var(--text-tertiary); font-size: 0.82rem; padding: 16px;">No goals to analyze. Define strategic targets on the Goals page.</div>`;
    } else {
      const allCats = ['Career', 'Health', 'Finance', 'Learning', 'Personal'];
      barsContainer.innerHTML = allCats.map(cat => {
        const catGoals = categoriesMap[cat] || [];
        const count = catGoals.length;
        let catAvg = 0;
        if (count > 0) {
          catAvg = Math.round(catGoals.reduce((s, g) => s + (Number(g.progress) || 0), 0) / count);
        }
        const catStyle = getCategoryColor(cat);

        return `
          <div class="analytics-goal-category-row">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.8rem;">
              <span style="font-weight: 600; color: ${catStyle.color}; display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${catStyle.color};"></span>
                ${cat}
              </span>
              <span style="color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.75rem;">
                ${count} ${count === 1 ? 'goal' : 'goals'} • <strong>${catAvg}%</strong> avg
              </span>
            </div>
            <div style="height: 6px; background: rgba(255, 255, 255, 0.05); border-radius: 999px; overflow: hidden;">
              <div style="width: ${catAvg}%; height: 100%; background: ${catStyle.color}; border-radius: 999px; transition: width 0.4s ease;"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

/* ==========================================================================
   MULTI-USER AUTHENTICATION & CLOUD SYNC MODAL
   ========================================================================== */
const AUTH_EYE_OPEN_SVG = `<svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const AUTH_EYE_OFF_SVG = `<svg class="eye-off-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

function ensureAuthModal() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('auth-modal') || document.getElementById('lifeos-auth-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.className = 'auth-modal-backdrop floating-modal-backdrop';
  modal.setAttribute('aria-hidden', 'true');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  modal.innerHTML = `
    <div class="auth-modal-dialog floating-modal-dialog">
      <!-- Mobile Drag Pill Indicator -->
      <div class="mobile-drag-pill" aria-hidden="true"></div>

      <!-- Modal Header -->
      <div class="auth-modal-header floating-modal-header">
        <div class="modal-title-with-icon">
          <div class="modal-icon-badge auth-badge-icon">
            <i class="fa-solid fa-cloud-arrow-up"></i>
          </div>
          <div class="auth-title-wrap">
            <h3 class="floating-title auth-title" id="auth-modal-title">Cloud Account &amp; Sync</h3>
            <p class="floating-subtitle auth-subtitle" id="auth-modal-subtitle">Sign in to sync your command center across devices</p>
          </div>
        </div>
        <button type="button" class="floating-close-btn auth-close-btn" id="auth-modal-close-btn" aria-label="Close modal">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="auth-modal-body floating-modal-body">
        <!-- Logged In State View -->
        <div id="auth-logged-in-view" class="auth-logged-in-panel" style="display: none;">
          <div class="auth-profile-badge">
            <div class="auth-avatar-circle">
              <i class="fa-solid fa-user-astronaut"></i>
            </div>
            <h4 id="auth-user-display-name" class="auth-user-name">LifeOS Commander</h4>
            <span id="auth-user-display-email" class="auth-user-email">commander@lifeos.app</span>
            <div class="auth-partition-status">
              <span class="status-pulse-dot"></span> Cloud Partition Connected
            </div>
          </div>
          <div class="auth-profile-actions">
            <button type="button" class="btn btn-outline" id="auth-sync-now-btn">
              <i class="fa-solid fa-arrows-rotate"></i>
              <span>Sync Data Now</span>
            </button>
            <button type="button" class="btn btn-outline text-rose" id="auth-logout-btn">
              <i class="fa-solid fa-arrow-right-from-bracket"></i>
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        <!-- Auth Forms View -->
        <div id="auth-forms-view" class="auth-forms-panel">
          <!-- Segmented Tab Control -->
          <div class="auth-segmented-control" role="tablist" aria-label="Authentication modes">
            <button type="button" class="auth-segment-tab active" id="auth-tab-login" role="tab" aria-selected="true" onclick="switchAuthMode('login')">
              <i class="fa-solid fa-right-to-bracket"></i>
              <span>Sign In</span>
            </button>
            <button type="button" class="auth-segment-tab" id="auth-tab-register" role="tab" aria-selected="false" onclick="switchAuthMode('register')">
              <i class="fa-solid fa-user-plus"></i>
              <span>Create Account</span>
            </button>
          </div>

          <!-- Status / Error Banner -->
          <div id="auth-error-msg" class="auth-error-banner" role="alert" style="display: none;">
            <i class="fa-solid fa-circle-exclamation auth-error-icon"></i>
            <span class="auth-error-text"></span>
          </div>

          <!-- Main Auth Form -->
          <form id="auth-form" class="auth-form" onsubmit="handleAuthSubmit(event)" novalidate>
            <!-- Username / Name (Only visible in register mode) -->
            <div class="form-group auth-field-group" id="auth-name-group" style="display: none;">
              <label class="field-label" for="auth-reg-name">Username (Max 6 letters) <span class="required" style="color: var(--rose);">*</span></label>
              <div class="input-wrapper">
                <i class="fa-regular fa-user input-icon text-amber"></i>
                <input type="text" id="auth-reg-name" name="name" class="styled-input" placeholder="Max 6 letters (e.g. Alex)" autocomplete="username" maxlength="6" required>
              </div>
              <span class="field-hint" style="font-size: 0.74rem; color: #94a3b8; margin-top: 4px; display: block;">Input max 6 letters for your account button</span>
            </div>

            <!-- Email Address -->
            <div class="form-group auth-field-group" id="auth-email-group">
              <label class="field-label" for="auth-email-input">Email Address <span class="required">*</span></label>
              <div class="input-wrapper">
                <i class="fa-regular fa-envelope input-icon text-cyan"></i>
                <input type="email" id="auth-email-input" name="email" class="styled-input" placeholder="commander@lifeos.app" autocomplete="email" required>
              </div>
            </div>

            <!-- Password with Inline Show/Hide Toggle -->
            <div class="form-group auth-field-group" id="auth-password-group">
              <div class="auth-password-label-row">
                <label class="field-label" for="auth-password-input">Password <span class="required">*</span></label>
                <span class="auth-password-hint" id="auth-password-hint" style="display: none;">Min 6 characters</span>
              </div>
              <div class="input-wrapper password-input-wrapper">
                <i class="fa-solid fa-lock input-icon text-violet"></i>
                <input type="password" id="auth-password-input" name="password" class="styled-input auth-password-input" placeholder="••••••••" autocomplete="current-password" required>
                <button type="button" class="password-toggle-btn" id="auth-password-toggle" aria-label="Show password" onclick="event.stopPropagation(); togglePasswordVisibility()">
                  <svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="auth-action-group">
              <button type="submit" class="btn btn-primary btn-glow auth-submit-btn" id="auth-submit-btn">
                <i class="fa-solid fa-right-to-bracket" id="auth-submit-icon"></i>
                <span id="auth-submit-label">Sign In to Life OS</span>
              </button>
            </div>
          </form>

          <div class="auth-security-footer">
            <i class="fa-solid fa-shield-halved"></i>
            <span>End-to-end encrypted tenant partition with bcrypt &amp; JWT</span>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

/**
 * Toggle between 'login' and 'register' states seamlessly
 */
function switchAuthMode(mode) {
  const targetMode = mode === 'register' || mode === 'signup' ? 'register' : 'login';
  const loginTab = document.getElementById('auth-tab-login');
  const regTab = document.getElementById('auth-tab-register');
  const nameGroup = document.getElementById('auth-name-group');
  const titleEl = document.getElementById('auth-modal-title');
  const subtitleEl = document.getElementById('auth-modal-subtitle');
  const submitLabel = document.getElementById('auth-submit-label');
  const submitIcon = document.getElementById('auth-submit-icon');
  const passHint = document.getElementById('auth-password-hint');
  const passInput = document.getElementById('auth-password-input');

  hideAuthError();

  if (targetMode === 'register') {
    if (loginTab) {
      loginTab.classList.remove('active');
      loginTab.setAttribute('aria-selected', 'false');
    }
    if (regTab) {
      regTab.classList.add('active');
      regTab.setAttribute('aria-selected', 'true');
    }
    if (nameGroup) nameGroup.style.display = 'block';
    if (titleEl) titleEl.textContent = 'Create Cloud Account';
    if (subtitleEl) subtitleEl.textContent = 'Multi-device sync & isolated life data partition';
    if (submitLabel) submitLabel.textContent = 'Create Account & Sync';
    if (submitIcon) submitIcon.className = 'fa-solid fa-user-plus';
    if (passHint) passHint.style.display = 'inline-block';
    if (passInput) passInput.setAttribute('autocomplete', 'new-password');
  } else {
    if (regTab) {
      regTab.classList.remove('active');
      regTab.setAttribute('aria-selected', 'false');
    }
    if (loginTab) {
      loginTab.classList.add('active');
      loginTab.setAttribute('aria-selected', 'true');
    }
    if (nameGroup) nameGroup.style.display = 'none';
    if (titleEl) titleEl.textContent = 'Cloud Account & Sync';
    if (subtitleEl) subtitleEl.textContent = 'Sign in to sync your command center across devices';
    if (submitLabel) submitLabel.textContent = 'Sign In to Life OS';
    if (submitIcon) submitIcon.className = 'fa-solid fa-right-to-bracket';
    if (passHint) passHint.style.display = 'none';
    if (passInput) passInput.setAttribute('autocomplete', 'current-password');
  }
}

let _lastPasswordToggleTime = 0;
/**
 * Toggle password input between 'password' and 'text' and swap SVG icon
 */
function togglePasswordVisibility(targetInputId = 'auth-password-input', toggleBtnId = 'auth-password-toggle') {
  const now = Date.now();
  if (now - _lastPasswordToggleTime < 250) return;
  _lastPasswordToggleTime = now;

  const input = document.getElementById(targetInputId) || document.querySelector('.auth-password-input') || document.getElementById('auth-login-pass') || document.getElementById('auth-reg-pass');
  const btn = document.getElementById(toggleBtnId) || document.querySelector('.password-toggle-btn');
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  if (btn) {
    btn.innerHTML = isPassword ? AUTH_EYE_OFF_SVG : AUTH_EYE_OPEN_SVG;
    btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  }
}

/**
 * Display dedicated error banner
 */
function showAuthError(message) {
  const banner = document.getElementById('auth-error-msg');
  if (!banner) return;
  const textEl = banner.querySelector('.auth-error-text');
  if (textEl) {
    textEl.textContent = message;
  } else {
    banner.textContent = message;
  }
  banner.style.display = 'flex';
}

/**
 * Hide dedicated error banner
 */
function hideAuthError() {
  const banner = document.getElementById('auth-error-msg');
  if (banner) {
    banner.style.display = 'none';
    const textEl = banner.querySelector('.auth-error-text');
    if (textEl) textEl.textContent = '';
  }
}

/**
 * Defensive submit handler for authentication form
 */
async function handleAuthSubmit(event) {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }

  hideAuthError();

  const regTab = document.getElementById('auth-tab-register');
  const isRegister = regTab && regTab.classList.contains('active');

  const emailInput = document.getElementById('auth-email-input') || document.getElementById('auth-login-email') || document.getElementById('auth-reg-email');
  const passInput = document.getElementById('auth-password-input') || document.getElementById('auth-login-pass') || document.getElementById('auth-reg-pass');
  const nameInput = document.getElementById('auth-reg-name');

  const email = (emailInput?.value || '').trim();
  const password = passInput?.value || '';
  const name = (nameInput?.value || '').trim();

  // Defensive validation
  if (!email) {
    showAuthError('Please enter your email address.');
    emailInput?.focus();
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showAuthError('Please enter a valid email address (e.g. commander@lifeos.app).');
    emailInput?.focus();
    return;
  }

  if (!password) {
    showAuthError('Please enter your password.');
    passInput?.focus();
    return;
  }

  if (isRegister && !name) {
    showAuthError('Please enter a username (max 6 letters).');
    nameInput?.focus();
    return;
  }

  if (isRegister && name.length > 6) {
    showAuthError('Username must be max 6 letters to fit in your account button.');
    nameInput?.focus();
    return;
  }

  if (isRegister && password.length < 6) {
    showAuthError('Password must be at least 6 characters long.');
    passInput?.focus();
    return;
  }

  // Submit button loading state
  const submitBtn = document.getElementById('auth-submit-btn');
  const submitLabel = document.getElementById('auth-submit-label');
  const submitIcon = document.getElementById('auth-submit-icon');
  const originalLabel = submitLabel ? submitLabel.textContent : '';
  const originalIconClass = submitIcon ? submitIcon.className : '';

  if (submitBtn) submitBtn.disabled = true;
  if (submitLabel) submitLabel.textContent = isRegister ? 'Creating Account...' : 'Signing In...';
  if (submitIcon) submitIcon.className = 'fa-solid fa-spinner fa-spin';

  try {
    if (isRegister) {
      await registerUser(email, password, name.slice(0, 6));
    } else {
      await loginUser(email, password);
    }
  } catch (err) {
    showAuthError(err.message || 'Authentication failed. Please verify credentials.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (submitLabel) submitLabel.textContent = originalLabel;
    if (submitIcon) submitIcon.className = originalIconClass;
  }
}

function openAuthModal(initialMode = 'login') {
  ensureAuthModal();
  const modal = document.getElementById('auth-modal') || document.getElementById('lifeos-auth-modal');
  if (!modal) return;

  const user = getCurrentUser();
  const loggedInView = document.getElementById('auth-logged-in-view');
  const formsView = document.getElementById('auth-forms-view');
  const nameEl = document.getElementById('auth-user-display-name');
  const emailEl = document.getElementById('auth-user-display-email');

  if (user) {
    if (loggedInView) loggedInView.style.display = 'block';
    if (formsView) formsView.style.display = 'none';
    if (nameEl) nameEl.textContent = user.name || 'LifeOS Commander';
    if (emailEl) emailEl.textContent = user.email;
  } else {
    if (loggedInView) loggedInView.style.display = 'none';
    if (formsView) formsView.style.display = 'block';
    switchAuthMode(initialMode || 'login');
  }

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  if (typeof playSound === 'function') playSound('click');
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal') || document.getElementById('lifeos-auth-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('modal-open');
  hideAuthError();
}

async function registerUser(email, password, name = '') {
  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, initialData: appState })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    if (data.token) {
      localStorage.setItem('life_os_auth_token', data.token);
      localStorage.setItem('life_os_auth_user', JSON.stringify(data.user));
      showToast(`Welcome, ${data.user.name || 'Commander'}! Account created.`, 'success');
      closeAuthModal();
      await loadFullState();
      updateSyncStatus(true, 'cloud connected');
    }
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

async function loginUser(email, password) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid credentials');
    }
    if (data.token) {
      localStorage.setItem('life_os_auth_token', data.token);
      localStorage.setItem('life_os_auth_user', JSON.stringify(data.user));
      showToast(`Welcome back, ${data.user.name || data.user.email}!`, 'success');
      closeAuthModal();
      await loadFullState();
      updateSyncStatus(true, 'cloud connected');
    }
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

function logoutUser() {
  try {
    localStorage.removeItem('life_os_auth_token');
    localStorage.removeItem('life_os_auth_user');
  } catch (e) {}
  showToast('Logged out of cloud account', 'info');
  closeAuthModal();
  updateSyncStatus(true, 'db.json synchronized');
  loadFullState();
}

function ensureGoalModal() {
  if (document.getElementById('goal-modal')) return;

  const modalHtml = `
  <div id="goal-modal" class="floating-modal-backdrop" aria-hidden="true" role="dialog" aria-modal="true">
    <div class="floating-modal-dialog">
      <div class="floating-modal-header">
        <div class="modal-title-with-icon">
          <div class="modal-icon-badge" style="background: rgba(139, 92, 246, 0.15); border-color: rgba(139, 92, 246, 0.35);">
            <i class="fa-solid fa-bullseye text-violet"></i>
          </div>
          <div>
            <h3 class="floating-title" id="goal-modal-title">Create Life Goal</h3>
            <p class="floating-subtitle">Define target outcomes and milestones</p>
          </div>
        </div>
        <button type="button" class="floating-close-btn" id="goal-modal-close" aria-label="Close modal">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <form id="goal-form" style="padding: 24px;">
        <input type="hidden" id="goal-edit-id" value="">

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="field-label" for="goal-title-input">Goal Title <span class="required">*</span></label>
          <input type="text" id="goal-title-input" class="styled-input" placeholder="e.g. Build ₹1,00,000 Emergency Fund, Run 10k Marathon..." required>
        </div>

        <div class="form-row" style="margin-bottom: 16px;">
          <div class="form-group" style="flex: 1;">
            <label class="field-label" for="goal-category-select">Category</label>
            <select id="goal-category-select" class="styled-input">
              <option value="Career">Career & Work</option>
              <option value="Health">Health & Fitness</option>
              <option value="Finance">Financial Wealth</option>
              <option value="Learning">Learning & Skills</option>
              <option value="Personal">Personal & Lifestyle</option>
            </select>
          </div>

          <div class="form-group" style="flex: 1;">
            <label class="field-label" for="goal-target-date-input">Target Deadline</label>
            <input type="date" id="goal-target-date-input" class="styled-input">
          </div>
        </div>

        <div class="form-row" style="margin-bottom: 16px;">
          <div class="form-group" style="flex: 1;">
            <label class="field-label" for="goal-progress-slider">Current Progress: <strong id="goal-progress-display" class="text-cyan">0%</strong></label>
            <input type="range" id="goal-progress-slider" min="0" max="100" value="0" class="styled-range" style="width: 100%; margin-top: 8px;">
          </div>
          <div class="form-group" style="flex: 1;">
            <label class="field-label" for="goal-metrics-input">Key Metric / Target Value</label>
            <input type="text" id="goal-metrics-input" class="styled-input" placeholder="e.g. ₹75,000 / ₹1,00,000 or 10 / 12 Books">
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="field-label" for="goal-desc-input">Description & Motivation</label>
          <textarea id="goal-desc-input" class="styled-input" rows="3" placeholder="Why is this goal important? What routines will support it?" style="resize: vertical;"></textarea>
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
          <label class="field-label" for="goal-milestones-input">Milestones (Comma-separated)</label>
          <input type="text" id="goal-milestones-input" class="styled-input" placeholder="e.g. Phase 1 complete, 5k sub-28m, Final rollout">
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button type="button" class="btn btn-outline" id="goal-cancel-btn">Cancel</button>
          <button type="submit" class="btn btn-violet btn-glow" id="goal-save-btn">
            <i class="fa-solid fa-floppy-disk"></i>
            <span id="goal-save-btn-text">Save Goal</span>
          </button>
        </div>
      </form>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openGoalModal(goalId = null) {
  ensureGoalModal();
  const modal = document.getElementById('goal-modal');
  if (!modal) return;

  const titleHeader = document.getElementById('goal-modal-title');
  const editIdInput = document.getElementById('goal-edit-id');
  const titleInput = document.getElementById('goal-title-input');
  const catSelect = document.getElementById('goal-category-select');
  const targetDateInput = document.getElementById('goal-target-date-input');
  const progressSlider = document.getElementById('goal-progress-slider');
  const progressDisplay = document.getElementById('goal-progress-display');
  const metricsInput = document.getElementById('goal-metrics-input');
  const descInput = document.getElementById('goal-desc-input');
  const milestonesInput = document.getElementById('goal-milestones-input');
  const saveBtnText = document.getElementById('goal-save-btn-text');

  if (goalId) {
    const goal = (appState.goals || []).find(g => g.id === goalId);
    if (!goal) return;
    if (titleHeader) titleHeader.textContent = 'Edit Strategic Goal';
    if (editIdInput) editIdInput.value = goal.id;
    if (titleInput) titleInput.value = goal.title || '';
    if (catSelect) catSelect.value = goal.category || 'Career';
    if (targetDateInput) targetDateInput.value = goal.targetDate || '';
    if (progressSlider) progressSlider.value = goal.progress || 0;
    if (progressDisplay) progressDisplay.textContent = `${goal.progress || 0}%`;
    if (metricsInput) metricsInput.value = goal.metrics || '';
    if (descInput) descInput.value = goal.description || '';
    if (milestonesInput) milestonesInput.value = Array.isArray(goal.milestones) ? goal.milestones.join(', ') : '';
    if (saveBtnText) saveBtnText.textContent = 'Update Goal';
  } else {
    if (titleHeader) titleHeader.textContent = 'Create Life Goal';
    if (editIdInput) editIdInput.value = '';
    if (titleInput) titleInput.value = '';
    if (catSelect) catSelect.value = 'Career';
    if (targetDateInput) targetDateInput.value = getLocalDateString(new Date());
    if (progressSlider) progressSlider.value = 0;
    if (progressDisplay) progressDisplay.textContent = '0%';
    if (metricsInput) metricsInput.value = '';
    if (descInput) descInput.value = '';
    if (milestonesInput) milestonesInput.value = '';
    if (saveBtnText) saveBtnText.textContent = 'Save Goal';
  }

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  if (titleInput) setTimeout(() => titleInput.focus(), 60);
  playSound('click');
}

function closeGoalModal() {
  const modal = document.getElementById('goal-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

function addOrUpdateGoal(goalData) {
  if (!Array.isArray(appState.goals)) appState.goals = [];

  const isEdit = Boolean(goalData.id);
  const cleanProgress = Math.min(100, Math.max(0, Number(goalData.progress) || 0));
  const cleanStatus = cleanProgress >= 100 ? 'completed' : 'in-progress';

  let milestoneArr = [];
  if (typeof goalData.milestones === 'string') {
    milestoneArr = goalData.milestones.split(',').map(s => s.trim()).filter(Boolean);
  } else if (Array.isArray(goalData.milestones)) {
    milestoneArr = goalData.milestones;
  }

  if (isEdit) {
    const existing = appState.goals.find(g => g.id === goalData.id);
    if (existing) {
      playSound('success');
      optimisticMutation('Update Goal', () => {
        existing.title = goalData.title.trim();
        existing.category = goalData.category || 'Career';
        existing.targetDate = goalData.targetDate || '';
        existing.progress = cleanProgress;
        existing.status = cleanStatus;
        existing.metrics = (goalData.metrics || '').trim();
        existing.description = (goalData.description || '').trim();
        existing.milestones = milestoneArr;
        existing.updatedAt = new Date().toISOString();
      });
      showToast(`Updated "${goalData.title}"`, 'success');
    }
  } else {
    const newGoal = {
      id: 'goal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: goalData.title.trim(),
      category: goalData.category || 'Career',
      targetDate: goalData.targetDate || '',
      progress: cleanProgress,
      status: cleanStatus,
      metrics: (goalData.metrics || '').trim(),
      description: (goalData.description || '').trim(),
      milestones: milestoneArr,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    playSound('success');
    optimisticMutation('Create Goal', () => {
      appState.goals.unshift(newGoal);
    });
    showToast(`Created goal "${newGoal.title}"`, 'success');
  }

  evaluateAchievements();
}

function updateGoalProgress(goalId, newProgress) {
  const goal = (appState.goals || []).find(g => g.id === goalId);
  if (!goal) return;

  const clamped = Math.min(100, Math.max(0, Number(newProgress) || 0));
  playSound('click');
  optimisticMutation('Update Goal Progress', () => {
    goal.progress = clamped;
    goal.status = clamped >= 100 ? 'completed' : 'in-progress';
    goal.updatedAt = new Date().toISOString();
  });

  if (clamped >= 100) {
    playSound('achievement');
    showToast(`Goal Conquered: "${goal.title}"!`, 'achievement', '🏆 Target Reached');
  } else {
    showToast(`Progress: ${clamped}% on "${goal.title}"`, 'info');
  }
  evaluateAchievements();
}

function toggleGoalStatus(goalId) {
  const goal = (appState.goals || []).find(g => g.id === goalId);
  if (!goal) return;

  const currentlyDone = goal.status === 'completed' || Number(goal.progress) >= 100;
  playSound('click');
  optimisticMutation('Toggle Goal Status', () => {
    if (currentlyDone) {
      goal.status = 'in-progress';
      goal.progress = Math.min(90, goal.progress || 0);
    } else {
      goal.status = 'completed';
      goal.progress = 100;
    }
    goal.updatedAt = new Date().toISOString();
  });

  if (!currentlyDone) {
    playSound('achievement');
    showToast(`Goal Completed: "${goal.title}"!`, 'achievement', '🏆 Milestone Conquered');
  } else {
    showToast(`Reopened "${goal.title}"`, 'info');
  }
  evaluateAchievements();
}

function deleteGoal(goalId, skipPrompt = false) {
  const goal = (appState.goals || []).find(g => g.id === goalId);
  if (!goal) return;
  const goalTitle = goal.title || 'Goal';

  if (!skipPrompt && typeof document !== 'undefined') {
    promptDoubleCheck({
      title: 'Delete Strategic Goal?',
      subtitle: 'Remove milestone and progress tracking',
      targetName: `🎯 ${goalTitle}`,
      message: `Are you sure you want to delete the goal "${goalTitle}"? All tracked milestones and progress for this goal will be removed.`,
      safetyNote: 'Your other life goals, metrics, and achievements remain safe.',
      confirmText: 'Delete Goal',
      confirmBtnClass: 'btn-rose',
      onConfirm: () => deleteGoal(goalId, true)
    });
    return;
  }

  playSound('click');
  optimisticMutation('Delete Goal', () => {
    appState.goals = (appState.goals || []).filter(g => g.id !== goalId);
  });
  showToast('Goal deleted', 'info');
  evaluateAchievements();
  renderGoalsView();
  renderPage();
}

/* ==========================================================================
   Double-Check Safety Confirmation Modal Engine
   Guarantees accidental deletion prevention across ALL app features
   ========================================================================== */
let pendingDoubleCheckAction = null;

function ensureDoubleCheckModal() {
  if (typeof document === 'undefined') return null;
  let modal = document.getElementById('double-check-modal');
  if (modal) {
    if (!modal.dataset.initialized) {
      modal.dataset.initialized = 'true';
      const closeBtn = modal.querySelector('#double-check-close-btn');
      const cancelBtn = modal.querySelector('#double-check-cancel-btn');
      const confirmBtn = modal.querySelector('#double-check-confirm-btn');

      if (closeBtn) closeBtn.addEventListener('click', closeDoubleCheckModal);
      if (cancelBtn) cancelBtn.addEventListener('click', closeDoubleCheckModal);
      if (confirmBtn) confirmBtn.addEventListener('click', executeDoubleCheckConfirm);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeDoubleCheckModal();
      });
    }
    return modal;
  }

  modal = document.createElement('div');
  modal.id = 'double-check-modal';
  modal.className = 'floating-modal-backdrop';
  modal.setAttribute('aria-hidden', 'true');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.dataset.initialized = 'true';
  modal.innerHTML = `
    <div class="floating-modal-dialog double-check-dialog" style="max-width: 480px; border: 1px solid rgba(244, 63, 94, 0.35); box-shadow: 0 25px 60px rgba(0,0,0,0.85), 0 0 35px rgba(244, 63, 94, 0.2);">
      <div class="floating-modal-header" style="border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 14px;">
        <div class="modal-title-with-icon">
          <div class="modal-icon-badge" id="double-check-icon" style="background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.3);">
            <i class="fa-solid fa-triangle-exclamation text-rose"></i>
          </div>
          <div>
            <h3 class="floating-title" id="double-check-title" style="color: var(--text-primary); font-size: 1.15rem; font-weight: 700;">Double-Check Confirmation</h3>
            <p class="floating-subtitle" id="double-check-subtitle" style="font-size: 0.8rem; color: var(--text-tertiary);">Please confirm to prevent accidental loss</p>
          </div>
        </div>
        <button type="button" class="modal-close-btn" id="double-check-close-btn" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div style="padding: 16px 20px;">
        <div id="double-check-badge-wrap" style="margin-bottom: 12px;">
          <span id="double-check-item-badge" class="count-badge" style="background: rgba(244, 63, 94, 0.12); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.3); font-size: 0.85rem; padding: 4px 10px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block;">
            Target Item
          </span>
        </div>
        <p id="double-check-message" style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin: 0 0 16px 0;">
          Are you sure you want to proceed with this deletion? This action cannot be undone.
        </p>
        <div id="double-check-safety-note" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: var(--radius-md); padding: 10px 12px; margin-bottom: 20px; display: flex; align-items: flex-start; gap: 8px;">
          <i class="fa-solid fa-shield-halved text-emerald" style="margin-top: 2px;"></i>
          <span id="double-check-safety-text" style="font-size: 0.78rem; color: var(--text-tertiary); line-height: 1.4;">
            All other workspace records and settings remain safe and untouched.
          </span>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button type="button" class="btn btn-outline" id="double-check-cancel-btn">
            Cancel & Keep
          </button>
          <button type="button" class="btn btn-rose" id="double-check-confirm-btn" style="background: var(--rose); color: #fff; border-color: var(--rose);">
            <i class="fa-solid fa-trash-can"></i>
            <span id="double-check-confirm-text">Yes, Delete</span>
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const closeBtn = modal.querySelector('#double-check-close-btn');
  const cancelBtn = modal.querySelector('#double-check-cancel-btn');
  const confirmBtn = modal.querySelector('#double-check-confirm-btn');

  if (closeBtn) closeBtn.addEventListener('click', closeDoubleCheckModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeDoubleCheckModal);
  if (confirmBtn) confirmBtn.addEventListener('click', executeDoubleCheckConfirm);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeDoubleCheckModal();
  });

  return modal;
}

function openDoubleCheckModal() {
  const modal = ensureDoubleCheckModal();
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.add('modal-open');
    }
  }
}

function closeDoubleCheckModal() {
  const modal = document.getElementById('double-check-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    pendingDoubleCheckAction = null;
    if (typeof document !== 'undefined' && document.body) {
      const otherActive = document.querySelector('.floating-modal-backdrop.active');
      if (!otherActive) {
        document.body.classList.remove('modal-open');
      }
    }
  }
}

function executeDoubleCheckConfirm() {
  const action = pendingDoubleCheckAction;
  pendingDoubleCheckAction = null;
  closeDoubleCheckModal();
  if (typeof action === 'function') {
    try {
      const res = action();
      if (res && typeof res.catch === 'function') {
        res.catch(err => {
          console.error('Double-check action error:', err);
          showToast('Operation failed: ' + (err.message || 'Error occurred'), 'error');
        });
      }
    } catch (err) {
      console.error('Double-check action error:', err);
      showToast('Operation failed: ' + (err.message || 'Error occurred'), 'error');
    }
  }
}

function promptDoubleCheck({
  title = 'Double-Check Confirmation',
  subtitle = 'Please confirm to prevent accidental loss',
  targetName = 'Selected Item',
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  safetyNote = 'All other workspace records and settings remain safe and untouched.',
  confirmText = 'Yes, Delete',
  iconClass = 'fa-solid fa-triangle-exclamation text-rose',
  iconBadgeBg = 'rgba(244, 63, 94, 0.15)',
  iconBadgeBorder = 'rgba(244, 63, 94, 0.3)',
  confirmBtnClass = 'btn-rose',
  onConfirm
} = {}) {
  const modal = ensureDoubleCheckModal();
  if (!modal || typeof document === 'undefined') {
    if (typeof onConfirm === 'function') onConfirm();
    return;
  }

  const titleEl = document.getElementById('double-check-title');
  if (titleEl) titleEl.textContent = title;

  const subtitleEl = document.getElementById('double-check-subtitle');
  if (subtitleEl) subtitleEl.textContent = subtitle;

  const badgeEl = document.getElementById('double-check-item-badge');
  if (badgeEl) badgeEl.textContent = targetName;

  const msgEl = document.getElementById('double-check-message');
  if (msgEl) msgEl.textContent = message;

  const safetyEl = document.getElementById('double-check-safety-text');
  if (safetyEl) safetyEl.textContent = safetyNote;

  const confirmTextEl = document.getElementById('double-check-confirm-text');
  if (confirmTextEl) confirmTextEl.textContent = confirmText;

  const iconEl = document.getElementById('double-check-icon');
  if (iconEl) {
    iconEl.style.background = iconBadgeBg;
    iconEl.style.borderColor = iconBadgeBorder;
    iconEl.innerHTML = `<i class="${iconClass}"></i>`;
  }

  const confirmBtn = document.getElementById('double-check-confirm-btn');
  if (confirmBtn) {
    confirmBtn.className = `btn ${confirmBtnClass}`;
  }

  pendingDoubleCheckAction = onConfirm;
  openDoubleCheckModal();
}

function renderSettingsView() {
  const syncStatusEl = document.getElementById('settings-sync-status');
  const user = getCurrentUser();
  if (syncStatusEl) {
    if (user) {
      syncStatusEl.textContent = `Cloud Connected • ${user.email}`;
      syncStatusEl.style.color = 'var(--emerald)';
    } else if (isOnline) {
      syncStatusEl.textContent = 'Local Server Active (Sign in to sync across devices)';
      syncStatusEl.style.color = 'var(--cyan)';
    } else {
      syncStatusEl.textContent = 'Offline Mode (Saved locally on this device)';
      syncStatusEl.style.color = 'var(--amber)';
    }
  }

  const authBtnLabel = document.getElementById('settings-auth-btn-label');
  if (authBtnLabel) {
    authBtnLabel.textContent = user ? `Account: ${user.name || user.email.split('@')[0]}` : 'Sign In / Switch Account';
  }

  const soundLabel = document.getElementById('settings-sound-label');
  const soundBtn = document.getElementById('settings-sound-toggle-btn');
  const soundIcon = document.getElementById('settings-sound-icon');
  if (soundLabel) {
    soundLabel.textContent = appState.soundEnabled ? 'Sound: On' : 'Sound: Muted';
  }
  if (soundBtn) {
    soundBtn.style.color = appState.soundEnabled ? 'var(--amber)' : 'var(--text-tertiary)';
    soundBtn.style.borderColor = appState.soundEnabled ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.15)';
  }
  if (soundIcon) {
    soundIcon.className = appState.soundEnabled ? 'fa-solid fa-volume-high text-amber' : 'fa-solid fa-volume-xmark text-tertiary';
  }

  const weekSelect = document.getElementById('settings-weekstart-select');
  if (weekSelect && typeof localStorage !== 'undefined') {
    const savedWeek = localStorage.getItem('life_os_week_start') || 'monday';
    weekSelect.value = savedWeek;
  }

  const timeSelect = document.getElementById('settings-timeformat-select');
  if (timeSelect && typeof localStorage !== 'undefined') {
    const savedTime = localStorage.getItem('life_os_time_format') || '12h';
    timeSelect.value = savedTime;
  }

  const hCount = document.getElementById('settings-habit-count');
  if (hCount) hCount.textContent = `${(appState.habits || []).length} active habits`;

  const tCount = document.getElementById('settings-task-count');
  if (tCount) {
    const total = (appState.tasks || []).length;
    const done = (appState.tasks || []).filter(t => t.completed).length;
    tCount.textContent = `${total} tasks (${done} completed)`;
  }

  const schCount = document.getElementById('settings-sch-count');
  if (schCount) schCount.textContent = `${(appState.schedule || []).length} scheduled events`;

  const goalCount = document.getElementById('settings-goal-count');
  if (goalCount) {
    const totalG = (appState.goals || []).length;
    const completedG = (appState.goals || []).filter(g => g.status === 'completed' || Number(g.progress) >= 100).length;
    goalCount.textContent = `${totalG} goals (${completedG} achieved)`;
  }

  const txCount = document.getElementById('settings-tx-count');
  if (txCount) txCount.textContent = `${(appState.transactions || []).length} ledger entries`;

  const journalCount = document.getElementById('settings-journal-count');
  if (journalCount) journalCount.textContent = `${(appState.journal || []).length} notes archived`;

  const achCount = document.getElementById('settings-ach-count');
  if (achCount) {
    const unlocked = Object.values(appState.unlockedAchievements || {}).length;
    achCount.textContent = `${unlocked} unlocked`;
  }
}

function initSettings() {
  if (typeof document === 'undefined') return;

  // Account modal button in settings
  safeListener('settings-open-auth-btn', 'click', () => {
    openAuthModal();
  });

  // Sound toggle button in settings
  safeListener('settings-sound-toggle-btn', 'click', () => {
    toggleSound();
    renderSettingsView();
  });

  // Week start selector in settings
  safeListener('settings-weekstart-select', 'change', (e) => {
    localStorage.setItem('life_os_week_start', e.target.value);
    showToast(`Week start day set to ${e.target.value === 'sunday' ? 'Sunday' : 'Monday'}`, 'info');
    renderCalendarView();
  });

  // Time format selector in settings
  safeListener('settings-timeformat-select', 'change', (e) => {
    localStorage.setItem('life_os_time_format', e.target.value);
    showToast(`Time format set to ${e.target.value === '24h' ? '24-Hour (Military)' : '12-Hour (AM / PM)'}`, 'info');
    updateClock();
    renderCalendarView();
    if (typeof renderDashboard === 'function') renderDashboard();
  });

  // Force Full Database Sync
  safeListener('settings-sync-btn', 'click', async () => {
    const btn = document.getElementById('settings-sync-btn');
    const icon = btn ? btn.querySelector('i') : null;
    if (icon) icon.classList.add('fa-spin');
    try {
      await syncWithBackend();
      await loadFullState();
      showToast('All workspace data synchronized successfully!', 'success');
    } catch (err) {
      showToast('Sync error: ' + (err.message || 'Failed to sync'), 'error');
    } finally {
      if (icon) icon.classList.remove('fa-spin');
      renderSettingsView();
    }
  });

  // Export JSON Backup
  safeListener('export-json-btn', 'click', () => {
    try {
      const exportData = {
        habits: appState.habits || [],
        tasks: appState.tasks || [],
        transactions: appState.transactions || [],
        schedule: appState.schedule || [],
        goals: appState.goals || [],
        journal: appState.journal || [],
        moodLogs: appState.moodLogs || [],
        scoreSnapshots: appState.scoreSnapshots || [],
        unlockedAchievements: appState.unlockedAchievements || {},
        settings: {
          weekStart: (typeof localStorage !== 'undefined' && localStorage.getItem('life_os_week_start')) || 'monday',
          timeFormat: (typeof localStorage !== 'undefined' && localStorage.getItem('life_os_time_format')) || '12h',
          soundEnabled: appState.soundEnabled
        },
        exportedAt: new Date().toISOString()
      };
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement('a');
      const today = getLocalDateString(new Date());
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `lifeos-backup-${today}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Backup JSON exported successfully! 💾', 'success');
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error');
    }
  });

  // Import JSON Backup with Double-Check Confirmation
  safeListener('import-json-input', 'change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (!imported || typeof imported !== 'object') throw new Error('Invalid JSON format');

        promptDoubleCheck({
          title: 'Restore from Backup File?',
          subtitle: 'Replace current workspace with backup data',
          targetName: `📁 ${file.name}`,
          message: 'This will import records from your backup file into your workspace. Existing items will be replaced by the backup contents.',
          safetyNote: 'Ensure this backup file is from a trusted Life OS export.',
          confirmText: 'Restore Workspace',
          confirmBtnClass: 'btn-cyan',
          iconClass: 'fa-solid fa-file-import text-cyan',
          iconBadgeBg: 'rgba(6, 182, 212, 0.15)',
          iconBadgeBorder: 'rgba(6, 182, 212, 0.3)',
          onConfirm: async () => {
            if (Array.isArray(imported.habits)) appState.habits = imported.habits;
            if (Array.isArray(imported.tasks)) appState.tasks = imported.tasks;
            if (Array.isArray(imported.transactions)) appState.transactions = imported.transactions;
            if (Array.isArray(imported.schedule)) appState.schedule = imported.schedule;
            if (Array.isArray(imported.goals)) appState.goals = imported.goals;
            if (Array.isArray(imported.journal)) appState.journal = imported.journal;
            if (Array.isArray(imported.moodLogs)) appState.moodLogs = imported.moodLogs;
            if (Array.isArray(imported.scoreSnapshots)) appState.scoreSnapshots = imported.scoreSnapshots;
            if (imported.unlockedAchievements && typeof imported.unlockedAchievements === 'object') {
              appState.unlockedAchievements = imported.unlockedAchievements;
            } else if (imported.achievements) {
              appState.unlockedAchievements = imported.achievements;
            }
            if (imported.settings && typeof localStorage !== 'undefined') {
              if (imported.settings.weekStart) localStorage.setItem('life_os_week_start', imported.settings.weekStart);
              if (imported.settings.timeFormat) localStorage.setItem('life_os_time_format', imported.settings.timeFormat);
              if (typeof imported.settings.soundEnabled === 'boolean') {
                appState.soundEnabled = imported.settings.soundEnabled;
                localStorage.setItem('life_os_sound', appState.soundEnabled ? 'true' : 'false');
              }
            }
            if (typeof localStorage !== 'undefined') localStorage.removeItem('life_os_wiped');
            await saveFullStateToServer();
            saveStateLocally();
            renderPage();
            renderSettingsView();
            evaluateAchievements(true);
            showToast('Workspace restored successfully from backup! 🚀', 'success');
          }
        });
      } catch (err) {
        showToast('Failed to import backup: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Tool 1: Clear Completed Tasks with Double-Check Protection
  safeListener('settings-clear-completed-btn', 'click', () => {
    const doneTasks = (appState.tasks || []).filter(t => t.completed);
    if (doneTasks.length === 0) {
      showToast('No completed tasks to clear', 'info');
      return;
    }
    promptDoubleCheck({
      title: 'Clear Completed Tasks?',
      subtitle: 'Declutter your focus tasks list',
      targetName: `${doneTasks.length} Completed Task${doneTasks.length === 1 ? '' : 's'}`,
      message: `You are about to remove ${doneTasks.length} completed task${doneTasks.length === 1 ? '' : 's'}. All active, uncompleted tasks and priorities will stay completely safe and untouched.`,
      safetyNote: 'Active and upcoming tasks are preserved.',
      confirmText: 'Clear Completed',
      confirmBtnClass: 'btn-cyan',
      iconClass: 'fa-solid fa-list-check text-cyan',
      iconBadgeBg: 'rgba(6, 182, 212, 0.15)',
      iconBadgeBorder: 'rgba(6, 182, 212, 0.3)',
      onConfirm: () => {
        optimisticMutation('Clear Completed Tasks', () => {
          appState.tasks = (appState.tasks || []).filter(t => !t.completed);
        });
        showToast(`Cleared ${doneTasks.length} completed task${doneTasks.length === 1 ? '' : 's'}!`, 'success');
        renderSettingsView();
        renderTasksView();
        renderPage();
      }
    });
  });

  // Tool 2: Clear Past Calendar Blocks with Double-Check Protection
  safeListener('settings-clear-events-btn', 'click', () => {
    const todayStr = getLocalDateString(new Date());
    const isPastNonRecurring = (e) => {
      const isRecurring = e.recurrence === 'everyday' || e.repeat === 'everyday' || e.recurrence === 'selected_days' || (Array.isArray(e.repeatDays) && e.repeatDays.length > 0);
      return !isRecurring && e.date && e.date < todayStr;
    };
    const pastEvents = (appState.schedule || []).filter(isPastNonRecurring);
    if (pastEvents.length === 0) {
      showToast('No past calendar events to clear. Today and future schedule are active.', 'info');
      return;
    }
    promptDoubleCheck({
      title: 'Clear Past Calendar Blocks?',
      subtitle: 'Free up schedule space from previous days',
      targetName: `${pastEvents.length} Past Block${pastEvents.length === 1 ? '' : 's'}`,
      message: `You are about to remove ${pastEvents.length} past schedule block${pastEvents.length === 1 ? '' : 's'} from days prior to ${todayStr}. Today's schedule and all future blocks will remain 100% intact.`,
      safetyNote: "Today's schedule and recurring events remain intact.",
      confirmText: 'Clear Past Blocks',
      confirmBtnClass: 'btn-amber',
      iconClass: 'fa-solid fa-clock-rotate-left text-amber',
      iconBadgeBg: 'rgba(245, 158, 11, 0.15)',
      iconBadgeBorder: 'rgba(245, 158, 11, 0.3)',
      onConfirm: () => {
        optimisticMutation('Clear Past Schedule Events', () => {
          appState.schedule = (appState.schedule || []).filter(e => !isPastNonRecurring(e));
        });
        showToast(`Removed ${pastEvents.length} past schedule block${pastEvents.length === 1 ? '' : 's'}!`, 'success');
        renderSettingsView();
        renderCalendarView();
        renderPage();
      }
    });
  });

  // Tool 3: Restore Sample Starter Baseline with Double-Check Protection
  safeListener('reset-demo-btn', 'click', () => {
    promptDoubleCheck({
      title: 'Restore Starter Baseline?',
      subtitle: 'Fill workspace with comprehensive starter kit',
      targetName: 'Starter Kit (10-20 Items per Pillar)',
      message: 'This will reset your workspace data to the rich starter baseline across all 5 life pillars (12 habits, 18 tasks, 14 schedule blocks, 10 goals, 16 transactions, and 12 journal notes) for testing and planning.',
      safetyNote: 'You can export a JSON backup beforehand if you wish to keep your current data.',
      confirmText: 'Restore Baseline',
      confirmBtnClass: 'btn-violet',
      iconClass: 'fa-solid fa-wand-magic-sparkles text-violet',
      iconBadgeBg: 'rgba(168, 85, 247, 0.15)',
      iconBadgeBorder: 'rgba(168, 85, 247, 0.3)',
      onConfirm: async () => {
        const source = (typeof DEFAULT_SAMPLE_DATA !== 'undefined' ? DEFAULT_SAMPLE_DATA : (typeof DEFAULT_STATE !== 'undefined' ? DEFAULT_STATE : getStarterBaseline()));
        appState.habits = JSON.parse(JSON.stringify(source.habits || []));
        appState.tasks = JSON.parse(JSON.stringify(source.tasks || []));
        appState.schedule = JSON.parse(JSON.stringify(source.schedule || []));
        appState.goals = JSON.parse(JSON.stringify(source.goals || []));
        appState.transactions = JSON.parse(JSON.stringify(source.transactions || []));
        appState.journal = JSON.parse(JSON.stringify(source.journal || []));
        if (source.moodLogs) appState.moodLogs = JSON.parse(JSON.stringify(source.moodLogs));
        if (source.unlockedAchievements) {
          appState.unlockedAchievements = JSON.parse(JSON.stringify(source.unlockedAchievements));
        }
        if (typeof localStorage !== 'undefined') localStorage.removeItem('life_os_wiped');
        await saveFullStateToServer();
        saveStateLocally();
        renderPage();
        renderSettingsView();
        evaluateAchievements(true);
        showToast('Workspace restored to comprehensive sample baseline! ✨', 'success');
      }
    });
  });

  // Tool 4: Wipe All Records with Double-Check Protection
  safeListener('settings-wipe-all-btn', 'click', () => {
    promptDoubleCheck({
      title: 'Wipe All Records (Blank Slate)?',
      subtitle: 'Permanent workspace reset to 0 items',
      targetName: 'All 5 Life Pillars -> 0 Records',
      message: 'Are you completely sure? This will erase all habits, tasks, calendar blocks, financial transactions, and journal entries. Your workspace will start with a completely clean slate.',
      safetyNote: 'Recommendation: Download a JSON backup first if you have important records.',
      confirmText: 'Yes, Wipe Everything',
      confirmBtnClass: 'btn-rose',
      iconClass: 'fa-solid fa-triangle-exclamation text-rose',
      iconBadgeBg: 'rgba(244, 63, 94, 0.2)',
      iconBadgeBorder: 'rgba(244, 63, 94, 0.4)',
      onConfirm: async () => {
        appState.habits = [];
        appState.tasks = [];
        appState.schedule = [];
        appState.goals = [];
        appState.transactions = [];
        appState.journal = [];
        appState.moodLogs = [];
        appState.scoreSnapshots = [];
        if (typeof localStorage !== 'undefined') localStorage.setItem('life_os_wiped', 'true');
        await saveFullStateToServer();
        saveStateLocally();
        renderPage();
        renderSettingsView();
        showToast('Workspace wiped clean. Ready for a fresh start! 🌿', 'info');
      }
    });
  });

  // Render initial settings values
  renderSettingsView();
}

/* ==========================================================================
   Mutations & Actions
   ========================================================================== */
function addScheduleEvent(title, date, hour, duration = 1, category = 'Work', recurrence = 'once', repeatDays = []) {
  const cleanRecurrence = ['everyday', 'selected_days'].includes(recurrence) ? recurrence : 'once';
  const cleanRepeatDays = Array.isArray(repeatDays) ? repeatDays : [];

  const newEvent = {
    id: 'sch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    title: title.trim(),
    date: date || appState.selectedCalendarDate || getLocalDateString(new Date()),
    hour: Number(hour),
    startHour: Number(hour),
    duration: Number(duration) || 1,
    durationHours: Number(duration) || 1,
    category: category || 'Work',
    recurrence: cleanRecurrence,
    repeatDays: cleanRepeatDays,
    completed: false,
    completedDates: [],
    createdAt: new Date().toISOString()
  };

  playSound('success');
  optimisticMutation('Add Schedule Event', () => {
    if (!Array.isArray(appState.schedule)) appState.schedule = [];
    appState.schedule.push(newEvent);
  });

  let toastMsg = `Scheduled "${newEvent.title}" at ${formatHourLabel(newEvent.hour)}`;
  if (cleanRecurrence === 'everyday') {
    toastMsg = `Scheduled "${newEvent.title}" Everyday at ${formatHourLabel(newEvent.hour)}`;
  } else if (cleanRecurrence === 'selected_days' && cleanRepeatDays.length > 0) {
    toastMsg = `Scheduled "${newEvent.title}" on (${cleanRepeatDays.join(', ')}) at ${formatHourLabel(newEvent.hour)}`;
  }
  showToast(toastMsg, 'success');
  evaluateAchievements();
}

function toggleScheduleEvent(id, dateStr = (typeof appState !== 'undefined' ? appState.selectedCalendarDate : null)) {
  const evt = (appState.schedule || []).find(s => s.id === id);
  if (!evt) return;

  const targetDate = dateStr || getLocalDateString(new Date());
  if (!Array.isArray(evt.completedDates)) {
    evt.completedDates = evt.completed && evt.date ? [evt.date] : [];
  }
  const isDone = evt.completedDates.includes(targetDate);
  if (isDone) {
    playSound('click');
  } else {
    playSound('success');
  }

  optimisticMutation('Toggle Schedule Event', () => {
    const target = (appState.schedule || []).find(s => s.id === id);
    if (!target) return;
    if (!Array.isArray(target.completedDates)) {
      target.completedDates = target.completed && target.date ? [target.date] : [];
    }
    const idx = target.completedDates.indexOf(targetDate);
    if (idx >= 0) {
      target.completedDates.splice(idx, 1);
    } else {
      target.completedDates.push(targetDate);
    }
    target.completed = target.completedDates.length > 0;
  });

  if (!isDone) {
    showToast(`Focus block "${evt.title}" marked completed! ⏰`, 'success');
  } else {
    showToast(`Focus block "${evt.title}" marked incomplete`, 'info');
  }
  if (typeof renderDayAgendaPlanner === 'function') renderDayAgendaPlanner();
  if (typeof renderCleanCalendarGrid === 'function') renderCleanCalendarGrid();
  if (typeof renderSidebarAndHeader === 'function') renderSidebarAndHeader();
  evaluateAchievements();
}

function deleteScheduleEvent(id, skipPrompt = false) {
  const evt = (appState.schedule || []).find(s => s.id === id);
  const title = evt ? evt.title : 'Event';

  if (!skipPrompt && typeof document !== 'undefined') {
    promptDoubleCheck({
      title: 'Delete Schedule Block?',
      subtitle: 'Remove calendar time block',
      targetName: `⏰ ${title}`,
      message: `Are you sure you want to delete the schedule block "${title}"?`,
      safetyNote: 'Your other calendar blocks and daily agenda remain safe.',
      confirmText: 'Delete Block',
      confirmBtnClass: 'btn-rose',
      onConfirm: () => deleteScheduleEvent(id, true)
    });
    return;
  }

  playSound('click');
  optimisticMutation('Delete Schedule Event', () => {
    appState.schedule = (appState.schedule || []).filter(s => s.id !== id);
  });
  showToast(`Event "${title}" removed from schedule`, 'info');
  evaluateAchievements();
  if (typeof renderDayAgendaPlanner === 'function') renderDayAgendaPlanner();
  if (typeof renderCleanCalendarGrid === 'function') renderCleanCalendarGrid();
  renderPage();
}

function toggleHabitDay(habitId, dateStr) {
  const habit = (appState.habits || []).find(h => h.id === habitId);
  if (!habit) return;

  const wasCompleted = (habit.completedDates || []).includes(dateStr);
  if (wasCompleted) {
    playSound('click');
  } else {
    playSound('success');
  }

  optimisticMutation('Toggle Habit Day', () => {
    const targetHabit = appState.habits.find(h => h.id === habitId);
    if (!targetHabit) return;
    if (!targetHabit.completedDates) targetHabit.completedDates = [];
    const idx = targetHabit.completedDates.indexOf(dateStr);
    if (idx >= 0) {
      targetHabit.completedDates.splice(idx, 1);
    } else {
      targetHabit.completedDates.push(dateStr);
    }
  });

  const isNowDone = !wasCompleted;
  if (isNowDone) {
    const currentHabit = (appState.habits || []).find(h => h.id === habitId);
    const streak = calculateHabitStreak(currentHabit ? currentHabit.completedDates : []);
    showToast(`Completed "${habit.name}"! Streak: ${streak}d 🔥`, 'success');
  } else {
    showToast(`Habit "${habit.name}" unchecked for ${dateStr}`, 'info');
  }
  evaluateAchievements();
}

function addHabit(name, category, routine = 'Morning', motivation = '', color = 'emerald') {
  const newHabit = {
    id: 'h_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    name: name.trim(),
    category: category || 'General',
    routine: routine || 'Morning',
    motivation: motivation ? motivation.trim() : '',
    color: color || 'emerald',
    createdAt: new Date().toISOString(),
    completedDates: []
  };

  playSound('success');
  optimisticMutation('Add Habit', () => {
    if (!Array.isArray(appState.habits)) appState.habits = [];
    appState.habits.unshift(newHabit);
  });
  showToast(`Habit "${name}" activated!`, 'success');
  evaluateAchievements();
}

function deleteHabit(habitId, skipPrompt = false) {
  const habit = (appState.habits || []).find(h => h.id === habitId);
  const habitName = habit ? habit.name : 'Habit';

  if (!skipPrompt && typeof document !== 'undefined') {
    promptDoubleCheck({
      title: 'Delete Daily Habit?',
      subtitle: 'Remove habit and streak history',
      targetName: `🔥 ${habitName}`,
      message: `Are you sure you want to delete "${habitName}"? All logged streaks and completions for this habit will be removed.`,
      safetyNote: 'Your other daily habits and Life Score history will remain safe.',
      confirmText: 'Delete Habit',
      confirmBtnClass: 'btn-rose',
      onConfirm: () => deleteHabit(habitId, true)
    });
    return;
  }

  playSound('click');
  optimisticMutation('Delete Habit', () => {
    appState.habits = (appState.habits || []).filter(h => h.id !== habitId);
  });
  showToast(`Habit "${habitName}" removed`, 'info');
  evaluateAchievements();
  renderHabitsView();
  renderPage();
}

function updateHabitColor(habitId, newColor) {
  const habit = (appState.habits || []).find(h => h.id === habitId);
  if (!habit) return;
  playSound('click');
  optimisticMutation(
    'Update Habit Color',
    () => {
      const target = (appState.habits || []).find(h => h.id === habitId);
      if (target) target.color = newColor;
    },
    async () => {
      const res = await fetch(`${API_BASE}/api/habits/${habitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: newColor })
      });
      return res.ok;
    }
  );
  showToast(`Habit accent color updated to ${newColor}! 🎨`, 'success');
}

function toggleTask(taskId) {
  const task = (appState.tasks || []).find(t => t.id === taskId);
  if (!task) return;

  const wasCompleted = Boolean(task.completed);
  if (wasCompleted) {
    playSound('click');
  } else {
    playSound('success');
  }

  optimisticMutation('Toggle Task', () => {
    const target = appState.tasks.find(t => t.id === taskId);
    if (target) {
      target.completed = !target.completed;
      target.completedAt = target.completed ? new Date().toISOString() : null;
    }
  });

  if (!wasCompleted) {
    showToast(`Task "${task.title}" completed! 🎯`, 'success');
  } else {
    showToast(`Task "${task.title}" marked incomplete`, 'info');
  }
  evaluateAchievements();
}

function addTask(title, priority = 'medium', category = 'Work', effort = '30m', notes = '') {
  const newTask = {
    id: 't_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    title: title.trim(),
    priority: priority || 'medium',
    category: category || 'General',
    effort: effort || '30m',
    notes: notes ? notes.trim() : '',
    completed: false,
    createdAt: new Date().toISOString()
  };

  playSound('success');
  optimisticMutation('Add Task', () => {
    if (!Array.isArray(appState.tasks)) appState.tasks = [];
    appState.tasks.unshift(newTask);
  });
  showToast(`Task "${newTask.title}" added to command center!`, 'success');
  evaluateAchievements();
}

function deleteTask(taskId, skipPrompt = false) {
  const task = (appState.tasks || []).find(t => t.id === taskId);
  const taskTitle = task ? task.title : 'Task';

  if (!skipPrompt && typeof document !== 'undefined') {
    promptDoubleCheck({
      title: 'Delete Focus Task?',
      subtitle: 'Remove task from command center',
      targetName: `🎯 ${taskTitle}`,
      message: `Are you sure you want to delete "${taskTitle}"? It will be removed from your focus tasks queue.`,
      safetyNote: 'Your remaining tasks, milestones, and Life Score calculations stay intact.',
      confirmText: 'Delete Task',
      confirmBtnClass: 'btn-rose',
      onConfirm: () => deleteTask(taskId, true)
    });
    return;
  }

  playSound('click');
  optimisticMutation('Delete Task', () => {
    appState.tasks = (appState.tasks || []).filter(t => t.id !== taskId);
  });
  showToast(`Task "${taskTitle}" deleted`, 'info');
  evaluateAchievements();
  renderTasksView();
  renderPage();
}

function addTransaction(description, amount, type = 'expense', category = 'Other', paymentMethod = 'UPI') {
  if (type === 'income' && (!category || category === 'Other' || category === 'Food')) {
    category = 'Income';
  }
  const newTx = {
    id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    description: description.trim(),
    amount: Math.abs(Number(amount)),
    type: type === 'income' ? 'income' : 'expense',
    category: category || (type === 'income' ? 'Income' : 'Other'),
    paymentMethod: paymentMethod || 'UPI',
    date: getLocalDateString(new Date())
  };

  playSound('success');
  optimisticMutation('Add Transaction', () => {
    if (!Array.isArray(appState.transactions)) appState.transactions = [];
    appState.transactions.unshift(newTx);
  });
  showToast(`Logged ${type}: ₹${newTx.amount.toFixed(2)} (${newTx.paymentMethod})`, 'success');
  evaluateAchievements();
}

function deleteTransaction(txId, skipPrompt = false) {
  const tx = (appState.transactions || []).find(t => t.id === txId);
  const desc = tx ? tx.description : 'Transaction';
  const amountStr = tx ? `₹${tx.amount.toFixed(2)}` : '';

  if (!skipPrompt && typeof document !== 'undefined') {
    promptDoubleCheck({
      title: 'Delete Financial Record?',
      subtitle: 'Remove entry from financial ledger',
      targetName: `💳 ${desc} (${amountStr})`,
      message: `Are you sure you want to delete this ${tx ? tx.type : 'transaction'} of ${amountStr}? Net balance and financial summaries will recompute immediately.`,
      safetyNote: 'Your remaining ledger transactions and budget tracking stay untouched.',
      confirmText: 'Delete Record',
      confirmBtnClass: 'btn-rose',
      onConfirm: () => deleteTransaction(txId, true)
    });
    return;
  }

  playSound('click');
  optimisticMutation('Delete Transaction', () => {
    appState.transactions = (appState.transactions || []).filter(t => t.id !== txId);
  });
  showToast(`Transaction "${desc}" removed`, 'info');
  evaluateAchievements();
  renderFinancesView();
  renderPage();
}

// Mood tracking removed by user request (stubbed to prevent runtime errors)
function saveMoodLog() {}
function openDailyMoodModal() {}
function closeDailyMoodModal() {}
function ensureDailyMoodModal() {}
function checkAndPromptDailyMood() {}

/* ==========================================================================
   Floating Creator Modal Controller
   ========================================================================== */
const EXPENSE_CATEGORIES = [
  { val: 'Food', label: '🍔 Food' },
  { val: 'Bills', label: '⚡ Bills' },
  { val: 'Groceries', label: '🛒 Groceries' },
  { val: 'Transport', label: '🚗 Transport' },
  { val: 'Shopping', label: '🛍️ Shopping' },
  { val: 'Leisure', label: '🎮 Leisure' },
  { val: 'Health', label: '💊 Health' },
  { val: 'Other', label: '🏷️ Other' }
];

const INCOME_CATEGORIES = [
  { val: 'Salary', label: '💼 Salary' },
  { val: 'Freelance', label: '💻 Freelance' },
  { val: 'Investment', label: '📈 Investment' },
  { val: 'Business', label: '🏢 Business' },
  { val: 'Gift', label: '🎁 Gift' },
  { val: 'Dividends', label: '💰 Dividends' },
  { val: 'Refund', label: '🔄 Refund' },
  { val: 'Other', label: '🏷️ Other' }
];

function updateTransactionCategories(type = 'expense', selectedVal = null) {
  const catGroup = document.getElementById('modal-tx-cat-group');
  const catInput = document.getElementById('modal-tx-category');
  if (!catGroup) return;

  const isIncome = (type || '').toLowerCase() === 'income';
  const cats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const currentVal = selectedVal || (isIncome ? 'Salary' : 'Food');

  catGroup.innerHTML = cats.map(c => `
    <button type="button" class="mini-chip ${c.val === currentVal ? 'active' : ''}" data-val="${c.val}">${c.label}</button>
  `).join('');

  if (catInput) {
    catInput.value = currentVal;
  }
}

function openCreatorModal(tab = 'schedule', defaults = {}) {
  const modal = document.getElementById('floating-creator-modal');
  if (!modal) {
    if (tab === 'goal' && typeof openGoalModal === 'function') {
      openGoalModal();
    }
    return;
  }

  const todayStr = getLocalDateString(new Date());

  // Ensure date inputs on both schedule and goals default to today's date
  const defaultSchDate = document.getElementById('modal-sch-date');
  if (defaultSchDate && !defaultSchDate.value) {
    defaultSchDate.value = todayStr;
  }
  const defaultGoalDate = document.getElementById('modal-goal-date');
  if (defaultGoalDate && !defaultGoalDate.value) {
    defaultGoalDate.value = todayStr;
  }

  modal.classList.add('active');
  document.body.classList.add('modal-open');
  switchCreatorTab(tab);

  if (tab === 'schedule') {
    const dateInput = document.getElementById('modal-sch-date');
    const hourSelect = document.getElementById('modal-sch-hour');
    if (dateInput) dateInput.value = defaults.date || todayStr;
    const initialHour = defaults.hour !== undefined ? String(defaults.hour) : (hourSelect?.value || '9');
    if (hourSelect) {
      hourSelect.value = initialHour;
      document.querySelectorAll('#modal-sch-time-presets .mini-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.hour === initialHour);
      });
    }

    const rec = defaults.recurrence || 'once';
    const repeatInput = document.getElementById('modal-sch-repeat');
    if (repeatInput) repeatInput.value = rec;
    document.querySelectorAll('#modal-sch-repeat-group .mini-chip').forEach(c => {
      c.classList.toggle('active', (c.dataset.repeat || '') === rec);
    });
    const daysContainer = document.getElementById('modal-sch-days-container');
    if (daysContainer) {
      daysContainer.style.display = rec === 'selected_days' ? 'block' : 'none';
    }
    if (Array.isArray(defaults.repeatDays)) {
      document.querySelectorAll('#modal-sch-days-picker .day-chip').forEach(c => {
        c.classList.toggle('active', defaults.repeatDays.includes(c.dataset.day));
      });
    }
  }

  if (tab === 'habit') {
    const col = defaults.color || 'emerald';
    const colEl = document.getElementById('modal-habit-color');
    if (colEl) colEl.value = col;
    document.querySelectorAll('#modal-habit-color-group .color-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === col);
    });
    const nameInput = document.getElementById('modal-habit-name');
    if (nameInput && defaults.name !== undefined) nameInput.value = defaults.name;
  }

  if (tab === 'goal') {
    const titleInput = document.getElementById('modal-goal-title');
    if (titleInput) titleInput.value = defaults.title || '';
    const cat = defaults.category || 'Career';
    const catInput = document.getElementById('modal-goal-category');
    if (catInput) catInput.value = cat;
    document.querySelectorAll('#modal-goal-category-group .mini-chip').forEach(c => {
      c.classList.toggle('active', (c.dataset.val || c.textContent.trim()) === cat);
    });
    const dateInput = document.getElementById('modal-goal-date');
    if (dateInput) {
      dateInput.value = defaults.targetDate || todayStr;
    }
    const prog = defaults.progress !== undefined ? defaults.progress : 0;
    const progInput = document.getElementById('modal-goal-progress');
    const progDisplay = document.getElementById('modal-goal-progress-display');
    if (progInput) progInput.value = prog;
    if (progDisplay) progDisplay.textContent = `${prog}%`;
    const metricsInput = document.getElementById('modal-goal-metrics');
    if (metricsInput) metricsInput.value = defaults.metrics || '';
    const descInput = document.getElementById('modal-goal-desc');
    if (descInput) descInput.value = defaults.description || '';
    const milesInput = document.getElementById('modal-goal-milestones');
    if (milesInput) milesInput.value = defaults.milestones || '';
  }

  if (tab === 'finance') {
    const type = defaults.type || 'expense';
    const typeInput = document.getElementById('modal-tx-type');
    if (typeInput) typeInput.value = type;
    document.querySelectorAll('#modal-tx-type-group .mini-chip').forEach(c => {
      c.classList.toggle('active', (c.dataset.val || '').toLowerCase() === type.toLowerCase());
    });
    updateTransactionCategories(type, defaults.category);
    const amtInput = document.getElementById('modal-tx-amount');
    if (amtInput && defaults.amount !== undefined) amtInput.value = defaults.amount;
    const descInput = document.getElementById('modal-tx-desc');
    if (descInput && defaults.description !== undefined) descInput.value = defaults.description;
  }
}

function closeCreatorModal() {
  const modal = document.getElementById('floating-creator-modal');
  if (!modal) return;
  modal.classList.remove('active');
  document.body.classList.remove('modal-open');
}

function switchCreatorTab(tab) {
  document.querySelectorAll('.creator-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });

  document.querySelectorAll('.creator-panel').forEach(p => {
    p.classList.remove('active');
  });

  const todayStr = getLocalDateString(new Date());
  if (tab === 'schedule') {
    const dateInput = document.getElementById('modal-sch-date');
    if (dateInput && !dateInput.value) dateInput.value = todayStr;
    const hourSelect = document.getElementById('modal-sch-hour');
    const currentHour = hourSelect ? String(hourSelect.value) : '9';
    document.querySelectorAll('#modal-sch-time-presets .mini-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.hour === currentHour);
    });
  } else if (tab === 'goal') {
    const dateInput = document.getElementById('modal-goal-date');
    if (dateInput && !dateInput.value) dateInput.value = todayStr;
  }

  const targetPanel = document.getElementById(`modal-${tab}-form`);
  if (targetPanel) {
    targetPanel.classList.add('active');
    const firstInput = targetPanel.querySelector('input:not([type="hidden"])');
    if (firstInput) setTimeout(() => firstInput.focus(), 60);
  }

  const iconWrap = document.getElementById('creator-modal-icon');
  const titleEl = document.getElementById('creator-modal-title');

  if (tab === 'schedule') {
    if (iconWrap) iconWrap.innerHTML = '<i class="fa-regular fa-clock text-amber"></i>';
    if (titleEl) titleEl.textContent = 'Schedule Time-Block';
  } else if (tab === 'habit') {
    if (iconWrap) iconWrap.innerHTML = '<i class="fa-solid fa-fire text-amber"></i>';
    if (titleEl) titleEl.textContent = 'Create Daily Habit';
  } else if (tab === 'task') {
    if (iconWrap) iconWrap.innerHTML = '<i class="fa-solid fa-list-check text-cyan"></i>';
    if (titleEl) titleEl.textContent = 'Schedule New Task';
  } else if (tab === 'finance') {
    if (iconWrap) iconWrap.innerHTML = '<i class="fa-solid fa-wallet text-emerald"></i>';
    if (titleEl) titleEl.textContent = 'Log Transaction (₹)';
  } else if (tab === 'goal') {
    if (iconWrap) iconWrap.innerHTML = '<i class="fa-solid fa-bullseye text-violet"></i>';
    if (titleEl) titleEl.textContent = 'Set Strategic Goal';
  }
}

/* ==========================================================================
   Clock & Live Time
   ========================================================================== */
function updateClock() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  const timeFormat = (typeof localStorage !== 'undefined' && localStorage.getItem('life_os_time_format')) || '12h';
  const is12h = timeFormat === '12h';
  const timeStr = now.toLocaleTimeString(undefined, { hour12: is12h });

  const dateEl = document.getElementById('top-date-display');
  const clockEl = document.getElementById('top-clock-display');
  if (dateEl) dateEl.textContent = dateStr;
  if (clockEl) clockEl.textContent = timeStr;
}

/* ==========================================================================
   Mobile Universal Swipe-Down-to-Dismiss Gesture Engine
   Allows swiping down any active modal/bottom-sheet window on mobile devices
   ========================================================================== */
function initModalSwipeDownGestures() {
  if (window.__lifeOsSwipeGesturesAttached) return;
  window.__lifeOsSwipeGesturesAttached = true;

  let activeDialog = null;
  let activeBackdrop = null;
  let startY = 0;
  let startX = 0;
  let currentY = 0;
  let startTime = 0;
  let isDragging = false;
  let canDrag = false;

  function getActiveModalBackdrop(dialog) {
    return dialog.closest('.floating-modal-backdrop.active, .modal-backdrop.active, .auth-modal-backdrop.active, #auth-modal.active, #lifeos-auth-modal.active, #floating-creator-modal.active, #achievements-modal.active, #rank-lookup-modal.active, #goal-modal.active, #habit-modal.active, #task-modal.active, #transaction-modal.active, #timeblock-modal.active, #journal-modal.active, #journal-reflection-modal.active, #journal-writer-modal.active, #mood-modal.active');
  }

  function triggerModalClose(backdrop, dialog) {
    if (!backdrop) return;
    document.body.classList.remove('modal-open');

    // First try standard close buttons inside the dialog
    const closeBtn = dialog?.querySelector('#achievements-modal-close, #auth-modal-close-btn, #creator-modal-close, .floating-close-btn, .auth-close-btn, .modal-cancel-btn');
    if (closeBtn) {
      closeBtn.click();
      return;
    }

    // Direct helper mapping by modal ID
    const id = backdrop.id;
    if (id === 'achievements-modal' && typeof closeAchievementsModal === 'function') {
      closeAchievementsModal();
    } else if ((id === 'auth-modal' || id === 'lifeos-auth-modal') && typeof closeAuthModal === 'function') {
      closeAuthModal();
    } else if (id === 'floating-creator-modal' && typeof closeCreatorModal === 'function') {
      closeCreatorModal();
    } else if (id === 'rank-lookup-modal' && typeof closeRankLookupModal === 'function') {
      closeRankLookupModal();
    } else if (id === 'goal-modal' && typeof closeGoalModal === 'function') {
      closeGoalModal();
    } else if (id === 'journal-writer-modal' && typeof closeJournalWriterModal === 'function') {
      closeJournalWriterModal();
    } else if (id === 'journal-reflection-modal' && typeof closeJournalReaderModal === 'function') {
      closeJournalReaderModal();
    } else {
      backdrop.classList.remove('active');
      backdrop.setAttribute('aria-hidden', 'true');
    }
  }

  function onTouchStart(e) {
    if (!e.touches || e.touches.length !== 1) return;
    const touch = e.touches[0];

    // Find if touch is inside any modal dialog
    const dialog = touch.target.closest('.floating-modal-dialog, .auth-modal-dialog, .achievements-modal-dialog, .modal-box, .journal-modal-dialog-large');
    if (!dialog) return;

    const backdrop = getActiveModalBackdrop(dialog);
    if (!backdrop) return;

    // Avoid hijacking interactive form controls
    const tag = touch.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || touch.target.isContentEditable) {
      return;
    }

    // Allow dragging if user touches near header / drag pill or if content is at top (scrollTop <= 2)
    const isPillOrHeader = Boolean(touch.target.closest('.mobile-drag-pill, .floating-modal-header, .auth-modal-header, .modal-title-with-icon'));
    const isAtTop = dialog.scrollTop <= 2;

    if (!isPillOrHeader && !isAtTop) {
      return;
    }

    activeDialog = dialog;
    activeBackdrop = backdrop;
    startY = touch.clientY;
    startX = touch.clientX;
    currentY = touch.clientY;
    startTime = Date.now();
    isDragging = false;
    canDrag = true;
  }

  function onTouchMove(e) {
    if (!canDrag || !activeDialog || !e.touches || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - startY;
    const deltaX = touch.clientX - startX;

    // Check if horizontal movement dominates (e.g. Swiping filter tabs / chips)
    if (!isDragging) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        canDrag = false;
        return;
      }
      // Require downward pull of at least 6px with scrollTop <= 2 to engage swipe down
      if (deltaY > 6 && activeDialog.scrollTop <= 2) {
        isDragging = true;
      }
    }

    if (isDragging) {
      if (e.cancelable) e.preventDefault();
      currentY = touch.clientY;
      const pull = Math.max(0, deltaY);

      activeDialog.style.transform = `translateY(${pull}px)`;
      activeDialog.style.transition = 'none';

      if (activeBackdrop) {
        activeBackdrop.style.opacity = Math.max(0.35, 1 - (pull / 500));
      }
    }
  }

  function onTouchEnd() {
    if (!canDrag || !activeDialog) {
      canDrag = false;
      isDragging = false;
      return;
    }

    if (isDragging) {
      const deltaY = currentY - startY;
      const duration = Math.max(1, Date.now() - startTime);
      const velocity = deltaY / duration; // px per ms

      const targetDialog = activeDialog;
      const targetBackdrop = activeBackdrop;

      // Dismiss if pulled down > 70px or flicked down with velocity > 0.38
      const shouldDismiss = deltaY > 70 || (deltaY > 35 && velocity > 0.38);

      if (shouldDismiss) {
        targetDialog.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease';
        targetDialog.style.transform = 'translateY(100%)';
        targetDialog.style.opacity = '0';
        if (targetBackdrop) {
          targetBackdrop.style.transition = 'opacity 0.2s ease';
          targetBackdrop.style.opacity = '0';
        }

        setTimeout(() => {
          targetDialog.style.transform = '';
          targetDialog.style.transition = '';
          targetDialog.style.opacity = '';
          if (targetBackdrop) {
            targetBackdrop.style.opacity = '';
            targetBackdrop.style.transition = '';
          }
          triggerModalClose(targetBackdrop, targetDialog);
        }, 220);
      } else {
        // Snap back
        targetDialog.style.transition = 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1)';
        targetDialog.style.transform = 'translateY(0)';
        if (targetBackdrop) {
          targetBackdrop.style.transition = 'opacity 0.2s ease';
          targetBackdrop.style.opacity = '';
        }

        setTimeout(() => {
          if (targetDialog) {
            targetDialog.style.transform = '';
            targetDialog.style.transition = '';
          }
          if (targetBackdrop) {
            targetBackdrop.style.transition = '';
          }
        }, 250);
      }
    }

    activeDialog = null;
    activeBackdrop = null;
    canDrag = false;
    isDragging = false;
  }

  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('touchcancel', onTouchEnd, { passive: true });
}

/* ==========================================================================
   Event Listeners & Initialization
   ========================================================================== */
function initEventListeners() {
  initModalSwipeDownGestures();
  if (window.__lifeOsDelegatedListenersAttached) return;
  window.__lifeOsDelegatedListenersAttached = true;

  // Stepper Press & Hold Engine for Transaction Amount (+ / -)
  let stepperHoldTimer = null;
  let stepperHoldInterval = null;
  let isHoldingStepper = false;

  function stepTransactionAmount(btn, direction, delta = 1) {
    const wrapper = btn.closest('.rupee-input-wrapper') || btn.closest('.input-wrapper') || document;
    const amtInput = wrapper.querySelector('input[type="number"]') || document.getElementById('modal-tx-amount');
    if (amtInput) {
      const cur = parseFloat(amtInput.value) || 0;
      if (delta === 1) {
        amtInput.value = direction > 0 ? Math.max(1, Math.round(cur + 1)) : Math.max(1, Math.round(cur - 1));
      } else {
        amtInput.value = Math.max(1, Math.round(cur + direction * delta));
      }
      amtInput.dispatchEvent(new Event('input', { bubbles: true }));
      amtInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function startStepperHold(btn, direction) {
    stopStepperHold();
    isHoldingStepper = true;
    stepTransactionAmount(btn, direction, 1);
    playSound('click');

    let ticks = 0;
    stepperHoldTimer = setTimeout(() => {
      stepperHoldInterval = setInterval(() => {
        ticks++;
        let stepSize = 1;
        if (ticks > 35) stepSize = 10;
        else if (ticks > 15) stepSize = 5;
        stepTransactionAmount(btn, direction, stepSize);
      }, 70);
    }, 350);
  }

  function stopStepperHold() {
    if (stepperHoldTimer) {
      clearTimeout(stepperHoldTimer);
      stepperHoldTimer = null;
    }
    if (stepperHoldInterval) {
      clearInterval(stepperHoldInterval);
      stepperHoldInterval = null;
    }
    setTimeout(() => {
      isHoldingStepper = false;
    }, 60);
  }

  // Helper to open native date picker across desktop and phone view
  function openDatePickerFromTarget(target) {
    if (!target) return;
    const calIcon = target;
    const dateInput = calIcon.closest('.input-wrapper')?.querySelector('input[type="date"]') || target.closest('.form-group')?.querySelector('input[type="date"]');
    if (!dateInput) return;

    try {
      if (typeof dateInput.showPicker === 'function') {
        dateInput.showPicker();
        return;
      }
    } catch (err) {}

    try {
      dateInput.focus();
      dateInput.click();
    } catch (err) {}
  }

  // Mouse hold listeners for transaction amount stepper
  document.addEventListener('mousedown', (e) => {
    const incBtn = e.target.closest('.amount-stepper-inc, #tx-amount-inc');
    if (incBtn) {
      e.preventDefault();
      startStepperHold(incBtn, 1);
      return;
    }
    const decBtn = e.target.closest('.amount-stepper-dec, #tx-amount-dec');
    if (decBtn) {
      e.preventDefault();
      startStepperHold(decBtn, -1);
      return;
    }
  });

  document.addEventListener('mouseup', stopStepperHold);
  document.addEventListener('mouseleave', stopStepperHold);

  // Touch hold listeners for transaction amount stepper on mobile
  document.addEventListener('touchstart', (e) => {
    const incBtn = e.target.closest('.amount-stepper-inc, #tx-amount-inc');
    if (incBtn) {
      e.preventDefault();
      startStepperHold(incBtn, 1);
      return;
    }
    const decBtn = e.target.closest('.amount-stepper-dec, #tx-amount-dec');
    if (decBtn) {
      e.preventDefault();
      startStepperHold(decBtn, -1);
      return;
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    stopStepperHold();
    // In phone view, tapping the calendar icon triggers showPicker immediately
    const calIcon = e.target.closest('.input-wrapper .input-icon.fa-calendar, .input-wrapper .fa-calendar, .calendar-trigger-btn');
    if (calIcon) {
      e.preventDefault();
      openDatePickerFromTarget(calIcon);
    }
  }, { passive: false });

  document.addEventListener('touchcancel', stopStepperHold);

  // Global Delegated Click Listener on Document
  document.addEventListener('click', (e) => {
    // 1. Achievements Modal Opener
    const achBtn = e.target.closest('#open-achievements-btn, .nav-achievements-btn');
    if (achBtn) {
      e.preventDefault();
      openAchievementsModal();
      return;
    }

    // Achievements Modal Closer
    const achCloseBtn = e.target.closest('#achievements-modal-close');
    if (achCloseBtn) {
      e.preventDefault();
      closeAchievementsModal();
      return;
    }

    const achModal = document.getElementById('achievements-modal');
    if (e.target === achModal) {
      closeAchievementsModal();
      return;
    }

    // Cloud Sync & Auth Modal Opener
    const syncCard = e.target.closest('#sync-status-card, #open-auth-modal-btn, #settings-open-auth-btn');
    if (syncCard && !e.target.closest('#manual-sync-btn, #settings-sync-btn')) {
      e.preventDefault();
      openAuthModal();
      return;
    }

    const authClose = e.target.closest('#auth-modal-close-btn');
    if (authClose) {
      e.preventDefault();
      closeAuthModal();
      return;
    }

    const authModal = document.getElementById('auth-modal') || document.getElementById('lifeos-auth-modal');
    if (e.target === authModal) {
      closeAuthModal();
      return;
    }

    // Auth tab toggling
    const tabLogin = e.target.closest('#auth-tab-login');
    if (tabLogin) {
      e.preventDefault();
      switchAuthMode('login');
      return;
    }

    const tabReg = e.target.closest('#auth-tab-register');
    if (tabReg) {
      e.preventDefault();
      switchAuthMode('register');
      return;
    }

    // Inline password visibility toggle
    const passToggle = e.target.closest('#auth-password-toggle, .password-toggle-btn');
    if (passToggle) {
      e.preventDefault();
      togglePasswordVisibility();
      return;
    }

    // Auth actions
    const logoutBtn = e.target.closest('#auth-logout-btn');
    if (logoutBtn) {
      e.preventDefault();
      logoutUser();
      return;
    }

    const syncNowBtn = e.target.closest('#auth-sync-now-btn');
    if (syncNowBtn) {
      e.preventDefault();
      syncWithBackend();
      showToast('Cloud data synchronized', 'success');
      return;
    }

    // Achievements Filter Chips
    const achChip = e.target.closest('#achievements-filter-bar .ach-filter-chip');
    if (achChip) {
      e.preventDefault();
      document.querySelectorAll('#achievements-filter-bar .ach-filter-chip').forEach(c => c.classList.remove('active'));
      achChip.classList.add('active');
      renderAchievementsCards(achChip.dataset.filter || 'all');
      playSound('click');
      return;
    }

    // 2. Calendar Controls
    const prevMonthBtn = e.target.closest('#cal-prev-month, #cal-prev-btn');
    if (prevMonthBtn) {
      e.preventDefault();
      const vd = new Date(getValidCalendarDate());
      vd.setDate(1);
      vd.setMonth(vd.getMonth() - 1);
      appState.calendarViewDate = vd;
      renderCalendarView();
      playSound('click');
      return;
    }

    const nextMonthBtn = e.target.closest('#cal-next-month, #cal-next-btn');
    if (nextMonthBtn) {
      e.preventDefault();
      const vd = new Date(getValidCalendarDate());
      vd.setDate(1);
      vd.setMonth(vd.getMonth() + 1);
      appState.calendarViewDate = vd;
      renderCalendarView();
      playSound('click');
      return;
    }

    const calTodayBtn = e.target.closest('#cal-today-btn');
    if (calTodayBtn) {
      e.preventDefault();
      appState.calendarViewDate = new Date();
      appState.selectedCalendarDate = getLocalDateString(new Date());
      renderCalendarView();
      playSound('click');
      return;
    }

    const quickAddToDayBtn = e.target.closest('#quick-add-to-day-btn, #agenda-empty-add-btn');
    if (quickAddToDayBtn) {
      e.preventDefault();
      openCreatorModal('schedule', { date: appState.selectedCalendarDate });
      return;
    }

    // 3. Creator Modal Openers
    const openScheduleBtn = e.target.closest('#open-schedule-modal-btn');
    if (openScheduleBtn) {
      e.preventDefault();
      openCreatorModal('schedule');
      return;
    }

    const openHabitBtn = e.target.closest('#open-habit-modal-btn, #dash-new-habit-btn, #dash-add-habit-btn');
    if (openHabitBtn) {
      e.preventDefault();
      openCreatorModal('habit');
      return;
    }

    const openTaskBtn = e.target.closest('#open-task-modal-btn, #dash-new-task-btn, #dash-add-task-btn');
    if (openTaskBtn) {
      e.preventDefault();
      openCreatorModal('task');
      return;
    }

    const openFinanceBtn = e.target.closest('#open-finance-modal-btn');
    if (openFinanceBtn) {
      e.preventDefault();
      openCreatorModal('finance');
      return;
    }

    const quickAddBtn = e.target.closest('#quick-add-btn, #top-quick-add-btn');
    if (quickAddBtn) {
      e.preventDefault();
      const p = window.location.pathname.toLowerCase();
      if (p.includes('calendar')) openCreatorModal('schedule', { date: appState.selectedCalendarDate });
      else if (p.includes('tasks')) openCreatorModal('task');
      else if (p.includes('finances')) openCreatorModal('finance');
      else if (p.includes('habits')) openCreatorModal('habit');
      else if (p.includes('goals')) openCreatorModal('goal');
      else if (p.includes('journal')) openJournalWriterModal();
      else openCreatorModal('schedule');
      return;
    }

    // 4. Creator Modal Closer & Backdrop
    const creatorClose = e.target.closest('#creator-modal-close, .modal-cancel-btn');
    if (creatorClose) {
      e.preventDefault();
      closeCreatorModal();
      return;
    }

    const creatorModal = document.getElementById('floating-creator-modal');
    if (e.target === creatorModal) {
      closeCreatorModal();
      return;
    }

    // 5. Creator Modal Tabs
    const creatorTab = e.target.closest('.creator-tab');
    if (creatorTab && creatorTab.dataset.tab) {
      e.preventDefault();
      switchCreatorTab(creatorTab.dataset.tab);
      return;
    }

    // Creator Schedule Time Preset Chips
    const timePresetChip = e.target.closest('#modal-sch-time-presets .mini-chip');
    if (timePresetChip) {
      e.preventDefault();
      const hour = timePresetChip.dataset.hour;
      const hourSelect = document.getElementById('modal-sch-hour');
      if (hourSelect) {
        hourSelect.value = hour;
        hourSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      document.querySelectorAll('#modal-sch-time-presets .mini-chip').forEach(c => c.classList.remove('active'));
      timePresetChip.classList.add('active');
      playSound('click');
      return;
    }

    // Money Increasing and Decreasing Stepper Buttons (+1 / -1)
    const incBtn = e.target.closest('.amount-stepper-inc, #tx-amount-inc');
    if (incBtn) {
      e.preventDefault();
      if (!isHoldingStepper) {
        stepTransactionAmount(incBtn, 1, 1);
        playSound('click');
      }
      return;
    }

    const decBtn = e.target.closest('.amount-stepper-dec, #tx-amount-dec');
    if (decBtn) {
      e.preventDefault();
      if (!isHoldingStepper) {
        stepTransactionAmount(decBtn, -1, 1);
        playSound('click');
      }
      return;
    }

    // Date Picker Icon Click: Open Calendar Picker across Desktop & Phone View
    const calIcon = e.target.closest('.input-wrapper .input-icon.fa-calendar, .input-wrapper .fa-calendar, .calendar-trigger-btn');
    if (calIcon) {
      e.preventDefault();
      openDatePickerFromTarget(calIcon);
      playSound('click');
      return;
    }

    // 6. Creator Modal Chips
    const durChip = e.target.closest('#modal-sch-duration-group .mini-chip');
    if (durChip) {
      e.preventDefault();
      document.querySelectorAll('#modal-sch-duration-group .mini-chip').forEach(c => c.classList.remove('active'));
      durChip.classList.add('active');
      const input = document.getElementById('modal-sch-duration');
      if (input) input.value = durChip.dataset.val;
      playSound('click');
      return;
    }

    const catChip = e.target.closest('#modal-sch-cat-group .mini-chip');
    if (catChip) {
      e.preventDefault();
      document.querySelectorAll('#modal-sch-cat-group .mini-chip').forEach(c => c.classList.remove('active'));
      catChip.classList.add('active');
      const input = document.getElementById('modal-sch-category');
      if (input) input.value = catChip.dataset.val;
      playSound('click');
      return;
    }

    const repChip = e.target.closest('#modal-sch-repeat-group .mini-chip');
    if (repChip) {
      e.preventDefault();
      document.querySelectorAll('#modal-sch-repeat-group .mini-chip').forEach(c => c.classList.remove('active'));
      repChip.classList.add('active');
      const repeatVal = repChip.dataset.repeat || 'once';
      const repeatInput = document.getElementById('modal-sch-repeat');
      if (repeatInput) repeatInput.value = repeatVal;
      const daysContainer = document.getElementById('modal-sch-days-container');
      if (daysContainer) daysContainer.style.display = repeatVal === 'selected_days' ? 'block' : 'none';
      playSound('click');
      return;
    }

    const dayChip = e.target.closest('#modal-sch-days-picker .day-chip');
    if (dayChip) {
      e.preventDefault();
      dayChip.classList.toggle('active');
      playSound('click');
      return;
    }

    const habitCatChip = e.target.closest('#modal-habit-category-group .mini-chip');
    if (habitCatChip) {
      e.preventDefault();
      document.querySelectorAll('#modal-habit-category-group .mini-chip').forEach(c => c.classList.remove('active'));
      habitCatChip.classList.add('active');
      const catEl = document.getElementById('modal-habit-category');
      if (catEl) catEl.value = habitCatChip.dataset.val;
      playSound('click');
      return;
    }

    const habitRoutineChip = e.target.closest('#modal-habit-routine-group .mini-chip');
    if (habitRoutineChip) {
      e.preventDefault();
      document.querySelectorAll('#modal-habit-routine-group .mini-chip').forEach(c => c.classList.remove('active'));
      habitRoutineChip.classList.add('active');
      const rEl = document.getElementById('modal-habit-routine');
      if (rEl) rEl.value = habitRoutineChip.dataset.val;
      playSound('click');
      return;
    }

    const habitColorSwatch = e.target.closest('#modal-habit-color-group .color-swatch');
    if (habitColorSwatch) {
      e.preventDefault();
      document.querySelectorAll('#modal-habit-color-group .color-swatch').forEach(s => s.classList.remove('active'));
      habitColorSwatch.classList.add('active');
      const colEl = document.getElementById('modal-habit-color');
      if (colEl) colEl.value = habitColorSwatch.dataset.color;
      playSound('click');
      return;
    }

    const colorPickerBtn = e.target.closest('.habit-color-picker-btn');
    if (colorPickerBtn) {
      e.preventDefault();
      e.stopPropagation();
      const wrap = colorPickerBtn.closest('.habit-color-picker-wrap');
      const popover = wrap?.querySelector('.habit-color-popover');
      if (popover) {
        const isShown = popover.style.display !== 'none';
        document.querySelectorAll('.habit-color-popover').forEach(p => p.style.display = 'none');
        popover.style.display = isShown ? 'none' : 'flex';
        playSound('click');
      }
      return;
    }

    const colorSwatchSm = e.target.closest('.habit-color-popover .color-swatch-sm');
    if (colorSwatchSm) {
      e.preventDefault();
      e.stopPropagation();
      const habitRow = colorSwatchSm.closest('.habit-row');
      const habitId = habitRow?.dataset.id;
      const newColor = colorSwatchSm.dataset.color;
      if (habitId && newColor) {
        updateHabitColor(habitId, newColor);
      }
      document.querySelectorAll('.habit-color-popover').forEach(p => p.style.display = 'none');
      return;
    }

    if (!e.target.closest('.habit-color-picker-wrap')) {
      document.querySelectorAll('.habit-color-popover').forEach(p => p.style.display = 'none');
    }

    const taskPrioCard = e.target.closest('#modal-task-priority-group .priority-choice-card');
    if (taskPrioCard) {
      e.preventDefault();
      document.querySelectorAll('#modal-task-priority-group .priority-choice-card').forEach(c => c.classList.remove('active'));
      taskPrioCard.classList.add('active');
      const prioEl = document.getElementById('modal-task-priority');
      if (prioEl) prioEl.value = taskPrioCard.dataset.priority;
      playSound('click');
      return;
    }

    const taskCatChip = e.target.closest('#modal-task-category-group .mini-chip');
    if (taskCatChip) {
      e.preventDefault();
      document.querySelectorAll('#modal-task-category-group .mini-chip').forEach(c => c.classList.remove('active'));
      taskCatChip.classList.add('active');
      const catEl = document.getElementById('modal-task-category');
      if (catEl) catEl.value = taskCatChip.dataset.val;
      playSound('click');
      return;
    }

    const taskEffChip = e.target.closest('#modal-task-effort-group .mini-chip');
    if (taskEffChip) {
      e.preventDefault();
      document.querySelectorAll('#modal-task-effort-group .mini-chip').forEach(c => c.classList.remove('active'));
      taskEffChip.classList.add('active');
      const effEl = document.getElementById('modal-task-effort');
      if (effEl) effEl.value = taskEffChip.dataset.val;
      playSound('click');
      return;
    }

    const txTypeChip = e.target.closest('#modal-tx-type-group .mini-chip');
    if (txTypeChip) {
      e.preventDefault();
      document.querySelectorAll('#modal-tx-type-group .mini-chip').forEach(c => c.classList.remove('active'));
      txTypeChip.classList.add('active');
      const tEl = document.getElementById('modal-tx-type');
      const chosenType = txTypeChip.dataset.val || 'expense';
      if (tEl) tEl.value = chosenType;

      // Dynamically switch categories between Income and Expense per user request
      updateTransactionCategories(chosenType);

      playSound('click');
      return;
    }

    const txCatChip = e.target.closest('#modal-tx-cat-group .mini-chip');
    if (txCatChip) {
      e.preventDefault();
      document.querySelectorAll('#modal-tx-cat-group .mini-chip').forEach(c => c.classList.remove('active'));
      txCatChip.classList.add('active');
      const catEl = document.getElementById('modal-tx-category');
      if (catEl) catEl.value = txCatChip.dataset.val;
      playSound('click');
      return;
    }

    const txMethodChip = e.target.closest('#modal-tx-method-group .mini-chip');
    if (txMethodChip) {
      e.preventDefault();
      document.querySelectorAll('#modal-tx-method-group .mini-chip').forEach(c => c.classList.remove('active'));
      txMethodChip.classList.add('active');
      const methEl = document.getElementById('modal-tx-method');
      if (methEl) methEl.value = txMethodChip.dataset.val;
      playSound('click');
      return;
    }

    const goalCatChip = e.target.closest('#modal-goal-category-group .mini-chip');
    if (goalCatChip) {
      e.preventDefault();
      document.querySelectorAll('#modal-goal-category-group .mini-chip').forEach(c => c.classList.remove('active'));
      goalCatChip.classList.add('active');
      const catEl = document.getElementById('modal-goal-category');
      if (catEl) catEl.value = goalCatChip.dataset.val || goalCatChip.textContent.trim();
      playSound('click');
      return;
    }

    // 7. Timeframe Pills
    const timePill = e.target.closest('.timeframe-pill');
    if (timePill && timePill.dataset.period) {
      e.preventDefault();
      setLifeScorePeriod(timePill.dataset.period);
      return;
    }

    // 8. Star Benchmark
    const benchBtn = e.target.closest('#star-benchmark-toggle');
    if (benchBtn) {
      e.preventDefault();
      toggleStarBenchmark();
      return;
    }

    // 9. Sound & Sync

    const soundBtn = e.target.closest('#sound-toggle-btn');
    if (soundBtn) {
      e.preventDefault();
      toggleSound();
      return;
    }

    const syncBtn = e.target.closest('#manual-sync-btn');
    if (syncBtn) {
      e.preventDefault();
      syncWithBackend();
      return;
    }

    // 10. Filter Chips on Specific Pages
    const habitFilter = e.target.closest('#habit-filter-chips .chip');
    if (habitFilter) {
      e.preventDefault();
      document.querySelectorAll('#habit-filter-chips .chip').forEach(c => c.classList.remove('active'));
      habitFilter.classList.add('active');
      habitCategoryFilter = habitFilter.dataset.category || 'All';
      renderHabitsView();
      playSound('click');
      return;
    }

    const taskFilter = e.target.closest('#task-filter-chips .chip');
    if (taskFilter) {
      e.preventDefault();
      document.querySelectorAll('#task-filter-chips .chip').forEach(c => c.classList.remove('active'));
      taskFilter.classList.add('active');
      taskStatusFilter = taskFilter.dataset.taskFilter || taskFilter.dataset.status || 'all';
      renderTasksView();
      playSound('click');
      return;
    }

    const finFilter = e.target.closest('#finance-filter-chips .chip, #fin-type-filter-chips .chip');
    if (finFilter) {
      e.preventDefault();
      document.querySelectorAll('#finance-filter-chips .chip, #fin-type-filter-chips .chip').forEach(c => c.classList.remove('active'));
      finFilter.classList.add('active');
      financeTypeFilter = finFilter.dataset.type || 'all';
      renderFinancesView();
      playSound('click');
      return;
    }

    const jFilter = e.target.closest('#journal-filter-chips .chip');
    if (jFilter) {
      e.preventDefault();
      document.querySelectorAll('#journal-filter-chips .chip').forEach(c => c.classList.remove('active'));
      jFilter.classList.add('active');
      journalCategoryFilter = jFilter.dataset.cat || jFilter.dataset.category || 'All';
      renderJournalView();
      playSound('click');
      return;
    }

    // Journal tag chip selection (both side editor and big modal)
    const jTagChip = e.target.closest('.journal-tag-chip');
    if (jTagChip) {
      e.preventDefault();
      const parent = jTagChip.closest('#journal-tag-chips, #big-journal-tag-chips');
      if (parent) {
        parent.querySelectorAll('.journal-tag-chip').forEach(c => c.classList.remove('active'));
        jTagChip.classList.add('active');
        const cat = jTagChip.dataset.cat || jTagChip.textContent.trim() || 'Reflection';
        if (parent.id === 'journal-tag-chips') {
          const catInput = document.getElementById('journal-category-input');
          if (catInput) catInput.value = cat;
        } else {
          const catInput = document.getElementById('big-journal-category');
          if (catInput) catInput.value = cat;
        }
        playSound('click');
      }
      return;
    }

    // Reset journal editor / new note
    const newNoteBtn = e.target.closest('#journal-clear-btn, #quick-new-note-top-btn, #big-journal-new-btn');
    if (newNoteBtn) {
      e.preventDefault();
      resetJournalForm();
      playSound('click');
      showToast('Editor reset for new note', 'info');
      return;
    }

    // 11. Journal Modals
    const openJWriter = e.target.closest('#open-journal-writer-btn, #dash-write-journal-btn, #open-focus-writer-btn');
    if (openJWriter) {
      e.preventDefault();
      openJournalWriterModal();
      return;
    }

    const closeJWriter = e.target.closest('#journal-writer-modal-close, #cancel-journal-btn, #close-writer-modal-btn, #big-journal-cancel-btn');
    if (closeJWriter) {
      e.preventDefault();
      closeJournalWriterModal();
      return;
    }

    const closeJReader = e.target.closest('#journal-reader-modal-close, #close-reader-modal-btn, #close-reflection-modal-btn, #reflect-close-bottom-btn');
    if (closeJReader) {
      e.preventDefault();
      closeJournalReaderModal();
      return;
    }

    const reflectEditBtn = e.target.closest('#reflect-edit-btn');
    if (reflectEditBtn) {
      e.preventDefault();
      const idToEdit = currentReadingJournalId;
      closeJournalReaderModal();
      openJournalWriterModal(idToEdit);
      return;
    }

    const reflectDeleteBtn = e.target.closest('#reflect-delete-btn');
    if (reflectDeleteBtn) {
      e.preventDefault();
      const idToDelete = currentReadingJournalId;
      closeJournalReaderModal();
      deleteJournalEntry(idToDelete);
      return;
    }

    // 12. Rank Lookup Modal (accessible from Achievements modal)
    const rankBtn = e.target.closest('#open-rank-btn, .nav-rank-btn, #view-rank-tiers-btn, #summary-rank-box, #ach-open-rank-tiers-btn');
    if (rankBtn) {
      e.preventDefault();
      openRankLookupModal();
      return;
    }

    const rankCloseBtn = e.target.closest('#rank-modal-close');
    if (rankCloseBtn) {
      e.preventDefault();
      closeRankLookupModal();
      return;
    }

    const rankModal = document.getElementById('rank-lookup-modal');
    if (e.target === rankModal) {
      closeRankLookupModal();
      return;
    }

    // 13. Goals Modal & Controls
    const dashScheduleBtn = e.target.closest('#dash-create-schedule-btn');
    if (dashScheduleBtn) {
      e.preventDefault();
      openCreatorModal('schedule');
      return;
    }

    const dashGoalBtn = e.target.closest('#dash-create-goal-btn');
    if (dashGoalBtn) {
      e.preventDefault();
      openCreatorModal('goal');
      return;
    }

    const openGoalBtn = e.target.closest('#open-goal-modal-btn, #empty-create-goal-btn');
    if (openGoalBtn) {
      e.preventDefault();
      openGoalModal();
      return;
    }

    const closeGoalBtn = e.target.closest('#goal-modal-close, #goal-cancel-btn');
    if (closeGoalBtn) {
      e.preventDefault();
      closeGoalModal();
      return;
    }

    const goalModal = document.getElementById('goal-modal');
    if (e.target === goalModal) {
      closeGoalModal();
      return;
    }

    // Goals Filter Chips
    const goalChip = e.target.closest('#goals-filter-chips .chip');
    if (goalChip) {
      e.preventDefault();
      document.querySelectorAll('#goals-filter-chips .chip').forEach(c => c.classList.remove('active'));
      goalChip.classList.add('active');
      const filter = goalChip.dataset.filter || 'all';
      if (filter === 'in-progress' || filter === 'completed') {
        goalStatusFilter = filter;
        goalCategoryFilter = 'all';
      } else if (filter === 'all') {
        goalStatusFilter = 'all';
        goalCategoryFilter = 'all';
      } else {
        goalStatusFilter = 'all';
        goalCategoryFilter = filter;
      }
      renderGoalsView();
      playSound('click');
      return;
    }

    // Goal Quick Adjust Buttons (-10%, +10%, Complete)
    const goalQuickBtn = e.target.closest('.goal-quick-btn');
    if (goalQuickBtn) {
      e.preventDefault();
      const goalId = goalQuickBtn.dataset.goalId;
      const delta = goalQuickBtn.dataset.delta;
      const goal = (appState.goals || []).find(g => g.id === goalId);
      if (goal) {
        if (delta === 'complete') {
          toggleGoalStatus(goalId);
        } else {
          const numDelta = Number(delta) || 0;
          updateGoalProgress(goalId, (Number(goal.progress) || 0) + numDelta);
        }
      }
      return;
    }

    // Goal Card Actions: Toggle Complete, Edit, Delete
    const goalToggle = e.target.closest('.goal-toggle-btn');
    if (goalToggle) {
      e.preventDefault();
      toggleGoalStatus(goalToggle.dataset.goalId);
      return;
    }

    const goalEdit = e.target.closest('.goal-edit-btn');
    if (goalEdit) {
      e.preventDefault();
      openGoalModal(goalEdit.dataset.goalId);
      return;
    }

    const goalDelete = e.target.closest('.goal-delete-btn');
    if (goalDelete) {
      e.preventDefault();
      deleteGoal(goalDelete.dataset.goalId);
      return;
    }

    // Dashboard Goal Quick Boost Button (+10%)
    const dashGoalBoost = e.target.closest('.dash-goal-boost-btn');
    if (dashGoalBoost) {
      e.preventDefault();
      const goalId = dashGoalBoost.dataset.goalId;
      const goal = (appState.goals || []).find(g => g.id === goalId);
      if (goal) {
        if (goal.status === 'completed' || Number(goal.progress) >= 100) {
          toggleGoalStatus(goalId);
        } else {
          updateGoalProgress(goalId, (Number(goal.progress) || 0) + 10);
        }
      }
      return;
    }
  });

  // Synchronize modal-sch-hour change with quick preset chips
  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'modal-sch-hour') {
      const selectedVal = String(e.target.value);
      document.querySelectorAll('#modal-sch-time-presets .mini-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.hour === selectedVal);
      });
    }
  });

  // Note: Date input typing is natively enabled without premature showPicker on text click.
  // The calendar picker opens when clicking the calendar icon at the end of the input.

  // Delegated Form Submit Listener on Document
  document.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;

    if (form.id === 'modal-schedule-form') {
      const titleInput = document.getElementById('modal-sch-title');
      const dateInput = document.getElementById('modal-sch-date');
      const hourSelect = document.getElementById('modal-sch-hour');
      const durationInput = document.getElementById('modal-sch-duration');
      const catInput = document.getElementById('modal-sch-category');
      const repeatInput = document.getElementById('modal-sch-repeat');
      const recurrence = repeatInput ? repeatInput.value : 'once';
      const activeDayChips = document.querySelectorAll('#modal-sch-days-picker .day-chip.active');
      const repeatDays = Array.from(activeDayChips).map(c => c.dataset.day);

      if (titleInput && titleInput.value.trim()) {
        addScheduleEvent(
          titleInput.value.trim(),
          dateInput?.value || appState.selectedCalendarDate || getLocalDateString(new Date()),
          Number(hourSelect?.value || 9),
          Number(durationInput?.value || 1),
          catInput?.value || 'Work',
          recurrence,
          repeatDays
        );
        titleInput.value = '';
        closeCreatorModal();
      }
    } else if (form.id === 'modal-habit-form') {
      const nameInput = document.getElementById('modal-habit-name');
      const category = document.getElementById('modal-habit-category')?.value || 'General';
      const routine = document.getElementById('modal-habit-routine')?.value || 'Morning';
      const motivation = document.getElementById('modal-habit-motivation')?.value || '';
      const color = document.getElementById('modal-habit-color')?.value || 'emerald';

      if (nameInput && nameInput.value.trim()) {
        addHabit(nameInput.value.trim(), category, routine, motivation, color);
        nameInput.value = '';
        const motEl = document.getElementById('modal-habit-motivation');
        if (motEl) motEl.value = '';
        closeCreatorModal();
      }
    } else if (form.id === 'modal-task-form') {
      const titleInput = document.getElementById('modal-task-title');
      const priority = document.getElementById('modal-task-priority')?.value || 'medium';
      const category = document.getElementById('modal-task-category')?.value || 'Work';
      const effort = document.getElementById('modal-task-effort')?.value || '30m';
      const notes = document.getElementById('modal-task-notes')?.value || '';

      if (titleInput && titleInput.value.trim()) {
        addTask(titleInput.value.trim(), priority, category, effort, notes);
        titleInput.value = '';
        const notesEl = document.getElementById('modal-task-notes');
        if (notesEl) notesEl.value = '';
        closeCreatorModal();
      }
    } else if (form.id === 'modal-finance-form') {
      const descInput = document.getElementById('modal-tx-desc');
      const amountInput = document.getElementById('modal-tx-amount');
      const type = document.getElementById('modal-tx-type')?.value || 'expense';
      let category = document.getElementById('modal-tx-category')?.value || (type === 'income' ? 'Income' : 'Food');
      const method = document.getElementById('modal-tx-method')?.value || 'UPI';

      if (type === 'income' && (!category || category === 'Food' || category === 'Other')) {
        category = 'Income';
      }

      const amt = amountInput ? parseFloat(amountInput.value) : 0;
      if (descInput && descInput.value.trim() && !isNaN(amt) && amt > 0) {
        addTransaction(descInput.value.trim(), amt, type, category, method);
        descInput.value = '';
        if (amountInput) amountInput.value = '';
        closeCreatorModal();
      }
    } else if (form.id === 'journal-editor-form') {
      const titleInput = document.getElementById('journal-title') || document.getElementById('journal-title-input');
      const contentInput = document.getElementById('journal-content') || document.getElementById('journal-content-input');
      const dateInput = document.getElementById('journal-date-input');
      const catInput = document.getElementById('journal-mood') || document.getElementById('journal-category-input');
      const idInput = document.getElementById('journal-edit-id');
      const t = titleInput ? titleInput.value.trim() : '';
      const c = contentInput ? contentInput.value.trim() : '';
      const cat = catInput ? catInput.value : 'Reflection';
      const d = dateInput?.value || getLocalDateString(new Date());
      const editId = idInput?.value || null;
      if (!c) {
        showToast('Please write some content for your journal note', 'warning');
        return;
      }
      addOrUpdateJournalEntry(t, cat, c, d, editId);
    } else if (form.id === 'big-journal-form' || form.id === 'journal-form') {
      const titleInput = document.getElementById('big-journal-title') || document.getElementById('journal-title') || document.getElementById('journal-title-input');
      const contentInput = document.getElementById('big-journal-content') || document.getElementById('journal-content') || document.getElementById('journal-content-input');
      const dateInput = document.getElementById('big-journal-date') || document.getElementById('journal-date-input');
      const catEl = document.getElementById('big-journal-category') || document.getElementById('journal-mood') || document.getElementById('journal-category-input');
      const idInput = document.getElementById('big-journal-edit-id') || document.getElementById('journal-edit-id');
      const t = titleInput ? titleInput.value.trim() : '';
      const c = contentInput ? contentInput.value.trim() : '';
      const cat = catEl ? catEl.value : 'Reflection';
      const d = dateInput?.value || getLocalDateString(new Date());
      const editId = idInput?.value || null;
      if (!c) {
        showToast('Please write some content for your journal note', 'warning');
        return;
      }
      addOrUpdateJournalEntry(t, cat, c, d, editId);
      closeJournalWriterModal();
    } else if (form.id === 'modal-goal-form') {
      const title = document.getElementById('modal-goal-title')?.value || '';
      const category = document.getElementById('modal-goal-category')?.value || 'Career';
      const targetDate = document.getElementById('modal-goal-date')?.value || '';
      const progress = document.getElementById('modal-goal-progress')?.value || 0;
      const metrics = document.getElementById('modal-goal-metrics')?.value || '';
      const milestones = document.getElementById('modal-goal-milestones')?.value || '';
      const desc = document.getElementById('modal-goal-desc')?.value || '';

      if (title.trim()) {
        addOrUpdateGoal({
          title: title.trim(),
          category,
          targetDate,
          progress: Number(progress),
          metrics,
          description: desc,
          milestones
        });
        form.reset();
        const display = document.getElementById('modal-goal-progress-display');
        if (display) display.textContent = '0%';
        closeCreatorModal();
      }
    } else if (form.id === 'goal-form') {
      const editId = document.getElementById('goal-edit-id')?.value;
      const title = document.getElementById('goal-title-input')?.value || '';
      const category = document.getElementById('goal-category-select')?.value || 'Career';
      const targetDate = document.getElementById('goal-target-date-input')?.value || '';
      const progress = document.getElementById('goal-progress-slider')?.value || 0;
      const metrics = document.getElementById('goal-metrics-input')?.value || '';
      const desc = document.getElementById('goal-desc-input')?.value || '';
      const milestones = document.getElementById('goal-milestones-input')?.value || '';

      if (title.trim()) {
        addOrUpdateGoal({
          id: editId || undefined,
          title: title.trim(),
          category,
          targetDate,
          progress: Number(progress),
          metrics,
          description: desc,
          milestones
        });
        form.reset();
        closeGoalModal();
      }
    } else if (form.id === 'auth-form' || form.id === 'auth-login-form' || form.id === 'auth-register-form') {
      handleAuthSubmit(e);
    }
  });

  // Search debouncing utility to eliminate DOM thrashing
  let _searchDebounceTimer = null;
  const debounceSearch = (fn, delay = 150) => {
    clearTimeout(_searchDebounceTimer);
    _searchDebounceTimer = setTimeout(fn, delay);
  };

  // Delegated Input Search Listener on Document
  document.addEventListener('input', (e) => {
    if (e.target.id === 'auth-reg-name') {
      if (e.target.value.length > 6) {
        e.target.value = e.target.value.slice(0, 6);
      }
    } else if (e.target.id === 'task-search-input') {
      taskSearchQuery = e.target.value;
      debounceSearch(() => renderTasksView());
    } else if (e.target.id === 'finance-search-input') {
      financeSearchQuery = e.target.value;
      debounceSearch(() => renderFinancesView());
    } else if (e.target.id === 'journal-search-input') {
      journalSearchQuery = e.target.value;
      debounceSearch(() => renderJournalView());
    } else if (e.target.id === 'goals-search-input') {
      goalSearchQuery = e.target.value;
      debounceSearch(() => renderGoalsView());
    } else if (e.target.id === 'journal-content' || e.target.id === 'journal-content-input') {
      updateJournalWordCount();
    } else if (e.target.id === 'big-journal-content') {
      updateBigJournalWordCount();
    } else if (e.target.id === 'goal-progress-slider') {
      const display = document.getElementById('goal-progress-display');
      if (display) display.textContent = `${e.target.value}%`;
    } else if (e.target.id === 'modal-goal-progress') {
      const display = document.getElementById('modal-goal-progress-display');
      if (display) display.textContent = `${e.target.value}%`;
    }
  });

  // Mobile virtual keyboard safety: center focused input inside modals
  document.addEventListener('focusin', (e) => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768 && e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
      const modal = e.target.closest('.modal-dialog, .floating-modal-dialog, .auth-modal-dialog');
      if (modal) {
        setTimeout(() => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 280);
      }
    }
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCreatorModal();
      closeJournalReaderModal();
      closeJournalWriterModal();
      closeAchievementsModal();
      closeRankLookupModal();
      closeGoalModal();
      closeAuthModal();
      return;
    }

    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      return;
    }

    if (e.key === 'a' || e.key === 'A') openAchievementsModal();
    if (e.key === 'g' || e.key === 'G') openCreatorModal('goal');
    if (e.key === 's' || e.key === 'S') openCreatorModal('schedule');
    if (e.key === 'h' || e.key === 'H') openCreatorModal('habit');
    if (e.key === 't' || e.key === 'T') openCreatorModal('task');
    if (e.key === 'f' || e.key === 'F') openCreatorModal('finance');
    if (e.key === 'q' || e.key === 'Q') openCreatorModal('schedule');
    if (e.key === 'j' || e.key === 'J') {
      if (document.getElementById('journal-writer-modal')) openJournalWriterModal();
    }
  });
}

/* ==========================================================================
   UNIVERSAL SPA ROUTER & SEAMLESS INSTANT NAVIGATION
   Eliminates page-reloading flashes when clicking throughout the app.
   ========================================================================== */
function normalizeSpaPath(pathname) {
  let p = pathname.replace(/^\/(?:pages\/)+/, '/pages/');
  if (
    p === '/' ||
    p === '/index.html' ||
    p === '/index' ||
    p === '/dashboard' ||
    p === '/dashboard.html' ||
    p === '/pages/index.html' ||
    p === '/pages/dashboard.html' ||
    p === '/pages/dashboard' ||
    p === ''
  ) {
    return '/index.html';
  }
  if (!p.startsWith('/pages/') && !p.startsWith('/api') && !p.endsWith('.css') && !p.endsWith('.js')) {
    const base = p.replace(/^\/+/, '').replace(/\.html$/, '');
    if (base === 'index' || base === 'dashboard' || base === 'home') return '/index.html';
    p = `/pages/${base}.html`;
  }
  return p;
}

function updateActiveSidebarNav() {
  const pathname = window.location.pathname;
  const currentFile = pathname.split('/').pop() || 'index.html';
  let cleanCurrent = currentFile.replace('.html', '').toLowerCase() || 'index';
  if (cleanCurrent === '' || cleanCurrent === 'new folder') cleanCurrent = 'index';

  const isMatch = (href) => {
    if (!href) return false;
    const linkFile = href.split('/').pop() || '';
    let cleanLink = linkFile.replace('.html', '').toLowerCase() || 'index';
    if (cleanLink === '') cleanLink = 'index';

    if (cleanCurrent === 'index' || cleanCurrent === 'dashboard') {
      return cleanLink === 'index' || cleanLink === 'dashboard' || cleanLink === '';
    }
    if (cleanCurrent === 'analytics' || cleanCurrent === 'stats') {
      return cleanLink === 'analytics' || cleanLink === 'stats';
    }
    if (cleanCurrent === 'finances' || cleanCurrent === 'finance') {
      return cleanLink === 'finances' || cleanLink === 'finance';
    }
    return cleanLink === cleanCurrent;
  };

  // 1. Desktop sidebar navigation items
  document.querySelectorAll('.nav-menu .nav-item, .sidebar-nav .nav-item').forEach(link => {
    if (isMatch(link.getAttribute('href'))) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // 2. Mobile bottom navigation items (highlight dynamically matches current page)
  document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item').forEach(link => {
    if (isMatch(link.getAttribute('href'))) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

async function loadPageContent(urlPath, animate = true) {
  try {
    const cleanPath = normalizeSpaPath(urlPath);
    const res = await fetch(cleanPath);
    if (!res.ok) {
      window.location.href = cleanPath;
      return;
    }

    const htmlText = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    if (doc.title) {
      document.title = doc.title;
    }

    const newContent = doc.querySelector('.content-area') || doc.querySelector('main');
    const curContent = document.querySelector('.content-area') || document.querySelector('main');

    if (newContent && curContent) {
      if (animate) {
        curContent.style.opacity = '0.35';
        curContent.style.transition = 'opacity 0.12s ease-in-out';
      }

      curContent.innerHTML = newContent.innerHTML;
      window.scrollTo({ top: 0, behavior: 'instant' });

      if (animate) {
        setTimeout(() => {
          curContent.style.opacity = '1';
        }, 40);
      }
    }

    // Sync floating creator & goal modals if present
    const newModal = doc.querySelector('#floating-creator-modal');
    const curModal = document.querySelector('#floating-creator-modal');
    if (newModal && curModal && newModal.innerHTML) {
      curModal.innerHTML = newModal.innerHTML;
    }

    const newGoalModal = doc.querySelector('#goal-modal');
    const curGoalModal = document.getElementById('goal-modal');
    if (newGoalModal && curGoalModal && newGoalModal.innerHTML) {
      curGoalModal.innerHTML = newGoalModal.innerHTML;
    }

    // Sync journal Big Window modals from fetched document or ensure defaults
    const newWriterModal = doc.querySelector('#journal-writer-modal');
    let curWriterModal = document.getElementById('journal-writer-modal');
    if (newWriterModal) {
      if (curWriterModal) {
        curWriterModal.innerHTML = newWriterModal.innerHTML;
      } else {
        document.body.appendChild(newWriterModal.cloneNode(true));
      }
    }

    const newReflectModal = doc.querySelector('#journal-reflection-modal');
    let curReflectModal = document.getElementById('journal-reflection-modal');
    if (newReflectModal) {
      if (curReflectModal) {
        curReflectModal.innerHTML = newReflectModal.innerHTML;
      } else {
        document.body.appendChild(newReflectModal.cloneNode(true));
      }
    }

    updateActiveSidebarNav();
    ensureAchievementsModal();
    ensureGoalModal();
    ensureJournalModals();

    // Re-initialize page-scoped features for newly loaded content
    if (document.getElementById('journal-editor-form') || document.getElementById('save-journal-btn') || document.getElementById('journal-entries-list')) {
      initJournal();
    }
    if (document.getElementById('tasks-container') || document.getElementById('add-task-btn') || document.getElementById('full-tasks-list')) {
      initTasks();
    }
    if (document.getElementById('habits-grid') || document.getElementById('full-habits-list')) {
      initHabits();
    }
    if (document.getElementById('finances-container') || document.getElementById('transactions-list')) {
      initFinances();
    }

    renderPage();
    playSound('click');
  } catch (err) {
    console.error('[SPA Navigation Error]:', err);
    window.location.href = urlPath;
  }
}

async function navigateToUrl(urlPath) {
  const cleanPath = normalizeSpaPath(urlPath);
  if (window.location.pathname === cleanPath) return;
  window.history.pushState(null, '', cleanPath);
  await loadPageContent(cleanPath, true);
}

function initSpaRouter() {
  document.addEventListener('click', async (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    if (
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('//') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      link.hasAttribute('download') ||
      link.getAttribute('target') === '_blank'
    ) {
      return;
    }

    if (href === '#' || href === '') {
      e.preventDefault();
      return;
    }

    // Intercept internal link to eliminate jarring page refresh
    e.preventDefault();

    try {
      const targetUrl = new URL(href, window.location.href);
      if (targetUrl.origin !== window.location.origin) {
        window.location.href = href;
        return;
      }

      // Immediate visual feedback on tapped navigation button
      const cleanPath = normalizeSpaPath(targetUrl.pathname);
      document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item, .nav-menu .nav-item').forEach(item => {
        if (item === link || item.contains(link)) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });

      await navigateToUrl(cleanPath + targetUrl.search);
    } catch (err) {
      window.location.href = href;
    }
  });

  window.addEventListener('popstate', () => {
    loadPageContent(normalizeSpaPath(window.location.pathname), false);
  });
}

/**
 * Phase 2 & Phase 3: Page-Scoped Initializers & Journal Restorations
 */
async function loadJournalEntries() {
  const listEl = document.getElementById('journal-entries-list');
  if (!listEl) return;

  try {
    const data = await apiRequest('/api/journal');
    let entries = null;
    if (data && data.success && Array.isArray(data.entries) && data.entries.length > 0) {
      entries = data.entries;
    } else if (Array.isArray(data) && data.length > 0) {
      entries = data;
    }

    if (Array.isArray(entries) && entries.length > 0) {
      appState.journal = entries;
    }
  } catch (err) {
    console.warn('Could not load journal entries from API, relying on local state:', err);
  }

  if (!Array.isArray(appState.journal)) appState.journal = [];

  renderJournalView();
}

function saveJournalEntry(e) {
  if (e && e.preventDefault) e.preventDefault();
  const titleInput = document.getElementById('journal-title') || document.getElementById('journal-title-input');
  const contentInput = document.getElementById('journal-content') || document.getElementById('journal-content-input');
  const moodInput = document.getElementById('journal-mood') || document.getElementById('journal-category-input');
  const dateInput = document.getElementById('journal-date-input');
  const idInput = document.getElementById('journal-edit-id');

  const title = titleInput ? titleInput.value.trim() : '';
  const content = contentInput ? contentInput.value.trim() : '';

  if (!content) {
    if (typeof showToast === 'function') {
      showToast('Please write some content for your journal note', 'warning');
    }
    return;
  }

  const category = (moodInput && moodInput.value) ? moodInput.value : 'Reflection';
  const date = (dateInput && dateInput.value) ? dateInput.value : getLocalDateString(new Date());
  const existingId = (idInput && idInput.value) ? idInput.value : null;

  addOrUpdateJournalEntry(title, category, content, date, existingId);
}

function initJournal() {
  loadJournalEntries();
  const dateInput = document.getElementById('journal-date-input');
  if (dateInput && !dateInput.value) {
    dateInput.value = getLocalDateString(new Date());
  }
  safeListener('save-journal-btn', 'click', saveJournalEntry);
  safeListener('journal-editor-form', 'submit', saveJournalEntry);

  const contentArea = document.getElementById('journal-content') || document.getElementById('journal-content-input');
  const wordCounter = document.getElementById('journal-word-counter');
  if (contentArea && wordCounter) {
    contentArea.addEventListener('input', () => {
      const text = contentArea.value.trim();
      const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      const chars = contentArea.value.length;
      wordCounter.textContent = `${words} word${words === 1 ? '' : 's'} • ${chars} character${chars === 1 ? '' : 's'}`;
    });
  }

  // Mood select dropdown listener
  const moodSelect = document.getElementById('journal-mood');
  if (moodSelect) {
    moodSelect.addEventListener('change', () => {
      const cat = moodSelect.value;
      const catInput = document.getElementById('journal-category-input');
      if (catInput) catInput.value = cat;
      document.querySelectorAll('#journal-tag-chips .journal-tag-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.cat.toLowerCase() === cat.toLowerCase());
      });
    });
  }

  // Tag / mood chips synchronization
  const chips = document.querySelectorAll('#journal-tag-chips .journal-tag-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const cat = chip.dataset.cat;
      const moodSel = document.getElementById('journal-mood');
      if (moodSel) moodSel.value = cat;
      const catInput = document.getElementById('journal-category-input');
      if (catInput) catInput.value = cat;
    });
  });

  safeListener('journal-search-input', 'input', (e) => {
    journalSearchQuery = e.target.value.trim();
    renderJournalView();
  });

  safeListener('journal-clear-btn', 'click', () => {
    resetJournalForm();
  });

  safeListener('quick-new-note-top-btn', 'click', () => {
    resetJournalForm();
  });

  // Dedicated Big Window modal open/close & New Note triggers
  safeListener('open-focus-writer-btn', 'click', () => {
    openJournalWriterModal();
  });

  safeListener('close-writer-modal-btn', 'click', () => {
    closeJournalWriterModal();
  });

  safeListener('big-journal-cancel-btn', 'click', () => {
    closeJournalWriterModal();
  });

  safeListener('big-journal-new-btn', 'click', () => {
    resetJournalForm();
    playSound('click');
    showToast('Editor reset for new note', 'info');
  });
}

function initTasks() {
  if (typeof renderTasksView === 'function') {
    renderTasksView();
  }
  safeListener('open-task-modal-btn', 'click', () => openCreatorModal('task'));
  safeListener('add-task-btn', 'click', () => openCreatorModal('task'));
  safeListener('task-search-input', 'input', (e) => {
    taskSearchQuery = e.target.value.trim();
    renderTasksView();
  });
}

function initHabits() {
  if (typeof renderHabitsView === 'function') {
    renderHabitsView();
  }
  safeListener('open-habit-modal-btn', 'click', () => openCreatorModal('habit'));
  safeListener('add-habit-btn', 'click', () => openCreatorModal('habit'));
}

function initFinances() {
  if (typeof renderFinancesView === 'function') {
    renderFinancesView();
  }
  safeListener('open-tx-modal-btn', 'click', () => openCreatorModal('finance'));
  safeListener('add-transaction-btn', 'click', () => openCreatorModal('finance'));
  safeListener('fin-search-input', 'input', (e) => {
    financeSearchQuery = e.target.value.trim();
    renderFinancesView();
  });
}

// App Bootstrapping
if (typeof document !== 'undefined') {
  const bootstrapApp = () => {
    applyTheme('dark');
    updateClock();
    setInterval(updateClock, 1000);
    ensureAchievementsModal();
    ensureGoalModal();
    ensureAuthModal();
    ensureJournalModals();
    initEventListeners();
    initSpaRouter();
    updateActiveSidebarNav();
    updateAuthNavButton();
    renderPage();
    loadFullState();

    // Page-Scoped Initializations
    if (document.getElementById('journal-container') || document.getElementById('save-journal-btn') || document.getElementById('journal-editor-form') || document.getElementById('journal-entries-list')) {
      initJournal();
    }
    if (document.getElementById('tasks-container') || document.getElementById('add-task-btn') || document.getElementById('full-tasks-list')) {
      initTasks();
    }
    if (document.getElementById('habits-grid') || document.getElementById('full-habits-list')) {
      initHabits();
    }
    if (document.getElementById('finances-container') || document.getElementById('transactions-list')) {
      initFinances();
    }
    if (document.getElementById('settings-sync-status') || document.getElementById('view-settings') || document.getElementById('settings-sync-btn')) {
      initSettings();
    }

    window.addEventListener('online', () => {
      isOnline = true;
      showToast('Internet connection restored. Synchronizing with cloud...', 'success');
      loadFullState();
    });

    window.addEventListener('offline', () => {
      isOnline = false;
      showToast('Network connection lost. Changes saved locally in offline mode.', 'warning');
      updateSyncStatus(false, 'Offline mode active');
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapApp);
  } else {
    bootstrapApp();
  }
}

// Browser Window Global Bindings
if (typeof window !== 'undefined') {
  window.switchAuthMode = switchAuthMode;
  window.togglePasswordVisibility = togglePasswordVisibility;
  window.handleAuthSubmit = handleAuthSubmit;
  window.showAuthError = showAuthError;
  window.hideAuthError = hideAuthError;
  window.openAuthModal = openAuthModal;
  window.closeAuthModal = closeAuthModal;
  window.ensureAuthModal = ensureAuthModal;
  window.updateAuthNavButton = updateAuthNavButton;
  window.updateTransactionCategories = updateTransactionCategories;
  window.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
  window.INCOME_CATEGORIES = INCOME_CATEGORIES;
  window.openAchievementsModal = openAchievementsModal;
  window.closeAchievementsModal = closeAchievementsModal;
  window.initModalSwipeDownGestures = initModalSwipeDownGestures;
  window.initSettings = initSettings;
  window.renderSettingsView = renderSettingsView;
  window.ensureDoubleCheckModal = ensureDoubleCheckModal;
  window.openDoubleCheckModal = openDoubleCheckModal;
  window.closeDoubleCheckModal = closeDoubleCheckModal;
  window.promptDoubleCheck = promptDoubleCheck;
  window.executeDoubleCheckConfirm = executeDoubleCheckConfirm;
  window.deleteHabit = deleteHabit;
  window.deleteTask = deleteTask;
  window.deleteScheduleEvent = deleteScheduleEvent;
  window.deleteGoal = deleteGoal;
  window.deleteTransaction = deleteTransaction;
  window.deleteJournalEntry = deleteJournalEntry;
  window.DEFAULT_SAMPLE_DATA = (typeof DEFAULT_SAMPLE_DATA !== 'undefined' ? DEFAULT_SAMPLE_DATA : getStarterBaseline());
  window.DEFAULT_STATE = (typeof DEFAULT_STATE !== 'undefined' ? DEFAULT_STATE : getStarterBaseline());
  window.appState = appState;
}

// Module export for testing & Node environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateLifeScore,
    calculateAllTimeLifeScore,
    calculateWeeklyBounds,
    calculateMonthlyBounds,
    isScheduleEventCompletedOnDate,
    doesScheduleEventOccurOnDate,
    createScoreSnapshot,
    applyTheme,
    toggleTheme: () => applyTheme('dark'),
    toggleSound,
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    switchAuthMode,
    togglePasswordVisibility,
    handleAuthSubmit,
    showAuthError,
    hideAuthError,
    openAuthModal,
    closeAuthModal,
    ensureAuthModal,
    updateAuthNavButton,
    updateTransactionCategories,
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    openAchievementsModal,
    closeAchievementsModal,
    initModalSwipeDownGestures,
    safeListener,
    apiRequest,
    loadJournalEntries,
    saveJournalEntry,
    initJournal,
    initTasks,
    initHabits,
    initFinances,
    initSettings,
    renderSettingsView,
    ensureDoubleCheckModal,
    openDoubleCheckModal,
    closeDoubleCheckModal,
    promptDoubleCheck,
    executeDoubleCheckConfirm,
    deleteHabit,
    deleteTask,
    deleteScheduleEvent,
    deleteGoal,
    deleteTransaction,
    deleteJournalEntry,
    formatHourLabel,
    getLocalDateString,
    openCreatorModal,
    switchCreatorTab,
    openGoalModal,
    updateClock,
    saveFullStateToServer,
    DEFAULT_SAMPLE_DATA: (typeof DEFAULT_SAMPLE_DATA !== 'undefined' ? DEFAULT_SAMPLE_DATA : getStarterBaseline()),
    DEFAULT_STATE: (typeof DEFAULT_STATE !== 'undefined' ? DEFAULT_STATE : getStarterBaseline()),
    appState
  };
}
