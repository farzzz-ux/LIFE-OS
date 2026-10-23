/**
 * LIFE OS — Habits Routes
 * Multi-user tenant isolated habits management.
 */

const express = require('express');
const { HabitRepository } = require('../db/repository.cjs');
const { validateRequest, habitCreateSchema } = require('../middleware/validateRequest.cjs');

const router = express.Router();

/**
 * GET /api/habits
 */
router.get('/', (req, res, next) => {
  try {
    const habits = HabitRepository.getAll(req.user.id);
    return res.status(200).json(habits);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/habits
 */
router.post('/', validateRequest(habitCreateSchema), (req, res, next) => {
  try {
    const newHabit = HabitRepository.create(req.user.id, req.body);
    return res.status(201).json(newHabit);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/habits/:id
 */
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = HabitRepository.update(req.user.id, id, req.body);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Habit with ID '${id}' not found`,
        message: `Habit with ID '${id}' not found`,
        error_code: 'NOT_FOUND',
        statusCode: 404
      });
    }
    return res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/habits/:id/toggle
 */
router.post('/:id/toggle', (req, res, next) => {
  try {
    const { id } = req.params;
    const dateStr = req.body.date || new Date().toISOString().split('T')[0];
    const updated = HabitRepository.toggle(req.user.id, id, dateStr);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Habit with ID '${id}' not found`,
        message: `Habit with ID '${id}' not found`,
        error_code: 'NOT_FOUND',
        statusCode: 404
      });
    }
    return res.status(200).json({ success: true, habit: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/habits/:id
 */
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = HabitRepository.delete(req.user.id, id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Habit with ID '${id}' not found`,
        message: `Habit with ID '${id}' not found`,
        error_code: 'NOT_FOUND',
        statusCode: 404
      });
    }
    return res.status(200).json({ success: true, id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
