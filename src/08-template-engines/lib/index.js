/**
 * Step 08: Template Engine Integration
 *
 * Mini-Express application with comprehensive view rendering support.
 */

'use strict';

const http = require('node:http');
const path = require('node:path');
const View = require('./view');
const simpleEngine = require('./engines/simple');
const ejsLite = require('./engines/ejs-lite');

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

    if (this.isMiddleware) {
      return { regexp: new RegExp(`^${pattern}(?:/|$)`), keys };
    }
    return { regexp: new RegExp(`^${pattern}$`), keys };
  }

  match(reqPath, method) {
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

    let matchedPath = '';
    if (this.isMiddleware && this.path !== '/' && this.path !== '*') {
      matchedPath = this.path;
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

  app.stack = [];

  // Settings with view defaults
  app.settings = {
    'env': process.env.NODE_ENV || 'development',
    'x-powered-by': true,
    'trust proxy': false,
    'views': path.join(process.cwd(), 'views'),
    'view engine': null,
    'view cache': process.env.NODE_ENV === 'production',
    'json spaces': process.env.NODE_ENV === 'production' ? 0 : 2
  };

  // Locals - available in all views
  app.locals = {
    settings: app.settings
  };

  // Template engines registry
  app.engines = {};

  // View cache
  app.cache = {};

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
   * Register a template engine
   * @param {string} ext - File extension (with or without leading dot)
   * @param {function} fn - Engine function (path, options, callback)
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
   * Render a view template
   * @param {string} name - View name
   * @param {object} options - Render options
   * @param {function} callback - Callback(err, html)
   */
  app.render = function(name, options, callback) {
    // Handle optional options
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    const opts = options || {};
    const done = callback;

    // Merge app.locals into render options
    const renderOptions = {
      ...this.locals,
      ...opts,
      settings: this.settings
    };

    // Check view cache
    const cacheKey = name;
    let view = this.enabled('view cache') ? this.cache[cacheKey] : null;

    if (!view) {
      // Create new view
      view = new View(name, {
        root: this.get('views'),
        defaultEngine: this.get('view engine'),
        engines: this.engines
      });

      // Cache if enabled
      if (this.enabled('view cache')) {
        this.cache[cacheKey] = view;
      }
    }

    // Render the view
    view.render(renderOptions, done);
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

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    req.path = url.pathname;
    req.query = Object.fromEntries(url.searchParams);
    req.originalUrl = req.url;
    req.params = {};
    req.baseUrl = '';
  };

  /**
   * Enhance response with view rendering
   */
  app.enhanceResponse = function(req, res) {
    res.app = this;
    res.req = req;

    // Response locals - per-request data for views
    res.locals = {};

    res.status = function(code) {
      this.statusCode = code;
      return this;
    };

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

    res.get = function(field) {
      return this.getHeader(field);
    };

    res.json = function(data) {
      this.setHeader('Content-Type', 'application/json');
      const spaces = this.app.get('json spaces');
      const body = JSON.stringify(data, null, spaces);
      this.end(body);
    };

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

    /**
     * Render a view template
     * @param {string} view - View name
     * @param {object} options - View data
     * @param {function} callback - Optional callback
     */
    res.render = function(view, options, callback) {
      const app = this.app;
      const req = this.req;
      const self = this;

      // Handle optional options
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }

      const opts = options || {};

      // Default callback sends HTML response
      const done = callback || function(err, html) {
        if (err) {
          // Let error handler deal with it
          return req.next ? req.next(err) : self.status(500).send(err.message);
        }
        self.send(html);
      };

      // Merge locals: app.locals + res.locals + options
      const renderOptions = {
        ...app.locals,
        ...this.locals,
        ...opts
      };

      // Render via app.render
      app.render(view, renderOptions, done);
    };

    res.type = function(type) {
      const contentType = type.includes('/')
        ? type
        : getMimeType(type);
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

    if (this.enabled('x-powered-by')) {
      res.setHeader('X-Powered-By', 'Mini-Express');
    }

    let idx = 0;

    const next = (err) => {
      // Store next on req for error handling in render
      req.next = next;

      while (idx < this.stack.length) {
        const layer = this.stack[idx++];
        const match = layer.match(req.path, layer.method ? req.method : null);

        if (match) {
          req.params = { ...req.params, ...match.params };

          const originalPath = req.path;
          const originalBaseUrl = req.baseUrl || '';

          if (match.matchedPath && layer.isMiddleware) {
            req.baseUrl = originalBaseUrl + match.matchedPath;
            req.path = originalPath.slice(match.matchedPath.length) || '/';
          }

          try {
            if (err && layer.handle.length === 4) {
              return layer.handle(err, req, res, (e) => {
                req.path = originalPath;
                req.baseUrl = originalBaseUrl;
                next(e);
              });
            }

            if (!err && layer.handle.length < 4) {
              return layer.handle(req, res, (e) => {
                req.path = originalPath;
                req.baseUrl = originalBaseUrl;
                next(e);
              });
            }
          } catch (e) {
            req.path = originalPath;
            req.baseUrl = originalBaseUrl;
            return next(e);
          }
        }
      }

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
 * Simple MIME type lookup
 */
function getMimeType(ext) {
  const types = {
    'html': 'text/html; charset=utf-8',
    'css': 'text/css; charset=utf-8',
    'js': 'text/javascript; charset=utf-8',
    'json': 'application/json; charset=utf-8',
    'txt': 'text/plain; charset=utf-8',
    'xml': 'application/xml; charset=utf-8'
  };
  return types[ext] || 'application/octet-stream';
}

// Export factory and engines
module.exports = createApp;
module.exports.View = View;
module.exports.simpleEngine = simpleEngine;
module.exports.ejsLite = ejsLite;
