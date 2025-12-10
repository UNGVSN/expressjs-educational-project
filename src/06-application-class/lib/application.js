/**
 * Application Class
 *
 * The Application class is the foundation of an Express-like app.
 * It manages settings, middleware, routing, template engines, and more.
 */

'use strict';

const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');
const View = require('./view');

// Default settings
const DEFAULT_SETTINGS = {
  'env': process.env.NODE_ENV || 'development',
  'x-powered-by': true,
  'etag': 'weak',
  'trust proxy': false,
  'view engine': undefined,
  'views': path.resolve('views'),
  'strict routing': false,
  'case sensitive routing': false,
  'json spaces': 2,
  'subdomain offset': 2,
  'query parser': 'extended'
};

// HTTP methods
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

/**
 * Characters to escape in regex
 */
const SPECIAL_CHARS = /[\\^$.*+?()[\]{}|]/g;

/**
 * Parameter pattern
 */
const PARAM_PATTERN = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;

/**
 * Layer class for middleware/route tracking
 */
class Layer {
  constructor(path, options, fn) {
    if (typeof options === 'function') {
      fn = options;
      options = {};
    }

    this.path = path;
    this.handle = fn;
    this.options = { end: true, ...options };
    this.keys = [];
    this.params = {};
    this.isErrorHandler = fn.length === 4;

    this._compile();
  }

  _compile() {
    let pattern = this.path;
    this.keys = [];

    if (pattern === '/' && !this.options.end) {
      this.regexp = /^\/(?:$|\/)/i;
      this.fastSlash = true;
      return;
    }

    if (pattern === '/' && this.options.end) {
      this.regexp = /^\/$/i;
      return;
    }

    pattern = pattern.replace(SPECIAL_CHARS, (c) => c === ':' || c === '*' ? c : '\\' + c);

    let keyIndex = 0;
    pattern = pattern.replace(PARAM_PATTERN, (_, name) => {
      this.keys.push({ name, index: keyIndex++ });
      return '([^\\/]+)';
    });

    pattern = pattern.replace(/\*/g, () => {
      this.keys.push({ name: String(keyIndex++), wildcard: true });
      return '(.*)';
    });

    const flags = 'i';
    if (this.options.end) {
      pattern = `^${pattern}(?:\\/)?$`;
    } else {
      pattern = pattern.replace(/\/$/, '');
      pattern = `^${pattern}(?:\\/|$)`;
    }

    this.regexp = new RegExp(pattern, flags);
  }

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

    this.params = {};
    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keys[i];
      const value = match[i + 1];
      if (value !== undefined) {
        try {
          this.params[key.name] = decodeURIComponent(value);
        } catch {
          this.params[key.name] = value;
        }
      }
    }

    this.matchedPath = match[0];
    return true;
  }

  getMatchedPath() {
    if (this.fastSlash) return '';
    return this.matchedPath || this.path;
  }

  handleRequest(err, req, res, next) {
    if (err && !this.isErrorHandler) return next(err);
    if (!err && this.isErrorHandler) return next();

    try {
      if (this.isErrorHandler) {
        this.handle(err, req, res, next);
      } else {
        this.handle(req, res, next);
      }
    } catch (e) {
      next(e);
    }
  }
}

/**
 * Application class
 */
class Application {
  constructor() {
    this.init();
  }

  /**
   * Initialize application
   */
  init() {
    // Middleware stack
    this.stack = [];

    // Application settings
    this.settings = { ...DEFAULT_SETTINGS };

    // Shared locals for views
    this.locals = Object.create(null);
    this.locals.settings = this.settings;

    // Template engines
    this.engines = {};

    // View cache
    this.cache = {};

    // Parameter handlers
    this.params = {};

    // Bound handler
    this.handler = this.handle.bind(this);
  }

  /**
   * Set or get a setting
   *
   * @param {string} name - Setting name
   * @param {*} [value] - Setting value
   * @returns {*}
   */
  set(name, value) {
    if (arguments.length === 1) {
      return this.settings[name];
    }
    this.settings[name] = value;
    return this;
  }

  /**
   * Get a setting value
   *
   * @param {string} name - Setting name
   * @returns {*}
   */
  get(name) {
    // Handle GET route vs settings lookup
    if (arguments.length === 1 && typeof name === 'string' && !name.startsWith('/')) {
      // Check if it looks like a path
      if (!name.includes(':') && !name.includes('*')) {
        return this.settings[name];
      }
    }

    // Route registration
    const args = Array.from(arguments);
    return this._route('get', ...args);
  }

  /**
   * Enable a boolean setting
   *
   * @param {string} name - Setting name
   * @returns {Application}
   */
  enable(name) {
    return this.set(name, true);
  }

  /**
   * Disable a boolean setting
   *
   * @param {string} name - Setting name
   * @returns {Application}
   */
  disable(name) {
    return this.set(name, false);
  }

  /**
   * Check if setting is enabled
   *
   * @param {string} name - Setting name
   * @returns {boolean}
   */
  enabled(name) {
    return Boolean(this.settings[name]);
  }

