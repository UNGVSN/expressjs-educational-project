/**
 * Application - Main Express-like application class
 *
 * The central hub that ties everything together.
 */

'use strict';

const http = require('http');
const Router = require('./router');
const { enhanceRequest } = require('./request');
const { enhanceResponse } = require('./response');
const { View, simpleEngine } = require('./view');

// Import built-in middleware
const { json, urlencoded, raw, text } = require('../../10-body-parsers/lib/index');
const { cookieParser } = require('../../11-cookies-sessions/lib/cookie-parser');
const { session, MemoryStore } = require('../../11-cookies-sessions/lib/session');

class Application {
  constructor() {
    // Settings
    this.settings = {
      'env': process.env.NODE_ENV || 'development',
      'view engine': 'html',
      'views': './views',
      'x-powered-by': true
    };

    // Application-level locals
    this.locals = {};

    // Main router
    this._router = new Router();

    // View engines
    this.engines = {
      'html': simpleEngine,
      'ejs': simpleEngine
    };

    // Store mounted applications
    this.mountpath = '/';

    // Bind the handle method
    this.handle = this.handle.bind(this);
  }

  /**
   * Set a setting value
   *
   * @param {string} setting - Setting name
   * @param {*} [val] - Setting value
   * @returns {*} Setting value (get) or Application (set)
   */
  set(setting, val) {
    if (arguments.length === 1) {
      return this.settings[setting];
    }

    this.settings[setting] = val;

    // Special handling for certain settings
    if (setting === 'trust proxy') {
      this.trustProxy = val;
    }

    return this;
  }

  /**
   * Get a setting value
   *
   * @param {string} setting - Setting name
   * @returns {*} Setting value
   */
  get(setting) {
    return this.settings[setting];
  }

  /**
   * Enable a boolean setting
   *
   * @param {string} setting - Setting name
   * @returns {Application} For chaining
   */
  enable(setting) {
    return this.set(setting, true);
  }

  /**
   * Disable a boolean setting
   *
   * @param {string} setting - Setting name
   * @returns {Application} For chaining
   */
  disable(setting) {
    return this.set(setting, false);
  }

  /**
   * Check if setting is enabled
   *
   * @param {string} setting - Setting name
   * @returns {boolean} True if enabled
   */
  enabled(setting) {
    return Boolean(this.settings[setting]);
  }

  /**
   * Check if setting is disabled
   *
   * @param {string} setting - Setting name
   * @returns {boolean} True if disabled
   */
  disabled(setting) {
    return !this.settings[setting];
  }

  /**
   * Register a template engine
   *
   * @param {string} ext - File extension
   * @param {Function} fn - Engine function
   * @returns {Application} For chaining
   */
  engine(ext, fn) {
    if (ext[0] !== '.') {
      ext = '.' + ext;
    }
    this.engines[ext] = fn;
    return this;
  }

  /**
   * Add middleware
   *
   * @param {string|Function} path - Path or handler
   * @param {...Function} handlers - Handler functions
   * @returns {Application} For chaining
   */
  use(path, ...handlers) {
    // Handle mount of another application
    if (handlers.length > 0 && handlers[0] instanceof Application) {
      const subApp = handlers[0];
      subApp.mountpath = path;
      subApp.parent = this;
      handlers = [subApp.handle];
    }
    // Handle mount of a Router instance
    else if (handlers.length > 0 && handlers[0] instanceof Router) {
      const router = handlers[0];
      const mountPath = typeof path === 'string' ? path : '/';
      // Create a handler function that delegates to the router
      const routerHandler = (req, res, next) => {
        // Save original path and strip mount prefix for router
        const originalPath = req.path;
        const originalUrl = req.url;

        // Strip mount path from req.path for the sub-router
        let newPath = originalPath;
        if (mountPath !== '/' && originalPath.startsWith(mountPath)) {
          newPath = originalPath.slice(mountPath.length) || '/';
        }
        req.path = newPath;

        // Handle through router
        router.handle(req, res, (err) => {
          // Restore original path
          req.path = originalPath;
          req.url = originalUrl;
          next(err);
        });
      };
      handlers = [routerHandler];
    }

    this._router.use(path, ...handlers);
    return this;
  }

  /**
   * Handle a request
   *
   * @param {http.IncomingMessage} req - Request
   * @param {http.ServerResponse} res - Response
   * @param {Function} [next] - Next callback (for mounted apps)
   */
  handle(req, res, next) {
    // Enhance request and response
    enhanceRequest(req, res);
    enhanceResponse(req, res, this);

    // Set X-Powered-By header
    if (this.settings['x-powered-by']) {
      res.setHeader('X-Powered-By', 'Mini-Express');
    }

    // Handle through router
    this._router.handle(req, res, (err) => {
      // If mounted, pass to parent
      if (next) {
        return next(err);
      }

      // Final handler
      if (err) {
        // Error handling
        const status = err.status || err.statusCode || 500;
        const message = err.expose ? err.message : 'Internal Server Error';

        if (this.settings.env === 'development') {
          console.error(err.stack || err);
        }

        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: message,
          ...(this.settings.env === 'development' && { stack: err.stack })
        }));
      } else {
        // 404 Not Found
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    });
  }

  /**
   * Render a view
   *
   * @param {string} name - View name
   * @param {Object} options - View data
   * @param {Function} callback - Callback(err, html)
   */
  render(name, options, callback) {
    const ext = '.' + (this.settings['view engine'] || 'html');
    const engine = this.engines[ext] || simpleEngine;

    const view = new View(name, {
      root: this.settings.views,
      ext: ext,
      engine: engine
    });

    view.render(options, callback);
  }

  /**
   * Start listening for requests
   *
   * @param {number} port - Port number
   * @param {string} [hostname] - Hostname
   * @param {number} [backlog] - Backlog
   * @param {Function} [callback] - Callback
   * @returns {http.Server} HTTP server
   */
  listen(...args) {
    const server = http.createServer(this.handle);
    return server.listen(...args);
  }

  /**
   * Return the path the app is mounted at
   */
  path() {
    if (!this.parent) {
      return '';
    }
    return this.parent.path() + this.mountpath;
  }
}

// Add HTTP method shortcuts to Application
['post', 'put', 'delete', 'patch', 'options', 'head', 'all'].forEach(method => {
  Application.prototype[method] = function(path, ...handlers) {
    this._router[method](path, ...handlers);
    return this;
  };
});

// Special handling for 'get' - one argument returns setting, two+ registers route
// This matches Express.js behavior
const originalGet = Application.prototype.get;
Application.prototype.get = function(path, ...handlers) {
  // If only one argument and it's a setting name (not a path pattern)
  if (arguments.length === 1 && typeof path === 'string' && !path.includes('/')) {
    return originalGet.call(this, path);
  }
  // Otherwise, register a GET route
  this._router.get(path, ...handlers);
  return this;
};

// Add param method
Application.prototype.param = function(name, callback) {
  // Store param handlers
  this._params = this._params || {};
  this._params[name] = this._params[name] || [];
  this._params[name].push(callback);
  return this;
};

// Export built-in middleware
Application.json = json;
Application.urlencoded = urlencoded;
Application.raw = raw;
Application.text = text;
Application.cookieParser = cookieParser;
Application.session = session;
Application.MemoryStore = MemoryStore;

// Static middleware
Application.static = function(root, options = {}) {
  const { serveStatic } = require('../../07-static-file-serving/lib/index');
  return serveStatic(root, options);
};

// Router factory
Application.Router = function(options) {
  return new Router(options);
};

module.exports = Application;
