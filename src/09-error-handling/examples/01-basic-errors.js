/**
 * Example 01: Basic Error Handling
 *
 * Demonstrates fundamental error handling patterns in Express:
 * - Synchronous error catching
 * - Error middleware signature (4 parameters)
 * - Default error responses
 */

'use strict';

const createApp = require('../lib/index');

const app = createApp();

// ============================================
// Routes that demonstrate error scenarios
// ============================================

/**
 * Synchronous errors are automatically caught
 * Express wraps route handlers in try/catch
 */
app.get('/sync-error', (req, res) => {
  // This error is automatically caught by Express
  throw new Error('This is a synchronous error!');
});

/**
 * You can throw different types of errors
 */
app.get('/type-error', (req, res) => {
  // Simulating a programming error
  const user = null;
  return user.name; // TypeError: Cannot read property 'name' of null
});

/**
 * Reference errors are also caught
 */
app.get('/reference-error', (req, res) => {
  // Simulating an undefined variable error
  return undefinedVariable; // ReferenceError
});

/**
 * Normal route that works fine
 */
app.get('/success', (req, res) => {
  res.json({
    message: 'This route works correctly!',
    timestamp: new Date().toISOString()
  });
});

/**
 * Route with conditional error
 */
app.get('/maybe-error', (req, res) => {
  // Randomly throw an error
  if (Math.random() > 0.5) {
    throw new Error('Random error occurred!');
  }
  res.json({ message: 'Lucky! No error this time.' });
});

// ============================================
// Error Handling Middleware
// ============================================

/**
 * Error logger - logs all errors
 * Note: Has 4 parameters (err, req, res, next)
 */
app.use((err, req, res, next) => {
  console.error('========== ERROR ==========');
  console.error(`Time: ${new Date().toISOString()}`);
  console.error(`Method: ${req.method}`);
  console.error(`Path: ${req.path}`);
  console.error(`Error: ${err.message}`);
  console.error('===========================');

  // Pass error to next handler
  next(err);
});

/**
 * Error responder - sends error response
 */
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    error: {
      message: err.message,
      type: err.name,
      statusCode: statusCode
    }
  });
});

// ============================================
// Start Server
// ============================================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
===========================================
  Basic Error Handling Example
===========================================

Server running at http://localhost:${PORT}

Try these routes:

  Successful routes:
  - GET /success        → Returns success JSON

  Error routes:
  - GET /sync-error     → Throws synchronous error
  - GET /type-error     → Throws TypeError
  - GET /reference-error → Throws ReferenceError
  - GET /maybe-error    → 50% chance of error
  - GET /nonexistent    → 404 Not Found

Watch the console for error logs!

Press Ctrl+C to stop
===========================================
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
