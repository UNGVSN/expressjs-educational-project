/**
 * Built-in Middleware Helpers
 *
 * This module provides common middleware patterns that demonstrate
 * how to build reusable middleware functions.
 *
 * These are educational implementations showing middleware patterns.
 */

'use strict';

/**
 * Logger middleware factory
 *
 * Logs information about each request including method, URL, status,
 * and response time.
 *
 * @param {Object} [options] - Logger options
 * @param {Function} [options.stream] - Output stream (default: console.log)
 * @param {string} [options.format] - Log format ('dev', 'combined', 'tiny')
 * @returns {Function} Middleware function
 *
 * @example
 * app.use(logger());
 * app.use(logger({ format: 'tiny' }));
 */
function logger(options = {}) {
  const {
    stream = console.log,
    format = 'dev'
  } = options;

  return function loggerMiddleware(req, res, next) {
    const start = Date.now();

    // Capture the original end method
    const originalEnd = res.end;

    // Override end to log after response
    res.end = function(...args) {
      // Restore original
      res.end = originalEnd;

      // Call original
      res.end.apply(this, args);

      // Calculate duration
      const duration = Date.now() - start;
      const status = res.statusCode;

      // Format log line
      let line;
      switch (format) {
        case 'tiny':
          line = `${req.method} ${req.url} ${status} - ${duration}ms`;
          break;
        case 'combined':
          line = `${req.ip || '-'} - - [${new Date().toISOString()}] "${req.method} ${req.url}" ${status} - ${duration}ms`;
          break;
        case 'dev':
        default:
          // Color based on status
          const color = status >= 500 ? '\x1b[31m' : // red
                        status >= 400 ? '\x1b[33m' : // yellow
                        status >= 300 ? '\x1b[36m' : // cyan
                        status >= 200 ? '\x1b[32m' : // green
                        '\x1b[0m';                   // reset
          line = `${color}${req.method}\x1b[0m ${req.url} ${color}${status}\x1b[0m - ${duration}ms`;
      }

      stream(line);
    };

    next();
  };
}

/**
 * Request ID middleware
 *
 * Assigns a unique ID to each request for tracking and debugging.
 *
 * @param {Object} [options] - Options
 * @param {Function} [options.generator] - ID generator function
 * @param {string} [options.header] - Header name to check/set
 * @returns {Function} Middleware function
 *
 * @example
 * app.use(requestId());
 * // Later: console.log(req.id); // "abc123..."
 */
function requestId(options = {}) {
  const {
    generator = () => Math.random().toString(36).substring(2) + Date.now().toString(36),
    header = 'X-Request-ID'
  } = options;

  return function requestIdMiddleware(req, res, next) {
    // Use existing header or generate new ID
    req.id = req.headers[header.toLowerCase()] || generator();

    // Set header on response
    res.setHeader(header, req.id);

    next();
  };
}

/**
 * Response time middleware
 *
 * Adds X-Response-Time header showing request processing time.
 *
 * @param {Object} [options] - Options
 * @param {string} [options.header] - Header name
 * @param {number} [options.digits] - Decimal places
 * @returns {Function} Middleware function
 *
 * @example
 * app.use(responseTime());
 */
function responseTime(options = {}) {
  const {
    header = 'X-Response-Time',
    digits = 3
  } = options;

  return function responseTimeMiddleware(req, res, next) {
    const start = process.hrtime.bigint();

    // Hook into response
    const originalEnd = res.end;
    res.end = function(...args) {
      // Calculate duration
      const duration = Number(process.hrtime.bigint() - start) / 1e6; // nanoseconds to milliseconds

      // Set header (if headers not sent)
      if (!res.headersSent) {
        res.setHeader(header, `${duration.toFixed(digits)}ms`);
      }

      // Call original
      originalEnd.apply(this, args);
    };

    next();
  };
}

/**
 * CORS middleware
 *
 * Adds Cross-Origin Resource Sharing headers to enable
 * requests from different origins.
 *
 * @param {Object} [options] - CORS options
 * @param {string|string[]} [options.origin] - Allowed origins
 * @param {string[]} [options.methods] - Allowed methods
 * @param {string[]} [options.allowedHeaders] - Allowed request headers
 * @param {string[]} [options.exposedHeaders] - Exposed response headers
 * @param {boolean} [options.credentials] - Allow credentials
 * @param {number} [options.maxAge] - Preflight cache duration
 * @returns {Function} Middleware function
 *
 * @example
 * app.use(cors({ origin: 'http://localhost:3000' }));
 */
