/**
 * Layer Class
 *
 * A Layer represents a single middleware or route in the stack.
 * It wraps a handler function and provides path matching logic.
 */

'use strict';

// Characters that need escaping in regex
const SPECIAL_CHARS = /[\\^$.*+?()[\]{}|]/g;

// Parameter pattern :name
const PARAM_PATTERN = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;

/**
 * Layer class
 */
class Layer {
  /**
   * Create a new Layer
   *
   * @param {string} path - Path pattern
   * @param {Object} options - Options
   * @param {Function} fn - Handler function
   */
  constructor(path, options, fn) {
    // Handle overloaded signatures
    if (typeof options === 'function') {
      fn = options;
      options = {};
    }

    this.path = path;
    this.handle = fn;
    this.name = fn.name || '<anonymous>';
    this.params = {};
    this.keys = [];

    // Options
    this.options = {
      end: true,
      strict: false,
      sensitive: false,
      ...options
    };

    // Detect error handler
    this.isErrorHandler = fn.length === 4;

    // Compile path
    this._compile();
  }

  /**
   * Compile path to regexp
   * @private
   */
  _compile() {
    let pattern = this.path;
    this.keys = [];

    // Root path special case for middleware (end: false)
    if (pattern === '/' && !this.options.end) {
      this.regexp = /^\/(?:$|\/)/i;
      this.fastSlash = true;
      return;
    }

    // Root path for exact match (end: true)
    if (pattern === '/' && this.options.end) {
      this.regexp = /^\/$/i;
      return;
    }

    // Handle '*' at the end
    if (pattern === '*') {
      this.regexp = /.*/;
      this.keys = [{ name: '0' }];
      return;
    }

    // Escape special characters
    pattern = pattern.replace(SPECIAL_CHARS, (char) => {
      if (char === ':' || char === '*') return char;
      return '\\' + char;
    });

    // Extract parameters
    let keyIndex = 0;
    pattern = pattern.replace(PARAM_PATTERN, (match, name) => {
      this.keys.push({ name, index: keyIndex++ });
      return '([^\\/]+)';
    });

    // Handle wildcards
    pattern = pattern.replace(/\*/g, () => {
      this.keys.push({ name: String(keyIndex++), wildcard: true });
      return '(.*)';
    });

    // Build final pattern
    const flags = this.options.sensitive ? '' : 'i';

    if (this.options.end) {
      // Exact match for routes - allow optional trailing slash
      pattern = `^${pattern}(?:\\/)?$`;
    } else {
      // Prefix match for middleware - must be at segment boundary
      pattern = pattern.replace(/\/$/, '');
      pattern = `^${pattern}(?:\\/|$)`;
    }

    this.regexp = new RegExp(pattern, flags);
  }

  /**
   * Check if path matches
   *
   * @param {string} path - Path to test
   * @returns {boolean}
   */
  match(path) {
    if (this.fastSlash) {
      this.params = {};
      return true;
    }

    const match = this.regexp.exec(path);

    if (!match) {
      this.params = {};
      return false;
    }

    // Extract parameters
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
      }
    }

    // Store matched path portion
    this.matchedPath = match[0];
    if (this.matchedPath.endsWith('/') && this.matchedPath.length > 1) {
      this.matchedPath = this.matchedPath.slice(0, -1);
    }

    return true;
  }

  /**
   * Get matched path prefix
   * @returns {string}
   */
  getMatchedPath() {
    if (this.fastSlash) return '';
    return this.matchedPath || this.path;
  }

  /**
   * Handle request
   *
   * @param {Error|null} err - Error
   * @param {Object} req - Request
   * @param {Object} res - Response
   * @param {Function} next - Next function
   */
  handleRequest(err, req, res, next) {
    const fn = this.handle;

    // Skip non-error handlers when there's an error
    if (err && !this.isErrorHandler) {
      return next(err);
    }

    // Skip error handlers when there's no error
    if (!err && this.isErrorHandler) {
      return next();
    }

    try {
      if (this.isErrorHandler) {
        fn(err, req, res, next);
      } else {
        fn(req, res, next);
      }
    } catch (e) {
      next(e);
    }
  }
}

module.exports = Layer;
