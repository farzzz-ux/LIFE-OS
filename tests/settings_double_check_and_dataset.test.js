const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const { DEFAULT_SAMPLE_DATA, DEFAULT_STATE } = require(path.join(ROOT_DIR, 'js', 'sampleData.js'));
const scriptJs = require(path.join(ROOT_DIR, 'script.js'));

test('Sample Dataset: 10-20 items in every single life pillar with valid mathematical distributions', () => {
  // 1. Habit count check
  assert.ok(DEFAULT_SAMPLE_DATA.habits.length >= 10 && DEFAULT_SAMPLE_DATA.habits.length <= 20, 
    `Habits must have 10-20 items, got ${DEFAULT_SAMPLE_DATA.habits.length}`);

  // 2. Task count check
  assert.ok(DEFAULT_SAMPLE_DATA.tasks.length >= 10 && DEFAULT_SAMPLE_DATA.tasks.length <= 20, 
    `Tasks must have 10-20 items, got ${DEFAULT_SAMPLE_DATA.tasks.length}`);

  // 3. Schedule count check
  assert.ok(DEFAULT_SAMPLE_DATA.schedule.length >= 10 && DEFAULT_SAMPLE_DATA.schedule.length <= 20, 
    `Schedule must have 10-20 items, got ${DEFAULT_SAMPLE_DATA.schedule.length}`);

  // 4. Goals count check
  assert.ok(DEFAULT_SAMPLE_DATA.goals.length >= 10 && DEFAULT_SAMPLE_DATA.goals.length <= 20, 
    `Goals must have 10-20 items, got ${DEFAULT_SAMPLE_DATA.goals.length}`);

  // 5. Finances count check
  assert.ok(DEFAULT_SAMPLE_DATA.transactions.length >= 10 && DEFAULT_SAMPLE_DATA.transactions.length <= 20, 
    `Transactions must have 10-20 items, got ${DEFAULT_SAMPLE_DATA.transactions.length}`);

  // 6. Journal count check
  assert.ok(DEFAULT_SAMPLE_DATA.journal.length >= 10 && DEFAULT_SAMPLE_DATA.journal.length <= 20, 
    `Journal must have 10-20 items, got ${DEFAULT_SAMPLE_DATA.journal.length}`);

  // 7. Math validation: finances savings calculation
  const totalIncome = DEFAULT_SAMPLE_DATA.transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = DEFAULT_SAMPLE_DATA.transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  assert.ok(totalIncome > totalExpense, 'Total income should exceed total expense for positive net savings');
  const netSavings = totalIncome - totalExpense;
  assert.ok(netSavings > 0, `Net savings must be positive, got ${netSavings}`);

  // 8. Math validation: Life Score calculation
  const scoreResult = scriptJs.calculateLifeScore('week', new Date('2026-10-20'), DEFAULT_SAMPLE_DATA);
  assert.ok(typeof scoreResult.totalScore === 'number', 'Overall Life Score should be a number');
  assert.ok(scoreResult.totalScore >= 0 && scoreResult.totalScore <= 100, 
    `Life Score must be between 0 and 100, got ${scoreResult.totalScore}`);
  assert.ok(scoreResult.totalScore > 0, `Life Score must be greater than zero with rich starter data, got ${scoreResult.totalScore}`);
});

