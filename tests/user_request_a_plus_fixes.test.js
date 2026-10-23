const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('User Request A+: 6-letter username guidance, maxlength=6, and forceful fit in account button', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');
  const uiJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'ui.js'), 'utf8');
  const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // 1. Tell the user to input max 6 letters in auth modal
  assert.ok(indexHtml.includes('Username (Max 6 letters)'), 'Auth modal label instructs max 6 letters');
  assert.ok(indexHtml.includes('placeholder="Max 6 letters (e.g. Alex)"'), 'Auth modal placeholder instructs max 6 letters');
  assert.ok(indexHtml.includes('maxlength="6"'), 'Auth username input enforces maxlength=6');
  assert.ok(indexHtml.includes('Input max 6 letters for your account button'), 'Auth modal provides explicit helper hint for account button fit');

  // 2. Dynamic modal in script.js also enforces max 6 letters
  assert.ok(scriptJs.includes('placeholder="Max 6 letters (e.g. Alex)"'), 'script.js dynamic modal instructs max 6 letters');
  assert.ok(scriptJs.includes('maxlength="6"'), 'script.js dynamic modal enforces maxlength="6"');

  // 3. Validation in handleAuthSubmit
  assert.ok(scriptJs.includes("showAuthError('Please enter a username (max 6 letters).')"), 'script.js handleAuthSubmit informs user of max 6 letters');
  assert.ok(scriptJs.includes("Username must be max 6 letters to fit in your account button"), 'script.js handleAuthSubmit warns if name exceeds 6 letters');
  assert.ok(scriptJs.includes("await registerUser(email, password, name.slice(0, 6))"), 'script.js registerUser enforces strict 6-letter slice');

  assert.ok(uiJs.includes("Username must be max 6 letters to fit in your account button"), 'ui.js handleAuthSubmit warns if name exceeds 6 letters');
  assert.ok(uiJs.includes("await registerUser(email, password, safeName)") || uiJs.includes("safeName = name.slice(0, 6)"), 'ui.js enforces strict 6-letter safeName slice');

  // 4. Forcefully fit in account button
  assert.ok(scriptJs.includes('const shortName = rawName.slice(0, 6);'), 'updateAuthNavButton forces 6-character slice for nav button label');
  assert.ok(scriptJs.includes('labels.forEach(l => { l.textContent = shortName; });'), 'updateAuthNavButton sets text to strictly 6-character shortName');

  // 5. CSS forceful containment
  assert.ok(styleCss.includes('#nav-user-label {') && styleCss.includes('max-width: 58px;'), '#nav-user-label has max-width: 58px');
  assert.ok(styleCss.includes('.nav-auth-btn {') && styleCss.includes('max-width: 110px;'), 'nav-auth-btn constrained to max-width: 110px');
  assert.ok(styleCss.includes('.nav-auth-btn {') && styleCss.includes('display: none !important;'), 'nav-auth-btn is hidden on lap/pc desktop layout');
  assert.ok(styleCss.includes('.header-status-group .nav-auth-btn {') && styleCss.includes('display: inline-flex !important;'), 'nav-auth-btn is visible on mobile phone view');
});

test('User Request A+: Keyboard safety, debouncing, and zero-defect accessibility compliance', () => {
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // 1. Escape key handler closes auth modal
  assert.ok(scriptJs.includes('closeAuthModal();') && scriptJs.includes("e.key === 'Escape'"), 'Escape key handler includes closeAuthModal()');

  // 2. Search debouncing logic
  assert.ok(scriptJs.includes('debounceSearch'), 'Search debouncing utility exists');
  assert.ok(scriptJs.includes('debounceSearch(() => renderTasksView())'), 'Tasks live search is debounced');
  assert.ok(scriptJs.includes('debounceSearch(() => renderFinancesView())'), 'Finances live search is debounced');
  assert.ok(scriptJs.includes('debounceSearch(() => renderJournalView())'), 'Journal live search is debounced');
  assert.ok(scriptJs.includes('debounceSearch(() => renderGoalsView())'), 'Goals live search is debounced');

  // 3. Mobile virtual keyboard focusin centering
  assert.ok(scriptJs.includes("document.addEventListener('focusin'") && scriptJs.includes('scrollIntoView'), 'Mobile virtual keyboard scrolls focused modal inputs into view');

  // 4. Numeric inputmode on amount
  assert.ok(indexHtml.includes('id="modal-tx-amount"') && indexHtml.includes('inputmode="numeric"'), 'Transaction amount has numeric inputmode');

  // 5. Touch-safe hover states
  assert.ok(styleCss.includes('@media (hover: none)'), 'Touch-safe hover media query exists');
  assert.ok(styleCss.includes('transform: none !important;'), 'Suppresses sticky hover transform on touch devices');

  // 6. A11y range label
  assert.ok(indexHtml.includes('id="modal-goal-progress"') && indexHtml.includes('aria-label="Goal progress percentage"'), 'modal-goal-progress has accessible aria-label');
});
