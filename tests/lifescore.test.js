const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// Import production scoring engine directly from script.js
const {
  calculateLifeScore,
  calculateWeeklyBounds,
  calculateMonthlyBounds,
  isScheduleEventCompletedOnDate,
  doesScheduleEventOccurOnDate,
  createScoreSnapshot
} = require('../script.js');

const API_BASE = 'http://localhost:3000';

/* ==========================================================================
   1. EXACT WEIGHTS & ROUNDING TEST
   ========================================================================== */
test('Life Score: Exact weights sum up to 100% (25/25/20/15/15) and round to integer', () => {
  // A controlled state where:
  // Habits = 100% (3 check-ins across 3 elapsed days Mon-Wed)
  // Tasks = 100% (1 completed of 1 eligible)
  // Finances = 100% (100% savings rate)
  // Goals = 100% (100% progress)
  // Schedule = 100% (1 completed block of 1 scheduled block)
  const refDate = new Date(2026, 9, 7, 12, 0, 0); // Wednesday Oct 7, 2026

  const perfectState = {
    habits: [
      { completedDates: ['2026-10-05', '2026-10-06', '2026-10-07'] }
    ],
    tasks: [
      { id: 't1', completed: true, completedAt: '2026-10-06T10:00:00Z', createdAt: '2026-10-05T09:00:00Z' }
    ],
    transactions: [
      { type: 'income', amount: 10000, date: '2026-10-06' },
      { type: 'expense', amount: 0, date: '2026-10-06' } // 100% savings rate -> 100% score
    ],
    goals: [
      { title: 'Goal 1', progress: 100, status: 'completed' }
    ],
    schedule: [
      { id: 's1', date: '2026-10-06', hour: 9, completed: true, completedDates: ['2026-10-06'] }
    ]
  };

  const result = calculateLifeScore('week', refDate, perfectState);

  assert.equal(result.breakdown.habits.weight, 25, 'Habits weight must be 25%');
  assert.equal(result.breakdown.tasks.weight, 25, 'Tasks weight must be 25%');
  assert.equal(result.breakdown.finances.weight, 20, 'Finances weight must be 20%');
  assert.equal(result.breakdown.goals.weight, 15, 'Goals weight must be 15%');
  assert.equal(result.breakdown.schedule.weight, 15, 'Schedule weight must be 15%');

  const totalWeight = result.breakdown.habits.weight +
    result.breakdown.tasks.weight +
    result.breakdown.finances.weight +
    result.breakdown.goals.weight +
    result.breakdown.schedule.weight;
  assert.equal(totalWeight, 100, 'Sum of all 5 weights must equal exactly 100%');

  assert.equal(Number.isInteger(result.totalScore), true, 'Total Life Score must be a rounded integer');
  assert.equal(result.totalScore, 100, 'Perfect execution across all 5 dimensions must equal 100%');
});

/* ==========================================================================
   2. STRICT MONDAY TO SUNDAY BOUNDARIES TEST
   ========================================================================== */
test('Life Score: Strict Monday to Sunday weekly boundaries', () => {
  // Test reference date on Wednesday Oct 7, 2026
  const wednesday = new Date(2026, 9, 7, 12, 0, 0);
  const boundsWed = calculateWeeklyBounds(wednesday);
  assert.equal(boundsWed.startDateStr, '2026-10-05', 'Monday must be 2026-10-05');
  assert.equal(boundsWed.endDateStr, '2026-10-11', 'Sunday must be 2026-10-11');
  assert.equal(boundsWed.periodKey, '2026-W41', 'ISO week periodKey must be 2026-W41');
  assert.equal(boundsWed.daysInPeriod, 7);

  // Test reference date on Sunday Oct 11, 2026 (end of week)
  const sunday = new Date(2026, 9, 11, 12, 0, 0);
  const boundsSun = calculateWeeklyBounds(sunday);
  assert.equal(boundsSun.startDateStr, '2026-10-05');
  assert.equal(boundsSun.endDateStr, '2026-10-11');

  // Test reference date on Monday Oct 5, 2026 (start of week)
  const monday = new Date(2026, 9, 5, 12, 0, 0);
  const boundsMon = calculateWeeklyBounds(monday);
  assert.equal(boundsMon.startDateStr, '2026-10-05');
  assert.equal(boundsMon.endDateStr, '2026-10-11');

  // Test leap year week crossing months: Feb 26, 2024 (Monday) to Mar 3, 2024 (Sunday)
  const leapWeek = calculateWeeklyBounds(new Date(2024, 1, 29, 12, 0, 0));
  assert.equal(leapWeek.startDateStr, '2024-02-26');
  assert.equal(leapWeek.endDateStr, '2024-03-03');
});

