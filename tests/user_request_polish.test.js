const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('Dashboard Buttons: Only "+" icon changes color like goals/schedule, not the entire button', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

  // Verify Habit button has text-emerald plus icon inside outline button
  assert.ok(indexHtml.includes('id="dash-add-habit-btn"'), 'index.html must have dash-add-habit-btn');
  const habitBtn = indexHtml.match(/id="dash-add-habit-btn"[^>]*>([\s\S]*?)<\/button>/)[1];
  assert.ok(habitBtn.includes('fa-plus') && habitBtn.includes('text-emerald'), 'Habit button "+" icon must be emerald green');
  assert.ok(habitBtn.includes('New'), 'Habit button must display "New"');

  // Verify Task button has text-cyan plus icon inside outline button
  assert.ok(indexHtml.includes('id="dash-add-task-btn"'), 'index.html must have dash-add-task-btn');
  const taskBtn = indexHtml.match(/id="dash-add-task-btn"[^>]*>([\s\S]*?)<\/button>/)[1];
  assert.ok(taskBtn.includes('fa-plus') && taskBtn.includes('text-cyan'), 'Task button "+" icon must be cyan blue');
  assert.ok(taskBtn.includes('New'), 'Task button must display "New"');

  // Verify Schedule and Goal buttons maintain colored plus icons
  const schBtn = indexHtml.match(/id="dash-create-schedule-btn"[^>]*>([\s\S]*?)<\/button>/)[1];
  assert.ok(schBtn.includes('text-amber'), 'Schedule button "+" icon is amber');
  const goalBtn = indexHtml.match(/id="dash-create-goal-btn"[^>]*>([\s\S]*?)<\/button>/)[1];
  assert.ok(goalBtn.includes('text-violet'), 'Goal button "+" icon is violet');
});

test('Dashboard Headings and Links: habits, tasks, schedules, goals with View All for all four', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

  // Headings
  assert.ok(indexHtml.includes('<h3>Habits</h3>'), 'Heading must be "Habits"');
  assert.ok(indexHtml.includes('<h3>Tasks</h3>'), 'Heading must be "Tasks"');
  assert.ok(indexHtml.includes('<h3>Schedules</h3>'), 'Heading must be "Schedules"');
  assert.ok(indexHtml.includes('<h3>Goals</h3>'), 'Heading must be "Goals"');

  // Headings link to pages
  assert.ok(indexHtml.includes('href="pages/habits.html" class="panel-title-group"'), 'Habits heading links to habits page');
  assert.ok(indexHtml.includes('href="pages/tasks.html" class="panel-title-group"'), 'Tasks heading links to tasks page');
  assert.ok(indexHtml.includes('href="pages/calendar.html" class="panel-title-group"'), 'Schedules heading links to calendar page');
  assert.ok(indexHtml.includes('href="pages/goals.html" class="panel-title-group"'), 'Goals heading links to goals page');

  // All four have View All link
  const viewAllMatches = indexHtml.match(/class="link-btn">View All &rarr;<\/a>/g);
  assert.ok(viewAllMatches && viewAllMatches.length >= 4, 'All four cards must feature a View All link');
});

test('Schedule Dashboard Preview: Everyday/days tags removed and compact time pill', () => {
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');
  const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // Verify dashboard schedule preview doesn't render repTag
  const dashSchMatch = scriptJs.match(/const dashSchStrip = document\.getElementById\('dash-schedule-preview'\);([\s\S]*?)renderDashboardGoals/);
  assert.ok(dashSchMatch, 'dash-schedule-preview block must exist in script.js');
  assert.ok(!dashSchMatch[1].includes('sch-repeat-pill'), 'Dashboard schedule preview must not render recurrence pills');

  // Time pill styling
  assert.ok(styleCss.includes('.dash-schedule-time'), 'dash-schedule-time class exists');
});

test('Prevent Text Breaking: metric-badge, priority-badge, and streak-pill never wrap vertically', () => {
  const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  assert.ok(styleCss.includes('metric-badge'), 'metric-badge styles exist');
  assert.ok(styleCss.includes('priority-badge'), 'priority-badge styles exist');

  // Verify priority-badge has nowrap and flex-shrink: 0
  const prioBlock = styleCss.match(/\.priority-badge\s*\{([\s\S]*?)\}/);
  assert.ok(prioBlock, 'priority-badge rule exists');
  assert.ok(prioBlock[1].includes('white-space: nowrap'), 'priority-badge must have white-space: nowrap');
  assert.ok(prioBlock[1].includes('flex-shrink: 0'), 'priority-badge must have flex-shrink: 0');
});

