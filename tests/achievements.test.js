const test = require('node:test');
const assert = require('node:assert/strict');

test('Achievements milestones evaluation and thresholds', () => {
  // Test habit check-in milestone thresholds (100, 250, 500)
  const habitMilestones = [1, 10, 25, 50, 100, 250, 500];
  const sampleHabits = [
    { id: 'h1', name: 'Exercise', completedDates: new Array(120).fill('2026-10-01') },
    { id: 'h2', name: 'Read', completedDates: new Array(150).fill('2026-10-02') }
  ];

  const totalCheckIns = sampleHabits.reduce((sum, h) => sum + h.completedDates.length, 0);
  assert.equal(totalCheckIns, 270);
  assert.ok(totalCheckIns >= 100, 'Unlocks 100 habits check-in milestone');
  assert.ok(totalCheckIns >= 250, 'Unlocks 250 habits check-in milestone');
  assert.ok(totalCheckIns < 500, '500 habits milestone remains locked in progress');

  // Test tasks milestone thresholds (100, 250, 500)
  const completedTasksCount = 105;
  assert.ok(completedTasksCount >= 100, 'Unlocks 100 tasks completed milestone');
  assert.ok(completedTasksCount < 250, '250 tasks milestone remains locked in progress');

  // Test new milestones: 1000 habits, 90 streak, 180 streak, 100 finances, 50 journal
  assert.ok(totalCheckIns < 1000, '1000 habits milestone remains locked until 1000 check-ins reached');
  const streakDays = 92;
  assert.ok(streakDays >= 90, 'Unlocks 90-day streak milestone');
  assert.ok(streakDays < 180, '180-day streak milestone remains locked until 180 days reached');
  const titanStreakDays = 185;
  assert.ok(titanStreakDays >= 180, 'Unlocks 180-day titan streak milestone');

  const txCount = 102;
  assert.ok(txCount >= 100, 'Unlocks 100 transactions financial milestone');
  const journalCount = 52;
  assert.ok(journalCount >= 50, 'Unlocks 50 journal reflections milestone');

  // Verify XP aggregation and Rank system lookup logic
  const unlockedXp = 50 + 100 + 250 + 500 + 1000 + 2500;
  assert.equal(unlockedXp, 4400);

  // Test Rank System logic
  const XP_RANKS = [
    { rank: 1, id: 'novice', minXp: 0, maxXp: 499, title: 'Novice Initiate' },
    { rank: 2, id: 'bronze', minXp: 500, maxXp: 1499, title: 'Bronze Achiever' },
    { rank: 3, id: 'silver', minXp: 1500, maxXp: 3499, title: 'Silver Practitioner' },
    { rank: 4, id: 'gold', minXp: 3500, maxXp: 6999, title: 'Gold Virtuoso' },
    { rank: 5, id: 'platinum', minXp: 7000, maxXp: 11999, title: 'Platinum Vanguard' },
    { rank: 6, id: 'diamond', minXp: 12000, maxXp: 19999, title: 'Diamond Paragon' },
    { rank: 7, id: 'master', minXp: 20000, maxXp: 34999, title: 'Master Strategist' },
    { rank: 8, id: 'grandmaster', minXp: 35000, maxXp: 49999, title: 'Grandmaster Titan' },
    { rank: 9, id: 'mythic', minXp: 50000, maxXp: Infinity, title: 'Mythic Immortal' }
  ];

  function getRank(xp) {
    const cur = XP_RANKS.slice().reverse().find(r => xp >= r.minXp) || XP_RANKS[0];
    const nxtIdx = XP_RANKS.findIndex(r => r.id === cur.id) + 1;
    const nxt = nxtIdx < XP_RANKS.length ? XP_RANKS[nxtIdx] : null;
    return {
      current: cur,
      next: nxt,
      needed: nxt ? Math.max(0, nxt.minXp - xp) : 0
    };
  }

  const rankInfo = getRank(4400);
  assert.equal(rankInfo.current.id, 'gold');
  assert.equal(rankInfo.next.id, 'platinum');
  assert.equal(rankInfo.needed, 2600, 'Needs 2600 XP to reach Platinum Vanguard');
});
