/**
 * LIFE OS — Authentication Middleware
 * Supports JWT bearer tokens and cookie authentication.
 * Falls back to tenant 'default' for unauthenticated requests to preserve legacy compatibility.
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env.cjs');

/**
 * Authenticate incoming requests and attach req.user
 */
function authMiddleware(req, res, next) {
  let token = null;

  // 1. Check Authorization Bearer header
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader) {
    const parts = String(authHeader).trim().split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      token = parts[1];
    }
  }

  // 2. Check HTTP-only cookie if no header
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name
      };
      req.isAuthenticated = true;
      return next();
    } catch (err) {
      // If endpoint is a public/unauthenticated route (like login, register, health),
      // an expired or invalid token must NOT block access. Fall back to guest partition.
      const url = req.originalUrl || req.url || '';
      if (url.includes('/login') || url.includes('/register') || url.includes('/health')) {
        req.user = { id: 'default', email: 'guest@lifeos.local', name: 'Guest User' };
        req.isAuthenticated = false;
        return next();
      }
      // Invalid token supplied for an endpoint requiring valid authentication
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or expired token.',
        message: 'Unauthorized: Invalid or expired token.',
        error_code: 'INVALID_TOKEN',
        statusCode: 401,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 3. Fallback to default guest partition for unauthenticated callers
  req.user = {
    id: 'default',
    email: 'guest@lifeos.local',
    name: 'Guest User'
  };
  req.isAuthenticated = false;
  next();
}

/**
 * Strict authentication guard for endpoints requiring registered accounts
 */
function requireAuth(req, res, next) {
  if (!req.isAuthenticated || !req.user || req.user.id === 'default') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Valid authentication token required.',
      message: 'Unauthorized: Valid authentication token required.',
      error_code: 'UNAUTHORIZED',
      statusCode: 401,
      timestamp: new Date().toISOString()
    });
  }
  next();
}

module.exports = {
  authMiddleware,
  requireAuth
};
