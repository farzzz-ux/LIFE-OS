/**
 * LIFE OS — Modular Frontend API Client
 * Features:
 * - Automatic JWT bearer authorization injection
 * - Graceful 401 token expiration handling & re-authentication prompt
 * - Unified 4xx/5xx error extraction & logging
 * - Real-time network drop detection & toast notification triggers
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LifeOSApi = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const API_BASE = (() => {
    if (typeof window !== 'undefined' && window.location) {
      if ((window.location.protocol === 'http:' || window.location.protocol === 'https:') && (window.location.port === '3000' || !window.location.port)) {
        return window.location.origin;
      }
    }
    return 'http://localhost:3000';
  })();

  function getAuthToken() {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('life_os_auth_token');
  }

  function setAuthToken(token) {
    if (typeof localStorage === 'undefined') return;
    if (token) {
      localStorage.setItem('life_os_auth_token', token);
    } else {
      localStorage.removeItem('life_os_auth_token');
    }
  }

  function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Hardened Fetch Wrapper with Graceful Error Handling
   */
  async function fetchWithAuth(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = { ...getAuthHeaders(), ...(options.headers || {}) };

    try {
      const res = await fetch(url, { ...options, headers });

      // Handle Token Expiration (401 Unauthorized)
      if (res.status === 401) {
        const hadToken = Boolean(getAuthToken());
        if (hadToken) {
          setAuthToken(null);
          if (typeof window !== 'undefined') {
            if (window.showToast) {
              window.showToast('Your session has expired. Please sign in again.', 'warning');
            }
            if (window.openAuthModal) {
              window.openAuthModal('login');
            }
          }
        }
      }

      // Handle 4xx / 5xx server responses gracefully
      if (!res.ok) {
        let errData = {};
        try {
          errData = await res.json();
        } catch (e) {
          errData = { message: res.statusText || `Request failed with status ${res.status}` };
        }
        const error = new Error(errData.error || errData.message || `Request failed (${res.status})`);
        error.status = res.status;
        error.data = errData;
        throw error;
      }

      return await res.json();
    } catch (networkErr) {
      if (networkErr.name === 'TypeError' && networkErr.message.includes('fetch')) {
        // Network drop / offline state
        if (typeof window !== 'undefined' && window.showToast) {
          window.showToast('Network connection lost. Changes saved locally in offline mode.', 'warning');
        }
      }
      throw networkErr;
    }
  }

  // Network Connectivity Listeners
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      if (window.showToast) {
        window.showToast('Internet connection restored. Synchronized with server.', 'success');
      }
      if (window.loadFullState) {
        window.loadFullState();
      }
    });

    window.addEventListener('offline', () => {
      if (window.showToast) {
        window.showToast('Network disconnected. Operating in offline local-first mode.', 'warning');
      }
    });
  }

  return {
    API_BASE,
    getAuthToken,
    setAuthToken,
    getAuthHeaders,
    fetchWithAuth,

    // Auth endpoints
    login: (email, password) => fetchWithAuth('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (email, password, name) => fetchWithAuth('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
    getMe: () => fetchWithAuth('/api/auth/me'),

    // State sync endpoints
    loadState: () => fetchWithAuth(getAuthToken() ? '/api/user/data' : '/api/data'),
    syncState: (state) => fetchWithAuth(getAuthToken() ? '/api/user/data' : '/api/sync', { method: 'POST', body: JSON.stringify(state) }),
    resetState: () => fetchWithAuth('/api/reset', { method: 'POST' }),

    // Specific entity endpoints
    getTasks: (params = '') => fetchWithAuth(`/api/tasks${params}`),
    createTask: (task) => fetchWithAuth('/api/tasks', { method: 'POST', body: JSON.stringify(task) }),
    updateTask: (id, updates) => fetchWithAuth(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    deleteTask: (id) => fetchWithAuth(`/api/tasks/${id}`, { method: 'DELETE' }),

    getHabits: () => fetchWithAuth('/api/habits'),
    createHabit: (habit) => fetchWithAuth('/api/habits', { method: 'POST', body: JSON.stringify(habit) }),
    updateHabit: (id, updates) => fetchWithAuth(`/api/habits/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    toggleHabit: (id, date) => fetchWithAuth(`/api/habits/${id}/toggle`, { method: 'POST', body: JSON.stringify({ date }) }),
    deleteHabit: (id) => fetchWithAuth(`/api/habits/${id}`, { method: 'DELETE' }),

    getFinances: () => fetchWithAuth('/api/finances'),
    createFinance: (tx) => fetchWithAuth('/api/finances', { method: 'POST', body: JSON.stringify(tx) }),
    deleteFinance: (id) => fetchWithAuth(`/api/finances/${id}`, { method: 'DELETE' }),

    getSchedule: () => fetchWithAuth('/api/schedule'),
    createSchedule: (event) => fetchWithAuth('/api/schedule', { method: 'POST', body: JSON.stringify(event) }),
    updateSchedule: (id, updates) => fetchWithAuth(`/api/schedule/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    deleteSchedule: (id) => fetchWithAuth(`/api/schedule/${id}`, { method: 'DELETE' }),

    getGoals: (params = '') => fetchWithAuth(`/api/goals${params}`),
    createGoal: (goal) => fetchWithAuth('/api/goals', { method: 'POST', body: JSON.stringify(goal) }),
    updateGoal: (id, updates) => fetchWithAuth(`/api/goals/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    deleteGoal: (id) => fetchWithAuth(`/api/goals/${id}`, { method: 'DELETE' }),

    getJournal: () => fetchWithAuth('/api/journal'),
    createJournal: (entry) => fetchWithAuth('/api/journal', { method: 'POST', body: JSON.stringify(entry) }),
    deleteJournal: (id) => fetchWithAuth(`/api/journal/${id}`, { method: 'DELETE' }),

    getMood: () => fetchWithAuth('/api/mood'),
    saveMood: (mood) => fetchWithAuth('/api/mood', { method: 'POST', body: JSON.stringify(mood) }),

    getScoreSnapshots: (periodType) => fetchWithAuth(`/api/scores/snapshots${periodType ? `?periodType=${periodType}` : ''}`),
    saveScoreSnapshot: (snap) => fetchWithAuth('/api/scores/snapshots', { method: 'POST', body: JSON.stringify(snap) })
  };
});
