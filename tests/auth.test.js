const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

function request(method, path, body = null, token = null) {
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

test('Multi-User Auth: Registration validation, hashing, and duplicate prevention', async () => {
  // 1. Validation error on invalid email
  const badEmailRes = await request('POST', '/api/auth/register', {
    email: 'not-an-email',
    password: 'password123'
  });
  assert.equal(badEmailRes.status, 400);

  // 2. Validation error on short password
  const shortPassRes = await request('POST', '/api/auth/register', {
    email: 'valid@example.com',
    password: '123'
  });
  assert.equal(shortPassRes.status, 400);

  // 3. Successful registration
  const uniqueEmail = `testuser_${Date.now()}@lifeos.app`;
  const regRes = await request('POST', '/api/auth/register', {
    email: uniqueEmail,
    password: 'securePassword2026',
    name: 'Atlas Commander'
  });
  assert.equal(regRes.status, 201);
  assert.ok(regRes.body.token, 'Must return JWT token');
  assert.equal(regRes.body.user.email, uniqueEmail);
  assert.equal(regRes.body.user.name, 'Atlas Commander');

  // 4. Duplicate registration prevention
  const dupRes = await request('POST', '/api/auth/register', {
    email: uniqueEmail,
    password: 'anotherPassword'
  });
  assert.equal(dupRes.status, 409);
});

test('Multi-User Auth: Login verification and JWT token issuance', async () => {
  const email = `login_test_${Date.now()}@lifeos.app`;
  const password = 'mySecretPassword123';

  // Register user
  await request('POST', '/api/auth/register', {
    email,
    password,
    name: 'Login Tester'
  });

  // 1. Login with incorrect password
  const failRes = await request('POST', '/api/auth/login', {
    email,
    password: 'wrongPassword'
  });
  assert.equal(failRes.status, 401);

  // 2. Login with non-existent email
  const notFoundRes = await request('POST', '/api/auth/login', {
    email: 'nonexistent@lifeos.app',
    password: 'password'
  });
  assert.equal(notFoundRes.status, 401);

  // 3. Successful login
  const successRes = await request('POST', '/api/auth/login', {
    email,
    password
  });
  assert.equal(successRes.status, 200);
  assert.ok(successRes.body.token, 'Must return JWT token');
  assert.equal(successRes.body.user.email, email);

  // 4. Identity check via /api/auth/me
  const meRes = await request('GET', '/api/auth/me', null, successRes.body.token);
  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.user.email, email);
});

test('Multi-User Auth: Protected endpoints and isolated tenant partitions', async () => {
  // 1. Unauthorized access to /api/user/data must return 401
  const unauthGet = await request('GET', '/api/user/data');
  assert.equal(unauthGet.status, 401);

  const unauthPost = await request('POST', '/api/user/data', { habits: [] });
  assert.equal(unauthPost.status, 401);

  // 2. Create User A and User B
  const userA_res = await request('POST', '/api/auth/register', {
    email: `usera_${Date.now()}@lifeos.app`,
    password: 'passwordA123',
    name: 'User A'
  });
  const tokenA = userA_res.body.token;

  const userB_res = await request('POST', '/api/auth/register', {
    email: `userb_${Date.now()}@lifeos.app`,
    password: 'passwordB123',
    name: 'User B'
  });
  const tokenB = userB_res.body.token;

  // 3. User A writes private habit and tasks
  const saveA = await request('POST', '/api/user/data', {
    habits: [{ id: 'h_a1', name: 'Private Habit of User A', category: 'Health' }],
    tasks: [{ id: 't_a1', title: 'Private Task of User A', completed: false }]
  }, tokenA);
  assert.equal(saveA.status, 200);

  // 4. User B reads private data (must be isolated and empty of User A's data)
  const getB = await request('GET', '/api/user/data', null, tokenB);
  assert.equal(getB.status, 200);
  assert.equal(getB.body.habits.length, 0, 'User B must not see User A habits');
  assert.equal(getB.body.tasks.length, 0, 'User B must not see User A tasks');

  // 5. User A reads private data (must contain their saved items)
  const getA = await request('GET', '/api/user/data', null, tokenA);
  assert.equal(getA.status, 200);
  assert.equal(getA.body.habits.length, 1);
  assert.equal(getA.body.habits[0].name, 'Private Habit of User A');
  assert.equal(getA.body.tasks[0].title, 'Private Task of User A');
});