/* ==========================================================================
   3. STRICT CALENDAR MONTH BOUNDARIES TEST
   ========================================================================== */
test('Life Score: Strict calendar month boundaries (1st day to last day)', () => {
  // October (31 days)
  const oct = calculateMonthlyBounds(new Date('2026-10-15T12:00:00Z'));
  assert.equal(oct.startDateStr, '2026-10-01');
  assert.equal(oct.endDateStr, '2026-10-31');
  assert.equal(oct.periodKey, '2026-10');
  assert.equal(oct.daysInPeriod, 31);

  // April (30 days)
  const apr = calculateMonthlyBounds(new Date('2026-04-10T12:00:00Z'));
  assert.equal(apr.startDateStr, '2026-04-01');
  assert.equal(apr.endDateStr, '2026-04-30');
  assert.equal(apr.periodKey, '2026-04');
  assert.equal(apr.daysInPeriod, 30);

  // February in a leap year (2024: 29 days)
  const febLeap = calculateMonthlyBounds(new Date('2024-02-14T12:00:00Z'));
  assert.equal(febLeap.startDateStr, '2024-02-01');
  assert.equal(febLeap.endDateStr, '2024-02-29');
  assert.equal(febLeap.daysInPeriod, 29);

  // February in a non-leap year (2025: 28 days)
  const febNormal = calculateMonthlyBounds(new Date('2025-02-05T12:00:00Z'));
  assert.equal(febNormal.startDateStr, '2025-02-01');
  assert.equal(febNormal.endDateStr, '2025-02-28');
  assert.equal(febNormal.daysInPeriod, 28);
});

/* ==========================================================================
   4. EMPTY / MISSING DATA SCORES ZERO (NOT 100)
   ========================================================================== */
test('Life Score: Empty and missing data strictly scores 0, never 100', () => {
  const emptyState = {
    habits: [],
    tasks: [],
    transactions: [],
    schedule: [],
    goals: []
  };

  const result = calculateLifeScore('week', new Date('2026-10-07'), emptyState);

  assert.equal(result.totalScore, 0, 'Empty total score must be 0');
  assert.equal(result.habitPct, 0, 'Empty habits must score 0, not 100');
  assert.equal(result.taskPct, 0, 'Empty tasks must score 0, not 100');
  assert.equal(result.financePct, 0, 'Empty finances must score 0, not 100');
  assert.equal(result.goalPct, 0, 'Empty goals must score 0, not 100');
  assert.equal(result.schedulePct, 0, 'Empty schedule must score 0, not 100');
  assert.equal(result.breakdown.habits.score, 0);
  assert.equal(result.breakdown.tasks.score, 0);
  assert.equal(result.breakdown.finances.score, 0);
  assert.equal(result.breakdown.goals.score, 0);
  assert.equal(result.breakdown.schedule.score, 0);
});

