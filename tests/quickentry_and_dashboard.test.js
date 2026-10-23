const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('Quick Entry Modal: Goal tab and form exist across index and subpages', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('data-tab="goal"'), 'index.html contains data-tab="goal"');
  assert.ok(indexHtml.includes('id="modal-goal-form"'), 'index.html contains id="modal-goal-form"');
  assert.ok(indexHtml.includes('id="modal-goal-title"'), 'index.html contains id="modal-goal-title"');
  assert.ok(indexHtml.includes('id="modal-goal-category"'), 'index.html contains id="modal-goal-category"');
  assert.ok(indexHtml.includes('id="modal-goal-category-group"'), 'index.html contains id="modal-goal-category-group"');
  assert.ok(indexHtml.includes('id="modal-goal-date"'), 'index.html contains id="modal-goal-date"');
  assert.ok(indexHtml.includes('id="modal-goal-progress"'), 'index.html contains id="modal-goal-progress"');
  assert.ok(indexHtml.includes('id="modal-goal-progress-display"'), 'index.html contains id="modal-goal-progress-display"');
  assert.ok(indexHtml.includes('id="modal-goal-metrics"'), 'index.html contains id="modal-goal-metrics"');
  assert.ok(indexHtml.includes('id="modal-goal-milestones"'), 'index.html contains id="modal-goal-milestones"');
  assert.ok(indexHtml.includes('id="modal-goal-desc"'), 'index.html contains id="modal-goal-desc"');

  const subpages = ['calendar.html', 'habits.html', 'tasks.html', 'finances.html', 'journal.html', 'settings.html', 'analytics.html'];
  for (const page of subpages) {
    const pageHtml = fs.readFileSync(path.join(ROOT_DIR, 'pages', page), 'utf8');
    assert.ok(pageHtml.includes('data-tab="goal"'), `${page} contains data-tab="goal"`);
    assert.ok(pageHtml.includes('id="modal-goal-form"'), `${page} contains id="modal-goal-form"`);
  }
});

test('60 FPS Hardware Acceleration: CSS uses GPU-composite properties', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  assert.ok(css.includes('@keyframes modalPopIn'), 'CSS defines modalPopIn keyframe');
  assert.ok(css.includes('will-change: transform, opacity'), 'CSS uses will-change: transform, opacity');
  assert.ok(css.includes('backface-visibility: hidden'), 'CSS uses backface-visibility: hidden');
  assert.ok(css.includes('@keyframes formFadeIn'), 'CSS defines formFadeIn keyframe');
});

test('Script Logic: switchCreatorTab handles goal in-place without popup window', () => {
  const js = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');
  assert.ok(!js.includes("switchCreatorTab(tab) {\n  if (tab === 'goal')"), 'switchCreatorTab does not redirect goal to separate modal');
  assert.ok(js.includes("tab === 'goal'"), 'switchCreatorTab handles goal natively');
  assert.ok(js.includes("'Set Strategic Goal'"), 'switchCreatorTab updates header for goal');
  assert.ok(js.includes("form.id === 'modal-goal-form'"), 'Form submit handles modal-goal-form');
  assert.ok(js.includes("modal-goal-category-group"), 'Delegated click handles goal category chips');
  assert.ok(js.includes("e.target.id === 'modal-goal-progress'"), 'Real-time slider updates modal-goal-progress-display');
});

test('Dashboard Copy: No commanding or asking text under header cards or panels', () => {
  const js = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');
  // Forbidden phrases that command or force-tell
  assert.ok(!js.includes('Click "+ New" to add one!'), 'Removed "Click + New to add one!"');
  assert.ok(!js.includes('No goals created yet. Set First Goal'), 'Removed "Set First Goal"');
  assert.ok(!js.includes('Open Calendar &rarr;'), 'Removed "Open Calendar" callout in dashboard schedule preview');
  assert.ok(!js.includes('Complete 2 habits today and log your focus tasks to ignite immediate momentum'), 'Removed coercive tier coaching copy');

  // Verify neutral strings are present
  assert.ok(js.includes('No habits tracked today'), 'Neutral habits empty state present');
  assert.ok(js.includes('No focus tasks queued'), 'Neutral tasks empty state present');
  assert.ok(js.includes('No time-blocks scheduled today'), 'Neutral schedule empty state present');
  assert.ok(js.includes('No active strategic goals'), 'Neutral goals empty state present');
});

test('Goals Empty State Button: Plus icon is cleanly scoped and aligned', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  assert.ok(css.includes('.empty-state .btn i'), 'style.css scopes .empty-state .btn i');
  assert.ok(!css.includes('.empty-state i {\n  font-size: 2.4rem;'), 'style.css does not pollute all nested button icons');
});
