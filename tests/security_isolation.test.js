/**
 * LIFE OS — Security Architecture & Cross-Tenant Data Isolation Test Suite
 * Validates that User A cannot read, mutate, or delete User B's resources across any API endpoint.
 * Validates Stored XSS sanitization and security response headers.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

function apiRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(postData);
    req.end();
  });
}

test('Security Architecture: Helmet headers and Frame protection active', async () => {
  const res = await apiRequest('GET', '/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.headers['x-content-type-options'], 'nosniff', 'Must include nosniff');
  assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN', 'Must protect against clickjacking with SAMEORIGIN');
  assert.ok(res.headers['content-security-policy'], 'Must enforce Content-Security-Policy');
});

test('Security Isolation: Cross-tenant isolation across Tasks, Habits, Finances, Calendar, Goals & Journal', async () => {
  const time = Date.now();
  // 1. Register User Alpha
  const regAlpha = await apiRequest('POST', '/api/auth/register', {
    email: `alpha_${time}@lifeos.security`,
    password: 'passwordAlpha123!',
    name: 'User Alpha'
  });
  assert.equal(regAlpha.status, 201);
  const tokenAlpha = regAlpha.body.token;

  // 2. Register User Beta
  const regBeta = await apiRequest('POST', '/api/auth/register', {
    email: `beta_${time}@lifeos.security`,
    password: 'passwordBeta123!',
    name: 'User Beta'
  });
  assert.equal(regBeta.status, 201);
  const tokenBeta = regBeta.body.token;

  // -------------------------------------------------------------
  // A. TASK ISOLATION
  // -------------------------------------------------------------
  const createTaskA = await apiRequest('POST', '/api/tasks', {
    title: 'Secret Alpha Strategy Task',
    priority: 'high',
    category: 'Classified'
  }, tokenAlpha);
  assert.equal(createTaskA.status, 201);
  const taskAId = createTaskA.body.id;

  // Beta reads tasks: must not see Alpha's task
  const getTasksB = await apiRequest('GET', '/api/tasks', null, tokenBeta);
  assert.equal(getTasksB.status, 200);
  assert.equal(getTasksB.body.some(t => t.id === taskAId), false, 'User Beta must not read User Alpha tasks');

  // Beta attempts to update Alpha's task: must return 404
  const updateTaskByB = await apiRequest('PUT', `/api/tasks/${taskAId}`, { title: 'Hacked by Beta' }, tokenBeta);
  assert.equal(updateTaskByB.status, 404, 'User Beta must not update User Alpha task');

  // Beta attempts to delete Alpha's task: must return 404
  const deleteTaskByB = await apiRequest('DELETE', `/api/tasks/${taskAId}`, null, tokenBeta);
  assert.equal(deleteTaskByB.status, 404, 'User Beta must not delete User Alpha task');

  // Verify Alpha's task is still intact
  const getTasksA = await apiRequest('GET', '/api/tasks', null, tokenAlpha);
  const alphaTask = getTasksA.body.find(t => t.id === taskAId);
  assert.ok(alphaTask);
  assert.equal(alphaTask.title, 'Secret Alpha Strategy Task');

  // -------------------------------------------------------------
  // B. HABIT ISOLATION
  // -------------------------------------------------------------
  const createHabitA = await apiRequest('POST', '/api/habits', {
    name: 'Alpha Secret Meditation',
    color: 'emerald'
  }, tokenAlpha);
  assert.equal(createHabitA.status, 201);
  const habitAId = createHabitA.body.id;

  // Beta reads habits: must not see Alpha's habit
  const getHabitsB = await apiRequest('GET', '/api/habits', null, tokenBeta);
  assert.equal(getHabitsB.body.some(h => h.id === habitAId), false, 'User Beta must not read User Alpha habits');

  // Beta attempts to toggle Alpha's habit: must return 404
  const toggleHabitByB = await apiRequest('POST', `/api/habits/${habitAId}/toggle`, { date: '2026-10-11' }, tokenBeta);
  assert.equal(toggleHabitByB.status, 404, 'User Beta must not toggle User Alpha habit');

  // Beta attempts to delete Alpha's habit: must return 404
  const deleteHabitByB = await apiRequest('DELETE', `/api/habits/${habitAId}`, null, tokenBeta);
  assert.equal(deleteHabitByB.status, 404, 'User Beta must not delete User Alpha habit');

  // -------------------------------------------------------------
  // C. FINANCE / TRANSACTION ISOLATION
  // -------------------------------------------------------------
  const createTxA = await apiRequest('POST', '/api/finances', {
    description: 'Alpha Private Bonus',
    amount: 150000,
    type: 'income',
    category: 'Salary'
  }, tokenAlpha);
  assert.equal(createTxA.status, 201);
  const txAId = createTxA.body.id;

  // Beta reads finances: must not see Alpha's financial record
  const getFinancesB = await apiRequest('GET', '/api/finances', null, tokenBeta);
  assert.equal(getFinancesB.body.some(f => f.id === txAId), false, 'User Beta must not read User Alpha finances');

  // Beta attempts to delete Alpha's transaction: must return 404
  const deleteTxByB = await apiRequest('DELETE', `/api/finances/${txAId}`, null, tokenBeta);
  assert.equal(deleteTxByB.status, 404, 'User Beta must not delete User Alpha transaction');

  // -------------------------------------------------------------
  // D. CALENDAR / SCHEDULE ISOLATION
  // -------------------------------------------------------------
  const createEventA = await apiRequest('POST', '/api/schedule', {
    title: 'Alpha Private Board Review',
    date: '2026-10-15',
    hour: 14,
    duration: 2,
    category: 'Work'
  }, tokenAlpha);
  assert.equal(createEventA.status, 201);
  const eventAId = createEventA.body.id;

  // Beta reads schedule: must not see Alpha's calendar event
  const getScheduleB = await apiRequest('GET', '/api/schedule', null, tokenBeta);
  assert.equal(getScheduleB.body.some(s => s.id === eventAId), false, 'User Beta must not read User Alpha schedule');

  // Beta attempts to update Alpha's event: must return 404
  const updateEventByB = await apiRequest('PUT', `/api/schedule/${eventAId}`, { title: 'Compromised' }, tokenBeta);
  assert.equal(updateEventByB.status, 404, 'User Beta must not update User Alpha schedule event');

  // Beta attempts to delete Alpha's event: must return 404
  const deleteEventByB = await apiRequest('DELETE', `/api/schedule/${eventAId}`, null, tokenBeta);
  assert.equal(deleteEventByB.status, 404, 'User Beta must not delete User Alpha schedule event');

  // -------------------------------------------------------------
  // E. GOAL ISOLATION
  // -------------------------------------------------------------
  const createGoalA = await apiRequest('POST', '/api/goals', {
    title: 'Alpha IPO Target',
    category: 'Career',
    progress: 75
  }, tokenAlpha);
  assert.equal(createGoalA.status, 201);
  const goalAId = createGoalA.body.id;

  // Beta reads goals: must not see Alpha's goal
  const getGoalsB = await apiRequest('GET', '/api/goals', null, tokenBeta);
  assert.equal(getGoalsB.body.some(g => g.id === goalAId), false, 'User Beta must not read User Alpha goals');

  // Beta attempts to delete Alpha's goal: must return 404
  const deleteGoalByB = await apiRequest('DELETE', `/api/goals/${goalAId}`, null, tokenBeta);
  assert.equal(deleteGoalByB.status, 404, 'User Beta must not delete User Alpha goal');

  // -------------------------------------------------------------
  // F. JOURNAL ISOLATION
  // -------------------------------------------------------------
  const createJournalA = await apiRequest('POST', '/api/journal', {
    title: 'Alpha Private Journal Reflection',
    category: 'Reflection',
    content: 'Classified thoughts that no other tenant can view'
  }, tokenAlpha);
  assert.equal(createJournalA.status, 201);
  const journalAId = createJournalA.body.id;

  // Beta reads journal: must not see Alpha's journal entry
  const getJournalB = await apiRequest('GET', '/api/journal', null, tokenBeta);
  const journalListB = Array.isArray(getJournalB.body) ? getJournalB.body : (getJournalB.body.entries || []);
  assert.equal(journalListB.some(j => j.id === journalAId), false, 'User Beta must not read User Alpha journal');

  // Beta attempts to delete Alpha's journal entry: must return 404
  const deleteJournalByB = await apiRequest('DELETE', `/api/journal/${journalAId}`, null, tokenBeta);
  assert.equal(deleteJournalByB.status, 404, 'User Beta must not delete User Alpha journal entry');
});

test('Security Sanitization: Stored XSS attacks in journal reflections and tasks are neutralized', async () => {
  const xssPayload = 'Daily Review <script>alert("XSS-EXPLOIT")</script><img src=x onerror=alert(1)> Safe Text';

  // 1. Create task with XSS payload
  const taskRes = await apiRequest('POST', '/api/tasks', {
    title: xssPayload,
    priority: 'high',
    category: 'Work'
  });
  assert.equal(taskRes.status, 201);
  assert.ok(!taskRes.body.title.includes('<script>'), 'Task title must strip <script> tag');
  assert.ok(!taskRes.body.title.includes('onerror='), 'Task title must strip onerror attribute');

  // 2. Create journal entry with XSS payload
  const journalRes = await apiRequest('POST', '/api/journal', {
    title: 'Clean Title',
    content: xssPayload
  });
  assert.equal(journalRes.status, 201);
  const journalContent = journalRes.body.entry ? journalRes.body.entry.content : (journalRes.body.content || '');
  assert.ok(!journalContent.includes('<script>'), 'Journal content must strip <script> tag');
  assert.ok(!journalContent.includes('onerror='), 'Journal content must strip onerror attribute');
  assert.ok(journalContent.includes('Safe Text'), 'Preserves safe sanitized content');
});
