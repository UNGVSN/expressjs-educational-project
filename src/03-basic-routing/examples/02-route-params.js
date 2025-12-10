/**
 * Example 02: Route Parameters
 *
 * This example demonstrates route parameter extraction
 * and various parameter patterns.
 *
 * Run: npm run example:params
 */

'use strict';

const { createApplication } = require('../lib');

const app = createApplication();

// Home with links
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Route Parameters Demo</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; }
    .example { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; }
    code { font-family: 'Monaco', 'Consolas', monospace; }
  </style>
</head>
<body>
  <h1>Route Parameters</h1>
  <p>Parameters are extracted from URL segments marked with <code>:</code></p>

  <div class="example">
    <h3>Single Parameter</h3>
    <p>Pattern: <code>/users/:id</code></p>
    <p>Try: <a href="/users/123">/users/123</a> | <a href="/users/456">/users/456</a></p>
    <pre><code>app.get('/users/:id', (req, res) => {
  // req.params.id = '123'
});</code></pre>
  </div>

  <div class="example">
    <h3>Multiple Parameters</h3>
    <p>Pattern: <code>/users/:userId/posts/:postId</code></p>
    <p>Try: <a href="/users/5/posts/10">/users/5/posts/10</a></p>
    <pre><code>app.get('/users/:userId/posts/:postId', (req, res) => {
  // req.params = { userId: '5', postId: '10' }
});</code></pre>
  </div>

  <div class="example">
    <h3>Mixed Path and Parameters</h3>
    <p>Pattern: <code>/api/v1/items/:category/:id</code></p>
    <p>Try: <a href="/api/v1/items/electronics/999">/api/v1/items/electronics/999</a></p>
  </div>

  <div class="example">
    <h3>Parameters with Query String</h3>
    <p>Try: <a href="/products/shoes?color=red&size=10">/products/shoes?color=red&size=10</a></p>
    <p>Both params and query are available!</p>
  </div>
</body>
</html>
  `);
});

// Single parameter
app.get('/users/:id', (req, res) => {
  res.json({
    pattern: '/users/:id',
    path: req.path,
    params: req.params,
    description: 'Single parameter extracted from URL'
  });
});

// Multiple parameters
app.get('/users/:userId/posts/:postId', (req, res) => {
  res.json({
    pattern: '/users/:userId/posts/:postId',
    path: req.path,
    params: req.params,
    description: 'Multiple parameters in one route'
  });
});

// Mixed static and dynamic segments
app.get('/api/v1/items/:category/:id', (req, res) => {
  res.json({
    pattern: '/api/v1/items/:category/:id',
    path: req.path,
    params: req.params,
    version: 'v1',
    description: 'Parameters mixed with static path segments'
  });
});

// Params + query string
app.get('/products/:category', (req, res) => {
  res.json({
    pattern: '/products/:category',
    path: req.path,
    params: req.params,
    query: req.query,
    description: 'Route params and query string together'
  });
});

// Nested resources
app.get('/orgs/:org/repos/:repo/issues/:issue', (req, res) => {
  res.json({
    pattern: '/orgs/:org/repos/:repo/issues/:issue',
    path: req.path,
    params: req.params,
    description: 'Deeply nested resource pattern'
  });
});

// Special characters in params (URL encoded)
app.get('/search/:query', (req, res) => {
  res.json({
    pattern: '/search/:query',
    path: req.path,
    params: req.params,
    note: 'Special characters are URL decoded',
    example: 'Try /search/hello%20world'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Route Parameters Example                                 ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Try these URLs:                                                 ║
║   http://localhost:${PORT}/users/123                                ║
║   http://localhost:${PORT}/users/5/posts/10                         ║
║   http://localhost:${PORT}/api/v1/items/electronics/999             ║
║   http://localhost:${PORT}/products/shoes?color=red&size=10         ║
║   http://localhost:${PORT}/orgs/github/repos/express/issues/1       ║
║   http://localhost:${PORT}/search/hello%20world                     ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
