/**
 * LIFE OS — Tasks Routes
 * Multi-user tenant isolated CRUD endpoints.
 */

const express = require('express');
const { TaskRepository } = require('../db/repository.cjs');
const { validateRequest, taskCreateSchema } = require('../middleware/validateRequest.cjs');

const router = express.Router();

/**
 * GET /api/tasks
 */
router.get('/', async (req, res, next) => {
  try {
    const priority = req.query.priority;
    let completed = null;
    if (req.query.completed !== undefined) {
      completed = req.query.completed === 'true' || req.query.completed === '1';
    }

    const tasks = await TaskRepository.getAll(req.user.id, { priority, completed });
    return res.status(200).json(tasks);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks
 */
router.post('/', validateRequest(taskCreateSchema), async (req, res, next) => {
  try {
    const newTask = await TaskRepository.create(req.user.id, req.body);
    return res.status(201).json(newTask);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/tasks/:id
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await TaskRepository.update(req.user.id, id, req.body);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Task with ID '${id}' not found`,
        message: `Task with ID '${id}' not found`,
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
 * DELETE /api/tasks/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await TaskRepository.delete(req.user.id, id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Task with ID '${id}' not found`,
        message: `Task with ID '${id}' not found`,
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
