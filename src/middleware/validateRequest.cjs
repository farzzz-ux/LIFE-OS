/**
 * LIFE OS — Request Validation Middleware using Zod
 * Enforces strict schemas and returns standardized validation errors.
 */

const { z } = require('zod');

// Schema for User Registration
const registerSchema = z.object({
  email: z.string({ required_error: "A valid 'email' is required." })
    .trim()
    .email("Validation failed: A valid 'email' is required."),
  password: z.string({ required_error: "'password' is required." })
    .min(6, "Validation failed: 'password' must be at least 6 characters."),
  name: z.string().optional(),
  initialData: z.record(z.any()).optional()
});

// Schema for User Login
const loginSchema = z.object({
  email: z.string().trim().min(1, "Validation failed: 'email' and 'password' are required."),
  password: z.string().min(1, "Validation failed: 'email' and 'password' are required.")
});

// Schema for Task Creation
const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "Validation failed: 'title' is required and must be a non-empty string."),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  category: z.string().optional().default('Work'),
  dueDate: z.string().optional().default('Today'),
  completed: z.boolean().optional().default(false),
  completedAt: z.string().nullable().optional()
});

// Schema for Task Update
const taskUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  category: z.string().optional(),
  dueDate: z.string().optional(),
  completed: z.boolean().optional(),
  completedAt: z.string().nullable().optional()
});

// Schema for Habit Creation
const habitCreateSchema = z.object({
  name: z.string().trim().min(1, "Validation failed: 'name' is required."),
  category: z.string().optional().default('Health'),
  routine: z.string().optional().default('Morning'),
  motivation: z.string().optional().default(''),
  color: z.string().optional().default('emerald'),
  completedDates: z.array(z.string()).optional().default([])
});

// Schema for Habit Update
const habitUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  category: z.string().optional(),
  routine: z.string().optional(),
  motivation: z.string().optional(),
  color: z.string().optional(),
  completedDates: z.array(z.string()).optional()
});

// Schema for Finance Creation
const financeCreateSchema = z.object({
  description: z.string().trim().min(1, "Validation failed: 'description' is required."),
  amount: z.coerce.number().positive("Validation failed: 'amount' must be a positive number."),
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: "Validation failed: 'type' must be 'income' or 'expense'." })
  }),
  category: z.string().optional().default('General'),
  paymentMethod: z.string().optional().default('UPI'),
  date: z.string().optional()
});

// Schema for Calendar / Schedule Creation
const scheduleCreateSchema = z.object({
  title: z.string().trim().min(1, "Validation failed: 'title' is required."),
  date: z.string().optional(),
  hour: z.coerce.number().optional(),
  startHour: z.coerce.number().optional(),
  duration: z.coerce.number().optional(),
  durationHours: z.coerce.number().optional(),
  category: z.string().optional().default('Work'),
  recurrence: z.enum(['once', 'everyday', 'selected_days']).optional().default('once'),
  repeatDays: z.array(z.any()).optional().default([]),
  completed: z.boolean().optional().default(false),
  completedDates: z.array(z.string()).optional().default([])
});

// Schema for Journal Creation
const journalCreateSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Validation failed: 'title' is required."),
  category: z.string().optional().default('Reflection'),
  content: z.string().optional().default(''),
  date: z.string().optional()
});

// Schema for Mood Creation
const moodCreateSchema = z.object({
  score: z.coerce.number().int().min(1, "Validation failed: 'score' must be an integer between 1 and 5.").max(5, "Validation failed: 'score' must be an integer between 1 and 5."),
  energy: z.coerce.number().optional().default(3),
  note: z.string().optional().default(''),
  date: z.string().optional()
});

// Schema for Goal Creation
const goalCreateSchema = z.object({
  title: z.string().trim().min(1, "Validation failed: 'title' is required and must be a non-empty string."),
  category: z.string().optional().default('Career'),
  targetDate: z.string().optional(),
  progress: z.coerce.number().min(0).max(100).optional().default(0),
  status: z.enum(['in-progress', 'completed', 'paused']).optional().default('in-progress'),
  metrics: z.string().optional().default(''),
  description: z.string().optional().default(''),
  milestones: z.array(z.any()).optional().default([])
});

// Schema for LifeScore Snapshot Creation
const snapshotCreateSchema = z.object({
  periodKey: z.string({ required_error: "Validation failed: 'periodKey' is required (e.g. '2026-W41' or '2026-10')." })
    .trim().min(1, "Validation failed: 'periodKey' is required (e.g. '2026-W41' or '2026-10')."),
  scores: z.record(z.any(), { required_error: "Validation failed: 'scores' object is required." }),
  periodType: z.string().optional().default('week'),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  formulaVersion: z.string().optional().default('2.0-5pillar'),
  isBaseline: z.boolean().optional().default(false)
});

/**
 * Middleware factory for validating request bodies
 */
function validateRequest(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      const message = issue.message.startsWith('Validation failed:')
        ? issue.message
        : `Validation failed: ${issue.message}`;

      return res.status(400).json({
        success: false,
        error: message,
        message: message,
        error_code: 'VALIDATION_ERROR',
        details: result.error.issues,
        statusCode: 400,
        timestamp: new Date().toISOString()
      });
    }

    req.validatedBody = result.data;
    next();
  };
}

module.exports = {
  validateRequest,
  registerSchema,
  loginSchema,
  taskCreateSchema,
  taskUpdateSchema,
  habitCreateSchema,
  habitUpdateSchema,
  financeCreateSchema,
  scheduleCreateSchema,
  journalCreateSchema,
  moodCreateSchema,
  goalCreateSchema,
  snapshotCreateSchema
};
