/**
 * LIFE OS — Calendar & Schedule Routes
 * Multi-user tenant isolated event and time-block management.
 */

const express = require('express');
const { CalendarRepository } = require('../db/repository.cjs');
const { validateRequest, scheduleCreateSchema } = require('../middleware/validateRequest.cjs');

const router = express.Router();

/**
 * GET /api/schedule
 */
router.get('/', (req, res, next) => {
  try {
    const events = CalendarRepository.getAll(req.user.id);
    return res.status(200).json(events);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/schedule
 */
router.post('/', validateRequest(scheduleCreateSchema), (req, res, next) => {
  try {
    const newEvent = CalendarRepository.create(req.user.id, req.body);
    return res.status(201).json(newEvent);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/schedule/:id
 */
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = CalendarRepository.update(req.user.id, id, req.body);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Schedule event with ID '${id}' not found`,
        message: `Schedule event with ID '${id}' not found`,
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
 * DELETE /api/schedule/:id
 */
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = CalendarRepository.delete(req.user.id, id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Schedule event with ID '${id}' not found`,
        message: `Schedule event with ID '${id}' not found`,
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