test('Life Score: Items with zero completed progress score zero', () => {
  const uncompletedState = {
    habits: [{ name: 'Drink water', completedDates: [] }],
    tasks: [{ id: 't1', title: 'Pending task', completed: false }],
    transactions: [{ type: 'income', amount: 0, date: '2026-10-07' }],
    schedule: [{ id: 's1', date: '2026-10-07', hour: 10, completed: false, completedDates: [] }],
    goals: [{ title: 'Goal A', progress: 0 }]
  };

  const result = calculateLifeScore('week', new Date('2026-10-07'), uncompletedState);

  assert.equal(result.habitPct, 0, 'Habit with 0 check-ins must score 0');
  assert.equal(result.taskPct, 0, 'Task with 0 completions must score 0');
  assert.equal(result.financePct, 0, 'Transactions with 0 balance must score 0');
  assert.equal(result.goalPct, 0, 'Goal with 0% progress must score 0');
  assert.equal(result.schedulePct, 0, 'Schedule with 0 completed blocks must score 0');
  assert.equal(result.totalScore, 0);
});

/* ==========================================================================
   5. HABIT COMPLETION RULES & STREAK BONUS
   ========================================================================== */
test('Life Score: Habit completions in period and capped streak bonus', () => {
  const refDate = new Date('2026-10-11'); // Completed week (Oct 5 - Oct 11)
  
  // Habit with completions inside the week AND outside the week
  const habitState = {
    habits: [
      {
        name: 'Morning Workout',
        completedDates: [
          '2026-09-30', // Outside period
          '2026-10-05', // Inside Monday
          '2026-10-06', // Inside Tuesday
          '2026-10-07', // Inside Wednesday
          '2026-10-08', // Inside Thursday
          '2026-10-09', // Inside Friday
          '2026-10-10', // Inside Saturday
          '2026-10-11'  // Inside Sunday
        ]
      }
    ],
    tasks: [],
    transactions: [],
    schedule: [],
    goals: []
  };

  const result = calculateLifeScore('week', refDate, habitState);
  assert.ok(result.habitPct >= 90, '7/7 check-ins must score high');
  assert.ok(result.breakdown.habits.weighted <= 25, 'Habit weighted score must not exceed 25');
});

/* ==========================================================================
   6. TASK COMPLETION & DENOMINATOR CONSISTENCY
   ========================================================================== */
test('Life Score: Tasks created after period or not yet due are excluded from failures', () => {
  const refDate = new Date('2026-10-07'); // Wednesday of week 2026-10-05 to 2026-10-11

  const taskState = {
    habits: [],
    tasks: [
      // 1. Completed task within period
      { id: 't1', title: 'Task in period', completed: true, completedAt: '2026-10-06T12:00:00Z', createdAt: '2026-10-05T08:00:00Z' },
      // 2. Task created AFTER the period ends (e.g. next week) -> MUST BE EXCLUDED FROM DENOMINATOR
      { id: 't2', title: 'Future task', completed: false, createdAt: '2026-10-20T09:00:00Z' },
      // 3. Task with a future dueDate beyond period -> MUST NOT BE COUNTED AS A FAILURE
      { id: 't3', title: 'Task due next month', dueDate: '2026-11-15', completed: false, createdAt: '2026-10-05T08:00:00Z' }
    ],
    transactions: [],
    schedule: [],
    goals: []
  };

  const result = calculateLifeScore('week', refDate, taskState);
  // Only t1 is eligible for this period, and t1 is completed -> 1/1 = 100%
  assert.equal(result.taskPct, 100, 'Eligible completed task must yield 100% when future tasks are excluded');
  assert.equal(result.totalTasks, 1, 'Only 1 task should be in eligible denominator');
  assert.equal(result.completedTasks, 1, '1 task completed');
});

/* ==========================================================================
   7. FINANCE SCORING CURVE
   ========================================================================== */
