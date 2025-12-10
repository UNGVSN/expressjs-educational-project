/**
 * Example 02: Enhanced Response Object
 *
 * This example demonstrates the Express-like methods
 * added to the response object.
 *
 * Run: npm run example:response
 * Test: curl http://localhost:3000/json
 */

'use strict';

const { createServer } = require('../lib');

const server = createServer((req, res) => {
  const path = req.path;

  console.log(`${req.method} ${path}`);

  switch (path) {
    case '/':
      // Send HTML using res.send() - auto-detects content type
      res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Response Methods Demo</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; }
    .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>Enhanced Response Methods</h1>

  <div class="endpoint">
    <h3><a href="/json">/json</a></h3>
    <p>Uses <code>res.json()</code> to send JSON</p>
  </div>

  <div class="endpoint">
    <h3><a href="/text">/text</a></h3>
    <p>Uses <code>res.type('text').send()</code> to send plain text</p>
  </div>

  <div class="endpoint">
    <h3><a href="/status">/status</a></h3>
    <p>Uses <code>res.status(201).json()</code> for custom status</p>
  </div>

  <div class="endpoint">
    <h3><a href="/headers">/headers</a></h3>
    <p>Uses <code>res.set()</code> to set custom headers</p>
  </div>

  <div class="endpoint">
    <h3><a href="/redirect">/redirect</a></h3>
    <p>Uses <code>res.redirect()</code> to redirect</p>
  </div>

  <div class="endpoint">
    <h3><a href="/cookie">/cookie</a></h3>
    <p>Uses <code>res.cookie()</code> to set cookies</p>
  </div>

  <div class="endpoint">
    <h3><a href="/sendstatus">/sendstatus</a></h3>
    <p>Uses <code>res.sendStatus()</code> for status-only response</p>
  </div>
</body>
</html>
      `);
      break;

    case '/json':
      // res.json() - Sends JSON with correct content-type
      res.json({
        method: 'res.json()',
        description: 'Automatically sets Content-Type to application/json',
        data: {
          users: ['Alice', 'Bob', 'Charlie'],
          count: 3
        }
      });
      break;

    case '/text':
      // res.type().send() - Set content type explicitly
      res.type('text').send(`
Plain Text Response
===================

This response uses:
- res.type('text') to set Content-Type
- res.send() to send the body

The type() method accepts shortcuts like:
- 'html' -> text/html
- 'json' -> application/json
- 'text' -> text/plain
      `);
      break;

    case '/status':
      // res.status().json() - Set status code before sending
      res.status(201).json({
        method: 'res.status(201).json()',
        description: 'Sets status code to 201 Created',
        note: 'status() is chainable and returns res'
      });
      break;

    case '/headers':
      // res.set() - Set custom headers
      res
        .set('X-Custom-Header', 'custom-value')
        .set('X-Request-ID', Date.now().toString())
        .set({
          'X-Multi-1': 'value1',
          'X-Multi-2': 'value2'
        })
        .json({
          method: 'res.set()',
          description: 'Sets custom response headers',
          note: 'Use curl -v to see headers'
        });
      break;

    case '/redirect':
      // res.redirect() - Send redirect response
      res.redirect('/json');
      break;

    case '/redirect/301':
      // Permanent redirect
      res.redirect(301, '/json');
      break;

    case '/cookie':
      // res.cookie() - Set cookies
      res
        .cookie('session', 'abc123', {
          httpOnly: true,
          maxAge: 3600000 // 1 hour
        })
        .cookie('preferences', JSON.stringify({ theme: 'dark' }), {
          maxAge: 86400000 // 24 hours
        })
        .json({
          method: 'res.cookie()',
          description: 'Sets cookies with options',
          cookies: [
            { name: 'session', options: 'httpOnly, 1 hour expiry' },
            { name: 'preferences', options: '24 hour expiry' }
          ]
        });
      break;

    case '/sendstatus':
      // res.sendStatus() - Send just a status code
      res.sendStatus(204);
      break;

    case '/links':
      // res.links() - Set Link header for pagination
      res
        .links({
          next: 'http://localhost:3000/users?page=2',
          last: 'http://localhost:3000/users?page=5'
        })
        .json({
          method: 'res.links()',
          description: 'Sets Link header for pagination',
          users: ['user1', 'user2'],
          page: 1
        });
      break;

    default:
      res.status(404).json({
        error: 'Not Found',
        path: path,
        availablePaths: ['/json', '/text', '/status', '/headers', '/redirect', '/cookie', '/sendstatus']
      });
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Enhanced Response Object Example                         ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Open http://localhost:${PORT} in your browser or try:             ║
║                                                                   ║
║   res.json():                                                     ║
║   curl http://localhost:${PORT}/json                                ║
║                                                                   ║
║   res.type().send():                                              ║
║   curl http://localhost:${PORT}/text                                ║
║                                                                   ║
║   res.status().json():                                            ║
║   curl -v http://localhost:${PORT}/status                           ║
║                                                                   ║
║   res.set() (see headers with -v):                                ║
║   curl -v http://localhost:${PORT}/headers                          ║
║                                                                   ║
║   res.redirect():                                                 ║
║   curl -L http://localhost:${PORT}/redirect                         ║
║                                                                   ║
║   res.cookie():                                                   ║
║   curl -v http://localhost:${PORT}/cookie                           ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
