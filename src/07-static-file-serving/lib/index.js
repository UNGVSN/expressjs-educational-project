/**
 * Step 07: Static File Serving
 *
 * Mini-Express application with static file serving middleware.
 */

'use strict';

const http = require('node:http');
const path = require('node:path');
const serveStatic = require('./static');
const mime = require('./mime');
const { sendFile, sendFileDownload } = require('./send');

/**
 * HTTP methods to support
 */
const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

/**
 * Layer class for path matching
 */
class Layer {
  constructor(path, fn, options = {}) {
    this.path = path;
    this.handle = fn;
    this.method = options.method || null;
    this.isMiddleware = !options.method;

    // Compile path pattern
    if (path === '/' || path === '*') {
      this.regexp = /.*/;
      this.keys = [];
    } else {
      const { regexp, keys } = this.compilePath(path);
      this.regexp = regexp;
      this.keys = keys;
    }
  }

  compilePath(path) {
    const keys = [];
    let pattern = path
      .replace(/\/:(\w+)(\?)?/g, (_, name, optional) => {
        keys.push(name);
        return optional ? '(?:/([^/]+))?' : '/([^/]+)';
      })
      .replace(/\//g, '\\/');

    // Match from start, allow trailing content for middleware
    if (this.isMiddleware) {
      return { regexp: new RegExp(`^${pattern}(?:/|$)`), keys };
    }

    return { regexp: new RegExp(`^${pattern}$`), keys };
  }

  match(reqPath, method) {
    // Check method if route
    if (this.method && method && this.method.toUpperCase() !== method.toUpperCase()) {
      return null;
    }

    const match = this.regexp.exec(reqPath);
    if (!match) return null;

    const params = {};
    this.keys.forEach((key, i) => {
      if (match[i + 1] !== undefined) {
        params[key] = decodeURIComponent(match[i + 1]);
      }
    });

    // For middleware, calculate the matched path portion
    let matchedPath = this.path;
    if (this.isMiddleware && this.path !== '/' && this.path !== '*') {
      matchedPath = this.path;
    } else {
      matchedPath = '';
    }

    return { params, matchedPath };
  }
}

/**
 * Create application
 */
function createApp() {
  const app = function(req, res) {
    app.handle(req, res);
  };

  // Stack of middleware/routes
  app.stack = [];

  // Settings
  app.settings = {
    'env': process.env.NODE_ENV || 'development',
    'x-powered-by': true,
    'trust proxy': false,
    'views': './views',
    'view engine': null
  };

  // Locals
  app.locals = {
    settings: app.settings
  };

  // Template engines
  app.engines = {};

  /**
   * Setting methods
   */
  app.set = function(name, value) {
    if (arguments.length === 1) {
      return this.settings[name];
    }
    this.settings[name] = value;
    this.locals.settings = this.settings;
    return this;
  };

  app.get = function(name, ...handlers) {
    if (handlers.length === 0) {
      return this.settings[name];
    }
    return this.addRoute('get', name, handlers);
  };

  app.enable = function(name) {
    return this.set(name, true);
  };

  app.disable = function(name) {
    return this.set(name, false);
  };

  app.enabled = function(name) {
    return !!this.settings[name];
  };

  app.disabled = function(name) {
    return !this.settings[name];
  };

  /**
   * Template engine registration
   */
  app.engine = function(ext, fn) {
    if (typeof fn !== 'function') {
      throw new Error('callback function required');
    }
    const extension = ext.startsWith('.') ? ext : '.' + ext;
    this.engines[extension] = fn;
    return this;
  };

  /**
   * Add middleware
   */
  app.use = function(path, ...handlers) {
    if (typeof path === 'function') {
      handlers.unshift(path);
      path = '/';
    }

    handlers.forEach(fn => {
      this.stack.push(new Layer(path, fn, { method: null }));
    });

    return this;
  };

  /**
   * Add route
   */
  app.addRoute = function(method, path, handlers) {
    handlers.forEach(fn => {
      this.stack.push(new Layer(path, fn, { method }));
    });
    return this;
  };

  // Add HTTP method shortcuts
  methods.filter(m => m !== 'get').forEach(method => {
    app[method] = function(path, ...handlers) {
      return this.addRoute(method, path, handlers);
    };
  });

  /**
   * Route chaining
   */
  app.route = function(path) {
    const route = {};

    methods.forEach(method => {
      route[method] = function(...handlers) {
        app.addRoute(method, path, handlers);
        return route;
      };
    });

    return route;
  };

  /**
   * Enhance request
   */
  app.enhanceRequest = function(req) {
    req.app = this;

    // Parse URL
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    req.path = url.pathname;
    req.query = Object.fromEntries(url.searchParams);
    req.originalUrl = req.url;

    // Initialize params
    req.params = {};
  };

  /**
   * Enhance response
   */
  app.enhanceResponse = function(req, res) {
    res.app = this;
    res.req = req;

    // Initialize locals
    res.locals = {};

    // Status method
    res.status = function(code) {
      this.statusCode = code;
      return this;
    };

    // Set header(s)
    res.set = res.header = function(field, val) {
      if (typeof field === 'object') {
        Object.entries(field).forEach(([key, value]) => {
          this.setHeader(key, value);
        });
      } else {
        this.setHeader(field, val);
      }
      return this;
    };

    // Get header
    res.get = function(field) {
      return this.getHeader(field);
    };

    // Send JSON
    res.json = function(data) {
      this.setHeader('Content-Type', 'application/json');
      const spaces = this.app.get('json spaces');
      const body = JSON.stringify(data, null, spaces);
      this.end(body);
    };

    // Send response
    res.send = function(body) {
      if (typeof body === 'object' && body !== null && !Buffer.isBuffer(body)) {
        return this.json(body);
      }

      if (!this.getHeader('Content-Type')) {
        if (typeof body === 'string') {
          this.setHeader('Content-Type', 'text/html; charset=utf-8');
        } else if (Buffer.isBuffer(body)) {
          this.setHeader('Content-Type', 'application/octet-stream');
        }
      }

      this.end(body);
    };

    // Redirect
    res.redirect = function(statusOrUrl, url) {
      let status = 302;
      let redirectUrl = statusOrUrl;

      if (typeof statusOrUrl === 'number') {
        status = statusOrUrl;
        redirectUrl = url;
      }

      this.statusCode = status;
      this.setHeader('Location', redirectUrl);
      this.end();
    };

    // Send file
    res.sendFile = function(filePath, options, callback) {
      const opts = typeof options === 'function' ? {} : options || {};
      const cb = typeof options === 'function' ? options : callback;
      const rootDir = opts.root || process.cwd();

      // Resolve path
      const resolvedPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(rootDir, filePath);

      sendFile(req, this, resolvedPath, opts)
        .then(() => cb && cb())
        .catch(err => {
          if (cb) {
            cb(err);
          } else {
            this.statusCode = err.status || 500;
            this.end(err.message);
          }
        });
    };

    // Download file
    res.download = function(filePath, filename, options, callback) {
      // Handle optional parameters
      let opts = {};
      let cb;

      if (typeof filename === 'function') {
        cb = filename;
        filename = path.basename(filePath);
      } else if (typeof options === 'function') {
        cb = options;
        opts = {};
      } else {
        opts = options || {};
        cb = callback;
      }

      sendFileDownload(req, this, filePath, filename, opts)
        .then(() => cb && cb())
        .catch(err => {
          if (cb) {
            cb(err);
          } else {
            this.statusCode = err.status || 500;
            this.end(err.message);
          }
        });
    };

    // Content type helper
    res.type = function(type) {
      const contentType = type.includes('/')
        ? type
        : mime.contentType(type);
      this.setHeader('Content-Type', contentType);
      return this;
    };
  };

  /**
   * Handle request
   */
  app.handle = function(req, res) {
    this.enhanceRequest(req);
    this.enhanceResponse(req, res);

    // Add X-Powered-By header
    if (this.enabled('x-powered-by')) {
      res.setHeader('X-Powered-By', 'Mini-Express');
    }

    let idx = 0;

    const next = (err) => {
      // Find next matching layer
      while (idx < this.stack.length) {
        const layer = this.stack[idx++];
        const match = layer.match(req.path, layer.method ? req.method : null);

        if (match) {
          req.params = { ...req.params, ...match.params };

          // Save original path and set baseUrl for mounted middleware
          const originalPath = req.path;
          const originalBaseUrl = req.baseUrl || '';

          if (match.matchedPath && layer.isMiddleware) {
            req.baseUrl = originalBaseUrl + match.matchedPath;
            req.path = originalPath.slice(match.matchedPath.length) || '/';
          }

          try {
            // Error handling middleware
            if (err && layer.handle.length === 4) {
              return layer.handle(err, req, res, () => {
                // Restore path after middleware
                req.path = originalPath;
                req.baseUrl = originalBaseUrl;
                next(err);
              });
            }

            // Regular middleware/route
            if (!err && layer.handle.length < 4) {
              return layer.handle(req, res, () => {
                // Restore path after middleware
                req.path = originalPath;
                req.baseUrl = originalBaseUrl;
                next();
              });
            }
          } catch (e) {
            req.path = originalPath;
            req.baseUrl = originalBaseUrl;
            return next(e);
          }
        }
      }

      // No more layers
      if (err) {
        res.statusCode = err.status || 500;
        res.end(err.message || 'Internal Server Error');
      } else {
        res.statusCode = 404;
        res.end('Not Found');
      }
    };

    next();
  };

  /**
   * Listen for connections
   */
  app.listen = function(port, callback) {
    const server = http.createServer(this);
    return server.listen(port, callback);
  };

  return app;
}

/**
 * Static middleware factory
 */
createApp.static = serveStatic;

/**
 * MIME utilities
 */
createApp.mime = mime;

module.exports = createApp;