test('Auth Button: Username is required and trimmed to 6-8 letters for clean fit', () => {
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

  // Username field is required
  assert.ok(indexHtml.includes('name="name" class="styled-input"') && indexHtml.includes('required'), 'Username field must be required in auth modal');
  assert.ok(scriptJs.includes('if (isRegister && !name)'), 'handleAuthSubmit must validate username');

  // 6-8 chars formatting
  assert.ok(scriptJs.includes('rawName.length > 8 ? rawName.slice(0, 7) + \'…\' : rawName'), 'updateAuthNavButton must format username to max 6-8 letters');
});

test('Habits & Calendar Panels: Compact panel sizing on mobile', () => {
  const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // Verify compact habit-row padding and dots in mobile query
  assert.ok(styleCss.includes('.habit-row') && styleCss.includes('padding: 8px 10px !important;'), 'Habit cards must have compact padding on mobile');
  assert.ok(styleCss.includes('.seven-days-grid') && styleCss.includes('max-width: 190px !important;'), '7-day grid must be compact');
  assert.ok(styleCss.includes('.day-dot-btn,') && styleCss.includes('width: 22px !important;'), 'Day dots must be compact at 22px');

  // Verify compact agenda-event-item in calendar
  assert.ok(styleCss.includes('.agenda-event-item') && styleCss.includes('padding: 6px 10px !important;'), 'Agenda event cards must have compact 6px 10px padding');
  assert.ok(styleCss.includes('.agenda-event-time') && styleCss.includes('min-width: 62px !important;'), 'Agenda event time must be compact');
});

test('Finances & Goals: Number overflow fixed for 6+ digits and transaction amounts single-line', () => {
  const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');

  // Overview card values font clamp
  assert.ok(styleCss.includes('.fin-card-value') && styleCss.includes('clamp('), 'fin-card-value uses font size clamp to prevent ellipsis overflow');
  assert.ok(styleCss.includes('font-variant-numeric: tabular-nums !important;'), 'fin-card-value uses tabular nums');

  // Overview card labels
  assert.ok(styleCss.includes('.fin-card-label') && styleCss.includes('font-size: 0.61rem !important;'), 'fin-card-label uses compact 0.61rem font');

  // Single-line transaction logs guarantee
  assert.ok(styleCss.includes('.tx-amount') && styleCss.includes('white-space: nowrap !important;'), 'tx-amount must strictly have white-space: nowrap');
  assert.ok(styleCss.includes('.tx-amount') && styleCss.includes('flex-shrink: 0 !important;'), 'tx-amount must strictly have flex-shrink: 0');
  assert.ok(styleCss.includes('.tx-right') && styleCss.includes('flex-shrink: 0 !important;'), 'tx-right must not compress');

  // Script formats whole numbers cleanly for digit visibility
  assert.ok(scriptJs.includes('const formatFinVal ='), 'script.js must define formatFinVal');
  assert.ok(scriptJs.includes('formatFinVal(totalIncome)'), 'script.js formats totalIncome with formatFinVal');
});

test('Goals View: Quick Entry button removed and single clean Create Goal button exists', () => {
  const goalsHtml = fs.readFileSync(path.join(ROOT_DIR, 'pages', 'goals.html'), 'utf8');

  // Top quick add button removed from goals.html
  assert.ok(!goalsHtml.includes('id="top-quick-add-btn"'), 'goals.html must not contain top-quick-add-btn');
  assert.ok(!goalsHtml.includes('<span>Quick Entry</span>'), 'goals.html must not have Quick Entry button');

  // Exactly one primary goal creation button
  assert.ok(goalsHtml.includes('id="open-goal-modal-btn"'), 'goals.html must have open-goal-modal-btn');
  assert.ok(goalsHtml.includes('<span>Create New Goals</span>'), 'goals.html goal button displays "Create New Goals"');
  assert.ok(goalsHtml.includes('Avg Progress'), 'goals.html uses concise Avg Progress label');
});

