const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
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

test('API Health check endpoint', async () => {
  const res = await request('GET', '/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'healthy');
  assert.ok(res.body.uptime >= 0);
});

test('API Full Data endpoint returns valid schema', async () => {
  const res = await request('GET', '/api/data');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.habits));
  assert.ok(Array.isArray(res.body.tasks));
  assert.ok(Array.isArray(res.body.transactions));
  assert.ok(Array.isArray(res.body.schedule));
  assert.ok(Array.isArray(res.body.journal));
  assert.ok(Array.isArray(res.body.goals));
});

test('Habits CRUD & Accent Color: Validation and mutation', async () => {
  // 1. Validation failure on empty name
  const failRes = await request('POST', '/api/habits', { name: '   ' });
  assert.equal(failRes.status, 400);

  // 2. Creation with specific accent color
  const createRes = await request('POST', '/api/habits', {
    name: 'Evening Meditation',
    category: 'Mindset',
    routine: 'Evening',
    color: 'violet'
  });
  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.name, 'Evening Meditation');
  assert.equal(createRes.body.color, 'violet');
  const habitId = createRes.body.id;

  // 3. Update accent color via PUT
  const updateRes = await request('PUT', `/api/habits/${habitId}`, { color: 'amber' });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.color, 'amber');

  // 4. Clean up test habit
  const delRes = await request('DELETE', `/api/habits/${habitId}`);
  assert.equal(delRes.status, 200);
});

test('Goals CRUD: Validation and execution', async () => {
  // 1. Validation failure on empty title
  const failRes = await request('POST', '/api/goals', { title: '   ' });
  assert.equal(failRes.status, 400);
  assert.ok(failRes.body.error.includes('title'));

  // 2. Successful creation
  const createRes = await request('POST', '/api/goals', {
    title: 'Automated Test Goal #1',
    category: 'Career',
    progress: 25,
    targetDate: '2026-12-31'
  });
  assert.equal(createRes.status, 201);
  assert.ok(createRes.body.id);
  assert.equal(createRes.body.progress, 25);
  const goalId = createRes.body.id;

  // 3. Update goal
  const updateRes = await request('PUT', `/api/goals/${goalId}`, { progress: 100 });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.progress, 100);
  assert.equal(updateRes.body.status, 'completed');

  // 4. Delete goal
  const deleteRes = await request('DELETE', `/api/goals/${goalId}`);
  assert.equal(deleteRes.status, 200);
  assert.equal(deleteRes.body.success, true);
});

test('Tasks CRUD: Validation and execution', async () => {
  // 1. Validation failure on empty title
  const failRes = await request('POST', '/api/tasks', { title: '   ' });
  assert.equal(failRes.status, 400);
  assert.ok(failRes.body.error.includes('title'));

  // 2. Successful creation
  const createRes = await request('POST', '/api/tasks', {
    title: 'Automated Test Task #1',
    priority: 'high',
    category: 'Engineering'
  });
  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.title, 'Automated Test Task #1');
  const taskId = createRes.body.id;

  // 3. Update task
  const updateRes = await request('PUT', `/api/tasks/${taskId}`, {
    completed: true
  });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.completed, true);

  // 4. Delete task
  const deleteRes = await request('DELETE', `/api/tasks/${taskId}`);
  assert.equal(deleteRes.status, 200);
  assert.equal(deleteRes.body.success, true);
});

test('Finances CRUD: Validation and execution', async () => {
  // 1. Negative amount failure
  const failRes = await request('POST', '/api/finances', {
    description: 'Bad Tx',
    amount: -100,
    type: 'expense'
  });
  assert.equal(failRes.status, 400);

  // 2. Create valid transaction
  const createRes = await request('POST', '/api/finances', {
    description: 'Test Server Payout',
    amount: 2500,
    type: 'income',
    category: 'Work',
    paymentMethod: 'UPI'
  });
  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.amount, 2500);
  const txId = createRes.body.id;

  // 3. Delete transaction
  const deleteRes = await request('DELETE', `/api/finances/${txId}`);
  assert.equal(deleteRes.status, 200);
});

test('Schedule CRUD: everyday and selected_days recurrence', async () => {
  // 1. Create everyday schedule block
  const everydayRes = await request('POST', '/api/schedule', {
    title: 'Daily Morning Standup',
    date: '2026-10-06',
    hour: 9,
    duration: 1,
    category: 'Work',
    recurrence: 'everyday'
  });
  assert.equal(everydayRes.status, 201);
  assert.equal(everydayRes.body.title, 'Daily Morning Standup');
  assert.equal(everydayRes.body.recurrence, 'everyday');
  const everydayId = everydayRes.body.id;

  // 2. Create selected days schedule block
  const daysRes = await request('POST', '/api/schedule', {
    title: 'Gym Workout Routine',
    date: '2026-10-06',
    hour: 7,
    duration: 1,
    category: 'Health',
    recurrence: 'selected_days',
    repeatDays: ['Mon', 'Wed', 'Fri']
  });
  assert.equal(daysRes.status, 201);
  assert.equal(daysRes.body.recurrence, 'selected_days');
  assert.deepEqual(daysRes.body.repeatDays, ['Mon', 'Wed', 'Fri']);
  const daysId = daysRes.body.id;

  // 3. Update schedule block
  const updateRes = await request('PUT', `/api/schedule/${daysId}`, {
    repeatDays: ['Mon', 'Wed', 'Fri', 'Sat']
  });
  assert.equal(updateRes.status, 200);
  assert.deepEqual(updateRes.body.repeatDays, ['Mon', 'Wed', 'Fri', 'Sat']);

  // 4. Clean up test schedule blocks
  const delEveryday = await request('DELETE', `/api/schedule/${everydayId}`);
  assert.equal(delEveryday.status, 200);
  const delDays = await request('DELETE', `/api/schedule/${daysId}`);
  assert.equal(delDays.status, 200);
});

