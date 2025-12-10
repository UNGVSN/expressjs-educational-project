/**
 * Layer - Represents a single route or middleware layer
 *
 * A layer contains:
 * - A path pattern (converted to regex)
 * - A handler function
 * - Optional HTTP method restriction
 */

'use strict';

const { pathToRegexp } = require('../../03-basic-routing/lib/path-to-regexp');

class Layer {
  /**
   * Create a new layer
   *
   * @param {string} path - Path pattern
   * @param {Object} options - Layer options
   * @param {Function} handler - Handler function
   */
  constructor(path, options, handler) {
    this.path = path;
    this.handler = handler;
    this.method = options.method || null;
    this.isMiddleware = options.end === false;
    this.name = handler.name || '<anonymous>';

    // Compile path to regexp
    const compiled = pathToRegexp(path, {
      end: options.end !== false,
      strict: options.strict || false,
      sensitive: options.sensitive || false
    });

    this.regexp = compiled.regexp;
    this.keys = compiled.keys;
    this.params = {};
  }

  /**
   * Check if this layer matches the given path
   *
   * @param {string} path - Request path
   * @returns {boolean} True if matches
   */
  match(path) {
    const match = this.regexp.exec(path);

    if (!match) {
      this.params = {};
      return false;
    }

    // Extract parameters
    this.params = {};
    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keys[i];
      const val = match[i + 1];

      if (val !== undefined) {
        this.params[key.name] = decodeParam(val);
      }
    }

    return true;
  }

  /**
   * Handle the request
   *
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next function
   */
  handleRequest(req, res, next) {
    const fn = this.handler;

    if (fn.length > 3) {
      // Error handler - skip
      return next();
    }

    try {
      fn(req, res, next);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Handle error
   *
   * @param {Error} err - Error object
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next function
   */
  handleError(err, req, res, next) {
    const fn = this.handler;

    if (fn.length !== 4) {
      // Not an error handler - skip
      return next(err);
    }

    try {
      fn(err, req, res, next);
    } catch (e) {
      next(e);
    }
  }
}

/**
 * Decode a URI component, handling errors
 */
function decodeParam(val) {
  if (typeof val !== 'string') {
    return val;
  }

  try {
    return decodeURIComponent(val);
  } catch (err) {
    return val;
  }
}

module.exports = Layer;
