/**
 * LIFE OS — Goals Routes
 * Multi-user tenant isolated OKRs and long-term targets.
 */

const express = require('express');
const { GoalRepository } = require('../db/repository.cjs');
const { validateRequest, goalCreateSchema } = require('../middleware/validateRequest.cjs');

const router = express.Router();

/**
 * GET /api/goals
 */
router.get('/', (req, res, next) => {
  try {
    const { status, category } = req.query;
    const goals = GoalRepository.getAll(req.user.id, { status, category });
    return res.status(200).json(goals);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/goals
 */
router.post('/', validateRequest(goalCreateSchema), (req, res, next) => {
  try {
    const newGoal = GoalRepository.create(req.user.id, req.body);
    return res.status(201).json(newGoal);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/goals/:id
 */
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = GoalRepository.update(req.user.id, id, req.body);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Goal with ID '${id}' not found`,
        message: `Goal with ID '${id}' not found`,
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
 * DELETE /api/goals/:id
 */
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = GoalRepository.delete(req.user.id, id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Goal with ID '${id}' not found`,
        message: `Goal with ID '${id}' not found`,
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
