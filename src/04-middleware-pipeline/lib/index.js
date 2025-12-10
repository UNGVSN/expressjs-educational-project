/**
 * Application with Middleware Pipeline
 *
 * This module implements an Express-like application with a full
 * middleware pipeline, including the crucial next() function.
 *
 * Key features:
 * - app.use() for middleware registration
 * - Path-based middleware (only run for specific paths)
 * - Error handling middleware (4-argument functions)
 * - app.route() for method chaining
 * - HTTP method shortcuts (get, post, etc.)
 */

'use strict';

const http = require('node:http');
const { URL } = require('node:url');
const Layer = require('./layer');
const { normalizePath, flatten } = require('./utils');

// HTTP methods to support
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'all'];

/**
 * Create a new application
 * @returns {Application} New application instance
 */
function createApplication() {
  const app = new Application();
  return app;
}

/**
 * Application class
 *
 * The application is the main entry point. It maintains a stack
 * of middleware layers and handles incoming requests.
 */
class Application {
  constructor() {
    /**
     * Middleware stack
     * Each layer has: { path, handle, regexp, keys, isErrorHandler }
     * @type {Layer[]}
     */
    this.stack = [];

    /**
     * Application settings
     * @type {Object}
     */
    this.settings = {
      'x-powered-by': true,
      'env': process.env.NODE_ENV || 'development'
    };

    /**
     * Request handler bound to this application
     * @type {Function}
     */
    this.handler = this.handle.bind(this);

    // Set up HTTP method shortcuts
    this._setupMethods();
  }

  /**
   * Set up HTTP method shortcut functions
   * @private
   */
  _setupMethods() {
    METHODS.forEach(method => {
      this[method] = function(path, ...handlers) {
        // Flatten in case handlers is an array
        handlers = flatten(handlers);

        // Add a layer for each handler
        handlers.forEach(handler => {
          const layer = new Layer(path, { end: true }, handler);
          layer.method = method === 'all' ? null : method.toUpperCase();
          this.stack.push(layer);
        });

        return this;
      };
    });
  }

  /**
   * Add middleware to the application
   *
   * @param {string|Function} path - Path or middleware function
   * @param {...Function} handlers - Middleware functions
   * @returns {Application} this for chaining
   *
   * @example
   * // Global middleware
   * app.use((req, res, next) => next());
   *
   * // Path-specific middleware
   * app.use('/api', apiMiddleware);
   *
   * // Multiple handlers
   * app.use(handler1, handler2, handler3);
   */
  use(path, ...handlers) {
    // Handle app.use(fn) - no path specified
    if (typeof path === 'function') {
      handlers = [path, ...handlers];
      path = '/';
    }

    // Handle app.use(path) with no handlers
    if (handlers.length === 0) {
      throw new TypeError('app.use() requires middleware functions');
    }

    // Flatten handlers array
    handlers = flatten(handlers);

    // Validate handlers
    handlers.forEach(fn => {
      if (typeof fn !== 'function') {
        throw new TypeError('app.use() requires middleware functions');
      }
    });

    // Normalize path
    path = normalizePath(path);

    // Create a layer for each handler
    handlers.forEach(handler => {
      // Middleware uses prefix matching (end: false)
      const layer = new Layer(path, { end: false }, handler);
      layer.method = null; // Match all methods
      this.stack.push(layer);
    });

    return this;
  }

  /**
   * Create a route for chaining method handlers
   *
   * @param {string} path - Route path
   * @returns {Object} Route object with method handlers
   *
   * @example
   * app.route('/users')
   *   .get((req, res) => { ... })
   *   .post((req, res) => { ... });
   */
  route(path) {
    const route = {};

    // Add method handlers
    METHODS.forEach(method => {
      route[method] = (...handlers) => {
        handlers = flatten(handlers);

        handlers.forEach(handler => {
          const layer = new Layer(path, { end: true }, handler);
          layer.method = method === 'all' ? null : method.toUpperCase();
          this.stack.push(layer);
        });

        return route; // Enable chaining
      };
    });

    return route;
  }

  /**
   * Set an application setting
   *
   * @param {string} name - Setting name
   * @param {*} [value] - Setting value
   * @returns {*} Value if getting, this if setting
   */
  set(name, value) {
    if (arguments.length === 1) {
      return this.settings[name];
    }
    this.settings[name] = value;
    return this;
  }

  /**
   * Get an application setting
   *
   * @param {string} name - Setting name
   * @returns {*} Setting value
   */
  get(name) {
    return this.settings[name];
  }

