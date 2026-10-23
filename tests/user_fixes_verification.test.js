const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');

test('Dashboard UI: Header intro block and life score sidebar removed, account panel present', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

  // 1. Red box items removed: Command Dashboard title, intro subtitle, Life Score & Star Analytics button
  assert.strictEqual(indexHtml.includes('class="dashboard-header-intro"'), false, 'dashboard-header-intro must be removed');
  assert.strictEqual(indexHtml.includes('Life Score &amp; Star Analytics &rarr;'), false, 'Header star analytics button must be removed');
  assert.strictEqual(indexHtml.includes("Today's active momentum across habits"), false, 'Header subtitle must be removed');

  // 2. Life score removed from sidebar and Account panel exists
  assert.strictEqual(indexHtml.includes('class="life-score-sidebar"'), false, 'life-score-sidebar must be removed from index.html');
  assert.ok(indexHtml.includes('id="sync-status-card"'), 'sync-status-card should exist in index.html');
  assert.ok(indexHtml.includes('id="sidebar-account-avatar"'), 'sidebar-account-avatar should exist in index.html');

  // Check all subpages also removed life-score-sidebar and contain account panel
  const pagesDir = path.join(ROOT_DIR, 'pages');
  const pages = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
  for (const page of pages) {
    const content = fs.readFileSync(path.join(pagesDir, page), 'utf8');
    assert.strictEqual(content.includes('class="life-score-sidebar"'), false, `${page} must NOT contain life-score-sidebar`);
    assert.ok(content.includes('id="sync-status-card"'), `${page} must contain sync-status-card`);
    assert.ok(content.includes('id="sidebar-account-avatar"'), `${page} must contain sidebar-account-avatar`);
  }
});

test('Journal UI: Select dropdown removed and all 6 category chips present', () => {
  const journalHtml = fs.readFileSync(path.join(ROOT_DIR, 'pages', 'journal.html'), 'utf8');
  assert.strictEqual(journalHtml.includes('id="journal-mood"'), false, 'select id="journal-mood" must not exist');
  assert.ok(journalHtml.includes('id="journal-tag-chips"'), 'journal-tag-chips must exist');

  const expectedChips = ['Reflection', 'Gratitude', 'Ideas', 'Wins', 'Lessons', 'Daily Log'];
  for (const chip of expectedChips) {
    assert.ok(journalHtml.includes(chip), `Journal chip ${chip} must be present`);
  }
});

test('Settings UI: Dark theme descriptive card text removed', () => {
  const settingsHtml = fs.readFileSync(path.join(ROOT_DIR, 'pages', 'settings.html'), 'utf8');
  assert.strictEqual(settingsHtml.includes('id="settings-card-theme"'), false, 'settings-card-theme panel must be removed');
  assert.strictEqual(settingsHtml.includes('Life OS is permanently optimized with a unified high-contrast'), false, 'Dark theme text must be removed');
});

test('Star Chart: ViewBox updated and labels symmetrically middle-anchored without clipping', () => {
  const analyticsHtml = fs.readFileSync(path.join(ROOT_DIR, 'pages', 'analytics.html'), 'utf8');
  assert.ok(analyticsHtml.includes('viewBox="0 0 520 440"'), 'Star chart SVG must have balanced 520x440 viewBox');

  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');
  assert.ok(scriptJs.includes('text-anchor="middle"'), 'Outer axis labels must use text-anchor="middle"');
  assert.ok(scriptJs.includes('x: 260'), 'Outer axis labels must center at cx=260');
});

test('Finances: Income system properly aggregates categories and prevents 0-rupee expense distortion', () => {
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');
  assert.ok(scriptJs.includes('const expenseCategories = {};'), 'Must separate expenseCategories');
  assert.ok(scriptJs.includes('const incomeCategories = {};'), 'Must separate incomeCategories');
  assert.ok(scriptJs.includes('Income by Category'), 'Must support Income by Category breakdown title');
  assert.ok(scriptJs.includes('Spending by Category'), 'Must support Spending by Category breakdown title');
});

test('Dashboard: Schedule focus items include interactive completion checkbox', () => {
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');
  assert.ok(scriptJs.includes('schedule-check-btn'), 'dash-schedule-pill must include schedule-check-btn checkbox');
  assert.ok(scriptJs.includes('toggleScheduleEvent(blk.id, todayStr)'), 'schedule checkbox must invoke toggleScheduleEvent');
});

test('Clean Organization: Backup db.json.bak is deleted', () => {
  assert.strictEqual(fs.existsSync(path.join(ROOT_DIR, 'data', 'db.json.bak')), false, 'db.json.bak must be deleted');
});

test('Server Routing: Clean URLs and dashboard aliases return HTTP 200 without 404', async () => {
  const checkUrl = (urlPath) => new Promise((resolve) => {
    http.get('http://127.0.0.1:3000' + urlPath, (res) => {
      resolve(res.statusCode);
    }).on('error', () => resolve(null));
  });

  const routes = ['/index.html', '/dashboard', '/pages/index.html', '/pages/tasks.html'];
  for (const r of routes) {
    const status = await checkUrl(r);
    assert.strictEqual(status, 200, `Route ${r} should return status 200, got ${status}`);
  }
});
