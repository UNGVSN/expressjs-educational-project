/**
 * Text Body Parser
 *
 * Returns the request body as a string.
 * Equivalent to express.text()
 */

'use strict';

const { readBodyAsString } = require('./read-body');
const { typeIs, getCharset } = require('./content-type');
const { parseBytes } = require('./bytes');

/**
 * Create text body parser middleware
 *
 * @param {Object} options - Parser options
 * @param {string|number} [options.limit='100kb'] - Max body size
 * @param {string} [options.defaultCharset='utf-8'] - Default charset
 * @param {string|string[]|Function} [options.type='text/plain'] - Content types
 * @returns {Function} Express middleware
 *
 * @example
 * // Parse plain text
 * app.use(text());
 *
 * // Parse all text types
 * app.use(text({ type: 'text/*' }));
 */
function text(options = {}) {
  const {
    limit = '100kb',
    defaultCharset = 'utf-8',
    type = 'text/plain'
  } = options;

  const bytesLimit = parseBytes(limit);

  return function textParser(req, res, next) {
    // Skip if body already parsed
    if (req.body !== undefined) {
      return next();
    }

    // Skip if no body
    if (!hasBody(req)) {
      req.body = '';
      return next();
    }

    // Check content type - skip to next middleware if not matching
    if (!typeIs(req, type)) {
      return next();
    }

    // Get charset
    const charset = getCharset(req.headers['content-type']) || defaultCharset;

    // Get content length
    const contentLength = req.headers['content-length']
      ? parseInt(req.headers['content-length'], 10)
      : null;

    // Read body as string
    readBodyAsString(req, {
      limit: bytesLimit,
      length: contentLength,
      encoding: charset
    })
      .then(body => {
        req.body = body;
        next();
      })
      .catch(next);
  };
}

/**
 * Check if request has a body
 */
function hasBody(req) {
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

module.exports = text;
module.exports.text = text;
