/**
 * Raw Body Parser
 *
 * Returns the request body as a Buffer.
 * Equivalent to express.raw()
 */

'use strict';

const { readBody } = require('./read-body');
const { typeIs } = require('./content-type');
const { parseBytes } = require('./bytes');

/**
 * Create raw body parser middleware
 *
 * @param {Object} options - Parser options
 * @param {string|number} [options.limit='100kb'] - Max body size
 * @param {string|string[]|Function} [options.type='application/octet-stream'] - Content types
 * @returns {Function} Express middleware
 *
 * @example
 * // Parse binary uploads
 * app.use(raw({ type: 'application/octet-stream', limit: '5mb' }));
 *
 * // Parse any content type
 * app.use('/webhook', raw({ type: '*\/*' }));
 */
function raw(options = {}) {
  const {
    limit = '100kb',
    type = 'application/octet-stream'
  } = options;

  const bytesLimit = parseBytes(limit);

  return function rawParser(req, res, next) {
    // Skip if body already parsed
    if (req.body !== undefined) {
      return next();
    }

    // Skip if no body
    if (!hasBody(req)) {
      req.body = Buffer.alloc(0);
      return next();
    }

    // Check content type - skip to next middleware if not matching
    if (!typeIs(req, type)) {
      return next();
    }

    // Get content length
    const contentLength = req.headers['content-length']
      ? parseInt(req.headers['content-length'], 10)
      : null;

    // Read body as buffer
    readBody(req, {
      limit: bytesLimit,
      length: contentLength
    })
      .then(buffer => {
        req.body = buffer;
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

module.exports = raw;
module.exports.raw = raw;
