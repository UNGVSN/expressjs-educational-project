/**
 * Error Handling Middleware
 *
 * Provides various error handling middleware functions.
 */

'use strict';

const { AppError } = require('./errors');

/**
 * Async handler wrapper
 * Catches errors from async functions and passes to next()
 *
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 * Catches requests that don't match any route
 *
 * @returns {Function} Middleware function
 */
function notFoundHandler() {
  return (req, res, next) => {
    const err = new Error(`Cannot ${req.method} ${req.path}`);
    err.statusCode = 404;
    err.status = 'fail';
    next(err);
  };
}

/**
 * Error logger middleware
 * Logs errors and passes them to next handler
 *
 * @param {Object} options - Logger options
 * @returns {Function} Error middleware
 */
function errorLogger(options = {}) {
  const {
    logger = console,
    includeStack = true
  } = options;

  return (err, req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const path = req.path;
    const statusCode = err.statusCode || 500;

    const logMessage = `[${timestamp}] ${method} ${path} - ${statusCode} - ${err.message}`;

    if (statusCode >= 500) {
      logger.error(logMessage);
      if (includeStack && err.stack) {
        logger.error(err.stack);
      }
    } else {
      logger.warn(logMessage);
    }

    next(err);
  };
}

/**
 * Development error handler
 * Shows full error details including stack trace
 *
 * @returns {Function} Error middleware
 */
function developmentErrorHandler() {
  return (err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
      error: {
        message: err.message,
        status: err.status || 'error',
        statusCode,
        stack: err.stack,
        ...(err.errors && { errors: err.errors })
      }
    });
  };
}

/**
 * Production error handler
 * Hides sensitive information from responses
 *
 * @returns {Function} Error middleware
 */
function productionErrorHandler() {
  return (err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    // Operational errors (expected) - send message to client
    if (err.isOperational) {
      return res.status(statusCode).json({
        error: {
          message: err.message,
          status: err.status || 'error',
          statusCode,
          ...(err.errors && { errors: err.errors })
        }
      });
    }

    // Programming errors (unexpected) - don't leak details
    console.error('UNEXPECTED ERROR:', err);

    res.status(500).json({
      error: {
        message: 'Something went wrong',
        status: 'error',
        statusCode: 500
      }
    });
  };
}

/**
 * Content negotiation error handler
 * Responds with HTML or JSON based on Accept header
 *
 * @param {Object} options - Handler options
 * @returns {Function} Error middleware
 */
function contentNegotiationErrorHandler(options = {}) {
  const {
    showStack = process.env.NODE_ENV !== 'production',
    htmlTemplate = defaultHtmlTemplate
  } = options;

  return (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Check Accept header
    const acceptsHtml = req.accepts('html');
    const acceptsJson = req.accepts('json');

    if (acceptsHtml && !acceptsJson) {
      // Send HTML
      const html = htmlTemplate({
        statusCode,
        message,
        stack: showStack ? err.stack : null
      });

      res.status(statusCode)
        .set('Content-Type', 'text/html')
        .send(html);
    } else {
      // Send JSON (default)
      const response = {
        error: {
          message,
          statusCode
        }
      };

      if (showStack) {
        response.error.stack = err.stack;
      }

      res.status(statusCode).json(response);
    }
  };
}

/**
 * Default HTML error template
 */
function defaultHtmlTemplate({ statusCode, message, stack }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Error ${statusCode}</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: #f5f5f5;
      margin: 0;
      padding: 40px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #dc3545;
      margin: 0 0 10px 0;
    }
    .status-code {
      font-size: 4em;
      font-weight: bold;
      color: #dc3545;
      opacity: 0.3;
      margin-bottom: 20px;
    }
    .message {
      font-size: 1.2em;
      color: #333;
      margin-bottom: 20px;
    }
    pre {
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 20px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.9em;
    }
    a {
      color: #007bff;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="status-code">${statusCode}</div>
    <h1>Error</h1>
    <p class="message">${message}</p>
    ${stack ? `<pre>${stack}</pre>` : ''}
    <p><a href="/">← Back to Home</a></p>
  </div>
</body>
</html>
  `;
}

/**
 * Validation error handler
 * Formats validation errors specifically
 *
 * @returns {Function} Error middleware
 */
function validationErrorHandler() {
  return (err, req, res, next) => {
    if (err.name === 'ValidationError' || err.statusCode === 422) {
      return res.status(422).json({
        error: {
          message: err.message || 'Validation failed',
          statusCode: 422,
          errors: err.errors || []
        }
      });
    }
    next(err);
  };
}

/**
 * Rate limit error handler
 *
 * @returns {Function} Error middleware
 */
function rateLimitErrorHandler() {
  return (err, req, res, next) => {
    if (err.name === 'RateLimitError' || err.statusCode === 429) {
      res.setHeader('Retry-After', err.retryAfter || 60);
      return res.status(429).json({
        error: {
          message: err.message || 'Too many requests',
          statusCode: 429,
          retryAfter: err.retryAfter || 60
        }
      });
    }
    next(err);
  };
}

module.exports = {
  asyncHandler,
  notFoundHandler,
  errorLogger,
  developmentErrorHandler,
  productionErrorHandler,
  contentNegotiationErrorHandler,
  validationErrorHandler,
  rateLimitErrorHandler,
  defaultHtmlTemplate
};
