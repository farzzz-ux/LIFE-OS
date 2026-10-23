const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('Turn 3 - Item 1 & 2: Start time icon overlap fixed and morning/noon/night presets removed', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // Verify presets are removed from index.html
  assert.ok(!indexHtml.includes('modal-sch-time-presets'), 'index.html does not contain modal-sch-time-presets');
  assert.ok(!indexHtml.includes('>Morning<'), 'index.html does not contain Morning chip');
  assert.ok(!indexHtml.includes('>Noon<'), 'index.html does not contain Noon chip');
  assert.ok(!indexHtml.includes('>Night<'), 'index.html does not contain Night chip');

  // Verify presets are removed from all subpages
  const subpages = ['calendar.html', 'habits.html', 'tasks.html', 'finances.html', 'journal.html', 'settings.html', 'analytics.html'];
  for (const page of subpages) {
    const pageHtml = fs.readFileSync(path.join(ROOT_DIR, 'pages', page), 'utf8');
    assert.ok(!pageHtml.includes('modal-sch-time-presets'), `${page} has presets removed`);
  }

  // Verify CSS padding prevents clock icon overlap in mobile view
  assert.ok(css.includes('.time-select-wrapper select.styled-time-select'), 'CSS targets styled-time-select in time-select-wrapper');
  assert.ok(css.includes('padding-left: 44px !important;'), 'Time select has padding-left: 44px !important so text never overlaps icon');
  assert.ok(css.includes('.time-select-wrapper .input-icon'), 'CSS targets time-select-wrapper input-icon');
  assert.ok(css.includes('left: 14px !important;'), 'Clock icon is pinned at left: 14px !important');
});

test('Turn 3 - Item 3: Achievements modal stats un-cramped and unlocked date formatted as DD-MM-YYYY', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');

  // Verify mobile achievements summary boxes have comfortable padding and min-height
  assert.ok(css.includes('.ach-stat-box {\n    padding: 12px 14px !important;'), 'ach-stat-box has spacious 12px 14px padding');
  assert.ok(css.includes('min-height: 64px !important;'), 'ach-stat-box has comfortable 64px min-height');
  assert.ok(css.includes('.ach-stat-val {\n    font-size: 1.25rem !important;'), 'ach-stat-val has prominent 1.25rem font size');
  assert.ok(css.includes('#summary-rank-box button {\n    margin-top: 4px !important;\n    padding: 4px 12px !important;'), 'summary rank box button has comfortable padding');

  // Verify filter chips have generous padding
  assert.ok(css.includes('.ach-filter-chip {\n    flex: 0 0 auto !important;\n    padding: 6px 14px !important;\n    font-size: 0.82rem !important;'), 'ach-filter-chip has spacious 6px 14px padding');

  // Verify cards grid spacing
  assert.ok(css.includes('.achievements-cards-grid {\n    display: flex !important;\n    flex-direction: column !important;\n    grid-template-columns: 1fr !important;\n    width: 100% !important;\n    gap: 14px !important;'), 'achievements-cards-grid has 14px gap');

  // Verify unlocked achievement date uses formatAppDate
  assert.ok(scriptJs.includes('remainingText = `Unlocked on ${formatAppDate(unlockedDateStr)}`'), 'Unlocked achievement date uses formatAppDate for DD-MM-YYYY');
});

test('Turn 3 - Item 4: Transaction stepper continuous press-and-hold engine', () => {
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');

  // Verify stepper hold engine
  assert.ok(scriptJs.includes('function stepTransactionAmount'), 'Defines stepTransactionAmount');
  assert.ok(scriptJs.includes('function startStepperHold'), 'Defines startStepperHold');
  assert.ok(scriptJs.includes('function stopStepperHold'), 'Defines stopStepperHold');

  // Verify mouse events for hold
  assert.ok(scriptJs.includes("document.addEventListener('mousedown'"), 'Listens to mousedown for stepper hold');
  assert.ok(scriptJs.includes("document.addEventListener('mouseup', stopStepperHold)"), 'Listens to mouseup to stop hold');
  assert.ok(scriptJs.includes("document.addEventListener('mouseleave', stopStepperHold)"), 'Listens to mouseleave to stop hold');

  // Verify touch events for mobile hold
  assert.ok(scriptJs.includes("document.addEventListener('touchstart'"), 'Listens to touchstart for mobile hold');
  assert.ok(scriptJs.includes("document.addEventListener('touchend'"), 'Listens to touchend to stop mobile hold');
  assert.ok(scriptJs.includes("document.addEventListener('touchcancel', stopStepperHold)"), 'Listens to touchcancel to stop mobile hold');
});

test('Turn 3 - Item 5: Calendar icon on input in phone view has 44px thumb target and native picker trigger', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');

  // Verify calendar icon has 44px touch area in mobile view
  assert.ok(css.includes('.input-wrapper .input-icon.fa-calendar') && css.includes('width: 44px !important;'), 'Calendar icon has 44px width touch target');
  assert.ok(css.includes('pointer-events: auto !important;'), 'Calendar icon has pointer-events: auto !important');
  assert.ok(css.includes('z-index: 5 !important;'), 'Calendar icon has z-index: 5 !important');

  // Verify helper function triggers showPicker or focus/click fallbacks
  assert.ok(scriptJs.includes('function openDatePickerFromTarget'), 'Defines openDatePickerFromTarget');
  assert.ok(scriptJs.includes('dateInput.showPicker()'), 'Invokes showPicker on dateInput');

  // Verify touchend event dispatches picker in phone view
  assert.ok(scriptJs.includes('openDatePickerFromTarget(calIcon)'), 'Tapping calendar icon invokes openDatePickerFromTarget');
});
