/**
 * Example 04: Route Patterns
 *
 * This example demonstrates advanced routing patterns
 * including wildcards and pattern matching.
 *
 * Run: npm run example:patterns
 */

'use strict';

const { createApplication } = require('../lib');

const app = createApplication();

// Home page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Route Patterns</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    .pattern { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 8px; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; font-family: 'Monaco', 'Consolas', monospace; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>Route Pattern Matching</h1>

  <div class="pattern">
    <h3>Exact Match</h3>
    <p>Pattern: <code>/exact</code></p>
    <p>Try: <a href="/exact">/exact</a></p>
    <p>Only matches exactly <code>/exact</code></p>
  </div>

  <div class="pattern">
    <h3>Named Parameters</h3>
    <p>Pattern: <code>/users/:id</code></p>
    <p>Try: <a href="/users/123">/users/123</a> | <a href="/users/abc">/users/abc</a></p>
    <p>Captures segment as <code>req.params.id</code></p>
  </div>

  <div class="pattern">
    <h3>Wildcard (*)</h3>
    <p>Pattern: <code>/files/*</code></p>
    <p>Try: <a href="/files/docs/readme.md">/files/docs/readme.md</a></p>
    <p>Captures everything after <code>/files/</code></p>
  </div>

  <div class="pattern">
    <h3>API Versioning</h3>
    <p>Pattern: <code>/api/:version/data</code></p>
    <p>Try: <a href="/api/v1/data">/api/v1/data</a> | <a href="/api/v2/data">/api/v2/data</a></p>
  </div>

  <div class="pattern">
    <h3>Multi-level Params</h3>
    <p>Pattern: <code>/:lang/:category/:slug</code></p>
    <p>Try: <a href="/en/tech/hello-world">/en/tech/hello-world</a></p>
  </div>

  <div class="pattern">
    <h3>Catch-All</h3>
    <p>Pattern: <code>/*</code> (registered last)</p>
    <p>Try: <a href="/anything/you/want">/anything/you/want</a></p>
    <p>Matches any path not matched by other routes</p>
  </div>
</body>
</html>
  `);
});

// Exact match
app.get('/exact', (req, res) => {
  res.json({
    pattern: '/exact',
    matchType: 'Exact match',
    path: req.path
  });
});

// Named parameter
app.get('/users/:id', (req, res) => {
  res.json({
    pattern: '/users/:id',
    matchType: 'Named parameter',
    path: req.path,
    params: req.params
  });
});

// Wildcard - match anything after /files/
app.get('/files/*', (req, res) => {
  res.json({
    pattern: '/files/*',
    matchType: 'Wildcard',
    path: req.path,
    params: req.params,
    capturedPath: req.params['0']
  });
});

// API versioning pattern
app.get('/api/:version/data', (req, res) => {
  res.json({
    pattern: '/api/:version/data',
    matchType: 'API versioning',
    path: req.path,
    version: req.params.version,
    data: {
      message: `Data from API ${req.params.version}`
    }
  });
});

// Multi-level parameters (like blog posts)
app.get('/:lang/:category/:slug', (req, res) => {
  // This is checked AFTER more specific patterns
  // Only matches if no other route matched
  res.json({
    pattern: '/:lang/:category/:slug',
    matchType: 'Multi-level params',
    path: req.path,
    params: req.params,
    note: 'This could be a blog post URL structure'
  });
});

// Catch-all (should be last!)
app.get('/*', (req, res) => {
  res.status(404).json({
    pattern: '/*',
    matchType: 'Catch-all (404)',
    path: req.path,
    captured: req.params['0'],
    message: 'No specific route matched, caught by wildcard'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Route Patterns Example                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Try these patterns:                                             ║
║                                                                   ║
║   Exact:      http://localhost:${PORT}/exact                        ║
║   Param:      http://localhost:${PORT}/users/123                    ║
║   Wildcard:   http://localhost:${PORT}/files/a/b/c.txt              ║
║   Version:    http://localhost:${PORT}/api/v2/data                  ║
║   Multi:      http://localhost:${PORT}/en/tech/hello-world          ║
║   Catch-all:  http://localhost:${PORT}/random/path                  ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
