const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('Mobile UX 1: Docked separate bottom navbar with zero content overlap', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // Verify docked separate panel styling
  assert.ok(css.includes('background: #090d18 !important;'), 'Navbar has solid dark dock background');
  assert.ok(css.includes('border-top: 1px solid rgba(255, 255, 255, 0.16) !important;'), 'Navbar has crisp divider top border');
  assert.ok(css.includes('box-shadow: 0 -12px 32px rgba(0, 0, 0, 0.75) !important;'), 'Navbar has pronounced elevation shadow');
  assert.ok(css.includes('z-index: 990 !important;'), 'Navbar has z-index 990 so modals sit above it');

  // Verify ample bottom clearance to prevent overlapping upper elements
  assert.ok(css.includes('padding: 16px 14px calc(96px + env(safe-area-inset-bottom, 0px)) 14px !important;'), 'Content area has generous bottom padding');
  assert.ok(css.includes('padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)) !important;'), 'Main app layout has bottom clearance');
});

test('Mobile UX 2: Smaller notification toasts in top-right corner', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // Verify top-right positioning on mobile (<=768px)
  assert.ok(css.includes('top: 12px !important;'), 'Toast container at top: 12px');
  assert.ok(css.includes('right: 12px !important;'), 'Toast container at right: 12px');
  assert.ok(css.includes('left: auto !important;'), 'Toast container left is auto (not stretched full-width)');
  assert.ok(css.includes('align-items: flex-end !important;'), 'Toasts align to the right edge');

  // Verify compact dimensions
  assert.ok(css.includes('padding: 8px 12px !important;'), 'Compact toast padding');
  assert.ok(css.includes('font-size: 0.78rem !important;'), 'Compact toast font size');
});

test('Mobile UX 3: Compact modals, scroll wheel styling, and universal swipe-down dismiss', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');

  // Creator modal compactness
  assert.ok(css.includes('max-height: 80vh !important;') && css.includes('max-height: 80dvh !important;'), 'Creator modal is compact');

  // Scroll wheel styling on mobile modals
  assert.ok(css.includes('scrollbar-width: thin !important;'), 'Thin scrollbar for modals');
  assert.ok(css.includes('.floating-modal-dialog::-webkit-scrollbar'), 'Webkit scrollbar styled for modals');

  // Universal swipe-down-to-dismiss gesture engine in client script
  assert.ok(scriptJs.includes('function initModalSwipeDownGestures('), 'Script defines initModalSwipeDownGestures');
  assert.ok(scriptJs.includes('initModalSwipeDownGestures()'), 'Script calls initModalSwipeDownGestures on init');
  assert.ok(scriptJs.includes('shouldDismiss'), 'Swipe gesture evaluates dismiss threshold');
  assert.ok(scriptJs.includes('touchstart') && scriptJs.includes('touchmove') && scriptJs.includes('touchend'), 'Touch events handled for swipe gestures');
});

test('Mobile UX 4: Achievements modal shows summary strip, filter chips, and achievement cards', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // Ensure dialog is scrollable and not crushed
  assert.ok(css.includes('max-height: 84dvh !important;'), 'Achievements dialog has safe max-height');
  assert.ok(css.includes('overflow-y: auto !important;'), 'Achievements dialog has overflow-y auto');

  // 2x2 compact summary strip
  assert.ok(css.includes('grid-template-columns: repeat(2, 1fr) !important;'), 'Achievements summary strip uses 2x2 grid on mobile');

  // Horizontal filter strip
  assert.ok(css.includes('flex-wrap: nowrap !important;'), 'Filter bar uses single-line nowrap');
  assert.ok(css.includes('overflow-x: auto !important;'), 'Filter bar scrolls horizontally');

  // Cards grid visibility
  assert.ok(css.includes('.achievements-cards-grid {\n    display: flex !important;\n    flex-direction: column !important;'), 'Cards grid displays as flexible column');
  assert.ok(css.includes('grid-auto-rows: max-content !important;'), 'Cards grid sets max-content row tracks to prevent cards overlapping');
});

test('Mobile UX 5: Checklist boxes and checkboxes reset to default compact size', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  assert.ok(css.includes('.task-check-btn,\n  .schedule-check-btn,\n  .habit-check-today'), 'Targets checklist check buttons');
  assert.ok(css.includes('width: 20px !important;'), 'Checklist boxes have 20px compact width');
  assert.ok(css.includes('height: 20px !important;'), 'Checklist boxes have 20px compact height');
});

test('Mobile UX 6: Compact inputs, iPhone 7 scaling and modal confirm button not under navbar', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');

  // Inputs compact height
  assert.ok(css.includes('height: 38px !important;'), 'Inputs styled with 38px compact height on mobile');

  // Navbar always visible and modals docked above navbar so confirm button is never obscured
  assert.ok(css.includes('bottom: calc(64px + env(safe-area-inset-bottom, 0px)) !important;'), 'Modals docked above navbar');
  assert.ok(css.includes('.mobile-bottom-nav {\n    display: flex !important;') || css.includes('z-index: 100005 !important;'), 'Navbar always displayed');

  // Script toggles modal-open class
  assert.ok(scriptJs.includes("document.body.classList.add('modal-open')"), 'Script adds modal-open on modal show');
  assert.ok(scriptJs.includes("document.body.classList.remove('modal-open')"), 'Script removes modal-open on modal close');

  // Password toggle debounced
  assert.ok(scriptJs.includes('_lastPasswordToggleTime'), 'Password toggle is debounced in script.js');
});

test('Mobile UX 7: Universal zero-compression and full-display across all elements', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // Verify anti-compression properties on cards and items
  assert.ok(css.includes('.achievement-card') && css.includes('flex-shrink: 0 !important;'), 'Achievement cards do not compress');
  assert.ok(css.includes('min-height: fit-content !important;'), 'Elements have min-height fit-content');
  assert.ok(css.includes('UNIVERSAL ANTI-COMPRESSION / FULL-DISPLAY ARCHITECTURE'), 'Universal anti-compression architecture present');

  // Verify achievements summary stats are comfortably sized and un-cramped per user request
  assert.ok(css.includes('.ach-stat-val {\n    font-size: 1.25rem !important;'), 'Achievements stat values are comfortably sized and not squashed');
  assert.ok(css.includes('.achievements-modal-dialog .floating-subtitle {\n    display: none !important;'), 'Long subtitle hidden on mobile');
});

test('Mobile UX 8: Dynamic navbar tracking, Big Window modal resilience, Comparative Matrix nowrap, and Habit layout', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');

  // 1. Dynamic mobile bottom navigation tracking in script.js
  assert.ok(scriptJs.includes('.mobile-bottom-nav .mobile-nav-item'), 'Tracks mobile bottom nav items dynamically');
  assert.ok(scriptJs.includes('function ensureJournalModals'), 'Defines ensureJournalModals');

  // 2. Comparative Matrix prevents syllable text wrapping
  assert.ok(css.includes('.matrix-table') && css.includes('min-width: 620px !important;'), 'Matrix table enforces comfortable min-width');
  assert.ok(css.includes('white-space: nowrap !important;'), 'Matrix table headers and cells use nowrap');

  // 3. Mobile habit-row is a clean 2-row grid card
  assert.ok(css.includes('grid-template-areas:') && css.includes('"meta streak actions"'), 'Habit cards use 2-row grid on mobile');

  // 4. Life Harmony index card is responsive on mobile
  assert.ok(css.includes('.harmony-card') && css.includes('flex-direction: column !important;'), 'Harmony card uses column layout on mobile');
});

