const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = process.cwd();

test('Logo & Favicon: favicon.svg exists and contains minimalist atom branding', () => {
  const faviconPath = path.join(projectRoot, 'favicon.svg');
  assert.ok(fs.existsSync(faviconPath), 'favicon.svg must exist at root');
  const content = fs.readFileSync(faviconPath, 'utf8');
  assert.ok(content.includes('<svg'), 'favicon.svg must be an SVG file');
  assert.ok(content.includes('linearGradient id="brandGrad"'), 'favicon.svg must define cyan-violet gradient');
  assert.ok(content.includes('<rect') && content.includes('<circle') && content.includes('<ellipse'), 'favicon.svg has squircle and atom orbital geometry');
});

test('Titles & Favicon: all 9 HTML pages have simplified titles, favicon link, and minimalist atom logos', () => {
  const expectedPages = [
    { file: 'index.html', title: 'Dashboard — LifeOS', favicon: 'favicon.svg' },
    { file: 'pages/tasks.html', title: 'Tasks — LifeOS', favicon: '../favicon.svg' },
    { file: 'pages/habits.html', title: 'Habits — LifeOS', favicon: '../favicon.svg' },
    { file: 'pages/finances.html', title: 'Finances — LifeOS', favicon: '../favicon.svg' },
    { file: 'pages/calendar.html', title: 'Calendar — LifeOS', favicon: '../favicon.svg' },
    { file: 'pages/goals.html', title: 'Goals — LifeOS', favicon: '../favicon.svg' },
    { file: 'pages/journal.html', title: 'Journal — LifeOS', favicon: '../favicon.svg' },
    { file: 'pages/analytics.html', title: 'Analytics — LifeOS', favicon: '../favicon.svg' },
    { file: 'pages/settings.html', title: 'Settings — LifeOS', favicon: '../favicon.svg' }
  ];

  for (const page of expectedPages) {
    const fullPath = path.join(projectRoot, page.file);
    assert.ok(fs.existsSync(fullPath), `${page.file} exists`);
    const html = fs.readFileSync(fullPath, 'utf8');

    // Title verification
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    assert.ok(titleMatch, `${page.file} has a <title> tag`);
    assert.equal(titleMatch[1].trim(), page.title, `${page.file} has expected simplified title`);

    // Favicon link verification
    assert.ok(
      html.includes(`<link rel="icon" type="image/svg+xml" href="${page.favicon}">`),
      `${page.file} has identical favicon link to ${page.favicon}`
    );

    // Minimalist atom icon in sidebar brand logo
    assert.ok(
      html.includes('<div class="brand-icon">') && html.includes('<i class="fa-solid fa-atom"></i>'),
      `${page.file} uses minimalist atom icon inside .brand-icon`
    );

    // Minimalist atom icon in top header date widget (for mobile & desktop top logo)
    assert.ok(
      html.includes('calendar-icon brand-top-icon') && html.includes('<i class="fa-solid fa-atom"></i>'),
      `${page.file} uses atom logo in top header date widget`
    );
  }
});

test('Style: .brand-icon has halved light spread, styled calendar-icon atom, and compact journal reflection buttons', () => {
  const css = fs.readFileSync(path.join(projectRoot, 'style.css'), 'utf8');
  assert.ok(css.includes('.brand-icon:hover'), 'style.css contains .brand-icon hover styling');
  assert.ok(css.includes('box-shadow: 0 0 12px rgba(0, 240, 255, 0.45)'), 'brand-icon hover has halved light spread');
  assert.ok(css.includes('.calendar-icon {'), 'style.css styles .calendar-icon');
  assert.ok(css.includes('.journal-reflection-actions .btn'), 'journal-reflection-actions .btn has compact styling');
  assert.ok(css.includes('height: 35px !important;'), 'journal reflection buttons are compact 35px height');
});
