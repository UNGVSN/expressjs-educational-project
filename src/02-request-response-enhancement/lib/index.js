/**
 * Step 02: Request/Response Enhancement
 *
 * This module creates an HTTP server with enhanced request and
 * response objects - just like Express does.
 *
 * The enhancements are applied by extending the prototypes of
 * Node's IncomingMessage and ServerResponse classes.
 */

'use strict';

const http = require('http');
const { URL } = require('url');

// Apply prototype extensions
// These add methods like req.get(), res.json(), etc.
require('./request');
require('./response');

/**
 * Creates an HTTP server with enhanced req/res objects.
 *
 * Unlike Step 01 where we used utility functions, here the
 * enhancements are baked into the request and response objects
 * themselves, making them available as methods.
 *
 * @param {Function} handler - Request handler (req, res) => void
 * @returns {http.Server} The HTTP server
 *
 * @example
 * const server = createServer((req, res) => {
 *   // Enhanced request methods
 *   const userAgent = req.get('User-Agent');
 *   const acceptsJson = req.accepts('json');
 *
 *   // Enhanced response methods
 *   res.status(200).json({ message: 'Hello!' });
 * });
 */
function createServer(handler) {
  const server = http.createServer((req, res) => {
    // Link request and response to each other
    // This allows res.redirect('back') to access req headers
    req.res = res;
    res.req = req;

    // Parse URL information
    try {
      const protocol = req.socket?.encrypted ? 'https' : 'http';
      const host = req.headers.host || 'localhost';
      const url = new URL(req.url, `${protocol}://${host}`);

      // Attach parsed URL properties to request
      req._path = url.pathname;
      req._hostname = url.hostname;
      req.originalUrl = req.url;

      // Parse query string into object
      req.query = {};
      for (const [key, value] of url.searchParams) {
        if (req.query[key] !== undefined) {
          // Handle duplicate keys as arrays
          if (Array.isArray(req.query[key])) {
            req.query[key].push(value);
          } else {
            req.query[key] = [req.query[key], value];
          }
        } else {
          req.query[key] = value;
        }
      }

    } catch (err) {
      // Fallback for malformed URLs
      req._path = req.url?.split('?')[0] || '/';
      req.query = {};
    }

    // Initialize params (will be populated by routing in Step 03)
    req.params = {};

    // Record request timing
    req._startTime = Date.now();

    // Call the handler
    try {
      handler(req, res);
    } catch (err) {
      // Basic error handling
      console.error('Unhandled error in request handler:', err);

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
    }
  });

  return server;
}

/**
 * Creates a server and starts listening immediately.
 *
 * @param {Function} handler - Request handler
 * @param {number} port - Port to listen on
 * @param {Function} [callback] - Called when server is ready
 * @returns {http.Server}
 */
function listen(handler, port, callback) {
  const server = createServer(handler);
  server.listen(port, callback);
  return server;
}

/**
 * Utility to get response time in milliseconds.
 *
 * @param {http.IncomingMessage} req - Request object
 * @returns {number} Response time in ms
 */
function getResponseTime(req) {
  if (!req._startTime) return 0;
  return Date.now() - req._startTime;
}

// Export everything
module.exports = {
  // Server creation
  createServer,
  listen,

  // Utilities
  getResponseTime,

  // Re-export http for convenience
  http
};
