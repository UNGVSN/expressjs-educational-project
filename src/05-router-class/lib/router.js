/**
 * Router Class
 *
 * The Router is a mini-application that handles routes and middleware.
 * It can be mounted on an application to create modular route handlers.
 *
 * Key features:
 * - HTTP method routing (get, post, put, delete, etc.)
 * - Middleware support (router.use())
 * - Route chaining (router.route())
 * - Parameter preprocessing (router.param())
 * - Path prefix when mounted
 */

'use strict';

const Layer = require('./layer');
const Route = require('./route');

// HTTP methods
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

/**
 * Router class
 */
class Router {
  /**
   * Create a new Router
   *
   * @param {Object} [options] - Router options
   * @param {boolean} [options.caseSensitive=false] - Case sensitive routing
   * @param {boolean} [options.strict=false] - Strict routing (trailing slash)
   * @param {boolean} [options.mergeParams=false] - Merge parent params
   */
  constructor(options = {}) {
    this.stack = [];
    this.params = {};
    this.caseSensitive = options.caseSensitive || false;
    this.strict = options.strict || false;
    this.mergeParams = options.mergeParams || false;

    // Make router callable as middleware
    // This allows: app.use('/api', router)
    const self = this;
    const handle = function(req, res, next) {
      self.handle(req, res, next);
    };

    // Copy prototype methods to handle function
    Object.setPrototypeOf(handle, Router.prototype);

    // Copy instance properties
    handle.stack = this.stack;
    handle.params = this.params;
    handle.caseSensitive = this.caseSensitive;
    handle.strict = this.strict;
    handle.mergeParams = this.mergeParams;

    return handle;
  }

  /**
   * Register a parameter handler
   *
   * When a route with the parameter is matched, this handler runs first.
   *
   * @param {string} name - Parameter name
   * @param {Function} handler - Handler function (req, res, next, value)
   * @returns {Router} this for chaining
   *
   * @example
   * router.param('id', (req, res, next, id) => {
   *   req.user = users.find(u => u.id === id);
   *   if (!req.user) return res.status(404).json({ error: 'Not found' });
   *   next();
   * });
   */
  param(name, handler) {
    if (!this.params[name]) {
      this.params[name] = [];
    }
    this.params[name].push(handler);
    return this;
  }

  /**
   * Add middleware to the router
   *
   * @param {string|Function} path - Path or handler
   * @param {...Function} handlers - Handler functions
   * @returns {Router} this for chaining
   */
  use(path, ...handlers) {
    // Handle router.use(fn)
    if (typeof path === 'function') {
      handlers = [path, ...handlers];
      path = '/';
    }

    // Handle router.use(path) with no handlers
    if (handlers.length === 0) {
      throw new TypeError('Router.use() requires middleware functions');
    }

    // Flatten handlers
    handlers = handlers.flat();

    // Validate handlers
    handlers.forEach(fn => {
      if (typeof fn !== 'function') {
        throw new TypeError(`Router.use() requires middleware function but got: ${typeof fn}`);
      }
    });

    // Add layers
    handlers.forEach(fn => {
      // Check if it's a sub-router or sub-app
      const isRouter = fn.handle && fn.stack;

      const layer = new Layer(path, { end: false }, fn);
      layer.route = undefined; // Mark as middleware, not route

      this.stack.push(layer);
    });

    return this;
  }

  /**
   * Create a route for chaining
   *
   * @param {string} path - Route path
   * @returns {Route} Route object
   *
   * @example
   * router.route('/users')
   *   .get(listUsers)
   *   .post(createUser);
   */
  route(path) {
    const route = new Route(path);

    const layer = new Layer(path, { end: true }, route.dispatch.bind(route));
    layer.route = route;

    this.stack.push(layer);

    return route;
  }

  /**
   * Handle an incoming request
   *
   * This method dispatches the request through the middleware stack.
   *
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} done - Called when done
   */
  handle(req, res, done) {
    const self = this;
    let index = 0;
    const stack = this.stack;

    // Store original URL info for path manipulation
    const originalUrl = req.originalUrl || req.url;
    const baseUrl = req.baseUrl || '';

    // Ensure req.originalUrl exists
    if (!req.originalUrl) {
      req.originalUrl = req.url;
    }

    // Get params from parent if merging
    const parentParams = req.params || {};

    // Process param handlers for matched params
    const processParams = (layerParams, callback) => {
      const paramNames = Object.keys(layerParams);
      let paramIndex = 0;

      function nextParam(err) {
        if (err) return callback(err);

        const paramName = paramNames[paramIndex++];
        if (!paramName) return callback();

        const paramValue = layerParams[paramName];
        const paramHandlers = self.params[paramName];

        if (!paramHandlers || paramHandlers.length === 0) {
          return nextParam();
        }

        let handlerIndex = 0;

        function nextHandler(err) {
          if (err) return callback(err);

          const handler = paramHandlers[handlerIndex++];
          if (!handler) return nextParam();

          try {
            handler(req, res, nextHandler, paramValue, paramName);
          } catch (e) {
            nextHandler(e);
          }
        }

        nextHandler();
      }

      nextParam();
    };

    // Next function
    function next(err) {
      // Signal to exit router
      if (err === 'router') {
        return done();
      }

      // Get next layer
      const layer = stack[index++];

      // No more layers
      if (!layer) {
        return done(err);
      }

      // Determine the path to match against
      const path = req.path || '/';

      // Check if path matches
      if (!layer.match(path)) {
        return next(err);
      }

      // Check HTTP method for routes
      if (layer.route) {
        const route = layer.route;
        const method = req.method.toLowerCase();

        if (!route._handles_method(method)) {
          return next(err);
        }
      }

      // Store params
      const layerParams = layer.params;

      // Merge params
      if (self.mergeParams && parentParams) {
        req.params = { ...parentParams, ...layerParams };
      } else {
        req.params = { ...req.params, ...layerParams };
      }

      // Store matched path for middleware path stripping
      if (!layer.route) {
        // Middleware - strip matched path
        const matchedPath = layer.getMatchedPath();

        if (matchedPath && matchedPath !== '/' && matchedPath !== path) {
          // Strip the matched prefix from the path
          const newPath = path.slice(matchedPath.length) || '/';

          // Update req for the next middleware/router
          req.baseUrl = baseUrl + matchedPath;
          req.url = newPath + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
          req.path = newPath;
        }
      }

      // Process param handlers then call layer
      processParams(layerParams, (paramErr) => {
        if (paramErr) {
          // Restore URL
          req.url = originalUrl;
          req.baseUrl = baseUrl;
          req.path = path;
          return next(paramErr);
        }

        // Call the layer handler
        layer.handleRequest(err, req, res, (layerErr) => {
          // Restore URL after middleware/router
          if (!layer.route) {
            req.url = originalUrl;
            req.baseUrl = baseUrl;
            req.path = path;
          }

          next(layerErr);
        });
      });
    }

    // Start processing
    next();
  }
}

// Add HTTP method shortcuts
METHODS.forEach(method => {
  Router.prototype[method] = function(path, ...handlers) {
    const route = this.route(path);
    route[method](...handlers);
    return this;
  };
});

// Add 'all' method
Router.prototype.all = function(path, ...handlers) {
  const route = this.route(path);
  route.all(...handlers);
  return this;
};

module.exports = Router;
