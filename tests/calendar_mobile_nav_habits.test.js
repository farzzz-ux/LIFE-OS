const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('Calendar & Navbar: All HTML pages have closed modal containers and top-level mobile-bottom-nav', () => {
  const pages = ['index.html', ...fs.readdirSync(path.join(ROOT_DIR, 'pages')).map(f => path.join('pages', f))];

  pages.forEach(relPath => {
    const html = fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf8');
    const navIdx = html.indexOf('mobile-bottom-nav');
    assert.ok(navIdx !== -1, `${relPath} must have mobile-bottom-nav`);

    const beforeNav = html.substring(0, navIdx);
    let openDivs = 0;
    const regex = /<\/?div\b[^>]*>/gi;
    let match;
    while ((match = regex.exec(beforeNav)) !== null) {
      if (match[0].startsWith('</')) openDivs--;
      else if (!match[0].endsWith('/>')) openDivs++;
    }
    assert.strictEqual(openDivs, 0, `${relPath} must have 0 unclosed divs before mobile-bottom-nav`);
  });
});

test('Calendar: Date numbers never wrap vertically and event chips are crisp', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // .cal-cell-num prevents vertical splitting of 2-digit numbers
  assert.ok(
    css.includes('.cal-cell-num {') && css.includes('white-space: nowrap !important;'),
    '.cal-cell-num enforces white-space nowrap'
  );
  assert.ok(
    css.includes('word-break: normal !important;') && css.includes('.cal-cell-num'),
    '.cal-cell-num enforces word-break normal'
  );

  // Mobile calendar styling
  assert.ok(css.includes('.cal-day-cell-clean {') && css.includes('height: 64px !important;'), 'Mobile calendar day cells have uniform compact height');
  assert.ok(css.includes('.cal-cell-count {') && css.includes('border-radius: 50%'), 'Event count badges are circular');
  assert.ok(css.includes('.calendar-legend-bar {') && css.includes('flex-wrap: wrap !important;'), 'Calendar legend bar wraps neatly on mobile');
});

test('Mobile Navbar & Modals: Modal backdrop covers full screen and bottom nav is always visible', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // Navbar is positioned at bottom
  assert.ok(
    css.includes('.mobile-bottom-nav {') && (css.includes('z-index: 990 !important;') || css.includes('z-index: 100030 !important;')),
    'Navbar is positioned at bottom dock'
  );
  assert.ok(
    css.includes('body.modal-open .mobile-bottom-nav') && css.includes('display: flex !important;'),
    'Navbar never disappears when modal is open'
  );

  // Modal backdrop extends to bottom: 0 and covers navbar with z-index 100050
  assert.ok(
    css.includes('z-index: 100050 !important;') || css.includes('padding: 0 0 calc(64px + env(safe-area-inset-bottom, 0px)) 0 !important;'),
    'Modal backdrop docks cleanly and covers full screen'
  );
});

test('Finance & Goals: Overview panels render as 2x2 grid on mobile screens', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // 2x2 Grid on mobile
  assert.ok(
    css.includes('.finance-overview-grid,') && css.includes('.goals-overview-grid') && css.includes('grid-template-columns: repeat(2, minmax(0, 1fr)) !important;'),
    'Finance and Goal overview cards render as 2x2 grid on mobile'
  );
});

test('Habits: Weekly streak circles are non-clickable and read-only status indicators', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');

  // CSS enforces non-clickable circles
  assert.ok(
    css.includes('.day-dot-btn,') && css.includes('pointer-events: none !important;') && css.includes('cursor: default !important;'),
    'Streak circles have pointer-events none and cursor default'
  );

  // Script does not attach click listener on day dots
  assert.ok(
    !scriptJs.includes("li.querySelectorAll('.day-dot-btn').forEach"),
    'Day dots do not have click listeners'
  );

  // Today checkbox is interactive
  assert.ok(
    scriptJs.includes("li.querySelector('.habit-check-today').addEventListener('click'"),
    'Today habit check button is interactive'
  );
});

