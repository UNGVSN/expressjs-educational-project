/**
 * Router - Modular route handler
 *
 * Allows grouping of routes under a common path prefix.
 * Similar to Express.js Router.
 */

'use strict';

const Layer = require('./layer');

class Router {
  constructor(options = {}) {
    this.stack = [];
    this.caseSensitive = options.caseSensitive || false;
    this.strict = options.strict || false;
  }

  /**
   * Add middleware to the router
   *
   * @param {string|Function} path - Path or handler
   * @param {...Function} handlers - Handler functions
   * @returns {Router} For chaining
   */
  use(path, ...handlers) {
    let routePath = '/';
    let fns = handlers;

    if (typeof path === 'function') {
      fns = [path, ...handlers];
    } else {
      routePath = path;
    }

    for (const fn of fns) {
      const layer = new Layer(routePath, { end: false }, fn);
      layer.isMiddleware = true;
      this.stack.push(layer);
    }

    return this;
  }

  /**
   * Add a route for a specific HTTP method
   *
   * @param {string} method - HTTP method
   * @param {string} path - Route path
   * @param {...Function} handlers - Handler functions
   * @returns {Router} For chaining
   */
  route(method, path, ...handlers) {
    for (const handler of handlers) {
      const layer = new Layer(path, {
        end: true,
        strict: this.strict,
        sensitive: this.caseSensitive
      }, handler);
      layer.method = method.toUpperCase();
      this.stack.push(layer);
    }

    return this;
  }

  /**
   * Handle a request through this router
   *
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} done - Done callback
   */
  handle(req, res, done) {
    let idx = 0;
    const stack = this.stack;

    const next = (err) => {
      // Exit if exhausted
      if (idx >= stack.length) {
        setImmediate(done, err);
        return;
      }

      // Get next layer
      const layer = stack[idx++];

      // Match path
      if (!layer.match(req.path)) {
        return next(err);
      }

      // Check method
      if (layer.method && layer.method !== req.method) {
        return next(err);
      }

      // Attach params
      req.params = { ...req.params, ...layer.params };

      // Handle error or request
      if (err) {
        layer.handleError(err, req, res, next);
      } else {
        layer.handleRequest(req, res, next);
      }
    };

    next();
  }

  /**
   * Create route methods (get, post, put, delete, patch, etc.)
   */
  _createMethod(method) {
    return function(path, ...handlers) {
      return this.route(method, path, ...handlers);
    };
  }
}

// Add HTTP method shortcuts
['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].forEach(method => {
  Router.prototype[method] = function(path, ...handlers) {
    return this.route(method, path, ...handlers);
  };
});

// Add 'all' method
Router.prototype.all = function(path, ...handlers) {
  for (const handler of handlers) {
    const layer = new Layer(path, {
      end: true,
      strict: this.strict,
      sensitive: this.caseSensitive
    }, handler);
    // No method restriction
    this.stack.push(layer);
  }
  return this;
};

module.exports = Router;
