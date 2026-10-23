/**
 * LIFE OS — User Data & System Routes
 * Handles full state synchronization, partitions, health checks, and demo resets.
 */

const express = require('express');
const { db } = require('../db/database.cjs');
const { UserDataRepository } = require('../db/repository.cjs');
const { requireAuth } = require('../middleware/authMiddleware.cjs');

const router = express.Router();

/**
 * GET /api/health
 */
router.get('/health', (req, res) => {
  let taskCount = 0;
  let userCount = 0;
  try {
    taskCount = db.prepare('SELECT count(*) as c FROM tasks').get().c;
    userCount = db.prepare('SELECT count(*) as c FROM users').get().c;
  } catch (e) {}

  return res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: {
      type: 'sqlite3-wal',
      users: userCount,
      tasks: taskCount,
      records: taskCount + userCount
    }
  });
});

/**
 * GET /api/user/data (Authenticated tenant partition)
 */
router.get('/user/data', requireAuth, (req, res, next) => {
  try {
    const partition = UserDataRepository.getPartition(req.user.id);
    return res.status(200).json(partition);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/user/data (Authenticated tenant partition update)
 */
router.post('/user/data', requireAuth, (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data payload: Expected JSON object.',
        message: 'Invalid data payload: Expected JSON object.',
        error_code: 'INVALID_PAYLOAD',
        statusCode: 400
      });
    }

    const updated = UserDataRepository.savePartition(req.user.id, req.body);
    return res.status(200).json({
      success: true,
      state: updated,
      updatedAt: updated.updatedAt
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/data (Full state fetch for current tenant or guest)
 */
router.get('/data', (req, res, next) => {
  try {
    const partition = UserDataRepository.getPartition(req.user.id);
    return res.status(200).json(partition);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sync (State synchronization)
 */
router.post('/sync', (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid state payload: Expected JSON object',
        message: 'Invalid state payload: Expected JSON object',
        error_code: 'INVALID_PAYLOAD',
        statusCode: 400
      });
    }

    const updated = UserDataRepository.savePartition(req.user.id, req.body);
    return res.status(200).json({
      success: true,
      state: updated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reset (Reset state to demo/initial)
 */
router.post('/reset', (req, res, next) => {
  try {
    const resetData = UserDataRepository.reset(req.user.id);
    return res.status(200).json({
      success: true,
      state: resetData
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
