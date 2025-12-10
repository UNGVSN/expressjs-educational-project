/**
 * Step 11: Cookie & Session Support
 *
 * A mini Express-like application with cookie parsing and session management.
 * Builds on Step 10 (Body Parsers) and adds:
 *
 * 1. Cookie parser middleware
 * 2. Signed cookies with HMAC
 * 3. Session middleware
 * 4. Memory session store
 * 5. res.cookie() and res.clearCookie() methods
 */

'use strict';

const http = require('http');
const { parse: parseUrl } = require('url');
const { pathToRegexp } = require('../../03-basic-routing/lib/path-to-regexp');
const { serialize: serializeCookie } = require('./cookie');
const { sign } = require('./signed');

// Import middleware
const cookieParser = require('./cookie-parser');
const session = require('./session');
const MemoryStore = require('./memory-store');

/**
 * Create an Express-like application
 */
function createApp() {
  const middleware = [];

  /**
   * Main request handler
   */
  function app(req, res) {
    // Parse URL
    const parsedUrl = parseUrl(req.url, true);
    req.path = parsedUrl.pathname;
    req.query = parsedUrl.query;

    // Note: cookies will be populated by cookie-parser middleware
    // Don't pre-initialize here to allow cookie-parser to run

    // Enhance response
    enhanceResponse(req, res);

    // Execute middleware pipeline
    let idx = 0;

    function next(err) {
      if (err) {
        // Find error handler
        while (idx < middleware.length) {
          const layer = middleware[idx++];
          if (layer.handler.length === 4) {
            return layer.handler(err, req, res, next);
          }
        }
        // Default error handler
        res.statusCode = err.status || err.statusCode || 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
        return;
      }

      // Find next matching middleware
      while (idx < middleware.length) {
        const layer = middleware[idx++];

        if (layer.handler.length === 4) {
          // Skip error handlers in normal flow
          continue;
        }

        if (matchLayer(layer, req)) {
          // Extract params
          if (layer.keys && layer.keys.length > 0) {
            req.params = extractParams(layer, req.path);
          }

          try {
            return layer.handler(req, res, next);
          } catch (e) {
            return next(e);
          }
        }
      }

      // No handler found
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Not Found' }));
    }

    next();
  }

  /**
   * Add middleware
   */
  app.use = function(pathOrHandler, handler) {
    let path = '/';
    let fn = pathOrHandler;

    if (typeof pathOrHandler === 'string') {
      path = pathOrHandler;
      fn = handler;
    }

    const compiled = pathToRegexp(path, {
      end: false,
      strict: false,
      sensitive: false
    });

    middleware.push({
      path,
      regexp: compiled.regexp,
      keys: compiled.keys,
      handler: fn,
      isMiddleware: true
    });

    return app;
  };

  // HTTP methods
  ['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
    app[method] = function(path, handler) {
      const compiled = pathToRegexp(path, {
        end: true,
        strict: false,
        sensitive: false
      });

      middleware.push({
        path,
        regexp: compiled.regexp,
        keys: compiled.keys,
        handler,
        method: method.toUpperCase(),
        isMiddleware: false
      });

      return app;
    };
  });

  /**
   * Start listening
   */
  app.listen = function(port, callback) {
    const server = http.createServer(app);
    server.listen(port, callback);
    return server;
  };

  return app;
}

/**
 * Check if a layer matches the request
 */
function matchLayer(layer, req) {
  // Check method
  if (layer.method && layer.method !== req.method) {
    return false;
  }

  // Check path
  return layer.regexp.test(req.path);
}

/**
 * Extract route parameters
 */
function extractParams(layer, path) {
  const match = layer.regexp.exec(path);
  const params = {};

  if (match && layer.keys) {
    layer.keys.forEach((key, i) => {
      params[key.name] = match[i + 1];
    });
  }

  return params;
}

/**
 * Enhance response object with Express-like methods
 */
function enhanceResponse(req, res) {
  // JSON response
  res.json = function(data) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return res;
  };

  // Status code setter
  res.status = function(code) {
    res.statusCode = code;
    return res;
  };

  // Send response
  res.send = function(data) {
    if (typeof data === 'object') {
      return res.json(data);
    }
    res.setHeader('Content-Type', 'text/html');
    res.end(String(data));
    return res;
  };

  // Redirect
  res.redirect = function(statusOrUrl, url) {
    let status = 302;
    let location = statusOrUrl;

    if (typeof statusOrUrl === 'number') {
      status = statusOrUrl;
      location = url;
    }

    res.statusCode = status;
    res.setHeader('Location', location);
    res.end();
    return res;
  };

  /**
   * Set a cookie
   *
   * @param {string} name - Cookie name
   * @param {string|Object} value - Cookie value
   * @param {Object} [options] - Cookie options
   * @returns {Response} For chaining
   */
  res.cookie = function(name, value, options = {}) {
    const opts = { path: '/', ...options };

    // Handle JSON values
    let val = value;
    if (typeof value === 'object' && value !== null) {
      val = 'j:' + JSON.stringify(value);
    } else {
      val = String(value);
    }

    // Sign cookie if requested
    if (opts.signed) {
      if (!req.secret) {
        throw new Error('cookieParser("secret") required for signed cookies');
      }
      val = sign(val, req.secret);
      delete opts.signed;
    }

    // Handle maxAge -> expires conversion
    if (opts.maxAge != null) {
      opts.expires = new Date(Date.now() + opts.maxAge);
    }

    // Serialize and set cookie
    const cookieStr = serializeCookie(name, val, opts);

    // Append to existing Set-Cookie header
    const existing = res.getHeader('Set-Cookie');
    if (existing) {
      const cookies = Array.isArray(existing) ? existing : [existing];
      cookies.push(cookieStr);
      res.setHeader('Set-Cookie', cookies);
    } else {
      res.setHeader('Set-Cookie', cookieStr);
    }

    return res;
  };

  /**
   * Clear a cookie
   *
   * @param {string} name - Cookie name
   * @param {Object} [options] - Cookie options (path, domain must match)
   * @returns {Response} For chaining
   */
  res.clearCookie = function(name, options = {}) {
    const opts = {
      path: '/',
      ...options,
      expires: new Date(1), // Set to past date
      maxAge: 0
    };

    return res.cookie(name, '', opts);
  };
}

// Export factory function and middleware
module.exports = createApp;
module.exports.createApp = createApp;
module.exports.cookieParser = cookieParser;
module.exports.session = session;
module.exports.MemoryStore = MemoryStore;
