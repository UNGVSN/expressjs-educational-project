/**
 * Example 04: Production Error Handling
 *
 * Demonstrates production-ready error handling:
 * - Development vs production modes
 * - Hiding sensitive information
 * - Operational vs programming errors
 * - Content negotiation
 * - Logging strategies
 */

'use strict';

const createApp = require('../lib/index');
const {
  asyncHandler,
  errorLogger,
  developmentErrorHandler,
  productionErrorHandler,
  contentNegotiationErrorHandler,
  validationErrorHandler,
  rateLimitErrorHandler,
  notFoundHandler,
  NotFoundError,
  ValidationError,
  RateLimitError,
  InternalError
} = require('../lib/index');

// Set environment (change to 'production' to see difference)
const env = process.env.NODE_ENV || 'development';
console.log(`Running in ${env} mode`);

const app = createApp();
app.set('env', env);

// ============================================
// Application Routes
// ============================================

/**
 * Successful route
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Production Error Handling Demo',
    environment: env
  });
});

/**
 * Operational error - expected, safe to show to client
 */
app.get('/operational', (req, res) => {
  throw new NotFoundError('This resource does not exist');
});

/**
 * Programming error - unexpected, hide from client
 */
app.get('/programming', (req, res) => {
  // Simulate a programming error (bug)
  const obj = null;
  return obj.property; // TypeError - programming error
});

/**
 * Database simulation error
 */
app.get('/db-error', asyncHandler(async (req, res) => {
  // Simulate database error with sensitive info
  const error = new Error('Connection to db://admin:secretpass@db.internal:5432/prod failed');
  error.code = 'ECONNREFUSED';
  throw error;
}));

/**
 * Validation error with details
 */
app.post('/register', (req, res) => {
  throw new ValidationError('Registration failed', [
    { field: 'email', message: 'Invalid email format' },
    { field: 'password', message: 'Password too weak' },
    { field: 'age', message: 'Must be 18 or older' }
  ]);
});

/**
 * Rate limit simulation
 */
let requestCount = 0;
app.get('/limited', (req, res) => {
  requestCount++;
  if (requestCount > 3) {
    throw new RateLimitError('Rate limit exceeded', 60);
  }
  res.json({ message: 'Request accepted', remaining: 3 - requestCount });
});

/**
 * Reset rate limit
 */
app.post('/reset', (req, res) => {
  requestCount = 0;
  res.json({ message: 'Rate limit reset' });
});

/**
 * Route that shows content negotiation
 * Try with: curl -H "Accept: text/html" localhost:3000/negotiated-error
 */
app.get('/negotiated-error', (req, res) => {
  const error = new Error('This error response format depends on Accept header');
  error.statusCode = 400;
  throw error;
});

/**
 * Simulate async failure
 */
app.get('/async-fail', asyncHandler(async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 100));
  throw new InternalError('Async operation failed unexpectedly');
}));

// ============================================
// Error Handling Pipeline
// ============================================

/**
 * 1. Not Found Handler - Catches unmatched routes
 * Must be BEFORE error handlers but AFTER all routes
 */
app.use(notFoundHandler());

/**
 * 2. Error Logger - Logs all errors
 * Use a custom logger in production (e.g., Winston, Pino)
 */
const customLogger = {
  error: (msg) => {
    // In production, send to logging service
    console.error(`[ERROR] ${msg}`);
  },
  warn: (msg) => {
    console.warn(`[WARN] ${msg}`);
  }
};

app.use(errorLogger({
  logger: customLogger,
  includeStack: env !== 'production'
}));

/**
 * 3. Specific Error Handlers
 */

// Handle validation errors specifically
app.use(validationErrorHandler());

// Handle rate limit errors with Retry-After header
app.use(rateLimitErrorHandler());

/**
 * 4. Environment-Specific Error Handler
 */
if (env === 'production') {
  // Production: Hide sensitive details
  app.use(productionErrorHandler());
} else {
  // Development: Show full details including stack
  // app.use(developmentErrorHandler());

  // Or use content negotiation (HTML for browser, JSON for API)
  app.use(contentNegotiationErrorHandler({
    showStack: true,
    htmlTemplate: ({ statusCode, message, stack }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Error ${statusCode}</title>
  <style>
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0;
      padding: 40px;
      min-height: 100vh;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .status-code {
      font-size: 6em;
      font-weight: bold;
      color: #e74c3c;
      opacity: 0.2;
      margin: 0;
      line-height: 1;
    }
    h1 {
      color: #e74c3c;
      margin: 20px 0 10px;
    }
    .message {
      font-size: 1.3em;
      color: #444;
      margin-bottom: 30px;
    }
    .env-badge {
      display: inline-block;
      background: #3498db;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 0.8em;
      margin-bottom: 20px;
    }
    pre {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.85em;
      line-height: 1.5;
    }
    a {
      color: #667eea;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      color: #888;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="status-code">${statusCode}</div>
    <span class="env-badge">Development Mode</span>
    <h1>Oops! Something went wrong</h1>
    <p class="message">${message}</p>
    ${stack ? `
      <h3>Stack Trace</h3>
      <pre>${stack}</pre>
    ` : ''}
    <div class="footer">
      <p><a href="/">← Back to Home</a></p>
      <p>This detailed error page is only shown in development mode.</p>
    </div>
  </div>
</body>
</html>
    `
  }));
}

/**
 * 5. Final Catch-All Handler
 * Should never be reached if above handlers work correctly
 */
app.use((err, req, res, next) => {
  console.error('CRITICAL: Error reached final handler:', err);

  if (!res.headersSent) {
    res.status(500).json({
      error: {
        message: 'A critical error occurred',
        statusCode: 500
      }
    });
  }
});

// ============================================
// Start Server
// ============================================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
===========================================
  Production Error Handling Demo
===========================================

Environment: ${env.toUpperCase()}
Server: http://localhost:${PORT}

Routes to try:
  - GET /                    → Success response
  - GET /operational         → Operational error (404)
  - GET /programming         → Programming error (hidden in prod)
  - GET /db-error            → Database error (hidden in prod)
  - POST /register           → Validation error (422)
  - GET /limited (4x)        → Rate limit (429)
  - POST /reset              → Reset rate limit
  - GET /async-fail          → Async error
  - GET /negotiated-error    → Content negotiation
  - GET /nonexistent         → 404 handler

Try with different Accept headers:
  curl -H "Accept: text/html" http://localhost:${PORT}/negotiated-error
  curl -H "Accept: application/json" http://localhost:${PORT}/negotiated-error

Run in production mode:
  NODE_ENV=production node examples/04-production.js

Press Ctrl+C to stop
===========================================
  `);
});

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  // In production, gracefully shutdown
  server.close(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
  // In production, gracefully shutdown
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nGraceful shutdown initiated...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
