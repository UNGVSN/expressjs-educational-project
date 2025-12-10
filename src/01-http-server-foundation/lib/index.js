/**
 * Step 01: HTTP Server Foundation
 *
 * This module provides the foundational HTTP server functionality
 * that Express is built upon. Understanding this is crucial to
 * understanding how Express works internally.
 */

'use strict';

const http = require('http');
const { parseUrl, parseQueryString, getClientIp } = require('./request');
const {
  sendJson,
  sendHtml,
  sendText,
  sendFile,
  redirect,
  sendError
} = require('./response');

/**
 * Creates an HTTP server with enhanced request/response handling.
 *
 * This is similar to http.createServer() but demonstrates how
 * Express enhances the basic Node.js functionality.
 *
 * @param {Function} handler - Request handler function (req, res) => void
 * @returns {http.Server} The HTTP server instance
 *
 * @example
 * const server = createServer((req, res) => {
 *   res.writeHead(200);
 *   res.end('Hello!');
 * });
 * server.listen(3000);
 */
function createServer(handler) {
  const server = http.createServer((req, res) => {
    // Record start time for request timing
    req._startTime = Date.now();

    // Parse URL information and attach to request
    const urlInfo = parseUrl(req);
    req.path = urlInfo.path;
    req.query = urlInfo.query;
    req.search = urlInfo.search;

    // Add client IP
    req.ip = getClientIp(req);

    // Call the user's handler
    try {
      handler(req, res);
    } catch (err) {
      // Basic error handling - we'll improve this in Step 09
      console.error('Request handler error:', err);
      sendError(res, 500, 'Internal Server Error');
    }
  });

  return server;
}

/**
 * Creates a server and immediately starts listening.
 *
 * @param {Function} handler - Request handler function
 * @param {number} port - Port to listen on
 * @param {Function} [callback] - Called when server starts
 * @returns {http.Server}
 *
 * @example
 * listen((req, res) => {
 *   res.end('Hello!');
 * }, 3000, () => console.log('Server running'));
 */
function listen(handler, port, callback) {
  const server = createServer(handler);
  server.listen(port, callback);
  return server;
}

// Export all functionality
module.exports = {
  // Server creation
  createServer,
  listen,

  // Request utilities
  parseUrl,
  parseQueryString,
  getClientIp,

  // Response utilities
  sendJson,
  sendHtml,
  sendText,
  sendFile,
  redirect,
  sendError,

  // Re-export http for convenience
  http
};