function cors(options = {}) {
  const {
    origin = '*',
    methods = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders = [],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400 // 24 hours
  } = options;

  return function corsMiddleware(req, res, next) {
    // Determine allowed origin
    let allowedOrigin = origin;
    if (typeof origin === 'function') {
      allowedOrigin = origin(req);
    } else if (Array.isArray(origin)) {
      const requestOrigin = req.headers.origin;
      allowedOrigin = origin.includes(requestOrigin) ? requestOrigin : origin[0];
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);

    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (exposedHeaders.length) {
      res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(','));
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', methods.join(','));

      const requestHeaders = req.headers['access-control-request-headers'];
      if (allowedHeaders.length) {
        res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(','));
      } else if (requestHeaders) {
        res.setHeader('Access-Control-Allow-Headers', requestHeaders);
      }

      res.setHeader('Access-Control-Max-Age', String(maxAge));

      // End preflight
      res.statusCode = 204;
      res.end();
      return;
    }

    next();
  };
}

/**
 * Not Found middleware
 *
 * Returns 404 response for unmatched requests.
 * Should be used at the end of middleware stack.
 *
 * @param {Object} [options] - Options
 * @param {string} [options.message] - Custom message
 * @returns {Function} Middleware function
 */
function notFound(options = {}) {
  const { message = 'Not Found' } = options;

  return function notFoundMiddleware(req, res, next) {
    res.statusCode = 404;

    // Content negotiation
    const accept = req.headers.accept || '';

    if (accept.includes('application/json')) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: message, path: req.url }));
    } else if (accept.includes('text/html')) {
      res.setHeader('Content-Type', 'text/html');
      res.end(`<!DOCTYPE html><html><head><title>404</title></head><body><h1>${message}</h1><p>Cannot ${req.method} ${req.url}</p></body></html>`);
    } else {
      res.setHeader('Content-Type', 'text/plain');
      res.end(`${message}: Cannot ${req.method} ${req.url}`);
    }
  };
}

/**
 * Error handler middleware
 *
 * Handles errors passed through the middleware chain.
 * Must be registered with 4 parameters (err, req, res, next).
 *
 * @param {Object} [options] - Options
 * @param {boolean} [options.showStack] - Show stack trace in dev
 * @returns {Function} Error middleware function
 */
function errorHandler(options = {}) {
  const {
    showStack = process.env.NODE_ENV !== 'production'
  } = options;

  // Note: Must have 4 parameters for Express to recognize it as error handler
  return function errorHandlerMiddleware(err, req, res, next) {
    // Default status
    const status = err.status || err.statusCode || 500;

    // Log error
    console.error(`[ERROR] ${req.method} ${req.url}:`, err.message);
    if (showStack && err.stack) {
      console.error(err.stack);
    }

    res.statusCode = status;

    // Content negotiation
    const accept = req.headers.accept || '';

    if (accept.includes('application/json')) {
      res.setHeader('Content-Type', 'application/json');
      const body = {
        error: err.message || 'Internal Server Error',
        status
      };
      if (showStack && err.stack) {
        body.stack = err.stack;
      }
      res.end(JSON.stringify(body));
    } else if (accept.includes('text/html')) {
      res.setHeader('Content-Type', 'text/html');
      let html = `<!DOCTYPE html><html><head><title>Error ${status}</title></head><body>`;
      html += `<h1>Error ${status}</h1>`;
      html += `<p>${err.message || 'Internal Server Error'}</p>`;
      if (showStack && err.stack) {
        html += `<pre>${err.stack}</pre>`;
      }
      html += '</body></html>';
      res.end(html);
    } else {
      res.setHeader('Content-Type', 'text/plain');
      let text = `Error ${status}: ${err.message || 'Internal Server Error'}`;
      if (showStack && err.stack) {
        text += `\n\n${err.stack}`;
      }
      res.end(text);
    }
  };
}

/**
 * Conditional middleware
 *
 * Runs middleware only if condition is met.
 *
 * @param {Function} condition - Condition function (req) => boolean
 * @param {Function} middleware - Middleware to conditionally run
 * @returns {Function} Middleware function
 *
 * @example
 * app.use(conditional(
 *   req => req.url.startsWith('/api'),
 *   apiAuthMiddleware
 * ));
 */
function conditional(condition, middleware) {
  return function conditionalMiddleware(req, res, next) {
    if (condition(req)) {
      middleware(req, res, next);
    } else {
      next();
    }
  };
}

/**
 * Compose multiple middleware into one
 *
 * @param {...Function} middlewares - Middleware functions
 * @returns {Function} Combined middleware
 *
 * @example
 * const apiMiddleware = compose(
 *   authenticate,
 *   rateLimit,
 *   cors()
 * );
 * app.use('/api', apiMiddleware);
 */
function compose(...middlewares) {
  return function composedMiddleware(req, res, next) {
    let index = 0;

    function dispatch(err) {
      if (err) {
        return next(err);
      }

      const middleware = middlewares[index++];

      if (!middleware) {
        return next();
      }

      try {
        middleware(req, res, dispatch);
      } catch (e) {
        next(e);
      }
    }

    dispatch();
  };
}

module.exports = {
  logger,
  requestId,
  responseTime,
  cors,
  notFound,
  errorHandler,
  conditional,
  compose
};
