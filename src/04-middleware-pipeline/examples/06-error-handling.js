/**
 * Example 06: Error Handling Middleware
 *
 * Demonstrates error handling in the middleware pipeline,
 * including catching errors and custom error handlers.
 *
 * Run: npm run example:error
 */

'use strict';

const createApp = require('../lib');

const app = createApp();

// ============================================
// CUSTOM ERROR CLASSES
// ============================================

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;
    this.isOperational = true;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 400);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

// ============================================
// ROUTES THAT DEMONSTRATE ERRORS
// ============================================

// Home page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Error Handling Middleware</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    .section { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 8px; }
    .error { background: #ffebee; border-left: 4px solid #f44336; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Error Handling Middleware</h1>

  <div class="section">
    <h3>How Error Handling Works</h3>
    <pre><code>// Error handling middleware has 4 parameters
app.use((err, req, res, next) => {
  // Handle the error
  res.status(err.status || 500).json({
    error: err.message
  });
});</code></pre>
    <p>Express recognizes error handlers by the <strong>4 parameters</strong>.</p>
  </div>

  <div class="section">
    <h3>Ways to Trigger Errors</h3>
    <ol>
      <li><code>next(err)</code> - Pass error to next</li>
      <li><code>throw err</code> - Throw synchronously</li>
      <li>Async errors need special handling</li>
    </ol>
  </div>

  <h2>Test Endpoints</h2>

  <div class="section error">
    <h3>Error Types</h3>
    <ul>
      <li><a href="/error/not-found">/error/not-found</a> - 404 Not Found</li>
      <li><a href="/error/validation">/error/validation</a> - 400 Validation Error</li>
      <li><a href="/error/unauthorized">/error/unauthorized</a> - 401 Unauthorized</li>
      <li><a href="/error/server">/error/server</a> - 500 Server Error</li>
      <li><a href="/error/throw">/error/throw</a> - Thrown Error</li>
      <li><a href="/error/async">/error/async</a> - Async Error</li>
    </ul>
  </div>

  <div class="section">
    <h3>Recovery Example</h3>
    <p><a href="/error/recover">/error/recover</a> - Error handler recovers and continues</p>
  </div>
</body>
</html>
  `);
});

// Success endpoint for comparison
app.get('/success', (req, res) => {
  res.json({ message: 'Everything is fine!' });
});

// 404 Not Found Error
app.get('/error/not-found', (req, res, next) => {
  next(new NotFoundError('The requested resource does not exist'));
});

// Validation Error
app.get('/error/validation', (req, res, next) => {
  const error = new ValidationError('Invalid input data', [
    { field: 'email', message: 'Invalid email format' },
    { field: 'age', message: 'Must be a positive number' }
  ]);
  next(error);
});

// Unauthorized Error
app.get('/error/unauthorized', (req, res, next) => {
  next(new UnauthorizedError('You must be logged in'));
});

// Generic Server Error
app.get('/error/server', (req, res, next) => {
  next(new AppError('Something went wrong on the server', 500));
});

// Thrown Error (synchronous)
app.get('/error/throw', (req, res, next) => {
  // Synchronously thrown errors are caught by the middleware
  throw new Error('This error was thrown synchronously');
});

// Async Error - demonstrates that async errors need handling
app.get('/error/async', (req, res, next) => {
  // Simulating async operation
  setTimeout(() => {
    // In real async code, you MUST call next(err)
    // throw new Error() here would crash the server!
    next(new AppError('Error in async operation', 500));
  }, 100);
});

// Promise-based async (would need wrapper in real Express)
app.get('/error/promise', (req, res, next) => {
  Promise.reject(new Error('Promise rejection'))
    .catch(next); // Must explicitly catch and pass to next
});

// ============================================
// ERROR RECOVERY DEMONSTRATION
// ============================================

// First error handler - tries to recover
app.use('/error/recover', (err, req, res, next) => {
  console.log('First error handler: attempting recovery');

  // Check if we can recover
  if (err.isOperational) {
    // Recover from operational error
    req.recovered = true;
    req.originalError = err.message;
    next(); // Continue without error - recovered!
  } else {
    // Can't recover, pass to final handler
    next(err);
  }
});

// Recovery endpoint handler
app.get('/error/recover', (req, res, next) => {
  // Trigger an operational error
  next(new AppError('Recoverable error', 400));
});

// After recovery, this runs
app.use('/error/recover', (req, res, next) => {
  if (req.recovered) {
    res.json({
      message: 'Recovered from error!',
      originalError: req.originalError,
      recovered: true
    });
  } else {
    next();
  }
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

/**
 * Log errors (but don't respond)
 */
app.use((err, req, res, next) => {
  console.error('\n[ERROR LOGGED]');
  console.error(`Path: ${req.method} ${req.url}`);
  console.error(`Message: ${err.message}`);
  console.error(`Status: ${err.status || 500}`);

  // Pass to next error handler
  next(err);
});

/**
 * Handle Validation Errors specifically
 */
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.errors
    });
  }
  next(err);
});

/**
 * Handle Unauthorized Errors
 */
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    res.setHeader('WWW-Authenticate', 'Bearer');
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.message
    });
  }
  next(err);
});

/**
 * Final Error Handler - catches all errors
 */
app.use((err, req, res, next) => {
  // Default to 500 if no status set
  const status = err.status || err.statusCode || 500;
  const isDev = process.env.NODE_ENV !== 'production';

  const response = {
    error: status >= 500 ? 'Internal Server Error' : err.name || 'Error',
    message: err.message,
    status: status
  };

  // Include stack trace in development
  if (isDev && status >= 500) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
});

// ============================================
// 404 HANDLER (for unmatched routes)
// ============================================

// This must come AFTER all routes but BEFORE error handlers?
// Actually no - Express handles this differently
// For our implementation, we handle it in the default handler

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Error Handling Middleware Example                        ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Error Endpoints:                                                ║
║   /error/not-found     - 404 error                                ║
║   /error/validation    - 400 validation error                     ║
║   /error/unauthorized  - 401 auth error                           ║
║   /error/server        - 500 server error                         ║
║   /error/throw         - Thrown error                             ║
║   /error/async         - Async error                              ║
║   /error/recover       - Error recovery                           ║
║                                                                   ║
║   Watch the console for error logs!                               ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
