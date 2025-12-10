/**
 * Route Class
 *
 * A Route represents a path that can have multiple handlers
 * for different HTTP methods. It's like a mini-router for a
 * single path.
 *
 * In Express, routes allow you to chain method handlers:
 *   app.route('/users')
 *     .get(listUsers)
 *     .post(createUser);
 */

'use strict';

const Layer = require('./layer');

/**
 * HTTP methods that Route supports.
 */
const METHODS = [
  'get', 'post', 'put', 'delete', 'patch',
  'options', 'head', 'all'
];

class Route {
  /**
   * Create a new Route.
   *
   * @param {string} path - Route path
   */
  constructor(path) {
    this.path = path;
    this.stack = [];      // Layers for this route
    this.methods = {};    // Methods this route handles
  }

  /**
   * Check if this route handles a specific method.
   *
   * @param {string} method - HTTP method
   * @returns {boolean}
   */
  handlesMethod(method) {
    const name = method.toLowerCase();

    if (name === 'head' && !this.methods.head) {
      // HEAD is implicitly handled if GET is defined
      return !!this.methods.get;
    }

    return !!this.methods[name] || !!this.methods.all;
  }

  /**
   * Get the allowed methods for this route.
   *
   * @returns {string[]} Array of method names
   */
  allowedMethods() {
    const methods = Object.keys(this.methods)
      .filter(m => m !== 'all' && this.methods[m])
      .map(m => m.toUpperCase());

    // Add HEAD if GET is allowed
    if (this.methods.get && !this.methods.head) {
      methods.push('HEAD');
    }

    return methods;
  }

  /**
   * Dispatch a request to this route.
   *
   * @param {http.IncomingMessage} req - Request object
   * @param {http.ServerResponse} res - Response object
   * @param {Function} done - Called when all handlers complete
   */
  dispatch(req, res, done) {
    let idx = 0;
    const stack = this.stack;
    const method = req.method.toLowerCase();

    // Handle HEAD as GET
    const effectiveMethod = method === 'head' ? 'get' : method;

    if (stack.length === 0) {
      return done();
    }

    const next = (err) => {
      // Handle errors
      if (err && err === 'route') {
        // Skip to next route
        return done();
      }

      // No more handlers
      if (idx >= stack.length) {
        return done(err);
      }

      const layer = stack[idx++];

      // Check if this layer handles the method
      if (layer.method && layer.method !== effectiveMethod && layer.method !== 'all') {
        return next(err);
      }

      if (err) {
        // Pass errors to error handlers
        layer.handleError(err, req, res, next);
      } else {
        layer.handleRequest(req, res, next);
      }
    };

    next();
  }

  /**
   * Add handlers for a specific HTTP method.
   *
   * @param {string} method - HTTP method
   * @param {...Function} handlers - Handler functions
   * @returns {Route} this (for chaining)
   */
  addHandler(method, ...handlers) {
    const methodLower = method.toLowerCase();

    for (const handler of handlers) {
      if (typeof handler !== 'function') {
        throw new TypeError('Handler must be a function');
      }

      const layer = new Layer('/', handler, {
        method: methodLower,
        end: true
      });

      layer.route = this;
      this.methods[methodLower] = true;
      this.stack.push(layer);
    }

    return this;
  }

  /**
   * Handle all HTTP methods.
   *
   * @param {...Function} handlers - Handler functions
   * @returns {Route} this
   */
  all(...handlers) {
    return this.addHandler('all', ...handlers);
  }
}

// Add method shortcuts
METHODS.forEach(method => {
  if (method !== 'all') {
    Route.prototype[method] = function(...handlers) {
      return this.addHandler(method, ...handlers);
    };
  }
});

module.exports = Route;
