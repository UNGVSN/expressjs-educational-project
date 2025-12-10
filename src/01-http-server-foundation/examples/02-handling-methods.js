/**
 * Example 02: Handling HTTP Methods
 *
 * HTTP defines several methods (verbs) for different operations.
 * This example shows how to handle them differently.
 *
 * Run: npm run example:methods
 * Test:
 *   curl http://localhost:3000
 *   curl -X POST http://localhost:3000 -d '{"name":"John"}'
 *   curl -X PUT http://localhost:3000
 *   curl -X DELETE http://localhost:3000
 */

'use strict';

const { createServer, sendJson, readJsonBody } = require('../lib');

const server = createServer(async (req, res) => {
  const { method, url } = req;

  console.log(`${method} ${url}`);

  // Handle different HTTP methods
  switch (method) {
    case 'GET':
      // GET - Retrieve data
      // Should be idempotent (same request = same result)
      // Should not modify server state
      sendJson(res, {
        message: 'GET request received',
        url,
        info: 'GET is for retrieving data'
      });
      break;

    case 'POST':
      // POST - Create new resource
      // Request body contains data to create
      try {
        const body = await readJsonBody(req);
        sendJson(res, {
          message: 'POST request received',
          created: body,
          info: 'POST is for creating new resources'
        }, 201); // 201 Created
      } catch (err) {
        sendJson(res, { error: err.message }, 400);
      }
      break;

    case 'PUT':
      // PUT - Update/replace entire resource
      // Should be idempotent
      try {
        const body = await readJsonBody(req);
        sendJson(res, {
          message: 'PUT request received',
          replaced: body,
          info: 'PUT is for replacing entire resources'
        });
      } catch (err) {
        sendJson(res, { error: err.message }, 400);
      }
      break;

    case 'PATCH':
      // PATCH - Partial update
      // Only modifies specified fields
      try {
        const body = await readJsonBody(req);
        sendJson(res, {
          message: 'PATCH request received',
          updated: body,
          info: 'PATCH is for partial updates'
        });
      } catch (err) {
        sendJson(res, { error: err.message }, 400);
      }
      break;

    case 'DELETE':
      // DELETE - Remove resource
      // Should be idempotent
      sendJson(res, {
        message: 'DELETE request received',
        info: 'DELETE is for removing resources'
      });
      break;

    case 'HEAD':
      // HEAD - Same as GET but without response body
      // Used to check if resource exists or get metadata
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'X-Resource-Exists': 'true'
      });
      res.end(); // No body for HEAD
      break;

    case 'OPTIONS':
      // OPTIONS - Describes communication options
      // Often used in CORS preflight requests
      res.writeHead(200, {
        'Allow': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      break;

    default:
      // Method not supported
      res.writeHead(405, {
        'Content-Type': 'application/json',
        'Allow': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS'
      });
      res.end(JSON.stringify({
        error: 'Method Not Allowed',
        allowed: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
      }));
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           HTTP Methods Example                             ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║   Server URL: http://localhost:${PORT}                      ║
║                                                           ║
║   Try these commands:                                     ║
║                                                           ║
║   GET (retrieve):                                         ║
║   curl http://localhost:${PORT}                             ║
║                                                           ║
║   POST (create):                                          ║
║   curl -X POST http://localhost:${PORT} \\                   ║
║        -H "Content-Type: application/json" \\              ║
║        -d '{"name":"John"}'                               ║
║                                                           ║
║   PUT (replace):                                          ║
║   curl -X PUT http://localhost:${PORT} \\                    ║
║        -H "Content-Type: application/json" \\              ║
║        -d '{"name":"Jane","age":25}'                      ║
║                                                           ║
║   PATCH (partial update):                                 ║
║   curl -X PATCH http://localhost:${PORT} \\                  ║
║        -H "Content-Type: application/json" \\              ║
║        -d '{"age":26}'                                    ║
║                                                           ║
║   DELETE (remove):                                        ║
║   curl -X DELETE http://localhost:${PORT}                   ║
║                                                           ║
║   HEAD (metadata only):                                   ║
║   curl -I http://localhost:${PORT}                          ║
║                                                           ║
║   OPTIONS (allowed methods):                              ║
║   curl -X OPTIONS http://localhost:${PORT}                  ║
║                                                           ║
║   Press Ctrl+C to stop                                    ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