test('Task Page: Search bar removed and long text elements unbroken', () => {
  const tasksHtml = fs.readFileSync(path.join(ROOT_DIR, 'pages', 'tasks.html'), 'utf8');
  const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');

  // Search bar removed from task page
  assert.ok(!tasksHtml.includes('id="task-search-input"'), 'tasks.html must not contain task-search-input');
  assert.ok(!tasksHtml.includes('Search tasks by title...'), 'tasks.html must not contain task search placeholder');

  // Task layout uses task-body and task-tags-row for full width title
  assert.ok(scriptJs.includes('task-body'), 'script.js uses task-body for task title layout');
  assert.ok(scriptJs.includes('task-tags-row'), 'script.js places tags in a dedicated row below title');
  assert.ok(styleCss.includes('.task-tags-row'), 'style.css defines task-tags-row');
  assert.ok(styleCss.includes('hyphens: none !important;'), 'task-label disables auto-hyphen syllable breakage');
});

test('Overview Typography: Goals numbers big like before, finance numbers dynamically sized (4-digit big, 5-6 digit smaller)', () => {
  const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');

  // Goals numbers big like before
  assert.ok(styleCss.includes('.goal-stat-card .fin-card-value') && styleCss.includes('font-size: 1.85rem !important;'), 'Goals numbers must be big at 1.85rem');

  // Finance dynamic classes based on digit count
  assert.ok(scriptJs.includes('getDigitCount'), 'script.js implements getDigitCount');
  assert.ok(scriptJs.includes('fin-val-sm fin-val-compact'), 'script.js adds fin-val-sm when > 4 digits');
  assert.ok(scriptJs.includes('fin-val-lg'), 'script.js adds fin-val-lg when <= 4 digits');
  assert.ok(styleCss.includes('.fin-card-value.fin-val-lg') && styleCss.includes('font-size: 1.38rem !important;'), 'fin-val-lg is bigger (1.38rem)');
  assert.ok(styleCss.includes('.fin-card-value.fin-val-sm'), 'fin-val-sm is defined in style.css');
});

test('Goals & Journal Request: Goals button text and journaled notes scroll wheel', () => {
  const goalsHtml = fs.readFileSync(path.join(ROOT_DIR, 'pages', 'goals.html'), 'utf8');
  const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // Goals button says "+ Create New Goals"
  assert.ok(goalsHtml.includes('<span>Create New Goals</span>'), 'Goals button must display "Create New Goals"');

  // Scroll wheel on journaled notes
  assert.ok(styleCss.includes('.journal-cards-list::-webkit-scrollbar'), 'journal-cards-list has webkit scrollbar');
  assert.ok(styleCss.includes('.journal-reader-content::-webkit-scrollbar'), 'journal-reader-content has webkit scrollbar');
  assert.ok(styleCss.includes('.journal-card-body.expanded::-webkit-scrollbar'), 'expanded journal note has webkit scrollbar');
});

test('Rank Tiers List: Full width description, compact XP needed / completed badges, and unbroken text layout', () => {
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');
  const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // Script markup uses rank-tier-header and rank-tier-desc
  assert.ok(scriptJs.includes('rank-tier-header'), 'script.js uses rank-tier-header');
  assert.ok(scriptJs.includes('rank-tier-desc'), 'script.js uses rank-tier-desc');

  // CSS defines rank-tier-desc and column layout for rank-tier-row
  assert.ok(styleCss.includes('.rank-tier-row') && styleCss.includes('flex-direction: column;'), 'rank-tier-row has flex-direction: column');
  assert.ok(styleCss.includes('.rank-tier-desc'), 'style.css defines rank-tier-desc');
  assert.ok(styleCss.includes('.rank-tier-header'), 'style.css defines rank-tier-header');

  // XP needed and completed status badges are compact & smaller
  assert.ok(styleCss.includes('.rank-status-tag') && styleCss.includes('font-size: 0.62rem !important;'), 'rank-status-tag has compact font-size 0.62rem');
  assert.ok(styleCss.includes('padding: 2.5px 7px !important;') || styleCss.includes('padding: 2px 6px !important;'), 'rank-status-tag has compact padding');
  assert.ok(styleCss.includes('.rank-status-completed'), 'styleCss supports rank-status-completed');
  assert.ok(styleCss.includes('.rank-progress-text strong') && styleCss.includes('white-space: nowrap !important;'), 'rank-progress-text strong does not wrap');
});




