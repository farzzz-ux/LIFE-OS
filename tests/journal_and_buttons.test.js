/**
 * LIFE OS — Journal and UI Button Dimensions Test Suite
 * Validates that desktop buttons are properly sized (no oversized 44px global bloat)
 * and verifies that all journal functionality, DOM IDs, and API routes work properly.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

test('Button Sizing: style.css does NOT contain global 44px min-dimension bloat on desktop', () => {
  const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');

  // Verify that lines like button, .btn { min-width: 44px; min-height: 44px; } at the top level are removed
  const hasGlobalOversizedButtons = css.includes('/* Tap targets minimum 44x44px */\nbutton,\n.btn');
  assert.strictEqual(hasGlobalOversizedButtons, false, 'Global oversized button rule must not be present');

  // Verify task check buttons and habit checks are not forced to 44px at root
  const hasGlobalCheckBloat = /button,\s*\.btn[^\{]*\.task-check-btn\s*\{[^}]*min-height:\s*44px/s.test(css);
  assert.strictEqual(hasGlobalCheckBloat, false, 'Task check buttons must not have global 44px min-height');
});

test('Journal Architecture: pages/journal.html contains all required elements and IDs', () => {
  const html = fs.readFileSync(path.join(__dirname, '../pages/journal.html'), 'utf8');

  // Editor form inputs
  assert.ok(html.includes('id="journal-editor-form"'), 'journal-editor-form exists');
  assert.ok(html.includes('id="journal-title"'), 'journal-title input exists');
  assert.ok(html.includes('id="journal-content"'), 'journal-content textarea exists');
  assert.ok(html.includes('id="journal-date-input"'), 'journal-date-input exists');
  assert.ok(html.includes('id="journal-tag-chips"'), 'journal-tag-chips exists');
  assert.ok(html.includes('id="journal-edit-id"'), 'journal-edit-id hidden input exists');
  assert.ok(html.includes('id="save-journal-btn"'), 'save-journal-btn exists');
  assert.ok(html.includes('id="journal-word-counter"'), 'journal-word-counter exists');
  assert.ok(html.includes('id="journal-clear-btn"'), 'journal-clear-btn exists');

  // Previous notes list & search
  assert.ok(html.includes('id="journal-entries-list"'), 'journal-entries-list exists');
  assert.ok(html.includes('id="journal-search-input"'), 'journal-search-input exists');
  assert.ok(html.includes('id="journal-filter-chips"'), 'journal-filter-chips exists');
  assert.ok(html.includes('id="quick-new-note-top-btn"'), 'quick-new-note-top-btn exists');

  // Modals
  assert.ok(html.includes('id="journal-reflection-modal"'), 'journal-reflection-modal exists');
  assert.ok(html.includes('id="journal-writer-modal"'), 'journal-writer-modal exists');
  assert.ok(html.includes('id="open-focus-writer-btn"'), 'open-focus-writer-btn exists');
  assert.ok(html.includes('id="big-journal-form"'), 'big-journal-form exists');
  assert.ok(html.includes('id="big-journal-title"'), 'big-journal-title exists');
  assert.ok(html.includes('id="big-journal-content"'), 'big-journal-content exists');
});

test('Journal Script Logic: script.js targets journal-title and journal-content correctly', () => {
  const js = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');

  // Verify journal-title and journal-content are supported across handlers
  assert.ok(js.includes("document.getElementById('journal-title') || document.getElementById('journal-title-input')"), 'Supports journal-title in script');
  assert.ok(js.includes("document.getElementById('journal-content') || document.getElementById('journal-content-input')"), 'Supports journal-content in script');
  assert.ok(js.includes("addOrUpdateJournalEntry"), 'addOrUpdateJournalEntry exists');
  assert.ok(js.includes("deleteJournalEntry"), 'deleteJournalEntry exists');
  assert.ok(js.includes("editJournalEntry"), 'editJournalEntry exists');
  assert.ok(js.includes("resetJournalForm"), 'resetJournalForm exists');
  assert.ok(js.includes("updateJournalWordCount"), 'updateJournalWordCount exists');
});

