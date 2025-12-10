/**
 * Route Class
 *
 * A Route is a collection of handlers for a specific path.
 * It groups multiple HTTP method handlers (GET, POST, etc.) for the same path.
 *
 * Example:
 *   router.route('/users')
 *     .get(listUsers)
 *     .post(createUser);
 */

'use strict';

const Layer = require('./layer');

// HTTP methods
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

/**
 * Route class
 */
class Route {
  /**
   * Create a new Route
   *
   * @param {string} path - Route path
   */
  constructor(path) {
    this.path = path;
    this.stack = []; // Layers for this route
    this.methods = {}; // Track which methods have handlers
  }

  /**
   * Check if this route handles a method
   *
   * @param {string} method - HTTP method
   * @returns {boolean}
   */
  _handles_method(method) {
    if (this.methods._all) {
      return true;
    }

    let name = method.toLowerCase();

    // HEAD falls back to GET
    if (name === 'head' && !this.methods['head']) {
      name = 'get';
    }

    return Boolean(this.methods[name]);
  }

  /**
   * Get supported methods
   *
   * @returns {string[]}
   */
  _options() {
    const methods = Object.keys(this.methods)
      .filter(m => m !== '_all')
      .map(m => m.toUpperCase());

    return methods;
  }

  /**
   * Dispatch request to route handlers
   *
   * @param {Object} req - Request
   * @param {Object} res - Response
   * @param {Function} done - Callback when done
   */
  dispatch(req, res, done) {
    let index = 0;
    const stack = this.stack;
    const method = req.method.toLowerCase();

    // Check if method is handled
    if (!this._handles_method(method)) {
      return done();
    }

    next();

    function next(err) {
      // Signal to skip remaining route handlers
      if (err && err === 'route') {
        return done();
      }

      // Signal to skip remaining handlers on router
      if (err && err === 'router') {
        return done(err);
      }

      const layer = stack[index++];

      if (!layer) {
        return done(err);
      }

      // Check method matches
      if (layer.method && layer.method !== method && layer.method !== 'all') {
        return next(err);
      }

      // Handle error or regular
      if (err) {
        layer.handleRequest(err, req, res, next);
      } else {
        layer.handleRequest(null, req, res, next);
      }
    }
  }

  /**
   * Add handler for all methods
   *
   * @param {...Function} handlers - Handler functions
   * @returns {Route} this for chaining
   */
  all(...handlers) {
    handlers.forEach(handler => {
      const layer = new Layer('/', {}, handler);
      layer.method = 'all';
      this.methods._all = true;
      this.stack.push(layer);
    });

    return this;
  }
}

// Add HTTP method handlers
METHODS.forEach(method => {
  Route.prototype[method] = function(...handlers) {
    handlers.forEach(handler => {
      const layer = new Layer('/', {}, handler);
      layer.method = method;
      this.methods[method] = true;
      this.stack.push(layer);
    });

    return this;
  };
});

module.exports = Route;
