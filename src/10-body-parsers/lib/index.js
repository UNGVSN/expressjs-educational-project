/**
 * Step 10: Body Parsers
 *
 * Demonstrates how Express.js parses request bodies.
 * Includes JSON, URL-encoded, raw, and text parsers.
 */

'use strict';

const http = require('node:http');
const { parse: parseUrl } = require('node:url');
const { pathToRegexp } = require('../../03-basic-routing/lib/path-to-regexp');

// Import body parsers
const jsonParser = require('./json');
const urlencodedParser = require('./urlencoded');
const rawParser = require('./raw');
const textParser = require('./text');

// Import utilities
const { parseBytes, formatBytes } = require('./bytes');
const { typeIs, parseContentType, normalizeType, getCharset } = require('./content-type');

/**
 * Layer class - represents a middleware or route
 */
class Layer {
  constructor(path, handler, options = {}) {
    this.path = path;
    this.handler = handler;
    this.method = options.method || null;
    this.isMiddleware = !options.method;
    this.isErrorHandler = handler.length === 4;
    this.name = handler.name || '<anonymous>';

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

    let matchedPath = '';
    if (this.isMiddleware && this.path !== '/') {
      matchedPath = match[0];
    }

    return { params, matchedPath };
  }
}

/**
 * Router class
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

  patch(path, ...handlers) {
    return this.route('PATCH', path, ...handlers);
  }

  delete(path, ...handlers) {
    return this.route('DELETE', path, ...handlers);
  }
}

/**
 * Application class with body parser support
 */
class Application extends Router {
  constructor() {
    super();
    this.settings = new Map();
    this.locals = {};

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
   */
  handle(req, res) {
    const parsedUrl = parseUrl(req.url, true);
    req.path = parsedUrl.pathname;
    req.query = parsedUrl.query;
    req.baseUrl = '';

    const originalPath = req.path;
    const originalBaseUrl = req.baseUrl;

    // Add res helpers
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

    // Add req.is() helper for content-type checking
    req.is = function(type) {
      return typeIs(req, type);
    };

    res.locals = {};

    let idx = 0;
    let currentError = null;

    const next = (err) => {
      if (err) {
        currentError = err;
      }

      req.path = originalPath;
      req.baseUrl = originalBaseUrl;

      while (idx < this.stack.length) {
        const layer = this.stack[idx++];

        if (layer.method && layer.method !== req.method) {
          continue;
        }

        const match = layer.match(req.path);
        if (!match) {
          continue;
        }

        req.params = match.params;

        if (match.matchedPath && layer.isMiddleware) {
          req.baseUrl = originalBaseUrl + match.matchedPath;
          req.path = originalPath.slice(match.matchedPath.length) || '/';
        }

        if (currentError) {
          if (layer.isErrorHandler) {
            try {
              layer.handler(currentError, req, res, next);
              return;
            } catch (e) {
              currentError = e;
              continue;
            }
          }
          continue;
        } else {
          if (layer.isErrorHandler) {
            continue;
          }

          try {
            layer.handler(req, res, next);
            return;
          } catch (e) {
            currentError = e;
            continue;
          }
        }
      }

      this.finalHandler(currentError, req, res);
    };

    next();
  }

  finalHandler(err, req, res) {
    if (err) {
      const statusCode = err.statusCode || err.status || 500;
      const message = err.message || 'Internal Server Error';

      console.error('Unhandled error:', err.message);

      if (!res.headersSent) {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: {
            message: this.get('env') === 'production' ? 'Internal Server Error' : message,
            type: err.type || 'error',
            statusCode
          }
        }));
      }
    } else {
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

// Export application factory
module.exports = createApplication;
module.exports.Application = Application;
module.exports.Router = Router;

// Export body parsers
module.exports.json = jsonParser;
module.exports.urlencoded = urlencodedParser;
module.exports.raw = rawParser;
module.exports.text = textParser;

// Export utilities
module.exports.parseBytes = parseBytes;
module.exports.formatBytes = formatBytes;
module.exports.typeIs = typeIs;
module.exports.parseContentType = parseContentType;
module.exports.normalizeType = normalizeType;
module.exports.getCharset = getCharset;
