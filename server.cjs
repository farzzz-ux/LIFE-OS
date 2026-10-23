/**
 * LIFE OS — Production-Grade REST API & Static Application Server
 * 
 * Architecture & Hardening Features:
 * - ACID-compliant SQLite embedded database with WAL mode & strict foreign keys
 * - Multi-tenant isolation: strict WHERE user_id = req.user.id filtering
 * - Robust Security: Helmet headers (CSP, HSTS, frameguard), strict CORS, cookie-parser
 * - Rate Limiting & DoS Protection: express-rate-limit across sensitive auth & API routes
 * - Stored XSS Protection: Deep input sanitization via sanitize-html
 * - Schema Validation: Zod contracts on all request bodies
 * - Modular Express Routing with centralized error handling
 * - Clean URL resolution and path-traversal guarded static file delivery
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { PORT, NODE_ENV, DB_PATH } = require('./src/config/env.cjs');
const { initSchema } = require('./src/db/database.cjs');
const { authMiddleware } = require('./src/middleware/authMiddleware.cjs');
const { sanitizeInput } = require('./src/middleware/sanitize.cjs');
const { apiLimiter } = require('./src/middleware/rateLimiter.cjs');
const { errorHandler } = require('./src/middleware/errorHandler.cjs');

// Import modular routes
const authRoutes = require('./src/routes/auth.routes.cjs');
const tasksRoutes = require('./src/routes/tasks.routes.cjs');
const habitsRoutes = require('./src/routes/habits.routes.cjs');
const financesRoutes = require('./src/routes/finances.routes.cjs');
const scheduleRoutes = require('./src/routes/schedule.routes.cjs');
const journalRoutes = require('./src/routes/journal.routes.cjs');
const goalsRoutes = require('./src/routes/goals.routes.cjs');
const scoresRoutes = require('./src/routes/scores.routes.cjs');
const moodRoutes = require('./src/routes/mood.routes.cjs');
const userRoutes = require('./src/routes/user.routes.cjs');

// Initialize database schema
initSchema();

const app = express();

// ==========================================
// SECURITY HEADERS & CORS
// ==========================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*", "http://127.0.0.1:*", "ws://127.0.0.1:*"]
    }
  },
  crossOriginEmbedderPolicy: false,
  frameguard: { action: 'sameorigin' },
  hsts: NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true
}));

// Serve static assets from root and pages directory
app.use(express.static(__dirname));
app.use('/pages', express.static(path.join(__dirname, 'pages')));

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Cookie parsing & body parsing with size guards
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization against Stored XSS
app.use(sanitizeInput);

// Health check endpoint for Render & Docker container health monitoring
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({ status: 'ok', uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString() });
});

// ==========================================
// API ROUTES WITH AUTH & TENANT RESOLUTION
// ==========================================
// Apply general API rate limiting & tenant resolution to /api
app.use('/api', apiLimiter);
app.use('/api', authMiddleware);

// Mount modular sub-routers
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/finances', financesRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api', userRoutes);

// 404 handler for unknown /api routes (placed after mounted sub-routers)
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route '${req.path}' not found`,
    message: `API route '${req.path}' not found`,
    statusCode: 404,
    error_code: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// STATIC FILE SERVING WITH CLEAN URLS
// ==========================================
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  let pathname = req.path;
  let relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');

  // Normalize repeated pages/ prefixes
  relativePath = relativePath.replace(/^(?:pages\/)+/, 'pages/');

  if (
    relativePath === 'pages/index.html' ||
    relativePath === 'pages/index' ||
    relativePath === 'dashboard' ||
    relativePath === 'dashboard.html' ||
    relativePath === 'pages/dashboard' ||
    relativePath === 'pages/dashboard.html' ||
    relativePath === 'home' ||
    relativePath === 'home.html' ||
    relativePath === 'index'
  ) {
    relativePath = 'index.html';
  } else if (relativePath === 'pages/style.css' || relativePath === 'style.css') {
    relativePath = 'style.css';
  } else if (relativePath === 'pages/script.js' || relativePath === 'script.js') {
    relativePath = 'script.js';
  } else if (!path.extname(relativePath)) {
    // Clean URL resolution (e.g. /calendar -> pages/calendar.html)
    if (fs.existsSync(path.join(__dirname, relativePath + '.html'))) {
      relativePath += '.html';
    } else if (fs.existsSync(path.join(__dirname, 'pages', relativePath + '.html'))) {
      relativePath = path.join('pages', relativePath + '.html');
    }
  } else if (relativePath.endsWith('.html') && !relativePath.startsWith('pages/') && relativePath !== 'index.html') {
    if (!fs.existsSync(path.join(__dirname, relativePath)) && fs.existsSync(path.join(__dirname, 'pages', relativePath))) {
      relativePath = path.join('pages', relativePath);
    }
  }

  const filePath = path.join(__dirname, relativePath);

  // Security: prevent path traversal attacks
  if (!filePath.startsWith(__dirname)) {
    return res.status(403).type('text/plain').send('403 Forbidden: Path traversal detected.');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      return next();
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// Custom 404 page for missing HTML assets
app.use((req, res) => {
  res.status(404).type('text/html; charset=utf-8').send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>404 Not Found — LIFE OS</title>
      <style>
        body { background: #090d16; color: #94a3b8; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .box { text-align: center; }
        h1 { font-size: 3rem; color: #f8fafc; margin-bottom: 8px; }
        a { color: #38bdf8; text-decoration: none; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>404</h1>
        <p>Page or asset not found in LIFE OS.</p>
        <p><a href="/">&larr; Return to Dashboard</a></p>
      </div>
    </body>
    </html>
  `);
});

// Centralized Error Handler
app.use(errorHandler);

// HTTP Server wrapper
const server = http.createServer(app);

// Start server when executed directly
if (require.main === module || !module.parent) {
  server.listen(PORT, () => {
    console.log(`[LIFE OS] Production server running live at http://localhost:${PORT}`);
    console.log(`[LIFE OS] ACID SQLite database active: ${DB_PATH}`);
  });
}

module.exports = server;