test('Life Score: Documented finance income/expense/savings curve', () => {
  const refDate = new Date('2026-10-07');

  // Case A: High surplus (savings rate >= 50%) -> score 85 - 100
  const highSurplus = calculateLifeScore('week', refDate, {
    habits: [], tasks: [], schedule: [], goals: [],
    transactions: [
      { type: 'income', amount: 10000, date: '2026-10-06' },
      { type: 'expense', amount: 3000, date: '2026-10-06' } // 70% savings
    ]
  });
  assert.ok(highSurplus.financePct >= 85 && highSurplus.financePct <= 100, 'Savings >= 50% must score 85-100');

  // Case B: Target surplus (savings rate 20% to 50%) -> score 70 - 85
  const targetSurplus = calculateLifeScore('week', refDate, {
    habits: [], tasks: [], schedule: [], goals: [],
    transactions: [
      { type: 'income', amount: 10000, date: '2026-10-06' },
      { type: 'expense', amount: 7000, date: '2026-10-06' } // 30% savings
    ]
  });
  assert.ok(targetSurplus.financePct >= 70 && targetSurplus.financePct <= 85, 'Savings 20-50% must score 70-85');

  // Case C: Deficit (expenses > income) -> score <= 50
  const deficit = calculateLifeScore('week', refDate, {
    habits: [], tasks: [], schedule: [], goals: [],
    transactions: [
      { type: 'income', amount: 5000, date: '2026-10-06' },
      { type: 'expense', amount: 10000, date: '2026-10-06' } // 100% deficit
    ]
  });
  assert.ok(deficit.financePct <= 50 && deficit.financePct >= 5, 'Deficit must score below 50');

  // Case D: Expenses only without income -> controlled score
  const expensesOnly = calculateLifeScore('week', refDate, {
    habits: [], tasks: [], schedule: [], goals: [],
    transactions: [
      { type: 'expense', amount: 500, date: '2026-10-06' }
    ]
  });
  assert.ok(expensesOnly.financePct <= 40 && expensesOnly.financePct >= 10, 'Expenses only must use documented curve');
});

/* ==========================================================================
   8. GOALS & SCHEDULE SCORING
   ========================================================================== */
test('Life Score: Goals and schedule completion scoring', () => {
  const refDate = new Date('2026-10-07');

  // Goals scoring: average of active goals
  const goalState = {
    habits: [], tasks: [], transactions: [], schedule: [],
    goals: [
      { title: 'Goal 1', progress: 80 },
      { title: 'Goal 2', progress: 40 }
    ]
  };
  const goalResult = calculateLifeScore('week', refDate, goalState);
  assert.equal(goalResult.goalPct, 60, 'Goals progress must be average of active goals ((80+40)/2 = 60)');

  // Schedule scoring: completed blocks / eligible blocks
  const schedState = {
    habits: [], tasks: [], transactions: [], goals: [],
    schedule: [
      { id: 's1', date: '2026-10-05', hour: 10, completed: true, completedDates: ['2026-10-05'] },
      { id: 's2', date: '2026-10-06', hour: 14, completed: false, completedDates: [] }
    ]
  };
  const schedResult = calculateLifeScore('week', refDate, schedState);
  assert.equal(schedResult.schedulePct, 50, '1 of 2 scheduled blocks completed must equal 50%');
});

/* ==========================================================================
   9. SCHEDULE RECURRENCE & COMPLETION HELPER FUNCTIONS
   ========================================================================== */
test('Schedule: Occurrence and completion helper functions handle single and recurring events', () => {
  const singleEvt = { id: 's1', date: '2026-10-06', recurrence: 'once', completedDates: ['2026-10-06'] };
  assert.equal(doesScheduleEventOccurOnDate(singleEvt, '2026-10-06'), true);
  assert.equal(doesScheduleEventOccurOnDate(singleEvt, '2026-10-07'), false);
  assert.equal(isScheduleEventCompletedOnDate(singleEvt, '2026-10-06'), true);
  assert.equal(isScheduleEventCompletedOnDate(singleEvt, '2026-10-07'), false);

  const everydayEvt = { id: 's2', recurrence: 'everyday', completedDates: ['2026-10-06'] };
  assert.equal(doesScheduleEventOccurOnDate(everydayEvt, '2026-10-06'), true);
  assert.equal(doesScheduleEventOccurOnDate(everydayEvt, '2026-10-07'), true);
  assert.equal(isScheduleEventCompletedOnDate(everydayEvt, '2026-10-06'), true);
  assert.equal(isScheduleEventCompletedOnDate(everydayEvt, '2026-10-07'), false);

  const weekDayEvt = { id: 's3', recurrence: 'selected_days', repeatDays: ['Mon', 'Wed', 'Fri'], completedDates: [] };
  assert.equal(doesScheduleEventOccurOnDate(weekDayEvt, '2026-10-05'), true);  // Monday
  assert.equal(doesScheduleEventOccurOnDate(weekDayEvt, '2026-10-06'), false); // Tuesday
  assert.equal(doesScheduleEventOccurOnDate(weekDayEvt, '2026-10-07'), true);  // Wednesday
});