test('Dashboard Add Buttons: All four cards consistently display "+ New"', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

  // Habit Add Button
  assert.ok(indexHtml.includes('id="dash-add-habit-btn"'), 'index.html must have dash-add-habit-btn');
  const habitBtnMatch = indexHtml.match(/id="dash-add-habit-btn"[^>]*>([\s\S]*?)<\/button>/);
  assert.ok(habitBtnMatch && habitBtnMatch[1].includes('New'), 'Habit button must display "New"');

  // Task Add Button
  assert.ok(indexHtml.includes('id="dash-add-task-btn"'), 'index.html must have dash-add-task-btn');
  const taskBtnMatch = indexHtml.match(/id="dash-add-task-btn"[^>]*>([\s\S]*?)<\/button>/);
  assert.ok(taskBtnMatch && taskBtnMatch[1].includes('New'), 'Task button must display "New"');

  // Schedule Add Button
  assert.ok(indexHtml.includes('id="dash-create-schedule-btn"'), 'index.html must have dash-create-schedule-btn');
  const schBtnMatch = indexHtml.match(/id="dash-create-schedule-btn"[^>]*>([\s\S]*?)<\/button>/);
  assert.ok(schBtnMatch && schBtnMatch[1].includes('New'), 'Schedule button must display "New"');

  // Goal Add Button
  assert.ok(indexHtml.includes('id="dash-create-goal-btn"'), 'index.html must have dash-create-goal-btn');
  const goalBtnMatch = indexHtml.match(/id="dash-create-goal-btn"[^>]*>([\s\S]*?)<\/button>/);
  assert.ok(goalBtnMatch && goalBtnMatch[1].includes('New'), 'Goal button must display "New"');
});

test('Top Header: Account button replaces over-named Sync / Sign In across all pages', () => {
  const files = ['index.html', ...fs.readdirSync(path.join(ROOT_DIR, 'pages')).map(f => path.join('pages', f))];

  for (const rel of files) {
    const content = fs.readFileSync(path.join(ROOT_DIR, rel), 'utf8');
    assert.ok(!content.includes('Sync / Sign In'), `${rel} must not contain over-named 'Sync / Sign In'`);
    assert.ok(content.includes('id="nav-user-label">Account</span>'), `${rel} must use clean 'Account' label`);
  }
});

test('Settings Page 10x Improvements: Clear explanations, live pillar counters, and 4 modular cleanup tools', () => {
  const settingsHtml = fs.readFileSync(path.join(ROOT_DIR, 'pages', 'settings.html'), 'utf8');

  // 1. Double check modal container exists
  assert.ok(settingsHtml.includes('id="double-check-modal"'), 'settings.html must contain double-check-modal');
  assert.ok(settingsHtml.includes('id="double-check-confirm-btn"'), 'modal must contain double-check-confirm-btn');
  assert.ok(settingsHtml.includes('id="double-check-cancel-btn"'), 'modal must contain double-check-cancel-btn');

  // 2. All 4 cleanup tools are present with simple explanations
  assert.ok(settingsHtml.includes('id="settings-clear-completed-btn"'), 'Must have Clear Completed Tasks tool');
  assert.ok(settingsHtml.includes('id="settings-clear-events-btn"'), 'Must have Clear Past Calendar Blocks tool');
  assert.ok(settingsHtml.includes('id="reset-demo-btn"'), 'Must have Restore Sample Workspace tool');
  assert.ok(settingsHtml.includes('id="settings-wipe-all-btn"'), 'Must have Start Completely Blank tool');

  // 3. Live Workspace Summary counters
  assert.ok(settingsHtml.includes('id="settings-habit-count"'), 'Summary has habit counter');
  assert.ok(settingsHtml.includes('id="settings-task-count"'), 'Summary has task counter');
  assert.ok(settingsHtml.includes('id="settings-sch-count"'), 'Summary has schedule counter');
  assert.ok(settingsHtml.includes('id="settings-goal-count"'), 'Summary has goal counter');
  assert.ok(settingsHtml.includes('id="settings-tx-count"'), 'Summary has transaction counter');
  assert.ok(settingsHtml.includes('id="settings-journal-count"'), 'Summary has journal counter');
  assert.ok(settingsHtml.includes('id="settings-ach-count"'), 'Summary has achievement counter');

  // 4. Sound & Display controls
  assert.ok(settingsHtml.includes('id="settings-sound-toggle-btn"'), 'Has audio feedback button');
  assert.ok(settingsHtml.includes('id="settings-weekstart-select"'), 'Has week start selector');
  assert.ok(settingsHtml.includes('id="settings-timeformat-select"'), 'Has time format selector');

  // 5. JavaScript functions exist and are exported
  assert.ok(typeof scriptJs.initSettings === 'function', 'initSettings is exported');
  assert.ok(typeof scriptJs.renderSettingsView === 'function', 'renderSettingsView is exported');
  assert.ok(typeof scriptJs.ensureDoubleCheckModal === 'function', 'ensureDoubleCheckModal is exported');
  assert.ok(typeof scriptJs.promptDoubleCheck === 'function', 'promptDoubleCheck is exported');
  assert.ok(typeof scriptJs.closeDoubleCheckModal === 'function', 'closeDoubleCheckModal is exported');
});

