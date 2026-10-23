/**
 * LIFE OS — Mood Logs Routes
 * Multi-user tenant isolated mood tracking.
 */

const express = require('express');
const { MoodRepository } = require('../db/repository.cjs');
const { validateRequest, moodCreateSchema } = require('../middleware/validateRequest.cjs');

const router = express.Router();

/**
 * GET /api/mood
 */
router.get('/', (req, res, next) => {
  try {
    const moods = MoodRepository.getAll(req.user.id);
    return res.status(200).json(moods);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/mood
 */
router.post('/', validateRequest(moodCreateSchema), (req, res, next) => {
  try {
    const newMood = MoodRepository.upsert(req.user.id, req.body);
    return res.status(201).json(newMood);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
