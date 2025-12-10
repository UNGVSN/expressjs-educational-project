/**
 * Example 03: Method Chaining
 *
 * This example demonstrates the power of method chaining
 * that Express's response methods enable.
 *
 * Run: npm run example:chaining
 */

'use strict';

const { createServer } = require('../lib');

const server = createServer((req, res) => {
  const path = req.path;

  switch (path) {
    case '/':
      res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Method Chaining Demo</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    .example { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; overflow-x: auto; }
    code { font-family: 'Monaco', 'Consolas', monospace; }
    h3 { color: #333; margin-top: 0; }
  </style>
</head>
<body>
  <h1>Method Chaining in Express</h1>

  <p>Express methods return <code>this</code> (the response object), enabling fluent chaining:</p>

  <div class="example">
    <h3><a href="/basic">/basic</a> - Basic Chaining</h3>
    <pre><code>res
  .status(200)
  .json({ message: 'Hello' });</code></pre>
  </div>

  <div class="example">
    <h3><a href="/full">/full</a> - Full Chain</h3>
    <pre><code>res
  .status(201)
  .set('X-Custom-Header', 'value')
  .set('X-Request-ID', '12345')
  .type('json')
  .json({ created: true });</code></pre>
  </div>

  <div class="example">
    <h3><a href="/cookies">/cookies</a> - Multiple Cookies</h3>
    <pre><code>res
  .cookie('session', 'abc', { httpOnly: true })
  .cookie('theme', 'dark')
  .cookie('lang', 'en')
  .json({ cookies: 'set!' });</code></pre>
  </div>

  <div class="example">
    <h3><a href="/vary">/vary</a> - Vary Headers</h3>
    <pre><code>res
  .vary('Accept')
  .vary('Accept-Encoding')
  .set('Cache-Control', 'public, max-age=300')
  .json({ cached: true });</code></pre>
  </div>

  <div class="example">
    <h3><a href="/append">/append</a> - Appending Headers</h3>
    <pre><code>res
  .append('Warning', '199 Miscellaneous warning')
  .append('Warning', '299 Another warning')
  .json({ warnings: 'added' });</code></pre>
  </div>
</body>
</html>
      `);
      break;

    case '/basic':
      // Basic chaining
      res
        .status(200)
        .json({
          example: 'Basic chaining',
          code: 'res.status(200).json({...})',
          note: 'status() returns res, enabling .json() to be called'
        });
      break;

    case '/full':
      // Full chain with multiple methods
      res
        .status(201)
        .set('X-Custom-Header', 'value')
        .set('X-Request-ID', Date.now().toString())
        .type('json')
        .json({
          example: 'Full chain',
          code: `res
  .status(201)
  .set('X-Custom-Header', 'value')
  .set('X-Request-ID', '12345')
  .type('json')
  .json({...})`,
          note: 'Use curl -v to see all the headers set'
        });
      break;

    case '/cookies':
      // Chaining cookie calls
      res
        .cookie('session', 'abc123', { httpOnly: true, maxAge: 3600000 })
        .cookie('theme', 'dark', { maxAge: 86400000 })
        .cookie('language', 'en', { path: '/' })
        .json({
          example: 'Multiple cookies',
          code: `res
  .cookie('session', 'abc', { httpOnly: true })
  .cookie('theme', 'dark')
  .cookie('lang', 'en')
  .json({...})`,
          note: 'Each cookie() call appends to Set-Cookie header'
        });
      break;

    case '/vary':
      // Vary and caching headers
      res
        .vary('Accept')
        .vary('Accept-Encoding')
        .set('Cache-Control', 'public, max-age=300')
        .set('ETag', '"abc123"')
        .json({
          example: 'Caching headers',
          code: `res
  .vary('Accept')
  .vary('Accept-Encoding')
  .set('Cache-Control', 'public, max-age=300')
  .json({...})`,
          note: 'Vary header helps with proper caching'
        });
      break;

    case '/append':
      // Appending headers
      res
        .append('Warning', '199 Miscellaneous warning')
        .append('Warning', '299 Another warning')
        .append('X-Debug', 'step-1')
        .append('X-Debug', 'step-2')
        .json({
          example: 'Appending headers',
          code: `res
  .append('Warning', '199 Miscellaneous warning')
  .append('Warning', '299 Another warning')
  .json({...})`,
          note: 'append() adds to existing header values'
        });
      break;

    case '/links':
      // Pagination links
      res
        .links({
          first: 'http://localhost:3000/users?page=1',
          prev: 'http://localhost:3000/users?page=2',
          next: 'http://localhost:3000/users?page=4',
          last: 'http://localhost:3000/users?page=10'
        })
        .json({
          example: 'Pagination links',
          page: 3,
          users: ['user1', 'user2', 'user3']
        });
      break;

    default:
      res.status(404).json({ error: 'Not found' });
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Method Chaining Example                                  ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Open http://localhost:${PORT} in your browser                     ║
║                                                                   ║
║   Or try with curl -v to see headers:                             ║
║   curl -v http://localhost:${PORT}/full                             ║
║   curl -v http://localhost:${PORT}/cookies                          ║
║   curl -v http://localhost:${PORT}/vary                             ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