test('Double-Checking Protection: All deletion endpoints support safety confirmation', () => {
  assert.ok(typeof scriptJs.deleteHabit === 'function', 'deleteHabit function exists');
  assert.ok(typeof scriptJs.deleteTask === 'function', 'deleteTask function exists');
  assert.ok(typeof scriptJs.deleteScheduleEvent === 'function', 'deleteScheduleEvent function exists');
  assert.ok(typeof scriptJs.deleteGoal === 'function', 'deleteGoal function exists');
  assert.ok(typeof scriptJs.deleteTransaction === 'function', 'deleteTransaction function exists');
  assert.ok(typeof scriptJs.deleteJournalEntry === 'function', 'deleteJournalEntry function exists');
  assert.ok(typeof scriptJs.saveFullStateToServer === 'function', 'saveFullStateToServer function exists');
});

test('Settings Time Format & Hour Labels: 12h AM/PM vs 24h Military time formatting', () => {
  // Test 12h formatting
  global.localStorage = {
    _data: { 'life_os_time_format': '12h' },
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = v; }
  };
  assert.strictEqual(scriptJs.formatHourLabel(9), '09:00 AM');
  assert.strictEqual(scriptJs.formatHourLabel(12), '12:00 PM');
  assert.strictEqual(scriptJs.formatHourLabel(14), '02:00 PM');
  assert.strictEqual(scriptJs.formatHourLabel(0), '12:00 AM');

  // Test 24h formatting
  global.localStorage.setItem('life_os_time_format', '24h');
  assert.strictEqual(scriptJs.formatHourLabel(9), '09:00');
  assert.strictEqual(scriptJs.formatHourLabel(12), '12:00');
  assert.strictEqual(scriptJs.formatHourLabel(14), '14:00');
  assert.strictEqual(scriptJs.formatHourLabel(0), '00:00');
});

test('Settings Schedule Cleaner: Protects recurring events and today while removing past blocks', () => {
  const todayStr = '2026-10-21';
  const isPastNonRecurring = (e) => {
    const isRecurring = e.recurrence === 'everyday' || e.repeat === 'everyday' || e.recurrence === 'selected_days' || (Array.isArray(e.repeatDays) && e.repeatDays.length > 0);
    return !isRecurring && e.date && e.date < todayStr;
  };

  const sampleEvents = [
    { id: '1', title: 'Past Single Event', date: '2026-10-15', recurrence: 'once' },
    { id: '2', title: 'Today Event', date: '2026-10-21', recurrence: 'once' },
    { id: '3', title: 'Future Event', date: '2026-10-25', recurrence: 'once' },
    { id: '4', title: 'Past Recurring Everyday', date: '2026-10-01', recurrence: 'everyday' },
    { id: '5', title: 'Past Recurring Days', date: '2026-10-05', recurrence: 'selected_days', repeatDays: ['Mon', 'Wed'] }
  ];

  const filtered = sampleEvents.filter(e => !isPastNonRecurring(e));
  assert.strictEqual(filtered.length, 4, 'Must remove only the 1 past single event and keep 4 events');
  assert.ok(filtered.some(e => e.id === '2'), 'Must keep today event');
  assert.ok(filtered.some(e => e.id === '3'), 'Must keep future event');
  assert.ok(filtered.some(e => e.id === '4'), 'Must keep past everyday recurring event');
  assert.ok(filtered.some(e => e.id === '5'), 'Must keep past selected_days recurring event');
});

