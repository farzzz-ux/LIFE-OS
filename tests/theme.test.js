const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

test('Theme System: HTML pages do NOT contain theme toggle buttons and enforce dark mode', () => {
  const pages = [
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

  for (const page of pages) {
    const filePath = path.join(ROOT, page);
    assert.ok(fs.existsSync(filePath), `File ${page} must exist`);
    const content = fs.readFileSync(filePath, 'utf-8');

    // 1. Theme toggle buttons must be permanently removed
    assert.ok(
      !content.includes('id="theme-toggle-btn"') && !content.includes("id='theme-toggle-btn'"),
      `${page} must NOT contain #theme-toggle-btn in top bar`
    );
    assert.ok(
      !content.includes('id="sidebar-theme-toggle-btn"') && !content.includes("id='sidebar-theme-toggle-btn'"),
      `${page} must NOT contain #sidebar-theme-toggle-btn`
    );
    assert.ok(
      !content.includes('id="settings-theme-light-btn"') && !content.includes("id='settings-theme-light-btn'"),
      `${page} must NOT contain #settings-theme-light-btn`
    );

    // 2. Head script enforces strict dark mode
    assert.ok(
      content.includes("data-theme', 'dark'") || content.includes('data-theme", "dark"'),
      `${page} must set data-theme to dark`
    );
  }
});

test('Theme System: style.css defines locked high-contrast dark mode root and strips light mode', () => {
  const cssPath = path.join(ROOT, 'style.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  // Must declare Phase 4 strict dark mode variables
  assert.ok(css.includes('--bg-main: #090d16;'), 'style.css must define --bg-main: #090d16;');
  assert.ok(css.includes('--bg-card: #111827;'), 'style.css must define --bg-card: #111827;');
  assert.ok(css.includes('--bg-input: #1f2937;'), 'style.css must define --bg-input: #1f2937;');
  assert.ok(css.includes('--border-color: rgba(255, 255, 255, 0.08);'), 'style.css must define --border-color');
  assert.ok(css.includes('--text-primary: #f9fafb;'), 'style.css must define --text-primary: #f9fafb;');
  assert.ok(css.includes('--text-secondary: #9ca3af;'), 'style.css must define --text-secondary: #9ca3af;');
  assert.ok(css.includes('--text-muted: #6b7280;'), 'style.css must define --text-muted: #6b7280;');
  assert.ok(css.includes('--accent-primary: #38bdf8;'), 'style.css must define --accent-primary: #38bdf8;');
  assert.ok(css.includes('--accent-success: #10b981;'), 'style.css must define --accent-success: #10b981;');
  assert.ok(css.includes('--accent-danger: #ef4444;'), 'style.css must define --accent-danger: #ef4444;');

  // Light mode classes must be stripped
  assert.ok(!css.includes('[data-theme="light"]'), 'style.css must NOT have [data-theme="light"] selector');
});

test('Theme System: script.js enforces strict dark mode', () => {
  const { applyTheme, toggleTheme, appState } = require('../script.js');

  assert.equal(typeof applyTheme, 'function', 'applyTheme must be exported');
  assert.equal(typeof toggleTheme, 'function', 'toggleTheme must be exported');
  assert.ok(appState, 'appState must be exported');

  // Attempt to toggle
  applyTheme('light');
  assert.equal(appState.theme, 'dark', 'appState.theme must remain strictly locked to dark');

  toggleTheme();
  assert.equal(appState.theme, 'dark', 'appState.theme must remain dark');
});
