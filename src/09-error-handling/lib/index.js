/**
 * Step 09: Error Handling System
 *
 * Demonstrates how Express.js handles errors throughout the request lifecycle.
 * Shows error middleware patterns, custom error classes, and async error handling.
 */

'use strict';

const http = require('node:http');
const { parse: parseUrl } = require('node:url');
const { pathToRegexp } = require('../../03-basic-routing/lib/path-to-regexp');

// Import error handling components
const errors = require('./errors');
const middleware = require('./middleware');

/**
 * Layer class - represents a middleware or route
 */
class Layer {
  constructor(path, handler, options = {}) {
    this.path = path;
    this.handler = handler;
    this.method = options.method || null;
    this.isMiddleware = !options.method;
    this.isErrorHandler = handler.length === 4; // Error handlers have 4 params
    this.name = handler.name || '<anonymous>';

    // Parse path pattern - our pathToRegexp returns {regexp, keys}
    const compiled = pathToRegexp(path, {
      end: !this.isMiddleware,
      strict: false,
      sensitive: false
    });
    this.regexp = compiled.regexp;
    this.keys = compiled.keys;
  }

  match(reqPath) {
    const match = this.regexp.exec(reqPath);
    if (!match) return null;

    const params = {};
    for (let i = 1; i < match.length; i++) {
      const key = this.keys[i - 1];
      if (key) {
        params[key.name] = match[i];
      }
    }

    // Calculate matched path for middleware mounting
    let matchedPath = '';
    if (this.isMiddleware && this.path !== '/') {
      matchedPath = match[0];
    }

    return { params, matchedPath };
  }
}

/**
 * Router class - manages routes and middleware
 */
class Router {
  constructor() {
    this.stack = [];
  }

  use(path, ...handlers) {
    if (typeof path === 'function') {
      handlers.unshift(path);
      path = '/';
    }

    for (const handler of handlers) {
      const layer = new Layer(path, handler);
      this.stack.push(layer);
    }

    return this;
  }

  route(method, path, ...handlers) {
    for (const handler of handlers) {
      const layer = new Layer(path, handler, { method: method.toUpperCase() });
      this.stack.push(layer);
    }
    return this;
  }

  get(path, ...handlers) {
    return this.route('GET', path, ...handlers);
  }

  post(path, ...handlers) {
    return this.route('POST', path, ...handlers);
  }

  put(path, ...handlers) {
    return this.route('PUT', path, ...handlers);
  }

  delete(path, ...handlers) {
    return this.route('DELETE', path, ...handlers);
  }
}

/**
 * Application class with error handling support
 */
class Application extends Router {
  constructor() {
    super();
    this.settings = new Map();
    this.locals = {};

    // Default settings
    this.set('env', process.env.NODE_ENV || 'development');
  }

  set(key, value) {
    if (arguments.length === 1) {
      return this.settings.get(key);
    }
    this.settings.set(key, value);
    return this;
  }

  get(key, ...args) {
    if (args.length === 0 && typeof key === 'string' && !key.includes('/')) {
      return this.settings.get(key);
    }
    return super.get(key, ...args);
  }

