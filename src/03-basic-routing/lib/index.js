/**
 * Step 03: Basic Routing
 *
 * This module creates an application with Express-like routing.
 * It supports:
 * - Method-specific route handlers (get, post, put, delete, etc.)
 * - Path parameters (:id, :name)
 * - Route chaining with app.route()
 */

'use strict';

const http = require('http');
const { URL } = require('url');
const Layer = require('./layer');
const Route = require('./route');
const { pathToRegexp, normalizePath } = require('./path-to-regexp');

// Apply request/response enhancements from Step 02
// We import them to ensure the prototypes are extended
const requestEnhancements = require('../../02-request-response-enhancement/lib/request');
const responseEnhancements = require('../../02-request-response-enhancement/lib/response');

/**
 * HTTP methods supported by the application.
 */
const METHODS = [
  'get', 'post', 'put', 'delete', 'patch',
  'options', 'head', 'all'
];

/**
 * Create a new application with routing capabilities.
 *
 * @returns {Function} Application function
 *
 * @example
 * const app = createApplication();
 *
 * app.get('/', (req, res) => {
 *   res.send('Home');
 * });
 *
 * app.get('/users/:id', (req, res) => {
 *   res.json({ userId: req.params.id });
 * });
 *
 * app.listen(3000);
 */
function createApplication() {
  // The stack of layers (routes)
  const stack = [];

  /**
   * The main application function.
   * This is called for each incoming request.
   */
  function app(req, res) {
    // Link req and res
    req.res = res;
    res.req = req;

    // Parse URL
    try {
      const protocol = req.socket?.encrypted ? 'https' : 'http';
      const host = req.headers.host || 'localhost';
      const url = new URL(req.url, `${protocol}://${host}`);

      req.path = url.pathname;
      req.hostname = url.hostname;
      req.originalUrl = req.url;

      // Parse query string
      req.query = {};
      for (const [key, value] of url.searchParams) {
        if (req.query[key] !== undefined) {
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
      req.path = req.url?.split('?')[0] || '/';
      req.query = {};
    }

    // Initialize params
    req.params = {};

    // Record timing
    req._startTime = Date.now();

    // Handle the request
    app.handle(req, res);
  }

  /**
   * Handle a request by finding and executing matching routes.
   *
   * @param {http.IncomingMessage} req - Request object
   * @param {http.ServerResponse} res - Response object
   * @param {Function} [finalHandler] - Called when no routes match
   */
  app.handle = function handle(req, res, finalHandler) {
    const method = req.method.toLowerCase();
    const path = req.path;
    let idx = 0;

    // Default final handler
    const done = finalHandler || function(err) {
      if (err) {
        const status = err.status || err.statusCode || 500;
        const message = err.message || 'Internal Server Error';

        if (!res.headersSent) {
          res.status(status).json({
            error: http.STATUS_CODES[status] || 'Error',
            message: process.env.NODE_ENV === 'development' ? message : undefined
          });
        }
      } else {
        // No route matched
        res.status(404).json({
          error: 'Not Found',
          message: `Cannot ${req.method} ${req.path}`
        });
      }
    };

    // Find and execute matching layers
    function next(err) {
      // No more layers
      if (idx >= stack.length) {
        return done(err);
      }

      const layer = stack[idx++];

      // Check if layer matches path
      if (!layer.match(path)) {
        return next(err);
      }

      // Get the route
      const route = layer.route;

      // If no route, it's middleware (handled in Step 04)
      if (!route) {
        return layer.handleRequest(req, res, next);
      }

      // Check if route handles this method
      if (!route.handlesMethod(method)) {
        return next(err);
      }

      // Attach params to request
      req.params = { ...req.params, ...layer.params };

      // Dispatch to route
      if (err) {
        return next(err);
      }

      route.dispatch(req, res, next);
    }

    next();
  };

  /**
   * Create a route for the given path.
   *
   * @param {string} path - Route path
   * @returns {Route} Route object for chaining
   *
   * @example
   * app.route('/users')
   *   .get((req, res) => res.send('List'))
   *   .post((req, res) => res.send('Create'));
   */
  app.route = function route(path) {
    const route = new Route(path);
    const layer = new Layer(path, (req, res, next) => {
      route.dispatch(req, res, next);
    }, { end: true });

    layer.route = route;
    stack.push(layer);

    return route;
  };

  /**
   * Register a handler for all HTTP methods.
   *
   * @param {string} path - Route path
   * @param {...Function} handlers - Handler functions
   * @returns {Function} app (for chaining)
   */
  app.all = function all(path, ...handlers) {
    const route = app.route(path);
    route.all(...handlers);
    return app;
  };

  // Add method-specific route registration
  METHODS.forEach(method => {
    if (method === 'all') return;

    /**
     * Register a handler for a specific HTTP method.
     *
     * @param {string} path - Route path
     * @param {...Function} handlers - Handler functions
     * @returns {Function} app (for chaining)
     */
    app[method] = function(path, ...handlers) {
      const route = app.route(path);
      route[method](...handlers);
      return app;
    };
  });

  /**
   * Start the server listening on a port.
   *
   * @param {number} port - Port to listen on
   * @param {Function} [callback] - Called when server starts
   * @returns {http.Server}
   */
  app.listen = function listen(port, callback) {
    const server = http.createServer(app);
    server.listen(port, callback);
    return server;
  };

  /**
   * Get or set application settings.
   *
   * @param {string} key - Setting name
   * @param {any} [value] - Setting value (if setting)
   * @returns {any} Setting value (if getting) or app (if setting)
   */
  app.settings = {};

  app.set = function set(key, value) {
    if (arguments.length === 1) {
      return app.settings[key];
    }
    app.settings[key] = value;
    return app;
  };

  app.get = (function() {
    const originalGet = app.get;
    return function(key, ...handlers) {
      // If just one arg and it's a string, it's a setting get
      if (arguments.length === 1 && typeof key === 'string' && handlers.length === 0) {
        // Check if it looks like a path
        if (!key.startsWith('/') && !key.includes(':')) {
          return app.settings[key];
        }
      }
      // Otherwise it's a route
      return originalGet.call(app, key, ...handlers);
    };
  })();

  app.enable = function enable(key) {
    return app.set(key, true);
  };

  app.disable = function disable(key) {
    return app.set(key, false);
  };

  app.enabled = function enabled(key) {
    return !!app.settings[key];
  };

  app.disabled = function disabled(key) {
    return !app.settings[key];
  };

  // Application locals (for templates, etc.)
  app.locals = {};

  return app;
}

// Export
module.exports = {
  createApplication,
  Layer,
  Route,
  pathToRegexp,
  normalizePath
};
