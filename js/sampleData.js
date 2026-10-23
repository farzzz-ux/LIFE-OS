/**
 * LIFE OS — Comprehensive Sample Dataset (10-20 Rich Items Per Life Pillar)
 * Powers default workspace initialization, baseline reset, and interactive testing.
 */

const DEFAULT_SAMPLE_DATA = {
  habits: [
    {
      id: 'h_1',
      name: 'Morning Hydration (500ml Water + Electrolytes)',
      category: 'Health',
      routine: 'Morning',
      motivation: 'Kickstart cellular hydration and metabolism immediately after waking',
      color: 'cyan',
      completedDates: [],
      createdAt: '2026-10-01T06:30:00.000Z'
    },
    {
      id: 'h_2',
      name: 'Deep Work Focus Block (90 Mins No Distractions)',
      category: 'Productivity',
      routine: 'Morning',
      motivation: 'Protect high-cognitive focus time before responding to notifications',
      color: 'violet',
      completedDates: [],
      createdAt: '2026-10-01T08:00:00.000Z'
    },
    {
      id: 'h_3',
      name: '30-Min Cardio & Core Conditioning',
      category: 'Fitness',
      routine: 'Morning',
      motivation: 'Sustain cardiovascular endurance and midday mental energy',
      color: 'emerald',
      completedDates: [],
      createdAt: '2026-10-02T07:15:00.000Z'
    },
    {
      id: 'h_4',
      name: 'Read 15 Pages of Engineering / Systems Book',
      category: 'Learning',
      routine: 'Evening',
      motivation: 'Consistent continuous learning compounds into world-class expertise',
      color: 'amber',
      completedDates: [],
      createdAt: '2026-10-02T20:00:00.000Z'
    },
    {
      id: 'h_5',
      name: 'Mindfulness Breathwork & Box Breathing (10m)',
      category: 'Health',
      routine: 'Afternoon',
      motivation: 'Reset central nervous system and eliminate cognitive fatigue',
      color: 'cyan',
      completedDates: [],
      createdAt: '2026-10-03T13:30:00.000Z'
    },
    {
      id: 'h_6',
      name: 'Plan Next Day & Review Top 3 Priorities',
      category: 'Productivity',
      routine: 'Evening',
      motivation: 'Zero friction mornings start with intentional evening planning',
      color: 'violet',
      completedDates: [],
      createdAt: '2026-10-03T21:00:00.000Z'
    },
    {
      id: 'h_7',
      name: 'Clean Whole Foods Nutrition (Zero Refined Sugar)',
      category: 'Fitness',
      routine: 'Daily',
      motivation: 'High physical output requires clean unrefined fuel',
      color: 'emerald',
      completedDates: [],
      createdAt: '2026-10-04T12:00:00.000Z'
    },
    {
      id: 'h_8',
      name: 'Coding Kata & Architecture Reflection',
      category: 'Learning',
      routine: 'Afternoon',
      motivation: 'Refine clean software crafting patterns and code quality',
      color: 'amber',
      completedDates: [],
      createdAt: '2026-10-05T16:00:00.000Z'
    },
    {
      id: 'h_9',
      name: 'Evening Gratitude Journaling',
      category: 'Mindset',
      routine: 'Evening',
      motivation: 'Ground perspective and anchor appreciation for daily breakthroughs',
      color: 'rose',
      completedDates: [],
      createdAt: '2026-10-05T21:30:00.000Z'
    },
    {
      id: 'h_10',
      name: 'Screens Off 45 Mins Before Bed',
      category: 'Health',
      routine: 'Evening',
      motivation: 'Deep restorative REM sleep and melatonin stabilization',
      color: 'cyan',
      completedDates: [],
      createdAt: '2026-10-06T22:00:00.000Z'
    },
    {
      id: 'h_11',
      name: '10,000 Daily Steps Walking',
      category: 'Fitness',
      routine: 'Daily',
      motivation: 'Non-exercise physical activity for longevity and health',
      color: 'emerald',
      completedDates: [],
      createdAt: '2026-10-07T18:00:00.000Z'
    },
    {
      id: 'h_12',
      name: 'Daily Expense Ledger Auditing',
      category: 'Mindset',
      routine: 'Evening',
      motivation: 'Zero financial leaks through intentional daily awareness',
      color: 'amber',
      completedDates: [],
      createdAt: '2026-10-08T20:30:00.000Z'
    }
  ],

  tasks: [
    {
      id: 't_1',
      title: 'Finalize Q4 Production Architecture RFC & Review',
      completed: false,
      priority: 'high',
      category: 'Work',
      dueDate: '2026-10-20',
      notes: 'Include multi-tenant partitioning, SQLite WAL benchmarks, and caching strategy',
      createdAt: '2026-10-18T09:00:00.000Z',
      completedAt: '2026-10-20T11:30:00.000Z'
    },
    {
      id: 't_2',
      title: 'Conduct Automated Performance & 60fps Profiling',
      completed: false,
      priority: 'high',
      category: 'Work',
      dueDate: '2026-10-20',
      notes: 'Verify zero scroll jank in mobile drawer views and journal feed',
      createdAt: '2026-10-19T10:00:00.000Z',
      completedAt: '2026-10-20T14:15:00.000Z'
    },
    {
      id: 't_3',
      title: 'Review Quarterly Savings & Mutual Fund Allocation',
      completed: false,
      priority: 'medium',
      category: 'Finance',
      dueDate: '2026-10-20',
      notes: 'Confirm monthly SIP execution and emergency fund interest re-invest',
      createdAt: '2026-10-17T11:00:00.000Z',
      completedAt: '2026-10-20T12:00:00.000Z'
    },
    {
      id: 't_4',
      title: 'Ship Double-Check Safety Modal for Settings Data',
      completed: false,
      priority: 'high',
      category: 'Work',
      dueDate: '2026-10-20',
      notes: 'Ensure user-friendly warnings with confirmation dialogs',
      createdAt: '2026-10-20T08:30:00.000Z',
      completedAt: '2026-10-20T16:00:00.000Z'
    },
    {
      id: 't_5',
      title: 'Morning 5km Recovery Run & Stretching',
      completed: false,
      priority: 'medium',
      category: 'Health',
      dueDate: '2026-10-20',
      notes: 'Kept pace at 5:20/km; heart rate stayed in Zone 2',
      createdAt: '2026-10-20T06:30:00.000Z',
      completedAt: '2026-10-20T07:45:00.000Z'
    },
    {
      id: 't_6',
      title: 'Update Clean Cloud Backup & Export Data',
      completed: false,
      priority: 'low',
      category: 'Personal',
      dueDate: '2026-10-20',
      notes: 'Saved timestamped JSON backup to offline storage drive',
      createdAt: '2026-10-19T15:00:00.000Z',
      completedAt: '2026-10-20T10:10:00.000Z'
    },
    {
      id: 't_7',
      title: 'Implement Local-First Event Synchronization Layer',
      completed: false,
      priority: 'high',
      category: 'Work',
      dueDate: '2026-10-21',
      notes: 'Prepare client-side offline queue with exponential backoff retry',
      createdAt: '2026-10-20T10:00:00.000Z'
    },
    {
      id: 't_8',
      title: 'Finish Chapter 8: Designing Data-Intensive Applications',
      completed: false,
      priority: 'medium',
      category: 'Learning',
      dueDate: '2026-10-21',
      notes: 'Focus on distributed consensus protocols and leaderless replication',
      createdAt: '2026-10-19T18:00:00.000Z'
    },
    {
      id: 't_9',
      title: 'Schedule Annual Comprehensive Medical & Dental Checkup',
      completed: false,
      priority: 'medium',
      category: 'Health',
      dueDate: '2026-10-22',
      notes: 'Call wellness clinic for Saturday morning slot',
      createdAt: '2026-10-20T09:15:00.000Z'
    },
    {
      id: 't_10',
      title: 'Refactor REST Endpoint Error Boundaries with Zod',
      completed: false,
      priority: 'high',
      category: 'Work',
      dueDate: '2026-10-22',
      notes: 'Standardize RFC 7807 problem details error payload formatting',
      createdAt: '2026-10-19T14:30:00.000Z'
    },
    {
      id: 't_11',
      title: 'Review Monthly Electricity & Broadband Utility Bills',
      completed: false,
      priority: 'low',
      category: 'Finance',
      dueDate: '2026-10-23',
      notes: 'Audit recurring subscriptions and cancel unused cloud instances',
      createdAt: '2026-10-18T16:00:00.000Z'
    },
    {
      id: 't_12',
      title: 'Plan Weekend Trail Hike & Prepare Hydration Pack',
      completed: false,
      priority: 'low',
      category: 'Personal',
      dueDate: '2026-10-24',
      notes: 'Check weather forecast and download offline topographic map',
      createdAt: '2026-10-20T11:00:00.000Z'
    },
    {
      id: 't_13',
      title: 'Draft Technical Blog Post: 60 FPS Mobile Web Design',
      completed: false,
      priority: 'medium',
      category: 'Learning',
      dueDate: '2026-10-25',
      notes: 'Highlight content-visibility auto, GPU transform layers, and CSS containment',
      createdAt: '2026-10-19T20:00:00.000Z'
    },
    {
      id: 't_14',
      title: 'Optimize Home Ergonomic Workspace & Monitor Lighting',
      completed: false,
      priority: 'low',
      category: 'Health',
      dueDate: '2026-10-26',
      notes: 'Adjust monitor arm eye level and clean ambient light bar',
      createdAt: '2026-10-20T13:00:00.000Z'
    },
    {
      id: 't_15',
      title: 'Quarterly OKR Review & Strategic Progress Assessment',
      completed: false,
      priority: 'high',
      category: 'Work',
      dueDate: '2026-10-28',
      notes: 'Compare actual delivery metrics against planned Q4 goals',
      createdAt: '2026-10-18T10:00:00.000Z'
    },
    {
      id: 't_16',
      title: 'Setup Automated Database WAL Checkpointing Cron',
      completed: false,
      priority: 'medium',
      category: 'Work',
      dueDate: '2026-10-29',
      notes: 'Pragma wal_checkpoint(TRUNCATE) scheduled at low-traffic hours',
      createdAt: '2026-10-20T15:30:00.000Z'
    },
    {
      id: 't_17',
      title: 'Order Fresh Roaster Whole Bean Specialty Coffee',
      completed: false,
      priority: 'low',
      category: 'Personal',
      dueDate: '2026-10-30',
      notes: 'Ethiopian single origin medium roast',
      createdAt: '2026-10-20T16:00:00.000Z'
    },
    {
      id: 't_18',
      title: 'Clean Out Desktop Downloads & Temporary Cache Folders',
      completed: false,
      priority: 'low',
      category: 'Personal',
      dueDate: '2026-10-31',
      notes: 'Free up disk space and archive finished client assets',
      createdAt: '2026-10-19T17:00:00.000Z'
    }
  ],

  schedule: [
    {
      id: 'sch_1',
      title: 'Morning Cardio & Mobility Warmup',
      date: '2026-10-20',
      hour: 7,
      duration: 1,
      category: 'Fitness',
      recurrence: 'everyday',
      repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      completedDates: [],
      createdAt: '2026-10-01T07:00:00.000Z'
    },
    {
      id: 'sch_2',
      title: 'Nutritious Breakfast & Priority Planning',
      date: '2026-10-20',
      hour: 8,
      duration: 1,
      category: 'Personal',
      recurrence: 'everyday',
      repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      completedDates: [],
      createdAt: '2026-10-01T08:00:00.000Z'
    },
    {
      id: 'sch_3',
      title: 'Deep Focus: Core Architecture Refactoring',
      date: '2026-10-20',
      hour: 9,
      duration: 2.5,
      category: 'Work',
      recurrence: 'selected_days',
      repeatDays: ['Mon', 'Tue', 'Wed', 'Thu'],
      completedDates: [],
      createdAt: '2026-10-02T09:00:00.000Z'
    },
    {
      id: 'sch_4',
      title: 'Engineering Team Sync & Standup Review',
      date: '2026-10-20',
      hour: 12,
      duration: 1,
      category: 'Work',
      recurrence: 'everyday',
      repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      completedDates: [],
      createdAt: '2026-10-02T11:30:00.000Z'
    },
    {
      id: 'sch_5',
      title: 'Mindful Lunch & Sunshine Walk',
      date: '2026-10-20',
      hour: 13,
      duration: 1,
      category: 'Health',
      recurrence: 'everyday',
      repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      completedDates: [],
      createdAt: '2026-10-03T13:00:00.000Z'
    },
    {
      id: 'sch_6',
      title: 'Code Review, Pull Requests & Architecture Demos',
      date: '2026-10-20',
      hour: 14,
      duration: 2,
      category: 'Work',
      recurrence: 'selected_days',
      repeatDays: ['Tue', 'Thu'],
      completedDates: [],
      createdAt: '2026-10-03T14:00:00.000Z'
    },
    {
      id: 'sch_7',
      title: 'Systems Design & Distributed Systems Reading',
      date: '2026-10-20',
      hour: 16,
      duration: 1.5,
      category: 'Learning',
      recurrence: 'selected_days',
      repeatDays: ['Mon', 'Tue', 'Wed', 'Fri'],
      completedDates: [],
      createdAt: '2026-10-04T16:00:00.000Z'
    },
    {
      id: 'sch_8',
      title: 'Family Dinner & Evening Relaxation',
      date: '2026-10-20',
      hour: 19,
      duration: 1.5,
      category: 'Personal',
      recurrence: 'everyday',
      repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      completedDates: [],
      createdAt: '2026-10-05T19:00:00.000Z'
    },
    {
      id: 'sch_9',
      title: 'Evening Reflection & Day Log Writing',
      date: '2026-10-20',
      hour: 21,
      duration: 0.75,
      category: 'Mindset',
      recurrence: 'everyday',
      repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      completedDates: [],
      createdAt: '2026-10-05T21:00:00.000Z'
    },
    {
      id: 'sch_10',
      title: 'Strategy Session: Product Roadmap Q1',
      date: '2026-10-21',
      hour: 10,
      duration: 1.5,
      category: 'Work',
      recurrence: 'once',
      repeatDays: [],
      completedDates: [],
      createdAt: '2026-10-18T10:00:00.000Z'
    },
    {
      id: 'sch_11',
      title: 'Technical 1-on-1 Mentorship Session',
      date: '2026-10-22',
      hour: 15,
      duration: 1,
      category: 'Work',
      recurrence: 'once',
      repeatDays: [],
      completedDates: [],
      createdAt: '2026-10-18T15:00:00.000Z'
    },
    {
      id: 'sch_12',
      title: 'Weekend 15km Endurance Trail Run',
      date: '2026-10-24',
      hour: 7,
      duration: 2,
      category: 'Fitness',
      recurrence: 'once',
      repeatDays: [],
      completedDates: [],
      createdAt: '2026-10-19T07:00:00.000Z'
    },
    {
      id: 'sch_13',
      title: 'Weekly Financial Review & Budget Audit',
      date: '2026-10-25',
      hour: 17,
      duration: 1,
      category: 'Personal',
      recurrence: 'selected_days',
      repeatDays: ['Sun'],
      completedDates: [],
      createdAt: '2026-10-19T17:00:00.000Z'
    },
    {
      id: 'sch_14',
      title: 'Deep Rest: Wind Down & Digital Sunset',
      date: '2026-10-20',
      hour: 22,
      duration: 0.5,
      category: 'Health',
      recurrence: 'everyday',
      repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      completedDates: [],
      createdAt: '2026-10-06T22:00:00.000Z'
    }
  ],

  goals: [
    {
      id: 'g_1',
      title: 'Achieve Senior Staff Engineering Prestige',
      category: 'Career',
      progress: 80,
      targetDate: '2026-12-31',
      metrics: 'Lead multi-service migration, author 3 architecture RFCs, mentor 4 engineers',
      description: 'Expand technical influence across foundational infrastructure systems and elevate organizational standards.',
      milestones: 'RFC Approved (Done) • Core Engine Shipped (Done) • Cross-org Rollout (In Progress)',
      createdAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 'g_2',
      title: 'Run Official Half Marathon Under 1h 48m',
      category: 'Health',
      progress: 70,
      targetDate: '2026-11-29',
      metrics: 'Sustain sub-5:05/km pace across 21.1 km with Zone 3 heart rate efficiency',
      description: 'Progressive weekly long run volume build-up with structured intervals and strength conditioning.',
      milestones: '10k under 48m (Done) • 16k long run (Done) • 18k long run (Upcoming)',
      createdAt: '2026-09-05T00:00:00.000Z'
    },
    {
      id: 'g_3',
      title: 'Build Emergency Liquid Reserve to ₹10,00,000',
      category: 'Finance',
      progress: 85,
      targetDate: '2026-12-31',
      metrics: '₹8,50,000 currently secured in high-yield liquid instruments',
      description: 'Maintain 9 months of baseline living expenses fully isolated from market volatility.',
      milestones: '₹5L Fund (Done) • ₹7.5L Fund (Done) • ₹10L Final Target',
      createdAt: '2026-08-01T00:00:00.000Z'
    },
    {
      id: 'g_4',
      title: 'Read & Digest 24 Foundational Books',
      category: 'Learning',
      progress: 75,
      targetDate: '2026-12-31',
      metrics: '18 books completed with executive summaries recorded in Journal',
      description: 'Cover systems thinking, distributed architecture, economic history, and cognitive psychology.',
      milestones: '6 Books (Done) • 12 Books (Done) • 18 Books (Done) • 24 Books',
      createdAt: '2026-07-01T00:00:00.000Z'
    },
    {
      id: 'g_5',
      title: 'Launch SaaS Productivity Platform MVP',
      category: 'Career',
      progress: 60,
      targetDate: '2027-01-15',
      metrics: 'Deploy production cloud backend with 100 beta test users',
      description: 'Build local-first productivity tool with real-time sync, SQLite persistence, and zero latency.',
      milestones: 'Architecture RFC (Done) • DB Schema (Done) • Beta Signup (In Progress)',
      createdAt: '2026-09-15T00:00:00.000Z'
    },
    {
      id: 'g_6',
      title: 'Master Advanced Rust & High-Throughput I/O',
      category: 'Learning',
      progress: 55,
      targetDate: '2027-02-28',
      metrics: 'Build asynchronous multi-threaded actor runtime from scratch',
      description: 'Master zero-cost abstractions, memory management, unsafe boundaries, and Tokio concurrency.',
      milestones: 'Rust Book (Done) • Async Tokio (Done) • Custom Engine (In Progress)',
      createdAt: '2026-09-20T00:00:00.000Z'
    },
    {
      id: 'g_7',
      title: 'Eliminate All Non-Mortgage Consumer Debt',
      category: 'Finance',
      progress: 100,
      targetDate: '2026-10-15',
      metrics: '100% zero credit card balances and high-interest loans fully settled',
      description: 'Total financial sovereignty with pristine credit profile and automated balance clearance.',
      milestones: 'Credit Card Paid (Done) • Auto Loan Settled (Done) • Zero Debt Badge Unlocked!',
      createdAt: '2026-06-01T00:00:00.000Z'
    },
    {
      id: 'g_8',
      title: 'Sustain 85%+ Life Score for 60 Consecutive Days',
      category: 'Personal',
      progress: 72,
      targetDate: '2026-11-30',
      metrics: 'Current consecutive streak: 43 days with average 88% overall composite score',
      description: 'Holistic discipline balancing physical habits, deep work tasks, calendar execution, and finances.',
      milestones: '14 Days (Done) • 30 Days (Done) • 45 Days (In Progress) • 60 Days',
      createdAt: '2026-09-08T00:00:00.000Z'
    },
    {
      id: 'g_9',
      title: 'Prepare 50 Clean Home-Cooked Mediterranean Meals',
      category: 'Health',
      progress: 90,
      targetDate: '2026-11-15',
      metrics: '45 delicious high-protein meals prepared with organic ingredients',
      description: 'Cultivate culinary mastery and clean nutrition without relying on restaurant takeout.',
      milestones: '15 Meals (Done) • 30 Meals (Done) • 45 Meals (Done) • 50 Meals Target',
      createdAt: '2026-08-15T00:00:00.000Z'
    },
    {
      id: 'g_10',
      title: 'Reach 1800 Blitz & Rapid Chess Rating',
      category: 'Personal',
      progress: 45,
      targetDate: '2027-03-31',
      metrics: 'Current rating: 1640 across 300 competitive tactical matches',
      description: 'Deepen calculation precision, pawn structure fundamentals, and endgame pattern recognition.',
      milestones: '1500 Rating (Done) • 1600 Rating (Done) • 1700 Rating • 1800 Rating',
      createdAt: '2026-09-10T00:00:00.000Z'
    }
  ],

  transactions: [
    {
      id: 'tx_1',
      type: 'income',
      amount: 220000,
      category: 'Salary',
      description: 'Primary Engineering Lead Monthly Salary',
      date: '2026-10-01',
      createdAt: '2026-10-01T09:00:00.000Z'
    },
    {
      id: 'tx_2',
      type: 'expense',
      amount: 42000,
      category: 'Housing',
      description: 'Apartment Lease & Society Maintenance',
      date: '2026-10-02',
      createdAt: '2026-10-02T10:00:00.000Z'
    },
    {
      id: 'tx_3',
      type: 'expense',
      amount: 14500,
      category: 'Food',
      description: 'Monthly Organic Groceries & Farm Fresh Produce',
      date: '2026-10-03',
      createdAt: '2026-10-03T14:30:00.000Z'
    },
    {
      id: 'tx_4',
      type: 'expense',
      amount: 3200,
      category: 'Bills',
      description: 'Gigabit Fiber Internet & Mobile Unlimited Plan',
      date: '2026-10-04',
      createdAt: '2026-10-04T11:00:00.000Z'
    },
    {
      id: 'tx_5',
      type: 'income',
      amount: 45000,
      category: 'Freelance',
      description: 'High-Performance System Architecture Consultation',
      date: '2026-10-06',
      createdAt: '2026-10-06T16:00:00.000Z'
    },
    {
      id: 'tx_6',
      type: 'expense',
      amount: 4800,
      category: 'Subscriptions',
      description: 'Cloud Infrastructure & Developer Tools',
      date: '2026-10-07',
      createdAt: '2026-10-07T09:30:00.000Z'
    },
    {
      id: 'tx_7',
      type: 'expense',
      amount: 3600,
      category: 'Transport',
      description: 'Metro Transit Card Recharge & EV Charging',
      date: '2026-10-08',
      createdAt: '2026-10-08T12:00:00.000Z'
    },
    {
      id: 'tx_8',
      type: 'expense',
      amount: 6200,
      category: 'Health',
      description: 'Annual Athletic Gym & Recovery Membership',
      date: '2026-10-09',
      createdAt: '2026-10-09T18:00:00.000Z'
    },
    {
      id: 'tx_9',
      type: 'income',
      amount: 14200,
      category: 'Investments',
      description: 'Quarterly Index Fund Dividend Distribution',
      date: '2026-10-10',
      createdAt: '2026-10-10T10:15:00.000Z'
    },
    {
      id: 'tx_10',
      type: 'expense',
      amount: 2800,
      category: 'Education',
      description: 'Distributed Systems & Database Internals Books',
      date: '2026-10-11',
      createdAt: '2026-10-11T15:00:00.000Z'
    },
    {
      id: 'tx_11',
      type: 'expense',
      amount: 5400,
      category: 'Food',
      description: 'Celebratory Weekend Dinner with Family',
      date: '2026-10-12',
      createdAt: '2026-10-12T20:30:00.000Z'
    },
    {
      id: 'tx_12',
      type: 'expense',
      amount: 8500,
      category: 'Shopping',
      description: 'Ergonomic Desk Monitor Mount & Blue Light Filter',
      date: '2026-10-14',
      createdAt: '2026-10-14T11:45:00.000Z'
    },
    {
      id: 'tx_13',
      type: 'income',
      amount: 8500,
      category: 'Other',
      description: 'Open-Source Design System Sponsorship & Royalties',
      date: '2026-10-15',
      createdAt: '2026-10-15T14:00:00.000Z'
    },
    {
      id: 'tx_14',
      type: 'expense',
      amount: 3100,
      category: 'Bills',
      description: 'State Electricity & Green Energy Tariff',
      date: '2026-10-16',
      createdAt: '2026-10-16T17:00:00.000Z'
    },
    {
      id: 'tx_15',
      type: 'expense',
      amount: 50000,
      category: 'Investments',
      description: 'Monthly Automated Nifty Index SIP Investment',
      date: '2026-10-18',
      createdAt: '2026-10-18T09:00:00.000Z'
    },
    {
      id: 'tx_16',
      type: 'expense',
      amount: 1850,
      category: 'Food',
      description: 'Artisanal Specialty Coffee Beans (1kg Ethiopian)',
      date: '2026-10-20',
      createdAt: '2026-10-20T10:30:00.000Z'
    }
  ],

  journal: [
    {
      id: 'j_1',
      title: 'Deep Work Breakthrough: Architectural Clarity',
      category: 'Reflection',
      date: '2026-10-20',
      content: 'Refactored our core persistence layer to separate tenancy at the database query boundary. The cognitive simplicity of clean modular design is unmatched. When you eliminate unnecessary indirection, execution speed immediately multiplies. Feeling immense mental clarity after today\'s focus sprint.',
      createdAt: '2026-10-20T16:30:00.000Z'
    },
    {
      id: 'j_2',
      title: 'Appreciation for Morning Calm & Clear Energy',
      category: 'Gratitude',
      date: '2026-10-20',
      content: 'Grateful for quiet early mornings before the city wakes up. Hydration, 30 minutes of running in crisp air, and a hot espresso. Life is built on these foundational rituals. It costs very little to live with high vitality.',
      createdAt: '2026-10-20T08:00:00.000Z'
    },
    {
      id: 'j_3',
      title: 'Interactive Double-Check UX Pattern for Destructive Actions',
      category: 'Ideas',
      date: '2026-10-19',
      content: 'Idea: Traditional browser confirm dialogs are jarring and break app immersion. Creating a dedicated high-contrast modal with warning glyphs, explicit item count badges, and friendly explanatory text turns destructive anxiety into user confidence.',
      createdAt: '2026-10-19T14:15:00.000Z'
    },
    {
      id: 'j_4',
      title: 'All Sprint Milestones Closed Ahead of Schedule',
      category: 'Wins',
      date: '2026-10-18',
      content: 'Closed all high-priority engineering deliverables 2 days ahead of the sprint deadline. The team was fully aligned. When expectations are explicit and uninterrupted blocks are respected, quality and velocity surge together.',
      createdAt: '2026-10-18T18:00:00.000Z'
    },
    {
      id: 'j_5',
      title: 'The Compounding Asymmetry of Daily Micro-Habits',
      category: 'Lessons',
      date: '2026-10-17',
      content: 'Never underestimate what 15 minutes a day does over 3 years. Whether it is reading foundational textbooks or maintaining physical mobility, consistency always beats periodic heroic intensity. Small deposits build monumental reserves.',
      createdAt: '2026-10-17T21:00:00.000Z'
    },
    {
      id: 'j_6',
      title: 'Tuesday Execution Audit & Midweek Calibration',
      category: 'Daily Log',
      date: '2026-10-16',
      content: 'Completed 6 focus tasks. Maintained clean nutrition and hit 11,200 steps. Reviewed financial ledger; savings rate is tracking at 49% of gross earnings this month. Tomorrow will be dedicated to distributed consensus reading.',
      createdAt: '2026-10-16T22:00:00.000Z'
    },
    {
      id: 'j_7',
      title: 'Mind-Body Synchronization & Sleep Optimization',
      category: 'Reflection',
      date: '2026-10-15',
      content: 'Cutting screens 45 minutes before sleep made an immediate difference on deep sleep tracking. Woke up without an alarm feeling completely refreshed. Respecting natural circadian biology is the highest leverage performance enhancer.',
      createdAt: '2026-10-15T07:30:00.000Z'
    },
    {
      id: 'j_8',
      title: 'Local-First Synchronized State Architecture',
      category: 'Ideas',
      date: '2026-10-14',
      content: 'Local-first software represents the ethical future of personal computing. Users must own their SQLite databases directly on device with zero cloud lock-in, using cloud servers purely as optional replication relays.',
      createdAt: '2026-10-14T11:00:00.000Z'
    },
    {
      id: 'j_9',
      title: 'Sub-48m 10k Run Achievement Unlocked',
      category: 'Wins',
      date: '2026-10-13',
      content: 'Pushed through the 8km wall and clocked 47:42 on today\'s 10km tempo run. Felt strong from start to finish. Aerobic conditioning is finally peaking just in time for the half marathon cycle next month.',
      createdAt: '2026-10-13T09:00:00.000Z'
    },
    {
      id: 'j_10',
      title: 'Evening with Family & Quiet Conversations',
      category: 'Gratitude',
      date: '2026-10-12',
      content: 'Heartfelt gratitude for dinner cooked at home and deep, calm conversations with loved ones. It is easy to get caught up in ambitious pursuits, but grounding oneself in family and community is true wealth.',
      createdAt: '2026-10-12T21:45:00.000Z'
    },
    {
      id: 'j_11',
      title: 'Cognitive Load Reduction Through Ruthless Elimination',
      category: 'Lessons',
      date: '2026-10-11',
      content: 'Decided to prune 12 non-essential email newsletters and mute group chat notifications. Protecting attention is as essential as protecting capital. Attention is the only currency through which life is actually experienced.',
      createdAt: '2026-10-11T19:30:00.000Z'
    },
    {
      id: 'j_12',
      title: 'Sunday Strategic Reset & Weekly Battle Plan',
      category: 'Daily Log',
      date: '2026-10-10',
      content: 'Mapped out the upcoming 5 days in Calendar Focus view. All key meetings consolidated into Tuesday and Thursday afternoons, leaving Monday and Wednesday completely open for uninterrupted deep engineering work.',
      createdAt: '2026-10-10T20:00:00.000Z'
    }
  ],

  unlockedAchievements: {},

  moodLogs: [
    { date: '2026-10-14', score: 5, note: 'High energy and strong deep work focus' },
    { date: '2026-10-15', score: 4, note: 'Solid recovery and clear mindset' },
    { date: '2026-10-16', score: 5, note: 'Productive sprint and great morning run' },
    { date: '2026-10-17', score: 4, note: 'Calm evening and quality reading' },
    { date: '2026-10-18', score: 5, note: 'Sprint goals closed early' },
    { date: '2026-10-19', score: 4, note: 'Smooth architecture progress' },
    { date: '2026-10-20', score: 5, note: 'Exceptional clarity and discipline' }
  ],

  settings: {
    theme: 'dark',
    soundEnabled: true,
    weekStart: 'monday'
  }
};

const DEFAULT_STATE = DEFAULT_SAMPLE_DATA;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_SAMPLE_DATA, DEFAULT_STATE };
}
if (typeof window !== 'undefined') {
  window.DEFAULT_SAMPLE_DATA = DEFAULT_SAMPLE_DATA;
  window.DEFAULT_STATE = DEFAULT_STATE;
}
