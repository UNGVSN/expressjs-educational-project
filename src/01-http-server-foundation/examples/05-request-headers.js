/**
 * Example 05: Request Headers
 *
 * HTTP headers carry metadata about the request.
 * This example shows how to read and use them.
 *
 * Run: npm run example:headers
 * Test: curl -H "X-Custom: hello" -H "Accept: application/json" http://localhost:3000
 */

'use strict';

const { createServer, sendJson, getHeader, accepts, isContentType, getClientIp } = require('../lib');

const server = createServer((req, res) => {
  // Get specific headers
  const contentType = getHeader(req, 'Content-Type');
  const userAgent = getHeader(req, 'User-Agent');
  const acceptHeader = getHeader(req, 'Accept');
  const host = getHeader(req, 'Host');
  const authorization = getHeader(req, 'Authorization');

  // Check content negotiation
  const acceptsJson = accepts(req, 'json');
  const acceptsHtml = accepts(req, 'html');

  // Get client information
  const clientIp = getClientIp(req);

  // Log headers
  console.log('\n--- Request Headers ---');
  Object.entries(req.headers).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log('----------------------\n');

  // Categorize headers
  const standardHeaders = {};
  const customHeaders = {};

  Object.entries(req.headers).forEach(([key, value]) => {
    if (key.startsWith('x-')) {
      customHeaders[key] = value;
    } else {
      standardHeaders[key] = value;
    }
  });

  sendJson(res, {
    message: 'Request Headers Analysis',

    // Client info derived from headers
    clientInfo: {
      ip: clientIp,
      userAgent: userAgent || 'Not provided',
      host: host
    },

    // Content negotiation
    contentNegotiation: {
      accepts: acceptHeader || '*/*',
      acceptsJson,
      acceptsHtml,
      contentType: contentType || 'Not provided'
    },

    // Authentication
    authentication: {
      hasAuth: !!authorization,
      authType: authorization ? authorization.split(' ')[0] : null
    },

    // All headers categorized
    headers: {
      standard: standardHeaders,
      custom: customHeaders
    },

    // Common headers explained
    headerReference: {
      'Host': 'Target server hostname',
      'User-Agent': 'Client application identifier',
      'Accept': 'Acceptable response content types',
      'Accept-Language': 'Preferred response languages',
      'Accept-Encoding': 'Acceptable compression methods',
      'Content-Type': 'Request body format',
      'Content-Length': 'Request body size in bytes',
      'Authorization': 'Authentication credentials',
      'Cookie': 'Session cookies',
      'Cache-Control': 'Caching directives',
      'Connection': 'Connection management (keep-alive)',
      'X-Forwarded-For': 'Original client IP (behind proxy)',
      'X-Requested-With': 'Often XMLHttpRequest for AJAX'
    }
  }, 200, { pretty: true });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Request Headers Example                                  ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Try these commands:                                             ║
║                                                                   ║
║   Basic request (browser-like):                                   ║
║   curl http://localhost:${PORT}                                     ║
║                                                                   ║
║   With Accept header:                                             ║
║   curl -H "Accept: application/json" http://localhost:${PORT}       ║
║                                                                   ║
║   With custom headers:                                            ║
║   curl -H "X-Custom-Header: my-value" \\                          ║
║        -H "X-Request-ID: 12345" \\                                ║
║        http://localhost:${PORT}                                     ║
║                                                                   ║
║   With authentication:                                            ║
║   curl -H "Authorization: Bearer token123" http://localhost:${PORT} ║
║                                                                   ║
║   Simulating proxy:                                               ║
║   curl -H "X-Forwarded-For: 203.0.113.50" http://localhost:${PORT}  ║
║                                                                   ║
║   Full browser simulation:                                        ║
║   curl -H "Accept: text/html,application/json" \\                 ║
║        -H "Accept-Language: en-US,en;q=0.9" \\                    ║
║        -H "Accept-Encoding: gzip, deflate" \\                     ║
║        -H "User-Agent: Mozilla/5.0" \\                            ║
║        http://localhost:${PORT}                                     ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
