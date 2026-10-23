const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('Deliverable 1: HTML Markup (index.html) contains complete #auth-modal container', () => {
  const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

  // Modal container & Drag pill
  assert.ok(html.includes('id="auth-modal"'), 'Must contain #auth-modal container');
  assert.ok(html.includes('class="mobile-drag-pill"'), 'Must contain mobile drag pill');

  // Header & Close button
  assert.ok(html.includes('id="auth-modal-title"'), 'Must contain auth modal title');
  assert.ok(html.includes('id="auth-modal-subtitle"'), 'Must contain auth modal subtitle');
  assert.ok(html.includes('id="auth-modal-close-btn"'), 'Must contain close button');

  // Segmented tab controls
  assert.ok(html.includes('id="auth-tab-login"'), 'Must contain Sign In tab');
  assert.ok(html.includes('id="auth-tab-register"'), 'Must contain Create Account tab');
  assert.ok(html.includes('switchAuthMode(\'login\')'), 'Tab must trigger switchAuthMode');
  assert.ok(html.includes('switchAuthMode(\'register\')'), 'Tab must trigger switchAuthMode');

  // Error banner
  assert.ok(html.includes('id="auth-error-msg"'), 'Must contain dedicated #auth-error-msg status banner');

  // Name, Email, Password, Toggle
  assert.ok(html.includes('id="auth-name-group"'), 'Must contain #auth-name-group for register mode');
  assert.ok(html.includes('id="auth-reg-name"'), 'Must contain full name input');
  assert.ok(html.includes('id="auth-email-input"'), 'Must contain email input');
  assert.ok(html.includes('id="auth-password-input"'), 'Must contain password input');
  assert.ok(html.includes('password-input-wrapper'), 'Must wrap password in password-input-wrapper');
  assert.ok(html.includes('id="auth-password-toggle"'), 'Must contain inline password visibility toggle');
  assert.ok(html.includes('type="button" class="password-toggle-btn" id="auth-password-toggle"'), 'Toggle button must have type="button"');

  // Submit button
  assert.ok(html.includes('id="auth-submit-btn"'), 'Must contain submit button');
});

test('Deliverable 2: CSS Rules (style.css) enforce responsive layout, touch targets & auto-zoom prevention', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // 1. Password input right padding
  assert.ok(css.includes('padding-right: 44px !important;'), 'Password input must have padding-right: 44px !important');

  // 2. Eliminate iOS Safari auto-zoom
  assert.ok(css.includes('font-size: 16px !important;'), 'Inputs must force font-size: 16px !important on mobile');

  // 3. Dynamic viewport height & safe area
  assert.ok(css.includes('max-height: 90dvh !important;'), 'Modal must support max-height: 90dvh !important');
  assert.ok(css.includes('env(safe-area-inset-bottom'), 'Modal padding must incorporate safe-area-inset-bottom');

  // 4. Zero sideways scrolling
  assert.ok(css.includes('overflow-x: hidden !important;'), 'Container must enforce overflow-x: hidden !important');
  assert.ok(css.includes('width: 100% !important;'), 'Width 100% !important enforced');

  // 5. Touch target compliance
  assert.ok(css.includes('min-height: 44px !important;') || css.includes('min-height: 44px;'), 'Min hit area height 44px');
  assert.ok(css.includes('min-width: 44px;'), 'Min hit area width 44px');

  // 6. Desktop card & Mobile bottom-sheet
  assert.ok(css.includes('.auth-modal-dialog'), 'Must define .auth-modal-dialog');
  assert.ok(css.includes('.auth-segmented-control'), 'Must define .auth-segmented-control');
  assert.ok(css.includes('.auth-error-banner'), 'Must define .auth-error-banner');
});

test('Deliverable 3: JavaScript controllers (script.js and js/ui.js) implement required functions', () => {
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');
  const uiJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'ui.js'), 'utf8');

  for (const [name, code] of [['script.js', scriptJs], ['ui.js', uiJs]]) {
    assert.ok(code.includes('function switchAuthMode(') || code.includes('switchAuthMode:'), `${name} must include switchAuthMode`);
    assert.ok(code.includes('function togglePasswordVisibility(') || code.includes('togglePasswordVisibility:'), `${name} must include togglePasswordVisibility`);
    assert.ok(code.includes('handleAuthSubmit(') || code.includes('handleAuthSubmit:'), `${name} must include handleAuthSubmit`);
    assert.ok(code.includes('AUTH_EYE_OPEN_SVG') || code.includes('EYE_OPEN_SVG'), `${name} must include SVG eye open`);
    assert.ok(code.includes('AUTH_EYE_OFF_SVG') || code.includes('EYE_OFF_SVG'), `${name} must include SVG eye off`);
  }
});