  /**
   * Handle incoming request
   * This is where error handling is integrated into the middleware pipeline
   */
  handle(req, res) {
    // Parse URL
    const parsedUrl = parseUrl(req.url, true);
    req.path = parsedUrl.pathname;
    req.query = parsedUrl.query;
    req.baseUrl = '';

    // Store original values
    const originalPath = req.path;
    const originalBaseUrl = req.baseUrl;

    // Add res.status and res.json helpers
    res.status = function(code) {
      res.statusCode = code;
      return res;
    };

    res.json = function(data) {
      const body = JSON.stringify(data);
      res.setHeader('Content-Type', 'application/json');
      res.end(body);
    };

    res.send = function(body) {
      if (typeof body === 'object') {
        return res.json(body);
      }
      res.setHeader('Content-Type', 'text/html');
      res.end(body);
    };

    // Content negotiation helper
    req.accepts = function(type) {
      const accept = req.headers.accept || '*/*';
      if (type === 'html') {
        return accept.includes('text/html') || accept.includes('*/*');
      }
      if (type === 'json') {
        return accept.includes('application/json') || accept.includes('*/*');
      }
      return accept.includes(type);
    };

    // Make app locals available
    res.locals = {};

    let idx = 0;
    let currentError = null;

    /**
     * The next() function - heart of Express middleware
     * Can be called with or without an error
     */
    const next = (err) => {
      // If error passed, store it
      if (err) {
        currentError = err;
      }

      // Restore path for next iteration
      req.path = originalPath;
      req.baseUrl = originalBaseUrl;

      // Find next matching layer
      while (idx < this.stack.length) {
        const layer = this.stack[idx++];

        // Check method match (for routes)
        if (layer.method && layer.method !== req.method) {
          continue;
        }

        // Check path match
        const match = layer.match(req.path);
        if (!match) {
          continue;
        }

        // Set params
        req.params = match.params;

        // Adjust path for mounted middleware
        if (match.matchedPath && layer.isMiddleware) {
          req.baseUrl = originalBaseUrl + match.matchedPath;
          req.path = originalPath.slice(match.matchedPath.length) || '/';
        }

        // Route to correct handler type
        if (currentError) {
          // We have an error - only run error handlers (4 params)
          if (layer.isErrorHandler) {
            try {
              layer.handler(currentError, req, res, next);
              return;
            } catch (e) {
              currentError = e;
              continue;
            }
          }
          // Skip non-error handlers
          continue;
        } else {
          // No error - skip error handlers
          if (layer.isErrorHandler) {
            continue;
          }

          // Run normal middleware/route
          try {
            layer.handler(req, res, next);
            return;
          } catch (e) {
            // Synchronous error thrown - pass to next
            currentError = e;
            continue;
          }
        }
      }

      // No more layers - finalize response
      this.finalHandler(currentError, req, res);
    };

    // Start processing
    next();
  }

  /**
   * Final handler - called when no middleware handles the request/error
   */
  finalHandler(err, req, res) {
    if (err) {
      // Unhandled error
      const statusCode = err.statusCode || err.status || 500;
      const message = err.message || 'Internal Server Error';

      console.error('Unhandled error:', err);

      if (!res.headersSent) {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: {
            message: this.get('env') === 'production' ? 'Internal Server Error' : message,
            statusCode
          }
        }));
      }
    } else {
      // No matching route
      if (!res.headersSent) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: {
            message: `Cannot ${req.method} ${req.path}`,
            statusCode: 404
          }
        }));
      }
    }
  }

  /**
   * Create HTTP server and listen
   */
  listen(port, callback) {
    const server = http.createServer((req, res) => {
      this.handle(req, res);
    });

    return server.listen(port, callback);
  }
}

/**
 * Create new application instance
 */
function createApplication() {
  return new Application();
}

// Export everything
module.exports = createApplication;
module.exports.Application = Application;
module.exports.Router = Router;
module.exports.Layer = Layer;

// Export error classes
module.exports.errors = errors;
module.exports.AppError = errors.AppError;
module.exports.BadRequestError = errors.BadRequestError;
module.exports.UnauthorizedError = errors.UnauthorizedError;
module.exports.ForbiddenError = errors.ForbiddenError;
module.exports.NotFoundError = errors.NotFoundError;
module.exports.ConflictError = errors.ConflictError;
module.exports.ValidationError = errors.ValidationError;
module.exports.RateLimitError = errors.RateLimitError;
module.exports.InternalError = errors.InternalError;
module.exports.ServiceUnavailableError = errors.ServiceUnavailableError;

// Export middleware helpers
module.exports.middleware = middleware;
module.exports.asyncHandler = middleware.asyncHandler;
module.exports.notFoundHandler = middleware.notFoundHandler;
module.exports.errorLogger = middleware.errorLogger;
module.exports.developmentErrorHandler = middleware.developmentErrorHandler;
module.exports.productionErrorHandler = middleware.productionErrorHandler;
module.exports.contentNegotiationErrorHandler = middleware.contentNegotiationErrorHandler;
module.exports.validationErrorHandler = middleware.validationErrorHandler;
module.exports.rateLimitErrorHandler = middleware.rateLimitErrorHandler;
