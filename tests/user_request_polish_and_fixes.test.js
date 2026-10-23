const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('1. Money in Dashboard Cash Flow Card: Indian formatting without .00 and no text wrapping', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');

  // HTML has dash-cash-val without initial .00
  assert.ok(indexHtml.includes('id="dash-cash-val">₹0</span>'), 'index.html initializes dash-cash-val as ₹0');

  // CSS enforces nowrap and compact font sizing
  assert.ok(css.includes('#dash-cash-val'), 'CSS contains #dash-cash-val rules');
  assert.ok(css.includes('white-space: nowrap !important;'), 'CSS has white-space: nowrap !important;');

  // script.js uses formatINR
  assert.ok(scriptJs.includes('cashValEl.textContent = formatINR(netCashToday, true)'), 'script.js uses formatINR for cash flow');

  // Test formatINR logic directly
  const formatINRMatch = scriptJs.match(/function formatINR\([\s\S]*?\n\}/);
  assert.ok(formatINRMatch, 'formatINR function exists in script.js');
  const formatINRFn = new Function(`return (${formatINRMatch[0]})`)();

  assert.equal(formatINRFn(1000, true), '+₹1,000', '1000 formats as +₹1,000 without .00');
  assert.equal(formatINRFn(-500, true), '-₹500', '-500 formats as -₹500 without .00');
  assert.equal(formatINRFn(0, true), '₹0', '0 formats as ₹0 without .00');
  assert.equal(formatINRFn(125000), '₹1,25,000', '125000 formats in Indian grouping as ₹1,25,000');
  assert.equal(formatINRFn(1000.5), '₹1,000.50', 'Decimals format with 2 digits when paise exist');
});

test('2. Date format across entire app: First Date, then Month, then Year (DD-MM-YYYY / DD MMM YYYY)', () => {
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');
  const journalHtml = fs.readFileSync(path.join(ROOT_DIR, 'pages', 'journal.html'), 'utf8');

  // Test formatAppDate function in script.js
  const formatAppDateMatch = scriptJs.match(/function formatAppDate\([\s\S]*?\n\}/);
  assert.ok(formatAppDateMatch, 'formatAppDate function exists in script.js');
  const formatAppDateFn = new Function(`return (${formatAppDateMatch[0]})`)();

  // Test day-first formatting
  assert.equal(formatAppDateFn('2026-10-11'), '11-10-2026', '2026-10-11 formats as 11-10-2026 (DD-MM-YYYY)');
  assert.equal(formatAppDateFn('2026-10-11', 'text'), '11 Oct 2026', '2026-10-11 text mode formats as 11 Oct 2026');
  assert.equal(formatAppDateFn('Today'), 'Today', 'Preserves literal Today');

  // Check top clock header date ordering (en-GB: weekday, day, month, year)
  assert.ok(scriptJs.includes("now.toLocaleDateString('en-GB'"), 'updateClock uses en-GB locale for date-before-month');

  // Check journal reflection date placeholder
  assert.ok(journalHtml.includes('04-10-2026'), 'journal.html uses day-first date format');
});

test('3. Calendar Picker & Date Input: Clicking text box allows typing, calendar icon opens picker', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');

  // Input typing cursor
  assert.ok(css.includes('input[type="date"]') && css.includes('cursor: text !important;'), 'Date inputs have cursor: text !important for easy typing');
  assert.ok(css.includes('::-webkit-calendar-picker-indicator') && css.includes('cursor: pointer !important;'), 'Calendar indicator has pointer cursor');

  // Verify premature showPicker click listener was removed from script.js
  assert.ok(!scriptJs.includes('if (e.target && e.target.matches && e.target.matches(\'input[type="date"]\'))'), 'No premature showPicker click interception on date input text');

  // Verify calendar icon button triggers showPicker
  assert.ok(scriptJs.includes('calIcon.closest(\'.input-wrapper\')?.querySelector(\'input[type="date"]\')'), 'Clicking calendar icon opens date picker');
});

test('4. Goals Page: Dedicated Scroll Wheel / Scroll Container', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  assert.ok(css.includes('.goals-list-container'), '.goals-list-container defined in CSS');
  assert.ok(css.includes('max-height: calc(100vh - 280px);'), '.goals-list-container has max-height for scrolling');
  assert.ok(css.includes('overflow-y: auto !important;'), '.goals-list-container has overflow-y: auto !important');
  assert.ok(css.includes('scrollbar-gutter: stable;'), '.goals-list-container has scrollbar-gutter: stable');
});

test('5. Analytics View: Polish, compact sizing, and full-width progress bar tracks', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // star-dim-card flex structure
  assert.ok(css.includes('.star-dim-left'), '.star-dim-left defined in CSS');
  assert.ok(css.includes('flex: 0 0 160px;'), '.star-dim-left has bounded flex-basis to avoid squishing middle track');
  assert.ok(css.includes('.star-dim-mid'), '.star-dim-mid defined in CSS');
  assert.ok(css.includes('min-width: 80px;'), '.star-dim-mid has minimum width for visible progress track');

  // compact padding
  assert.ok(css.includes('.harmony-card'), '.harmony-card defined');
  assert.ok(css.includes('.insight-pill'), '.insight-pill defined');
});

test('6. Journal Note Reader: Action buttons have comfortable bottom padding and are not cut off', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const journalHtml = fs.readFileSync(path.join(ROOT_DIR, 'pages', 'journal.html'), 'utf8');

  // Dialog padding
  assert.ok(css.includes('.journal-modal-dialog-large'), '.journal-modal-dialog-large defined in CSS');
  assert.ok(css.includes('padding-bottom: 40px !important;'), 'Journal modal dialog has generous 40px bottom padding');

  // Actions padding
  assert.ok(css.includes('.journal-reflection-actions'), '.journal-reflection-actions defined in CSS');
  assert.ok(css.includes('padding-bottom: 16px !important;'), 'Journal reflection actions has bottom padding');
  assert.ok(journalHtml.includes('journal-reflection-actions'), 'pages/journal.html uses journal-reflection-actions class');
});

test('7. Schedule Start Time: Clean options without fancy tags, quick presets removed, no icon overlap', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // Options do NOT contain overdone fancy tags
  assert.ok(!indexHtml.includes('(Early Focus)'), 'Options do not contain (Early Focus)');
  assert.ok(!indexHtml.includes('(Peak Focus)'), 'Options do not contain (Peak Focus)');
  assert.ok(!indexHtml.includes('(Wind Down)'), 'Options do not contain (Wind Down)');
  assert.ok(!indexHtml.includes('(Late Session)'), 'Options do not contain (Late Session)');

  // Quick presets (Morning, Noon, Night) under input box are removed per user request
  assert.ok(!indexHtml.includes('modal-sch-time-presets'), 'Presets under input box removed');

  // Clean options exist
  assert.ok(indexHtml.includes('<option value="9" selected>09:00 AM</option>'), 'Clean 09:00 AM option exists');
  assert.ok(indexHtml.includes('<option value="12">12:00 PM</option>'), 'Clean 12:00 PM option exists');
  assert.ok(indexHtml.includes('<option value="21">09:00 PM</option>'), 'Clean 09:00 PM option exists');

  // CSS ensures time select padding prevents clock icon overlap
  assert.ok(css.includes('padding-left: 44px !important;'), 'Time select has padding-left: 44px to prevent overlapping with clock icon');
});
