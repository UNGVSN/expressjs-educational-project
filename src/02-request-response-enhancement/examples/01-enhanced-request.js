/**
 * Example 01: Enhanced Request Object
 *
 * This example demonstrates the Express-like methods
 * added to the request object.
 *
 * Run: npm run example:basic
 * Test: curl -H "Accept: application/json" http://localhost:3000
 */

'use strict';

const { createServer } = require('../lib');

const server = createServer((req, res) => {
  console.log(`\n--- Request: ${req.method} ${req.url} ---`);

  // Demonstrate req.get() for headers
  const userAgent = req.get('User-Agent');
  const accept = req.get('Accept');
  const contentType = req.get('Content-Type');

  console.log('Headers via req.get():');
  console.log(`  User-Agent: ${userAgent}`);
  console.log(`  Accept: ${accept}`);
  console.log(`  Content-Type: ${contentType}`);

  // Demonstrate req.is() for content type checking
  console.log('\nContent-Type checks via req.is():');
  console.log(`  req.is('json'): ${req.is('json')}`);
  console.log(`  req.is('html'): ${req.is('html')}`);
  console.log(`  req.is('text/*'): ${req.is('text/*')}`);

  // Demonstrate req.accepts() for content negotiation
  console.log('\nAccept checks via req.accepts():');
  console.log(`  req.accepts('json'): ${req.accepts('json')}`);
  console.log(`  req.accepts('html'): ${req.accepts('html')}`);
  console.log(`  req.accepts('json', 'html'): ${req.accepts('json', 'html')}`);

  // Demonstrate parsed properties
  console.log('\nParsed request properties:');
  console.log(`  req.path: ${req.path}`);
  console.log(`  req.hostname: ${req.hostname}`);
  console.log(`  req.ip: ${req.ip}`);
  console.log(`  req.protocol: ${req.protocol}`);
  console.log(`  req.secure: ${req.secure}`);
  console.log(`  req.xhr: ${req.xhr}`);
  console.log(`  req.query: ${JSON.stringify(req.query)}`);

  // Send response
  res.json({
    message: 'Request analysis complete!',
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      hostname: req.hostname,
      ip: req.ip,
      protocol: req.protocol,
      xhr: req.xhr
    },
    headers: {
      userAgent,
      accept,
      contentType
    },
    checks: {
      isJson: req.is('json'),
      acceptsJson: req.accepts('json'),
      acceptsHtml: req.accepts('html')
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Enhanced Request Object Example                          ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Try these commands:                                             ║
║                                                                   ║
║   Basic request:                                                  ║
║   curl http://localhost:${PORT}                                     ║
║                                                                   ║
║   With Accept header:                                             ║
║   curl -H "Accept: application/json" http://localhost:${PORT}       ║
║                                                                   ║
║   With Content-Type:                                              ║
║   curl -X POST -H "Content-Type: application/json" \\             ║
║        -d '{"test":true}' http://localhost:${PORT}                  ║
║                                                                   ║
║   With query string:                                              ║
║   curl "http://localhost:${PORT}?page=1&sort=name"                  ║
║                                                                   ║
║   Simulating AJAX request:                                        ║
║   curl -H "X-Requested-With: XMLHttpRequest" http://localhost:${PORT}
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
