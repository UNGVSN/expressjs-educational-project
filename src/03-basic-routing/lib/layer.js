/**
 * Layer Class
 *
 * A Layer represents a single route handler with its path pattern.
 * It's responsible for:
 * - Matching incoming request paths against its pattern
 * - Extracting route parameters
 * - Invoking its handler function
 *
 * In Express, layers are used both for routes and middleware.
 */

'use strict';

const { pathToRegexp, extractParams } = require('./path-to-regexp');

class Layer {
  /**
   * Create a new Layer.
   *
   * @param {string} path - Path pattern
   * @param {Function} handler - Handler function
   * @param {Object} [options] - Options
   * @param {string} [options.method] - HTTP method (get, post, etc.)
   * @param {boolean} [options.end=true] - Match to end of string
   * @param {string} [options.name] - Layer name for debugging
   */
  constructor(path, handler, options = {}) {
    // Validate handler
    if (typeof handler !== 'function') {
      throw new TypeError('Handler must be a function');
    }

    this.path = path;
    this.handler = handler;
    this.method = options.method ? options.method.toLowerCase() : null;
    this.name = options.name || handler.name || '<anonymous>';

    // Compile path pattern
    const { regexp, keys } = pathToRegexp(path, {
      end: options.end !== false,
      strict: options.strict || false,
      sensitive: options.sensitive || false
    });

    this.regexp = regexp;
    this.keys = keys;

    // Extracted params (populated on match)
    this.params = null;

    // Store original path for debugging
    this.route = options.route || null;
  }

  /**
   * Check if this layer matches the given path.
   *
   * @param {string} path - Path to match
   * @returns {boolean} Whether the path matches
   */
  match(path) {
    // Handle root path
    if (path === '/' && this.path === '/' && !this.regexp) {
      this.params = {};
      return true;
    }

    // Try to match the regexp
    const match = this.regexp.exec(path);

    if (!match) {
      this.params = null;
      return false;
    }

    // Extract params from the match
    this.params = {};

    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keys[i];
      const value = match[i + 1];

      if (value !== undefined) {
        try {
          this.params[key.name] = decodeURIComponent(value);
        } catch (e) {
          this.params[key.name] = value;
        }
      } else if (key.optional) {
        this.params[key.name] = undefined;
      }
    }

    return true;
  }

  /**
   * Handle a request by invoking the handler.
   *
   * @param {http.IncomingMessage} req - Request object
   * @param {http.ServerResponse} res - Response object
   * @param {Function} next - Next function
   */
  handleRequest(req, res, next) {
    const fn = this.handler;

    // Check handler arity for error handling
    if (fn.length > 3) {
      // This is an error handler, skip
      return next();
    }

    try {
      fn(req, res, next);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Handle an error by invoking an error handler.
   *
   * @param {Error} err - Error object
   * @param {http.IncomingMessage} req - Request object
   * @param {http.ServerResponse} res - Response object
   * @param {Function} next - Next function
   */
  handleError(err, req, res, next) {
    const fn = this.handler;

    // Only error handlers have 4 parameters
    if (fn.length !== 4) {
      return next(err);
    }

    try {
      fn(err, req, res, next);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a string representation for debugging.
   *
   * @returns {string}
   */
  toString() {
    return `[Layer ${this.method || 'ALL'} ${this.path} -> ${this.name}]`;
  }
}

module.exports = Layer;
