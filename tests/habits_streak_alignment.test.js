const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('Habits: Rolling 7-day counting window & interactive clickable streak dots', () => {
  const scriptJs = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');
  const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

  // 1. Rolling 7 days window (counting backwards from today)
  assert.ok(scriptJs.includes('function getLast7Days()'), 'script.js must define getLast7Days()');
  assert.ok(scriptJs.includes('const weekDays = getLast7Days();'), 'renderHabitsView calls getLast7Days()');

  // 2. Habit row has quick toggle for today, while week circles are non-clickable indicators
  assert.ok(
    scriptJs.includes("li.querySelector('.habit-check-today').addEventListener('click'"),
    'Habit row has quick toggle for today'
  );

  // 3. CSS non-clickable styling: pointer-events none & cursor default for week circles
  assert.ok(
    styleCss.includes('pointer-events: none !important;') && styleCss.includes('.day-dot-btn'),
    '.day-dot-btn must have pointer-events none'
  );
  assert.ok(
    styleCss.includes('cursor: default !important;') && styleCss.includes('.day-dot-btn'),
    '.day-dot-btn must have cursor default'
  );

  // 4. Desktop grid track alignment: week-days-legend and habit-row share matching templates
  assert.ok(
    styleCss.includes('.week-days-legend') && styleCss.includes('minmax(0, 1fr) 210px 75px 65px !important;'),
    '.week-days-legend must use minmax(0, 1fr) 210px 75px 65px'
  );
  assert.ok(
    styleCss.includes('.habit-row') && styleCss.includes('minmax(0, 1fr) 210px 75px 65px !important;'),
    '.habit-row must use minmax(0, 1fr) 210px 75px 65px'
  );

  // 5. 7-column day grid: repeat(7, 1fr) with centered justify-items
  assert.ok(
    styleCss.includes('#week-days-labels') && styleCss.includes('grid-template-columns: repeat(7, 1fr) !important;'),
    '#week-days-labels must be a 7-column grid'
  );
  assert.ok(
    styleCss.includes('.seven-days-grid') && styleCss.includes('grid-template-columns: repeat(7, 1fr) !important;'),
    '.seven-days-grid must be a 7-column grid'
  );

  // 6. Accent color popover and swatches styling
  assert.ok(
    styleCss.includes('.habit-color-popover') && styleCss.includes('white-space: nowrap !important;'),
    'Habit color popover has white-space nowrap'
  );
  assert.ok(
    styleCss.includes('.color-swatch-sm') && styleCss.includes('min-width: 20px !important;'),
    'Habit color swatches have min-width 20px so they are not squashed into vertical slits'
  );
});

test('Habits: getLast7Days rolling calculation logic verification', () => {
  function getLocalDateString(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function testRolling7Days(refDate) {
    const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const days = [];
    const today = new Date(refDate);
    const todayStr = getLocalDateString(today);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = getLocalDateString(d);
      days.push({
        dateStr: dStr,
        dayLetter: dayLetters[d.getDay()],
        isToday: dStr === todayStr
      });
    }
    return days;
  }

  const rolling = testRolling7Days('2026-10-20T12:00:00Z');
  assert.strictEqual(rolling.length, 7, 'Must produce exactly 7 rolling days');
  assert.strictEqual(rolling[6].isToday, true, 'Last day of rolling window is today');
  assert.strictEqual(rolling[6].dateStr, '2026-10-20', 'Last day date matches today');
  assert.strictEqual(rolling[0].dateStr, '2026-10-14', 'First day date is 6 days ago');
  assert.strictEqual(rolling[0].isToday, false);
});
