/**
 * LIFE OS — Journal Routes
 * Multi-user tenant isolated reflections and journaling.
 */

const express = require('express');
const { JournalRepository } = require('../db/repository.cjs');
const { validateRequest, journalCreateSchema } = require('../middleware/validateRequest.cjs');

const router = express.Router();

/**
 * GET /api/journal
 */
router.get('/', (req, res, next) => {
  try {
    const entries = JournalRepository.getAll(req.user.id);
    return res.status(200).json({
      success: true,
      entries
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/journal
 */
router.post('/', validateRequest(journalCreateSchema), (req, res, next) => {
  try {
    const newEntry = JournalRepository.create(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      entry: newEntry,
      id: newEntry.id,
      ...newEntry
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/journal/:id
 */
router.put('/:id', validateRequest(journalCreateSchema), (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = JournalRepository.create(req.user.id, { ...req.body, id });
    return res.status(200).json({
      success: true,
      entry: updated,
      id,
      ...updated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/journal/:id
 */
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = JournalRepository.delete(req.user.id, id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Journal entry with ID '${id}' not found`,
        message: `Journal entry with ID '${id}' not found`,
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