  /**
   * Check if setting is disabled
   *
   * @param {string} name - Setting name
   * @returns {boolean}
   */
  disabled(name) {
    return !this.settings[name];
  }

  /**
   * Register a template engine
   *
   * @param {string} ext - File extension
   * @param {Function} fn - Engine function
   * @returns {Application}
   */
  engine(ext, fn) {
    if (typeof fn !== 'function') {
      throw new Error('callback function required');
    }

    // Normalize extension
    const extension = ext[0] !== '.' ? '.' + ext : ext;
    this.engines[extension] = fn;

    return this;
  }

  /**
   * Render a view
   *
   * @param {string} name - View name
   * @param {Object} [options] - Render options
   * @param {Function} callback - Callback(err, html)
   */
  render(name, options, callback) {
    // Handle overloaded arguments
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    // Merge locals
    const opts = {
      ...this.locals,
      ...options
    };

    // Check cache
    const cacheKey = name;
    let view = this.cache[cacheKey];

    if (!view) {
      try {
        view = new View(name, {
          defaultEngine: this.settings['view engine'],
          root: this.settings['views'],
          engines: this.engines
        });

        // Cache in production
        if (this.settings.env === 'production') {
          this.cache[cacheKey] = view;
        }
      } catch (err) {
        return callback(err);
      }
    }

    // Render
    view.render(opts, callback);
  }

  /**
   * Register parameter handler
   *
   * @param {string} name - Parameter name
   * @param {Function} handler - Handler function
   * @returns {Application}
   */
  param(name, handler) {
    if (!this.params[name]) {
      this.params[name] = [];
    }
    this.params[name].push(handler);
    return this;
  }

  /**
   * Add middleware
   *
   * @param {string|Function} path - Path or handler
   * @param {...Function} handlers - Handler functions
   * @returns {Application}
   */
  use(path, ...handlers) {
    if (typeof path === 'function') {
      handlers = [path, ...handlers];
      path = '/';
    }

    if (handlers.length === 0) {
      throw new TypeError('app.use() requires middleware functions');
    }

    handlers = handlers.flat();

    handlers.forEach(fn => {
      if (typeof fn !== 'function') {
        throw new TypeError('app.use() requires middleware functions');
      }

      const layer = new Layer(path, { end: false }, fn);
      layer.route = undefined;
      this.stack.push(layer);
    });

    return this;
  }

  /**
   * Create route for chaining
   *
   * @param {string} path - Route path
   * @returns {Object}
   */
  route(path) {
    const route = {};

    METHODS.forEach(method => {
      route[method] = (...handlers) => {
        handlers.forEach(handler => {
          const layer = new Layer(path, { end: true }, handler);
          layer.method = method.toUpperCase();
          layer.route = true;
          this.stack.push(layer);
        });
        return route;
      };
    });

    route.all = (...handlers) => {
      handlers.forEach(handler => {
        const layer = new Layer(path, { end: true }, handler);
        layer.method = null;
        layer.route = true;
        this.stack.push(layer);
      });
      return route;
    };

    return route;
  }

  /**
   * Internal route registration
   * @private
   */
  _route(method, path, ...handlers) {
    handlers.forEach(handler => {
      const layer = new Layer(path, { end: true }, handler);
      layer.method = method.toUpperCase();
      layer.route = true;
      this.stack.push(layer);
    });
    return this;
  }

