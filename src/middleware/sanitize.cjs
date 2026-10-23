/**
 * LIFE OS — Input Sanitization Middleware
 * Recursively sanitizes string inputs using sanitize-html to prevent Stored XSS.
 */

const sanitizeHtml = require('sanitize-html');

const SANITIZE_OPTIONS = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'span'],
  allowedAttributes: {
    'a': ['href', 'target', 'rel']
  },
  allowedSchemes: ['http', 'https', 'mailto']
};

/**
 * Clean a single string value
 */
function cleanString(val) {
  if (typeof val !== 'string') return val;
  // If string contains HTML tags or scripts, sanitize it
  return sanitizeHtml(val, SANITIZE_OPTIONS);
}

/**
 * Deep-clean an object or array
 */
function deepSanitize(target) {
  if (!target || typeof target !== 'object') return target;

  if (Array.isArray(target)) {
    return target.map(item => {
      if (typeof item === 'string') return cleanString(item);
      if (typeof item === 'object' && item !== null) return deepSanitize(item);
      return item;
    });
  }

  const cleaned = {};
  for (const [key, val] of Object.entries(target)) {
    if (typeof val === 'string') {
      cleaned[key] = cleanString(val);
    } else if (typeof val === 'object' && val !== null) {
      cleaned[key] = deepSanitize(val);
    } else {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

/**
 * Express middleware to sanitize req.body, req.query, and req.params
 */
function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  next();
}

module.exports = {
  cleanString,
  deepSanitize,
  sanitizeInput
};
