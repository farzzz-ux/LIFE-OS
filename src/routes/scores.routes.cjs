/**
 * LIFE OS — LifeScore Snapshots Routes
 * Multi-user tenant isolated analytics snapshots and historical deduplication.
 */

const express = require('express');
const { LifeScoreRepository } = require('../db/repository.cjs');
const { validateRequest, snapshotCreateSchema } = require('../middleware/validateRequest.cjs');

const router = express.Router();

/**
 * GET /api/scores/snapshots
 */
router.get('/snapshots', async (req, res, next) => {
  try {
    const { periodType } = req.query;
    const snapshots = await LifeScoreRepository.getAll(req.user.id, periodType);
    return res.status(200).json(snapshots);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/scores/snapshots
 */
router.post('/snapshots', validateRequest(snapshotCreateSchema), async (req, res, next) => {
  try {
    const result = await LifeScoreRepository.create(req.user.id, req.body);
    if (result.duplicate) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        snapshot: result.snapshot
      });
    }
    return res.status(201).json({
      success: true,
      snapshot: result.snapshot
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
