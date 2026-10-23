const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

const ALL_HTML_FILES = [
  'index.html',
  'pages/goals.html',
  'pages/tasks.html',
  'pages/habits.html',
  'pages/finances.html',
  'pages/calendar.html',
  'pages/analytics.html',
  'pages/journal.html',
  'pages/settings.html'
];

test('Mobile Requirement 1: Viewport meta tag is present on every HTML page', () => {
  for (const relPath of ALL_HTML_FILES) {
    const filePath = path.join(ROOT_DIR, relPath);
    assert.ok(fs.existsSync(filePath), `${relPath} exists`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">'),
      `${relPath} must contain exact viewport meta tag with user-scalable=no, viewport-fit=cover`
    );
  }
});

test('Mobile Requirement 2: Fixed mobile bottom navigation bar exists across all pages', () => {
  for (const relPath of ALL_HTML_FILES) {
    const filePath = path.join(ROOT_DIR, relPath);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('class="mobile-bottom-nav"'),
      `${relPath} must include mobile-bottom-nav container`
    );
    assert.ok(
      content.includes('class="mobile-nav-item'),
      `${relPath} must include mobile-nav-item links`
    );
  }
});

test('Mobile Requirement 2 & CSS: style.css replaces sidebar with fixed bottom nav on <=768px', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // Desktop default hides mobile bottom nav
  assert.ok(
    css.includes('.mobile-bottom-nav {\n  display: none;') ||
    css.includes('.mobile-bottom-nav {\r\n  display: none;'),
    'Desktop hides .mobile-bottom-nav by default'
  );

  // Mobile media query hides sidebar
  assert.ok(css.includes('.sidebar,'), 'CSS selects .sidebar on mobile');
  assert.ok(css.includes('display: none !important;'), 'Desktop sidebar is hidden on small screens');

  // Mobile bottom nav fixed at bottom
  assert.ok(css.includes('position: fixed !important;'), 'Mobile nav is fixed');
  assert.ok(css.includes('bottom: 0 !important;'), 'Mobile nav is at bottom: 0');
  assert.ok(css.includes('height: 64px !important;'), 'Mobile nav has height 64px');

  // Touch-friendly tap targets of min 48px
  assert.ok(css.includes('min-width: 48px !important;'), 'Nav items have min-width: 48px');
  assert.ok(css.includes('min-height: 48px !important;'), 'Nav items have min-height: 48px');
  assert.ok(css.includes('touch-action: manipulation'), 'Touch action manipulation enabled for mobile responsiveness');
});

test('Mobile Requirement 3: Multi-column dashboards and grids switch to single-column on mobile', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // Single column grid assertions on <=768px
  assert.ok(css.includes('.dashboard-split,'), 'CSS targets dashboard-split on mobile');
  assert.ok(css.includes('.metrics-grid,'), 'CSS targets metrics-grid on mobile');
  assert.ok(css.includes('.goals-overview-grid,'), 'CSS targets goals-overview-grid on mobile');
  assert.ok(css.includes('.finance-overview-grid,'), 'CSS targets finance-overview-grid on mobile');
  assert.ok(css.includes('.settings-grid,'), 'CSS targets settings-grid on mobile');
  assert.ok(css.includes('grid-template-columns: 1fr !important;'), 'Grids switch to 1fr single-column on mobile');
  assert.ok(css.includes('flex-direction: column !important;'), 'Multi-column layouts switch to column on mobile');
});

test('Mobile Requirement 4: Prevent text overflow and bottom-sheet drawer modal styling', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // Text overflow prevention
  assert.ok(css.includes('overflow-wrap: break-word !important;'), 'CSS specifies overflow-wrap: break-word');
  assert.ok(css.includes('word-break: break-word !important;'), 'CSS specifies word-break: break-word');
  assert.ok(css.includes('max-width: 100vw !important;'), 'App layout capped at 100vw');

  // Modal bottom-sheet drawer behavior
  assert.ok(css.includes('align-items: flex-end !important;'), 'Modals align to flex-end (bottom) on small screens');
  assert.ok(css.includes('border-top-left-radius: 24px !important;'), 'Modal drawers have rounded top corners');
  assert.ok(css.includes('border-bottom-left-radius: 0 !important;'), 'Modal drawers sit flush at the bottom edge');
  assert.ok(css.includes('@keyframes bottomSheetSlideUp'), 'CSS defines bottomSheetSlideUp keyframe animation');
  assert.ok(css.includes('animation: bottomSheetSlideUp'), 'Modal dialog uses bottomSheetSlideUp animation');
});
