/**
 * LIFE OS — Authentication Routes
 * Handles user registration, login, logout, and current user retrieval.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { UserRepository, UserDataRepository } = require('../db/repository.cjs');
const { JWT_SECRET } = require('../config/env.cjs');
const { authLimiter } = require('../middleware/rateLimiter.cjs');
const { validateRequest, registerSchema, loginSchema } = require('../middleware/validateRequest.cjs');
const { requireAuth } = require('../middleware/authMiddleware.cjs');

const router = express.Router();

/**
 * POST /api/auth/register
 */
router.post('/register', authLimiter, validateRequest(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name, initialData } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    const existing = UserRepository.findByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists.',
        message: 'User with this email already exists.',
        error_code: 'USER_ALREADY_EXISTS',
        statusCode: 409
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = 'u_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const newUser = UserRepository.create({
      id: userId,
      email: cleanEmail,
      name: (name || cleanEmail.split('@')[0]).trim(),
      passwordHash,
      createdAt: new Date().toISOString()
    });

    if (initialData && typeof initialData === 'object') {
      UserDataRepository.savePartition(userId, initialData);
    }

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set secure HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', authLimiter, validateRequest(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    const user = UserRepository.findByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
        message: 'Invalid email or password.',
        error_code: 'INVALID_CREDENTIALS',
        statusCode: 401
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
        message: 'Invalid email or password.',
        error_code: 'INVALID_CREDENTIALS',
        statusCode: 401
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set secure HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, (req, res, next) => {
  try {
    const user = UserRepository.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User account not found.',
        message: 'User account not found.',
        error_code: 'NOT_FOUND',
        statusCode: 404
      });
    }
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
});

/**
 * POST /api/auth/reset-password
 */
router.post('/reset-password', authLimiter, (req, res) => {
  // Safe mock endpoint for password reset initiation
  return res.status(200).json({
    success: true,
    message: 'If the provided account exists, instructions have been dispatched.'
  });
});

module.exports = router;
