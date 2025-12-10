/**
 * Example 02: The next() Function
 *
 * Deep dive into how next() works and its different uses.
 *
 * Run: npm run example:next
 */

'use strict';

const createApp = require('../lib');

const app = createApp();

// Track the middleware execution flow
const executionLog = [];

/**
 * UNDERSTANDING next()
 *
 * next() is a function that:
 * 1. Passed to every middleware as the third argument
 * 2. Calling it passes control to the next middleware
 * 3. NOT calling it stops the chain (hang or respond)
 * 4. Passing an error (next(err)) skips to error handlers
 */

// Clear execution log for each request
app.use((req, res, next) => {
  executionLog.length = 0;
  executionLog.push('Request started');
  next();
});

// Home page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Understanding next()</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    .example { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 8px; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; overflow-x: auto; }
    .flow { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .flow span { background: #4CAF50; color: white; padding: 8px 12px; border-radius: 4px; }
    .flow .arrow { background: none; color: #333; font-size: 20px; }
  </style>
</head>
<body>
  <h1>Understanding the next() Function</h1>

  <div class="example">
    <h3>Basic Flow with next()</h3>
    <div class="flow">
      <span>Middleware 1</span>
      <span class="arrow">→ next() →</span>
      <span>Middleware 2</span>
      <span class="arrow">→ next() →</span>
      <span>Route Handler</span>
      <span class="arrow">→</span>
      <span>Response</span>
    </div>
  </div>

  <div class="example">
    <h3>Demo Endpoints</h3>
    <ul>
      <li><a href="/flow">/flow</a> - Normal middleware flow</li>
      <li><a href="/skip">/skip</a> - Middleware that stops early</li>
      <li><a href="/async">/async</a> - Async middleware with next()</li>
      <li><a href="/error">/error</a> - next(err) - passing an error</li>
    </ul>
  </div>

  <div class="example">
    <h3>The next() Contract</h3>
    <pre><code>// ✅ CORRECT: Call next() to continue
app.use((req, res, next) => {
  console.log('Will continue');
  next();
});

// ✅ CORRECT: Send response (don't call next)
app.use((req, res, next) => {
  res.send('Stopping here');
});

// ❌ WRONG: Neither sending nor calling next
app.use((req, res, next) => {
  console.log('Request will hang forever!');
});

// ✅ CORRECT: Pass error to error handler
app.use((req, res, next) => {
  if (somethingWrong) {
    next(new Error('Something wrong'));
  } else {
    next();
  }
});</code></pre>
  </div>
</body>
</html>
  `);
});

/**
 * NORMAL FLOW: Each middleware calls next()
 */
app.use('/flow', (req, res, next) => {
  executionLog.push('Middleware A - before next()');
  next();
  executionLog.push('Middleware A - after next()');
});

app.use('/flow', (req, res, next) => {
  executionLog.push('Middleware B - before next()');
  next();
  executionLog.push('Middleware B - after next()');
});

app.get('/flow', (req, res) => {
  executionLog.push('Route handler');
  res.json({
    message: 'Normal middleware flow',
    executionOrder: executionLog,
    note: 'Notice code AFTER next() runs in reverse order (like an onion)'
  });
});

/**
 * SKIP: Middleware sends response without calling next()
 */
app.use('/skip', (req, res, next) => {
  executionLog.push('First middleware');
  next();
});

app.use('/skip', (req, res, next) => {
  executionLog.push('Second middleware - STOPPING HERE');
  // Not calling next(), sending response instead
  res.json({
    message: 'Stopped at second middleware',
    executionOrder: executionLog,
    note: 'Route handler was never reached!'
  });
});

app.get('/skip', (req, res) => {
  // This will never execute!
  executionLog.push('Route handler - YOU SHOULD NOT SEE THIS');
  res.json({ never: 'reached' });
});

/**
 * ASYNC: Calling next() after async operation
 */
app.use('/async', (req, res, next) => {
  executionLog.push('Async middleware - starting');

  // Simulate async operation (like database query)
  setTimeout(() => {
    executionLog.push('Async middleware - after 100ms delay');
    next();
  }, 100);
});

app.get('/async', (req, res) => {
  executionLog.push('Route handler');
  res.json({
    message: 'Async middleware completed',
    executionOrder: executionLog,
    note: 'next() was called after the async operation completed'
  });
});

/**
 * ERROR: Passing error to next(err)
 */
app.use('/error', (req, res, next) => {
  executionLog.push('Middleware before error');
  next();
});

app.get('/error', (req, res, next) => {
  executionLog.push('Route - about to throw error');

  // Simulate an error condition
  const error = new Error('Something went wrong!');
  error.status = 500;

  // Pass error to next - skips to error handler
  next(error);
});

app.use('/error', (req, res, next) => {
  // This will be SKIPPED because an error was passed
  executionLog.push('THIS SHOULD NOT APPEAR');
  next();
});

// Error handler (4 arguments)
app.use((err, req, res, next) => {
  executionLog.push(`Error handler caught: ${err.message}`);
  res.status(err.status || 500).json({
    message: 'Error was caught by error handler',
    error: err.message,
    executionOrder: executionLog,
    note: 'Regular middleware was SKIPPED, went directly to error handler'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Understanding next() Example                             ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Endpoints:                                                      ║
║   /flow  - Normal middleware flow                                 ║
║   /skip  - Middleware stops without next()                        ║
║   /async - Async operation before next()                          ║
║   /error - Error passed to next(err)                              ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
