const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

function postTask(taskData) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(taskData);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/tasks',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getTasks() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/tasks', res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Failed to parse tasks: ${body}`));
        }
      });
    }).on('error', reject);
  });
}

test('Atomic Concurrency: Multiple rapid parallel saves never corrupt JSON database', async () => {
  const initialTasks = await getTasks();
  const initialCount = initialTasks.length;

  const CONCURRENT_COUNT = 15;
  const promises = [];
  const results = [];
  try {
    for (let i = 0; i < CONCURRENT_COUNT; i++) {
      promises.push(postTask({
        title: `Concurrent Test Task #${i + 1} - ${Date.now()}`,
        priority: 'high',
        category: 'Work'
      }));
    }

    const settled = await Promise.all(promises);
    results.push(...settled);
    for (const res of results) {
      assert.equal(res.status, 201, 'Each concurrent write must succeed with 201 Created');
      assert.ok(res.data && res.data.id, 'Created task must return valid entity with ID');
    }

    const finalTasks = await getTasks();
    for (const res of results) {
      const found = finalTasks.some(t => t.id === res.data.id);
      assert.ok(found, `Concurrent task ${res.data.id} must be preserved in final tasks without data loss`);
    }
    assert.ok(finalTasks.length >= initialCount + CONCURRENT_COUNT, 'All concurrent writes must be saved');
  } finally {
    const { db } = require('../src/db/database.cjs');
    db.prepare("DELETE FROM tasks WHERE title LIKE 'Concurrent Test Task%'").run();
  }
});