/* ==========================================================================
   10. HISTORICAL SNAPSHOTS & DEDUPLICATION
   ========================================================================== */
test('Life Score: Historical snapshots creation and duplicate prevention', async () => {
  const testState = {
    habits: [{ completedDates: ['2026-10-05', '2026-10-06'] }],
    tasks: [{ completed: true, completedAt: '2026-10-05T12:00:00Z', createdAt: '2026-10-05T09:00:00Z' }],
    transactions: [{ type: 'income', amount: 5000, date: '2026-10-06' }],
    schedule: [{ date: '2026-10-05', completed: true, completedDates: ['2026-10-05'] }],
    goals: [{ progress: 75 }],
    scoreSnapshots: []
  };

  const refDate = new Date('2026-10-07');
  const snap1 = await createScoreSnapshot('week', refDate, testState);
  assert.equal(snap1.duplicate, false, 'First snapshot must be created successfully');
  assert.equal(testState.scoreSnapshots.length, 1);
  assert.equal(snap1.snapshot.periodKey, '2026-W41');
  assert.equal(snap1.snapshot.formulaVersion, '2.0-5pillar');
  assert.ok(snap1.snapshot.scores.total > 0);

  // Calling createScoreSnapshot again for the same periodKey must prevent duplicates
  const snap2 = await createScoreSnapshot('week', refDate, testState);
  assert.equal(snap2.duplicate, true, 'Second snapshot for same period must be flagged as duplicate');
  assert.equal(testState.scoreSnapshots.length, 1, 'Length must remain 1 (no duplicate snapshot added)');
});

/* ==========================================================================
   11. API INTEGRATION: SNAPSHOT REST ENDPOINTS
   ========================================================================== */
test('API: /api/scores/snapshots GET and POST with server deduplication', async () => {
  try {
    const healthRes = await fetch(`${API_BASE}/api/health`);
    if (!healthRes.ok) {
      console.log('Server not responding at API_BASE, skipping network test');
      return;
    }

    // 1. POST snapshot to API
    const uniqueKey = `2026-W${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    const payload = {
      periodType: 'week',
      periodKey: uniqueKey,
      startDate: '2026-10-05',
      endDate: '2026-10-11',
      formulaVersion: '2.0-5pillar',
      scores: {
        habits: 85,
        tasks: 90,
        finances: 75,
        goals: 60,
        schedule: 70,
        total: 78
      }
    };

    const postRes = await fetch(`${API_BASE}/api/scores/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(postRes.status, 201, 'POST /api/scores/snapshots must return 201');
    const postData = await postRes.json();
    assert.equal(postData.success, true);
    assert.equal(postData.snapshot.periodKey, uniqueKey);

    // 2. Duplicate prevention test on API
    const duplicateRes = await fetch(`${API_BASE}/api/scores/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(duplicateRes.status, 200, 'POST duplicate snapshot must return 200 with duplicate flag');
    const dupData = await duplicateRes.json();
    assert.equal(dupData.duplicate, true, 'API must prevent duplicate snapshot insertion');

    // 3. GET snapshots
    const getRes = await fetch(`${API_BASE}/api/scores/snapshots`);
    assert.equal(getRes.status, 200);
    const getList = await getRes.json();
    assert.ok(Array.isArray(getList));
    assert.ok(getList.some(s => s.periodKey === uniqueKey), 'Saved snapshot must be returned by GET');
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.warn('Server offline, skipping API endpoint test');
    } else {
      throw err;
    }
  }
});