test('Journal API: Endpoints support full CRUD lifecycle', async () => {
  // 1. Create a note via POST
  const createRes = await fetch(`${BASE_URL}/api/journal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Automated Test Note',
      category: 'Reflection',
      content: 'This note verifies end-to-end journal API connectivity.',
      date: '2026-10-11'
    })
  });
  assert.strictEqual(createRes.status, 201, 'POST /api/journal should return 201');
  const created = await createRes.json();
  assert.ok(created.success, 'Creation success');
  assert.ok(created.id, 'Entry has ID');
  const entryId = created.id;

  // 2. Fetch notes via GET
  const getRes = await fetch(`${BASE_URL}/api/journal`);
  assert.strictEqual(getRes.status, 200, 'GET /api/journal should return 200');
  const list = await getRes.json();
  assert.ok(list.success, 'List success');
  const found = (list.entries || []).find(e => e.id === entryId);
  assert.ok(found, 'Created entry is in GET list');
  assert.strictEqual(found.title, 'Automated Test Note');

  // 3. Update note via PUT
  const updateRes = await fetch(`${BASE_URL}/api/journal/${entryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Automated Test Note (Updated)',
      category: 'Wins',
      content: 'Updated content with new details.',
      date: '2026-10-11'
    })
  });
  assert.strictEqual(updateRes.status, 200, 'PUT /api/journal/:id should return 200');
  const updated = await updateRes.json();
  assert.ok(updated.success, 'Update success');
  assert.strictEqual(updated.entry.title, 'Automated Test Note (Updated)');
  assert.strictEqual(updated.entry.category, 'Wins');

  // 4. Delete note via DELETE
  const deleteRes = await fetch(`${BASE_URL}/api/journal/${entryId}`, {
    method: 'DELETE'
  });
  assert.strictEqual(deleteRes.status, 200, 'DELETE /api/journal/:id should return 200');
  const deleted = await deleteRes.json();
  assert.ok(deleted.success, 'Delete success');

  // 5. Verify note is deleted
  const verifyRes = await fetch(`${BASE_URL}/api/journal`);
  const verifyList = await verifyRes.json();
  const deletedFound = (verifyList.entries || []).find(e => e.id === entryId);
  assert.strictEqual(deletedFound, undefined, 'Deleted entry is no longer in GET list');
});

test('Journal UX: Big Window New Note button, unpressed cards, and scroll wheel styling', () => {
  const html = fs.readFileSync(path.join(__dirname, '../pages/journal.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');

  // 1. Big Window modal contains New Note button
  assert.ok(html.includes('id="big-journal-new-btn"'), 'big-journal-new-btn must exist in journal.html');

  // 2. Cards in journal-cards-list are never pressed (flex-shrink: 0 !important)
  assert.ok(css.includes('.journal-entry-card'), 'journal-entry-card defined in CSS');
  assert.ok(css.includes('flex-shrink: 0 !important;'), 'Cards have flex-shrink: 0 !important to avoid being pressed');

  // 3. Scroll wheel & overflow-y enabled on .journal-cards-list
  assert.ok(css.includes('overflow-y: auto !important;'), 'Scroll container has overflow-y: auto !important');
  assert.ok(css.includes('.journal-cards-list::-webkit-scrollbar'), 'Custom WebKit scrollbar defined for scroll wheel');

  // 4. script.js clears big window in resetJournalForm and attaches listeners
  assert.ok(js.includes('big-journal-new-btn'), 'script.js binds big-journal-new-btn');
  assert.ok(js.includes('bigTitleInput'), 'resetJournalForm resets Big Window title input');
  assert.ok(js.includes('bigContentInput'), 'resetJournalForm resets Big Window content input');
  assert.ok(js.includes('openJournalWriterModal'), 'openJournalWriterModal is defined');
});

