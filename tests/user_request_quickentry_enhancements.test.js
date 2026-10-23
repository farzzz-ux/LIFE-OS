const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('Quick Entry & Goals: Date Picker calendar interactivity and default today date', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');
  const { getLocalDateString } = require(path.join(ROOT_DIR, 'script.js'));

  // 1. Date inputs are present with type="date"
  assert.ok(indexHtml.includes('id="modal-sch-date"'), 'index.html has modal-sch-date');
  assert.ok(indexHtml.includes('id="modal-goal-date"'), 'index.html has modal-goal-date');

  // 2. CSS enforces color-scheme: dark and pointer events for calendar picker
  assert.ok(css.includes('input[type="date"],'), 'CSS styles all date inputs');
  assert.ok(css.includes('color-scheme: dark;'), 'CSS enforces color-scheme dark');
  assert.ok(css.includes('.input-wrapper .input-icon.fa-calendar'), 'Calendar icon is interactive');

  // 3. Script logic defaults both schedule and goal to today's date
  assert.ok(scriptJs.includes('defaults.date || todayStr'), 'Schedule date defaults to today');
  assert.ok(scriptJs.includes('defaults.targetDate || todayStr'), 'Goal date defaults to today in quick entry');
  assert.ok(scriptJs.includes('targetDateInput.value = getLocalDateString(new Date())'), 'openGoalModal defaults to today');

  const today = getLocalDateString(new Date());
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/, 'getLocalDateString returns valid YYYY-MM-DD');
});

test('Transaction Income Category: "Other Income" changed to just "Other"', () => {
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');
  const { INCOME_CATEGORIES } = require(path.join(ROOT_DIR, 'script.js'));

  assert.ok(Array.isArray(INCOME_CATEGORIES), 'INCOME_CATEGORIES is an array');
  assert.ok(INCOME_CATEGORIES.some(c => c.val === 'Other' && c.label.includes('Other')), 'INCOME_CATEGORIES contains Other');
  assert.ok(!INCOME_CATEGORIES.some(c => c.val === 'Other Income'), 'INCOME_CATEGORIES does NOT contain "Other Income"');
  assert.ok(!scriptJs.includes("val: 'Other Income'"), 'script.js does not contain "val: \'Other Income\'"');
});

test('Schedule Start Time: Modern styled time selector with clock icon, optgroups, and presets removed per request', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');

  // 1. HTML structure in index.html
  assert.ok(indexHtml.includes('class="select-wrapper time-select-wrapper"'), 'index.html has time-select-wrapper');
  assert.ok(indexHtml.includes('class="styled-time-select"'), 'index.html has styled-time-select');
  assert.ok(!indexHtml.includes('id="modal-sch-time-presets"'), 'index.html has modal-sch-time-presets removed per request');

  // 2. CSS rules
  assert.ok(css.includes('.time-select-wrapper'), 'CSS defines .time-select-wrapper');
  assert.ok(css.includes('.styled-time-select'), 'CSS defines .styled-time-select');
  assert.ok(css.includes('padding-left: 44px !important;'), 'CSS has padding-left: 44px to prevent clock icon and time overlap');

  // 3. Subpages also have the upgraded time select without presets
  const subpages = ['calendar.html', 'habits.html', 'tasks.html', 'finances.html', 'journal.html', 'settings.html', 'analytics.html'];
  for (const page of subpages) {
    const pageHtml = fs.readFileSync(path.join(ROOT_DIR, 'pages', page), 'utf8');
    assert.ok(pageHtml.includes('time-select-wrapper'), `${page} contains time-select-wrapper`);
    assert.ok(!pageHtml.includes('modal-sch-time-presets'), `${page} has modal-sch-time-presets removed`);
  }
});

test('Transaction Steppers: Buttons count by 1 and prominent steppers exist', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');

  // 1. Step is 1, not 0.01
  assert.ok(indexHtml.includes('step="1"'), 'index.html amount step is 1');
  assert.ok(!indexHtml.includes('id="modal-tx-amount" placeholder="0.00" step="0.01"'), 'step 0.01 is removed');

  // 2. Stepper buttons exist
  assert.ok(indexHtml.includes('class="stepper-buttons-group"'), 'index.html has stepper-buttons-group');
  assert.ok(indexHtml.includes('id="tx-amount-dec"'), 'index.html has tx-amount-dec button');
  assert.ok(indexHtml.includes('id="tx-amount-inc"'), 'index.html has tx-amount-inc button');

  // 3. Subpages amount inputs count 1 and have steppers
  const subpages = ['calendar.html', 'habits.html', 'tasks.html', 'finances.html', 'journal.html', 'settings.html', 'analytics.html'];
  for (const page of subpages) {
    const pageHtml = fs.readFileSync(path.join(ROOT_DIR, 'pages', page), 'utf8');
    assert.ok(pageHtml.includes('step="1"'), `${page} has step="1"`);
    assert.ok(pageHtml.includes('tx-amount-inc'), `${page} has tx-amount-inc`);
    assert.ok(pageHtml.includes('tx-amount-dec'), `${page} has tx-amount-dec`);
  }

  // 4. CSS defines stepper styles
  assert.ok(css.includes('.stepper-buttons-group'), 'CSS defines .stepper-buttons-group');
  assert.ok(css.includes('.amount-stepper-btn'), 'CSS defines .amount-stepper-btn');

  // 5. Script handles increment and decrement by 1
  assert.ok(scriptJs.includes('.amount-stepper-inc'), 'script.js handles amount-stepper-inc');
  assert.ok(scriptJs.includes('.amount-stepper-dec'), 'script.js handles amount-stepper-dec');
  assert.ok(scriptJs.includes('Math.round(cur + 1)'), 'script.js counts by 1 on inc');
  assert.ok(scriptJs.includes('Math.round(cur - 1)'), 'script.js counts by 1 on dec');
});