  /**
   * Handle an incoming request
   *
   * This is the core of the middleware pipeline. It:
   * 1. Sets up the request/response objects
   * 2. Creates the next() function
   * 3. Iterates through the middleware stack
   *
   * @param {http.IncomingMessage} req - Request object
   * @param {http.ServerResponse} res - Response object
   * @param {Function} [finalHandler] - Called when stack is exhausted
   */
  handle(req, res, finalHandler) {
    const stack = this.stack;
    let index = 0;

    // Enhance request with parsed URL
    this._setupRequest(req);

    // Enhance response with helper methods
    this._setupResponse(res);

    // Add X-Powered-By header if enabled
    if (this.settings['x-powered-by']) {
      res.setHeader('X-Powered-By', 'Mini-Express');
    }

    // Default final handler (404)
    const done = finalHandler || function(err) {
      if (err) {
        // Error occurred
        res.statusCode = err.status || err.statusCode || 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: err.message || 'Internal Server Error'
        }));
      } else {
        // No route matched
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: 'Not Found',
          path: req.url
        }));
      }
    };

    /**
     * The next() function
     *
     * This is passed to each middleware and allows them to:
     * 1. Pass control to the next middleware: next()
     * 2. Pass an error: next(err)
     * 3. Skip remaining route handlers: next('route')
     *
     * @param {Error|string} [err] - Error or 'route' to skip
     */
    function next(err) {
      // Skip to error handler if 'route' is passed
      const skipRoute = err === 'route';
      if (skipRoute) {
        err = null;
      }

      // Get the next layer
      let layer;
      let match = false;

      while (!match && index < stack.length) {
        layer = stack[index++];

        // Check if path matches
        match = layer.match(req.path);

        if (!match) {
          continue;
        }

        // Check if method matches (null matches all)
        if (layer.method !== null && layer.method !== req.method) {
          match = false;
          continue;
        }

        // If we're skipping to next route, skip route handlers
        // (middleware with end: false is not a route)
        if (skipRoute && layer.options.end) {
          match = false;
          continue;
        }
      }

      // No more layers
      if (!match) {
        return done(err);
      }

      // Store params on request
      req.params = { ...req.params, ...layer.params };

      // Calculate base path for mounted middleware
      const origUrl = req.url;
      const origPath = req.path;

      if (!layer.options.end) {
        // For middleware, strip the matched path
        const matchedPath = layer.getMatchedPath();
        if (matchedPath && matchedPath !== '/') {
          req.baseUrl = (req.baseUrl || '') + matchedPath;
          // Update path by removing matched portion
          const newPath = req.path.slice(matchedPath.length) || '/';
          req.url = newPath + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
          req.path = newPath;
        }
      }

      // Call the layer's handler
      layer.handleRequest(err, req, res, function(layerErr) {
        // Restore original URL/path
        req.url = origUrl;
        req.path = origPath;

        // Continue to next middleware
        next(layerErr);
      });
    }

    // Start the middleware chain
    next();
  }

  /**
   * Set up request with parsed URL and helper methods
   * @private
   */
  _setupRequest(req) {
    // Parse URL
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // Basic properties
    req.path = parsedUrl.pathname;
    req.query = Object.fromEntries(parsedUrl.searchParams);
    req.params = {};
    req.baseUrl = '';

    // Helper method to get header
    req.get = function(name) {
      const lc = name.toLowerCase();
      if (lc === 'referer' || lc === 'referrer') {
        return this.headers.referrer || this.headers.referer;
      }
      return this.headers[lc];
    };
  }

  /**
   * Set up response with helper methods
   * @private
   */
  _setupResponse(res) {
    // Status code setter (chainable)
    res.status = function(code) {
      this.statusCode = code;
      return this;
    };

    // JSON response
    res.json = function(obj) {
      const body = JSON.stringify(obj);
      this.setHeader('Content-Type', 'application/json');
      this.end(body);
      return this;
    };

    // Send response (auto-detect type)
    res.send = function(body) {
      if (typeof body === 'object') {
        return this.json(body);
      }
      if (typeof body === 'string') {
        if (!this.getHeader('Content-Type')) {
          this.setHeader('Content-Type', body.startsWith('<') ? 'text/html' : 'text/plain');
        }
      }
      this.end(body);
      return this;
    };

    // Set header (chainable)
    res.set = function(field, value) {
      if (typeof field === 'object') {
        Object.keys(field).forEach(key => {
          this.setHeader(key, field[key]);
        });
      } else {
        this.setHeader(field, value);
      }
      return this;
    };

    // Redirect
    res.redirect = function(statusOrUrl, url) {
      let status = 302;
      if (typeof statusOrUrl === 'number') {
        status = statusOrUrl;
      } else {
        url = statusOrUrl;
      }
      this.statusCode = status;
      this.setHeader('Location', url);
      this.end();
      return this;
    };
  }

  /**
   * Create HTTP server and start listening
   *
   * @param {number} port - Port number
   * @param {string} [hostname] - Hostname
   * @param {Function} [callback] - Callback when server starts
   * @returns {http.Server} HTTP server
   */
  listen(port, hostname, callback) {
    // Handle optional hostname
    if (typeof hostname === 'function') {
      callback = hostname;
      hostname = undefined;
    }

    const server = http.createServer(this.handler);
    return server.listen(port, hostname, callback);
  }
}

// Export factory function and class
module.exports = createApplication;
module.exports.Application = Application;
module.exports.Layer = Layer;
