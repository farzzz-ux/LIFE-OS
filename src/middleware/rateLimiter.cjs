/**
 * LIFE OS — Rate Limiting & DoS Protection Middleware
 * Protects sensitive authentication endpoints and general API surface.
 */

const rateLimit = require('express-rate-limit');
const { AUTH_RATE_LIMIT_MAX, API_RATE_LIMIT_MAX, NODE_ENV } = require('../config/env.cjs');

// Sensitive auth limiter (login, register, reset-password)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'test' ? 1000 : AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    error_code: 'RATE_LIMIT_EXCEEDED',
    statusCode: 429
  }
});

// General API rate limiter for DoS protection
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'test' ? 5000 : API_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many API requests from this IP. Please try again later.',
    message: 'Too many API requests from this IP. Please try again later.',
    error_code: 'RATE_LIMIT_EXCEEDED',
    statusCode: 429
  }
});

module.exports = {
  authLimiter,
  apiLimiter
};