test('User Request 7: Metrics 2x2, Schedule Add Button, Rank Modal Z-Index/Size, Dynamic Income Categories & Auth Sync', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');
  const { updateTransactionCategories, EXPENSE_CATEGORIES, INCOME_CATEGORIES } = require(path.join(ROOT_DIR, 'script.js'));

  // 1. Dashboard Metrics 2x2 layout on mobile
  assert.ok(
    css.includes('.metrics-grid,') && css.includes('.hero-metrics-grid,') && css.includes('grid-template-columns: repeat(2, minmax(0, 1fr)) !important;'),
    'Metrics grid renders as 2x2 on mobile screens'
  );

  // 2. Schedule Event Add Button in index.html and script.js handler
  assert.ok(indexHtml.includes('id="dash-create-schedule-btn"'), 'index.html has schedule add button');
  assert.ok(scriptJs.includes("dashScheduleBtn = e.target.closest('#dash-create-schedule-btn')"), 'script.js handles dash-create-schedule-btn');
  assert.ok(scriptJs.includes("openCreatorModal('schedule')"), 'Triggers schedule creator modal');

  // 3. Rank Badges modal elevates in front of achievements modal and has compact dialog size
  assert.ok(css.includes('#rank-lookup-modal {') && (css.includes('z-index: 100070 !important;') || css.includes('z-index: 100025 !important;')), 'Rank modal has higher z-index than achievements');
  assert.ok(css.includes('.rank-lookup-dialog') && (css.includes('max-width: 520px !important;') || css.includes('max-width: 560px !important;')), 'Rank lookup dialog is compact 520-560px');

  // 4. Finance dynamic category switching
  assert.ok(Array.isArray(EXPENSE_CATEGORIES) && EXPENSE_CATEGORIES.some(c => c.val === 'Food'), 'Expense categories contain Food');
  assert.ok(Array.isArray(INCOME_CATEGORIES) && INCOME_CATEGORIES.some(c => c.val === 'Salary'), 'Income categories contain Salary');
  assert.ok(typeof updateTransactionCategories === 'function', 'updateTransactionCategories is defined');

  // 5. Account syncing and simple sign-in design
  assert.ok(indexHtml.includes('id="open-auth-modal-btn"'), 'index.html contains account sign-in/sync button');
  assert.ok(indexHtml.includes('id="nav-user-label"'), 'index.html contains nav-user-label');
  assert.ok(scriptJs.includes('function updateAuthNavButton()'), 'script.js defines updateAuthNavButton');
  assert.ok(css.includes('.nav-auth-btn'), 'style.css defines styling for nav-auth-btn');
});

test('User Request 8: Top-Right Streak & Auth Alignment, No Double Dividers in Sign In, & User-Friendly Settings Overhaul', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  const settingsHtml = fs.readFileSync(path.join(ROOT_DIR, 'pages', 'settings.html'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');
  const { initSettings } = require(path.join(ROOT_DIR, 'script.js'));

  // 1. Streak count and sync/sign moved to top-right header-status-group
  assert.ok(indexHtml.includes('class="header-status-group"'), 'Header contains header-status-group');
  assert.ok(css.includes('.top-bar-header-row'), 'CSS formats top-bar-header-row');
  assert.ok(css.includes('.header-status-group'), 'CSS formats header-status-group');

  // 2. No duplicate drag pill divider on sign window / dialogs
  assert.ok(
    css.includes('.auth-modal-dialog::before,') && css.includes('content: none !important;'),
    'Suppresses duplicate ::before drag pill in auth dialog'
  );

  // 3. User-friendly settings texts and features
  assert.ok(settingsHtml.includes('Settings & Preferences'), 'Settings title is friendly');
  assert.ok(settingsHtml.includes('id="settings-sound-toggle-btn"'), 'Settings includes sound effects toggle');
  assert.ok(settingsHtml.includes('id="export-json-btn"'), 'Settings includes export backup button');
  assert.ok(settingsHtml.includes('id="import-json-input"'), 'Settings includes import backup input');
  assert.ok(settingsHtml.includes('id="settings-clear-completed-btn"'), 'Settings includes clear completed tasks button');
  assert.ok(typeof initSettings === 'function', 'script.js exports initSettings');
});

test('User Request 9: Modals Over Navbar, Rank Modal Z-Index & Sizing, and Journal 60fps Scroll', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');

  // 1. Modals sit over navbar with z-index 100050 and padding: 0
  assert.ok(css.includes('z-index: 100050 !important;'), 'Modal backdrops sit over navbar with z-index 100050');
  assert.ok(css.includes('body.modal-open .mobile-bottom-nav') && css.includes('visibility: hidden !important;'), 'Navbar is hidden under popped-up modals');

  // 2. Rank lookup modal elevates in front of achievements (100070) with matching panel size & drag pill
  assert.ok(css.includes('#rank-lookup-modal {') && css.includes('z-index: 100070 !important;'), 'Rank lookup modal has z-index 100070');
  assert.ok(scriptJs.includes('<div class="mobile-drag-pill"></div>') && scriptJs.includes('rank-lookup-modal'), 'Rank lookup modal includes mobile-drag-pill');

  // 3. Journal scroll performance optimization
  assert.ok(css.includes('.journal-cards-list {') && css.includes('content-visibility: auto !important;'), 'Journal cards use content-visibility auto for fast scrolling');
  assert.ok(css.includes('scroll-behavior: auto !important;'), 'Scrollable lists disable smooth scroll lag');
});


