/**
 * LIFE OS — Centralized Error Handling Middleware
 * Provides standardized JSON error responses across all routes.
 */

function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : (err.statusCode || 500);
  const errorCode = err.code || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_SERVER_ERROR');
  const message = err.message || 'An unexpected internal error occurred.';

  // Log server errors for diagnostics
  if (statusCode >= 500) {
    console.error(`[Server Error] [${req.method} ${req.url}]:`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: message,
    error_code: errorCode,
    statusCode,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  errorHandler
};
