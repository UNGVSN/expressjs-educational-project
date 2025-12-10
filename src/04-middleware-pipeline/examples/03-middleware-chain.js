/**
 * Example 03: Middleware Chain
 *
 * Demonstrates building complex middleware chains
 * for request processing pipelines.
 *
 * Run: npm run example:chain
 */

'use strict';

const createApp = require('../lib');

const app = createApp();

// ============================================
// MIDDLEWARE FACTORY FUNCTIONS
// These return middleware functions, allowing configuration
// ============================================

/**
 * Logger middleware factory
 * Returns a middleware that logs requests with a prefix
 */
function logger(prefix = '') {
  return function loggerMiddleware(req, res, next) {
    const timestamp = new Date().toISOString();
    console.log(`${prefix}[${timestamp}] ${req.method} ${req.url}`);
    next();
  };
}

/**
 * Request timer middleware
 * Adds start time and calculates duration
 */
function timer() {
  return function timerMiddleware(req, res, next) {
    req.startTime = process.hrtime.bigint();

    // Capture original end
    const originalEnd = res.end;
    res.end = function(...args) {
      const duration = Number(process.hrtime.bigint() - req.startTime) / 1e6;
      res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
      originalEnd.apply(this, args);
    };

    next();
  };
}

/**
 * Request ID middleware
 * Assigns unique ID to each request
 */
function requestId() {
  let counter = 0;

  return function requestIdMiddleware(req, res, next) {
    req.id = `req-${++counter}-${Date.now().toString(36)}`;
    res.setHeader('X-Request-ID', req.id);
    next();
  };
}

/**
 * Auth middleware factory
 * Checks for authorization header
 */
function requireAuth(options = {}) {
  const { realm = 'Protected' } = options;

  return function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;

    if (!auth) {
      res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
      res.status(401).json({
        error: 'Authentication required',
        hint: 'Add Authorization header'
      });
      return;
    }

    // For demo: accept any auth header
    req.authenticated = true;
    req.authHeader = auth;
    next();
  };
}

/**
 * Rate limiter middleware factory (simplified)
 */
function rateLimit(options = {}) {
  const {
    windowMs = 60000,
    max = 10
  } = options;

  const requests = new Map();

  return function rateLimitMiddleware(req, res, next) {
    const key = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Clean old entries
    const windowStart = now - windowMs;
    const userRequests = (requests.get(key) || []).filter(t => t > windowStart);

    if (userRequests.length >= max) {
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000)
      });
    }

    userRequests.push(now);
    requests.set(key, userRequests);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - userRequests.length);

    next();
  };
}

/**
 * Content-Type validator
 */
function requireJson() {
  return function jsonMiddleware(req, res, next) {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type'] || '';
      if (!contentType.includes('application/json')) {
        return res.status(415).json({
          error: 'Unsupported Media Type',
          expected: 'application/json'
        });
      }
    }
    next();
  };
}

// ============================================
// BUILDING THE MIDDLEWARE CHAIN
// ============================================

// Global middleware (runs for ALL requests)
app.use(requestId());
app.use(timer());
app.use(logger('📝 '));

// Home page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Middleware Chains</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    .chain { background: #e3f2fd; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2196F3; }
    .endpoint { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 8px; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Middleware Chains</h1>
  <p>Request ID: <code>${req.id}</code></p>

  <div class="chain">
    <h3>Global Middleware Chain</h3>
    <p>These run for EVERY request:</p>
    <ol>
      <li><strong>requestId()</strong> - Assigns unique ID</li>
      <li><strong>timer()</strong> - Measures response time</li>
      <li><strong>logger()</strong> - Logs to console</li>
    </ol>
  </div>

  <h2>Try These Endpoints</h2>

  <div class="endpoint">
    <h3>Public API - <a href="/api/public">/api/public</a></h3>
    <p>Has rate limiting but no auth required</p>
    <p>Chain: requestId → timer → logger → rateLimit → handler</p>
  </div>

  <div class="endpoint">
    <h3>Protected API - <a href="/api/protected">/api/protected</a></h3>
    <p>Requires authentication</p>
    <p>Chain: requestId → timer → logger → requireAuth → handler</p>
    <pre>curl -H "Authorization: Bearer token123" http://localhost:3000/api/protected</pre>
  </div>

  <div class="endpoint">
    <h3>Admin API - <a href="/api/admin/users">/api/admin/users</a></h3>
    <p>Full chain: rateLimit + auth + JSON validation</p>
  </div>
</body>
</html>
  `);
});

// ============================================
// API ROUTES WITH DIFFERENT MIDDLEWARE CHAINS
// ============================================

// Public API - rate limited
app.use('/api/public', rateLimit({ max: 5, windowMs: 30000 }));

app.get('/api/public', (req, res) => {
  res.json({
    message: 'Public API',
    requestId: req.id,
    rateLimit: {
      limit: res.getHeader('X-RateLimit-Limit'),
      remaining: res.getHeader('X-RateLimit-Remaining')
    }
  });
});

// Protected API - requires auth
app.use('/api/protected', requireAuth({ realm: 'API' }));

app.get('/api/protected', (req, res) => {
  res.json({
    message: 'Protected API - You are authenticated!',
    requestId: req.id,
    authHeader: req.authHeader
  });
});

// Admin API - full chain
app.use('/api/admin',
  rateLimit({ max: 3, windowMs: 60000 }),
  requireAuth({ realm: 'Admin' }),
  requireJson()
);

app.get('/api/admin/users', (req, res) => {
  res.json({
    message: 'Admin API',
    requestId: req.id,
    users: [
      { id: 1, name: 'Admin' },
      { id: 2, name: 'User' }
    ]
  });
});

// ============================================
// CHAIN INSPECTION ENDPOINT
// ============================================

app.get('/api/chain-info', (req, res) => {
  res.json({
    requestId: req.id,
    middlewareApplied: [
      'requestId()',
      'timer()',
      'logger()'
    ],
    responseHeaders: {
      'X-Request-ID': res.getHeader('X-Request-ID'),
      'X-Response-Time': 'Set on response end'
    }
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Middleware Chain Example                                 ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Endpoints:                                                      ║
║   /               - Home page                                     ║
║   /api/public     - Rate limited                                  ║
║   /api/protected  - Requires auth                                 ║
║   /api/admin/*    - Full chain (rate + auth + json)               ║
║                                                                   ║
║   Watch the console for middleware logs!                          ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
