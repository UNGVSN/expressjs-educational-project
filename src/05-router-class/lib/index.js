/**
 * Application with Router Support
 *
 * This module provides an Express-like application that uses the
 * Router class for modular routing.
 */

'use strict';

const http = require('node:http');
const { URL } = require('node:url');
const Router = require('./router');
const Layer = require('./layer');

// HTTP methods
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

/**
 * Create a new application
 * @returns {Application}
 */
function createApplication() {
  const app = new Application();
  return app;
}

/**
 * Create a new Router
 * @param {Object} [options] - Router options
 * @returns {Router}
 */
createApplication.Router = function(options) {
  return new Router(options);
};

/**
 * Application class
 */
class Application {
  constructor() {
    this.stack = [];
    this.params = {};
    this.settings = {
      'x-powered-by': true,
      'env': process.env.NODE_ENV || 'development'
    };

    // Bound handler for http.createServer
    this.handler = this.handle.bind(this);
  }

  /**
   * Register a parameter handler (application-level)
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
   * @param {...Function} handlers - Handlers
   * @returns {Application}
   */
  use(path, ...handlers) {
    // Handle app.use(fn)
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
   * Create a route for chaining
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
   * Set an application setting
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
   * Get an application setting
   *
   * @param {string} name - Setting name
   * @returns {*}
   */
  get(name) {
    // If single argument and it's a path, delegate to route
    if (arguments.length === 1 && typeof name === 'string' && !name.includes('/')) {
      return this.settings[name];
    }

    // Otherwise it's a GET route registration
    const args = Array.from(arguments);
    return this._addRoute('get', ...args);
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

    // Set up request
    this._setupRequest(req);

    // Set up response
    this._setupResponse(res);

    // X-Powered-By
    if (this.settings['x-powered-by']) {
      res.setHeader('X-Powered-By', 'Mini-Express');
    }

    // Default final handler
    const done = finalHandler || function(err) {
      if (err) {
        res.statusCode = err.status || err.statusCode || 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Not Found', path: req.originalUrl }));
      }
    };

    // Process param handlers
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
          // Restore
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
   * Set up request with parsed info
   * @private
   */
  _setupRequest(req) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    req.path = url.pathname;
    req.query = Object.fromEntries(url.searchParams);
    req.params = {};
    req.baseUrl = '';
    req.originalUrl = req.url;

    req.get = function(name) {
      const lc = name.toLowerCase();
      if (lc === 'referer' || lc === 'referrer') {
        return this.headers.referrer || this.headers.referer;
      }
      return this.headers[lc];
    };
  }

  /**
   * Set up response helpers
   * @private
   */
  _setupResponse(res) {
    res.status = function(code) {
      this.statusCode = code;
      return this;
    };

    res.json = function(obj) {
      this.setHeader('Content-Type', 'application/json');
      this.end(JSON.stringify(obj));
      return this;
    };

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

    res.set = function(field, value) {
      if (typeof field === 'object') {
        Object.keys(field).forEach(key => this.setHeader(key, field[key]));
      } else {
        this.setHeader(field, value);
      }
      return this;
    };

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
  }

  /**
   * Internal method to add routes
   * @private
   */
  _addRoute(method, path, ...handlers) {
    handlers.forEach(handler => {
      const layer = new Layer(path, { end: true }, handler);
      layer.method = method.toUpperCase();
      layer.route = true;
      this.stack.push(layer);
    });
    return this;
  }

  /**
   * Start listening
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
  // Skip 'get' as it's handled specially (for settings vs route)
  if (method === 'get') return;

  Application.prototype[method] = function(path, ...handlers) {
    return this._addRoute(method, path, ...handlers);
  };
});

// Add 'all' method
Application.prototype.all = function(path, ...handlers) {
  METHODS.forEach(method => {
    this._addRoute(method, path, ...handlers);
  });
  return this;
};

// Re-export Router
createApplication.Router = function(options) {
  return new Router(options);
};

module.exports = createApplication;
module.exports.Application = Application;
module.exports.Router = Router;
