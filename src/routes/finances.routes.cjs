/**
 * LIFE OS — Financial Records Routes
 * Multi-user tenant isolated finance and transaction management.
 */

const express = require('express');
const { FinanceRepository } = require('../db/repository.cjs');
const { validateRequest, financeCreateSchema } = require('../middleware/validateRequest.cjs');

const router = express.Router();

/**
 * GET /api/finances
 */
router.get('/', (req, res, next) => {
  try {
    const transactions = FinanceRepository.getAll(req.user.id);
    return res.status(200).json(transactions);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/finances
 */
router.post('/', validateRequest(financeCreateSchema), (req, res, next) => {
  try {
    const newTx = FinanceRepository.create(req.user.id, req.body);
    return res.status(201).json(newTx);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/finances/:id
 */
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = FinanceRepository.delete(req.user.id, id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Transaction with ID '${id}' not found`,
        message: `Transaction with ID '${id}' not found`,
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