  /**
   * Handle incoming request
   *
   * @param {http.IncomingMessage} req - Request
   * @param {http.ServerResponse} res - Response
   * @param {Function} [finalHandler] - Final handler
   */
  handle(req, res, finalHandler) {
    const self = this;
    let index = 0;
    const stack = this.stack;

    // Setup request
    this._setupRequest(req, res);

    // Setup response
    this._setupResponse(req, res);

    // X-Powered-By
    if (this.settings['x-powered-by']) {
      res.setHeader('X-Powered-By', 'Mini-Express');
    }

    // Default final handler
    const done = finalHandler || function(err) {
      if (err) {
        res.statusCode = err.status || err.statusCode || 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: err.message || 'Internal Server Error'
        }));
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: 'Not Found',
          path: req.originalUrl
        }));
      }
    };

    // Process params
    const processParams = (layerParams, callback) => {
      const paramNames = Object.keys(layerParams);
      let paramIndex = 0;

      function nextParam(err) {
        if (err) return callback(err);

        const paramName = paramNames[paramIndex++];
        if (!paramName) return callback();

        const paramValue = layerParams[paramName];
        const paramHandlers = self.params[paramName];

        if (!paramHandlers || paramHandlers.length === 0) {
          return nextParam();
        }

        let handlerIndex = 0;

        function nextHandler(err) {
          if (err) return callback(err);

          const handler = paramHandlers[handlerIndex++];
          if (!handler) return nextParam();

          try {
            handler(req, res, nextHandler, paramValue, paramName);
          } catch (e) {
            nextHandler(e);
          }
        }

        nextHandler();
      }

      nextParam();
    };

    // Next function
    function next(err) {
      const layer = stack[index++];

      if (!layer) {
        return done(err);
      }

      // Match path
      if (!layer.match(req.path)) {
        return next(err);
      }

      // Check method for routes
      if (layer.route) {
        if (layer.method && layer.method !== req.method) {
          return next(err);
        }
      }

      // Store params
      req.params = { ...req.params, ...layer.params };

      // Store original for restore
      const origUrl = req.url;
      const origPath = req.path;
      const origBaseUrl = req.baseUrl;

      // Strip path for middleware
      if (!layer.route) {
        const matchedPath = layer.getMatchedPath();
        if (matchedPath && matchedPath !== '/' && matchedPath !== req.path) {
          const newPath = req.path.slice(matchedPath.length) || '/';
          req.baseUrl = (req.baseUrl || '') + matchedPath;
          req.url = newPath + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
          req.path = newPath;
        }
      }

      // Process params then call handler
      processParams(layer.params, (paramErr) => {
        if (paramErr) {
          req.url = origUrl;
          req.path = origPath;
          req.baseUrl = origBaseUrl;
          return next(paramErr);
        }

        layer.handleRequest(err, req, res, (layerErr) => {
          req.url = origUrl;
          req.path = origPath;
          req.baseUrl = origBaseUrl;
          next(layerErr);
        });
      });
    }

    next();
  }

  /**
   * Setup request
   * @private
   */
  _setupRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    req.path = url.pathname;
    req.query = Object.fromEntries(url.searchParams);
    req.params = {};
    req.baseUrl = '';
    req.originalUrl = req.url;
    req.app = this;
    req.res = res;

    // Request helpers
    req.get = function(name) {
      const lc = name.toLowerCase();
      if (lc === 'referer' || lc === 'referrer') {
        return this.headers.referrer || this.headers.referer;
      }
      return this.headers[lc];
    };

    req.is = function(type) {
      const contentType = this.headers['content-type'] || '';
      if (type.includes('/')) {
        return contentType.includes(type);
      }
      return contentType.includes('/' + type);
    };
  }

  /**
   * Setup response
   * @private
   */
  _setupResponse(req, res) {
    const app = this;

    res.app = this;
    res.req = req;

    // Status (chainable)
    res.status = function(code) {
      this.statusCode = code;
      return this;
    };

    // JSON response
    res.json = function(obj) {
      const spaces = app.settings['json spaces'];
      const body = JSON.stringify(obj, null, spaces);
      this.setHeader('Content-Type', 'application/json');
      this.end(body);
      return this;
    };

    // Send response
    res.send = function(body) {
      if (typeof body === 'object') {
        return this.json(body);
      }
      if (typeof body === 'string') {
        if (!this.getHeader('Content-Type')) {
          this.setHeader('Content-Type', body.startsWith('<') ? 'text/html' : 'text/plain');
        }
      }
      this.end(body);
      return this;
    };

    // Set headers
    res.set = function(field, value) {
      if (typeof field === 'object') {
        Object.keys(field).forEach(key => this.setHeader(key, field[key]));
      } else {
        this.setHeader(field, value);
      }
      return this;
    };

    // Get header
    res.get = function(field) {
      return this.getHeader(field);
    };

    // Redirect
    res.redirect = function(statusOrUrl, url) {
      let status = 302;
      if (typeof statusOrUrl === 'number') {
        status = statusOrUrl;
      } else {
        url = statusOrUrl;
      }
      this.statusCode = status;
      this.setHeader('Location', url);
      this.end();
      return this;
    };

    // Type shorthand
    res.type = function(type) {
      const contentType = type.includes('/') ? type : `text/${type}`;
      this.setHeader('Content-Type', contentType);
      return this;
    };

    // Render view
    res.render = function(view, options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }

      const opts = {
        ...app.locals,
        ...options
      };

      app.render(view, opts, (err, html) => {
        if (err) {
          if (callback) return callback(err);
          return req.next ? req.next(err) : this.status(500).send('Error rendering view');
        }

        if (callback) {
          callback(null, html);
        } else {
          this.send(html);
        }
      });
    };
  }

  /**
   * Listen for connections
   *
   * @param {number} port - Port
   * @param {string|Function} [hostname] - Hostname or callback
   * @param {Function} [callback] - Callback
   * @returns {http.Server}
   */
  listen(port, hostname, callback) {
    if (typeof hostname === 'function') {
      callback = hostname;
      hostname = undefined;
    }

    const server = http.createServer(this.handler);
    return server.listen(port, hostname, callback);
  }
}

// Add HTTP method shortcuts
METHODS.forEach(method => {
  if (method === 'get') return; // Handled specially

  Application.prototype[method] = function(path, ...handlers) {
    return this._route(method, path, ...handlers);
  };
});

// All methods
Application.prototype.all = function(path, ...handlers) {
  METHODS.forEach(method => {
    this._route(method, path, ...handlers);
  });
  return this;
};

module.exports = Application;
