/**
 * Example 01: Basic Middleware
 *
 * This example demonstrates the fundamentals of middleware.
 * Middleware functions have access to req, res, and next.
 *
 * Run: npm run example:basic
 */

'use strict';

const createApp = require('../lib');

const app = createApp();

/**
 * MIDDLEWARE EXAMPLE 1: Logging
 *
 * This middleware logs every request before passing control.
 * Note how it calls next() to continue to the next middleware.
 */
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next(); // Pass control to the next middleware
});

/**
 * MIDDLEWARE EXAMPLE 2: Request Enhancement
 *
 * Middleware can add properties to the request object.
 * These are available in all subsequent handlers.
 */
app.use((req, res, next) => {
  // Add request timestamp
  req.requestTime = Date.now();

  // Add custom ID
  req.id = Math.random().toString(36).substring(7);

  console.log(`Request ID: ${req.id}`);
  next();
});

/**
 * MIDDLEWARE EXAMPLE 3: Response Enhancement
 *
 * Middleware can also modify the response.
 * Here we add a custom header to all responses.
 */
app.use((req, res, next) => {
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Home page - shows middleware concepts
app.get('/', (req, res) => {
  const processingTime = Date.now() - req.requestTime;

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Basic Middleware</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; }
    .box { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 8px; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Basic Middleware Demo</h1>

  <div class="box">
    <h3>Request Info (added by middleware)</h3>
    <p><strong>Request ID:</strong> ${req.id}</p>
    <p><strong>Processing Time:</strong> ${processingTime}ms</p>
    <p><strong>Path:</strong> ${req.path}</p>
  </div>

  <div class="box">
    <h3>How Middleware Works</h3>
    <pre><code>// Middleware function signature
function middleware(req, res, next) {
  // 1. Do something with req or res
  // 2. Call next() to continue, or
  // 3. End response with res.send()
}</code></pre>
  </div>

  <div class="box">
    <h3>The Three Possible Actions</h3>
    <ol>
      <li><strong>Call next()</strong> - Pass to next middleware</li>
      <li><strong>Send response</strong> - End the request-response cycle</li>
      <li><strong>Pass error</strong> - next(err) skips to error handler</li>
    </ol>
  </div>

  <div class="box">
    <h3>Try These Endpoints</h3>
    <ul>
      <li><a href="/test">/test</a> - Simple route</li>
      <li><a href="/info">/info</a> - Shows request enhancement</li>
    </ul>
    <p>Check the terminal to see middleware logs!</p>
  </div>
</body>
</html>
  `);
});

// Test route
app.get('/test', (req, res) => {
  res.json({
    message: 'Hello from /test',
    requestId: req.id,
    processingTime: Date.now() - req.requestTime + 'ms'
  });
});

// Info route - shows all the request enhancements
app.get('/info', (req, res) => {
  res.json({
    requestId: req.id,
    requestTime: new Date(req.requestTime).toISOString(),
    path: req.path,
    query: req.query,
    method: req.method,
    headers: req.headers
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Basic Middleware Example                                 ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   This example demonstrates:                                      ║
║   • Logging middleware                                            ║
║   • Request enhancement (adding properties)                       ║
║   • Response enhancement (adding headers)                         ║
║                                                                   ║
║   Watch the console for middleware logs!                          ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
