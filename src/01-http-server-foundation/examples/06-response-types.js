/**
 * Example 06: Response Types
 *
 * Different endpoints return different content types.
 * This example shows how to send various response formats.
 *
 * Run: npm run example:response
 * Test:
 *   curl http://localhost:3000/json
 *   curl http://localhost:3000/html
 *   curl http://localhost:3000/text
 */

'use strict';

const {
  createServer,
  sendJson,
  sendHtml,
  sendText,
  redirect,
  sendError,
  parseUrl
} = require('../lib');

const server = createServer((req, res) => {
  const { path } = parseUrl(req);

  console.log(`${req.method} ${path}`);

  // Route to different response types
  switch (path) {
    case '/':
      // Home - show available endpoints
      sendHtml(res, `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Response Types Demo</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #333; }
    .endpoint {
      background: white;
      padding: 15px;
      margin: 10px 0;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .endpoint h3 { margin: 0 0 10px; color: #0066cc; }
    .endpoint code {
      background: #eee;
      padding: 2px 6px;
      border-radius: 4px;
    }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>Response Types Demo</h1>
  <p>Click the links or use curl to see different response types:</p>

  <div class="endpoint">
    <h3><a href="/json">/json</a></h3>
    <p>Returns JSON data with <code>application/json</code> content type</p>
    <code>curl http://localhost:3000/json</code>
  </div>

  <div class="endpoint">
    <h3><a href="/html">/html</a></h3>
    <p>Returns HTML page with <code>text/html</code> content type</p>
    <code>curl http://localhost:3000/html</code>
  </div>

  <div class="endpoint">
    <h3><a href="/text">/text</a></h3>
    <p>Returns plain text with <code>text/plain</code> content type</p>
    <code>curl http://localhost:3000/text</code>
  </div>

  <div class="endpoint">
    <h3><a href="/redirect">/redirect</a></h3>
    <p>Redirects to another page (302 Found)</p>
    <code>curl -L http://localhost:3000/redirect</code>
  </div>

  <div class="endpoint">
    <h3><a href="/error/404">/error/404</a></h3>
    <p>Returns a 404 error page</p>
    <code>curl http://localhost:3000/error/404</code>
  </div>

  <div class="endpoint">
    <h3><a href="/error/500">/error/500</a></h3>
    <p>Returns a 500 error page</p>
    <code>curl http://localhost:3000/error/500</code>
  </div>

  <div class="endpoint">
    <h3><a href="/headers">/headers</a></h3>
    <p>Returns JSON with custom headers set</p>
    <code>curl -v http://localhost:3000/headers</code>
  </div>
</body>
</html>
      `);
      break;

    case '/json':
      // JSON response
      sendJson(res, {
        message: 'This is a JSON response',
        timestamp: new Date().toISOString(),
        data: {
          users: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' }
          ],
          total: 2
        }
      });
      break;

    case '/json/pretty':
      // Pretty-printed JSON
      sendJson(res, {
        message: 'This is pretty-printed JSON',
        nested: {
          level1: {
            level2: {
              value: 'deep'
            }
          }
        }
      }, 200, { pretty: true });
      break;

    case '/html':
      // HTML response
      sendHtml(res, `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>HTML Response</title>
  <style>
    body {
      font-family: Georgia, serif;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 { color: #2c3e50; }
    p { color: #666; }
  </style>
</head>
<body>
  <h1>HTML Response</h1>
  <p>This is an HTML page returned by the server.</p>
  <p>The Content-Type header is set to <code>text/html; charset=utf-8</code></p>
  <p><a href="/">Back to home</a></p>
</body>
</html>
      `);
      break;

    case '/text':
      // Plain text response
      sendText(res, `Plain Text Response
====================

This is a plain text response.
The Content-Type header is set to: text/plain; charset=utf-8

Plain text is useful for:
- Log files
- Simple API responses
- Debug information
- Raw data

No formatting, just text.`);
      break;

    case '/redirect':
      // Redirect response
      redirect(res, '/json');
      break;

    case '/redirect/permanent':
      // Permanent redirect (301)
      redirect(res, '/json', 301);
      break;

    case '/error/404':
      // Not Found error
      sendError(res, 404, 'The requested resource was not found');
      break;

    case '/error/500':
      // Server error
      sendError(res, 500, 'Internal Server Error');
      break;

    case '/error/json':
      // JSON error response
      sendError(res, 400, 'Validation failed', {
        json: true,
        details: {
          field: 'email',
          reason: 'Invalid email format'
        }
      });
      break;

    case '/headers':
      // Response with custom headers
      res.setHeader('X-Custom-Header', 'custom-value');
      res.setHeader('X-Request-ID', Date.now().toString());
      res.setHeader('X-Powered-By', 'Our Mini Express');
      res.setHeader('Cache-Control', 'no-cache');

      sendJson(res, {
        message: 'Check the response headers!',
        note: 'Use curl -v to see all headers'
      });
      break;

    case '/status/201':
      sendJson(res, { message: 'Resource created' }, 201);
      break;

    case '/status/204':
      // No Content response
      res.writeHead(204);
      res.end();
      break;

    default:
      // Unknown path - 404
      sendError(res, 404, `Path "${path}" not found`);
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Response Types Example                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Open http://localhost:${PORT} in your browser                     ║
║   or try these curl commands:                                     ║
║                                                                   ║
║   JSON response:                                                  ║
║   curl http://localhost:${PORT}/json                                ║
║                                                                   ║
║   HTML response:                                                  ║
║   curl http://localhost:${PORT}/html                                ║
║                                                                   ║
║   Plain text response:                                            ║
║   curl http://localhost:${PORT}/text                                ║
║                                                                   ║
║   Redirect (follow with -L):                                      ║
║   curl -L http://localhost:${PORT}/redirect                         ║
║                                                                   ║
║   Error responses:                                                ║
║   curl http://localhost:${PORT}/error/404                           ║
║   curl http://localhost:${PORT}/error/json                          ║
║                                                                   ║
║   Custom headers (use -v to see):                                 ║
║   curl -v http://localhost:${PORT}/headers                          ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
