/**
 * JSON Body Parser
 *
 * Parses JSON request bodies.
 * Equivalent to express.json()
 */

'use strict';

const { readBodyAsString } = require('./read-body');
const { typeIs, getCharset } = require('./content-type');
const { parseBytes } = require('./bytes');

/**
 * Create JSON body parser middleware
 *
 * @param {Object} options - Parser options
 * @param {string|number} [options.limit='100kb'] - Max body size
 * @param {boolean} [options.strict=true] - Only accept arrays/objects
 * @param {string|string[]|Function} [options.type='application/json'] - Content types to parse
 * @param {Function} [options.reviver] - JSON.parse reviver function
 * @returns {Function} Express middleware
 *
 * @example
 * app.use(json());
 * app.use(json({ limit: '1mb', strict: false }));
 */
function json(options = {}) {
  const {
    limit = '100kb',
    strict = true,
    type = 'application/json',
    reviver = null
  } = options;

  const bytesLimit = parseBytes(limit);

  return function jsonParser(req, res, next) {
    // Skip if body already parsed
    if (req.body !== undefined) {
      return next();
    }

    // Skip if no body
    if (!hasBody(req)) {
      req.body = {};
      return next();
    }

    // Check content type - skip to next middleware if not matching
    if (!typeIs(req, type)) {
      return next();
    }

    // Get charset
    const charset = getCharset(req.headers['content-type']) || 'utf-8';

    // Get content length
    const contentLength = req.headers['content-length']
      ? parseInt(req.headers['content-length'], 10)
      : null;

    // Read and parse body
    readBodyAsString(req, {
      limit: bytesLimit,
      length: contentLength,
      encoding: charset
    })
      .then(body => {
        // Handle empty body
        if (body.length === 0) {
          req.body = {};
          return next();
        }

        // Strict mode check - must start with { or [
        if (strict) {
          const firstChar = body.trim()[0];
          if (firstChar !== '{' && firstChar !== '[') {
            const err = new Error('Invalid JSON: only objects and arrays allowed');
            err.type = 'entity.parse.failed';
            err.statusCode = 400;
            err.body = body.slice(0, 100); // First 100 chars for debugging
            return next(err);
          }
        }

        // Parse JSON
        try {
          req.body = JSON.parse(body, reviver);
          next();
        } catch (e) {
          const err = new Error('Invalid JSON');
          err.type = 'entity.parse.failed';
          err.statusCode = 400;
          err.body = body.slice(0, 100);
          next(err);
        }
      })
      .catch(next);
  };
}

/**
 * Check if request has a body
 *
 * @param {Object} req - Request object
 * @returns {boolean} True if request has body
 */
function hasBody(req) {
  const method = req.method;

  // These methods typically have bodies
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    return true;
  }

  // Check Content-Length or Transfer-Encoding
  const contentLength = req.headers['content-length'];
  const transferEncoding = req.headers['transfer-encoding'];

  if (contentLength && contentLength !== '0') {
    return true;
  }

  if (transferEncoding) {
    return true;
  }

  return false;
}

module.exports = json;
module.exports.json = json;
module.exports.hasBody = hasBody;
