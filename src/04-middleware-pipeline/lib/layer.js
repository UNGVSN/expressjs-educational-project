/**
 * Layer Class
 *
 * A Layer wraps a middleware function along with path matching logic.
 * Each layer in the stack represents either:
 * - Application-level middleware (app.use)
 * - Route handler (app.get, app.post, etc.)
 *
 * This is the fundamental building block of the middleware pipeline.
 */

'use strict';

/**
 * Check if a path matches the layer's path pattern.
 *
 * Middleware layers use prefix matching:
 * - Layer path '/api' matches '/api', '/api/users', '/api/users/123'
 *
 * Route layers use exact matching (with parameters):
 * - Layer path '/users/:id' matches '/users/123', '/users/abc'
 * - But not '/users' or '/users/123/posts'
 */

// Characters that need escaping in regex
const SPECIAL_CHARS = /[\\^$.*+?()[\]{}|]/g;

// Parameter pattern :name
const PARAM_PATTERN = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;

/**
 * Layer class - represents a single middleware in the stack
 */
class Layer {
  /**
   * Create a new Layer
   *
   * @param {string} path - Path pattern to match
   * @param {Object} options - Layer options
   * @param {boolean} [options.end=true] - If true, match to end of path (routes)
   * @param {boolean} [options.strict=false] - If true, require trailing slash
   * @param {boolean} [options.sensitive=false] - If true, case sensitive
   * @param {Function} fn - Handler function
   */
  constructor(path, options, fn) {
    // Handle overloaded signatures
    if (typeof options === 'function') {
      fn = options;
      options = {};
    }

    if (typeof path === 'function') {
      fn = path;
      path = '/';
      options = {};
    }

    this.path = path;
    this.handle = fn;
    this.name = fn.name || '<anonymous>';
    this.params = {};
    this.keys = [];

    // Options with defaults
    this.options = {
      end: true,        // Match to end for routes
      strict: false,    // No strict trailing slash
      sensitive: false, // Case insensitive
      ...options
    };

    // Compile path to regexp
    this._compile();

    // Detect if this is an error handler (4 arguments)
    // Error handlers: function(err, req, res, next)
    this.isErrorHandler = fn.length === 4;
  }

  /**
   * Compile the path pattern to a regular expression.
   * @private
   */
  _compile() {
    let pattern = this.path;
    this.keys = [];

    // Handle root path
    if (pattern === '/' && !this.options.end) {
      this.regexp = /^\/(?=$|\/)/i;
      this.fastSlash = true;
      return;
    }

    // Escape special regex characters
    pattern = pattern.replace(SPECIAL_CHARS, '\\$&');

    // Replace parameters with capture groups
    let keyIndex = 0;
    pattern = pattern.replace(PARAM_PATTERN, (match, name) => {
      this.keys.push({ name, index: keyIndex++ });
      return '([^\\/]+)';
    });

    // Handle wildcards
    pattern = pattern.replace(/\\\*/g, () => {
      this.keys.push({ name: String(keyIndex++), wildcard: true });
      return '(.*)';
    });

    // Build final pattern
    const flags = this.options.sensitive ? '' : 'i';

    if (this.options.end) {
      // Exact match (for routes)
      pattern = `^${pattern}(?:\\/)?$`;
    } else {
      // Prefix match (for middleware)
      // Remove trailing slash for prefix matching
      pattern = pattern.replace(/\/$/, '');
      pattern = `^${pattern}(?:\\/|$)`;
    }

    this.regexp = new RegExp(pattern, flags);
  }

  /**
   * Check if the layer matches the given path.
   *
   * @param {string} path - Path to match
   * @returns {boolean} True if path matches
   */
  match(path) {
    // Fast path for root middleware
    if (this.fastSlash) {
      return true;
    }

    // Test against compiled regexp
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

    // Calculate the matched path portion (for mounting)
    this.matchedPath = match[0];

    return true;
  }

  /**
   * Get the path prefix that was matched.
   * Used for calculating req.path in mounted middleware.
   *
   * @returns {string} The matched path prefix
   */
  getMatchedPath() {
    if (this.fastSlash) {
      return '';
    }
    return this.matchedPath || this.path;
  }

  /**
   * Handle a request.
   *
   * @param {Error|null} err - Error from previous middleware
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next function
   */
  handleRequest(err, req, res, next) {
    const fn = this.handle;

    // If there's an error and this isn't an error handler, skip
    if (err && !this.isErrorHandler) {
      return next(err);
    }

    // If no error but this is an error handler, skip
    if (!err && this.isErrorHandler) {
      return next();
    }

    try {
      if (this.isErrorHandler) {
        // Error handling middleware: (err, req, res, next)
        fn(err, req, res, next);
      } else {
        // Regular middleware: (req, res, next)
        fn(req, res, next);
      }
    } catch (e) {
      // If middleware throws synchronously, pass to next
      next(e);
    }
  }
}

module.exports = Layer;
