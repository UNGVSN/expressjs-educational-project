/**
 * Request - Enhanced request object
 *
 * Adds Express-like methods and properties to the Node.js request object.
 */

'use strict';

const { parse: parseUrl } = require('url');

/**
 * Enhance the request object with Express-like properties and methods
 *
 * @param {http.IncomingMessage} req - Node.js request object
 * @param {http.ServerResponse} res - Node.js response object
 */
function enhanceRequest(req, res) {
  // Parse URL once
  const parsedUrl = parseUrl(req.url, true);

  // Basic properties
  req.path = parsedUrl.pathname;
  req.query = parsedUrl.query;
  req.params = {};
  req.body = undefined;

  // Protocol detection
  req.protocol = req.socket.encrypted ? 'https' : 'http';
  req.secure = req.protocol === 'https';

  // Host information
  req.hostname = req.headers.host ? req.headers.host.split(':')[0] : '';
  req.ip = req.socket.remoteAddress;

  // Fresh/stale (simplified)
  req.fresh = false;
  req.stale = true;

  // XHR detection
  Object.defineProperty(req, 'xhr', {
    get() {
      const val = req.headers['x-requested-with'] || '';
      return val.toLowerCase() === 'xmlhttprequest';
    }
  });

  /**
   * Get a header value (case-insensitive)
   *
   * @param {string} name - Header name
   * @returns {string|undefined} Header value
   */
  req.get = function(name) {
    const lc = name.toLowerCase();

    switch (lc) {
      case 'referer':
      case 'referrer':
        return req.headers.referrer || req.headers.referer;
      default:
        return req.headers[lc];
    }
  };

  // Alias for get
  req.header = req.get;

  /**
   * Check if the request accepts the given content type(s)
   *
   * @param {...string} types - Content types
   * @returns {string|false} Best match or false
   */
  req.accepts = function(...types) {
    const accept = req.headers.accept || '*/*';

    for (const type of types) {
      if (accept.includes(type) || accept.includes('*/*')) {
        return type;
      }
    }

    return false;
  };

  /**
   * Check if the content type matches
   *
   * @param {...string} types - Content types
   * @returns {string|false} Matching type or false
   */
  req.is = function(...types) {
    const contentType = req.headers['content-type'] || '';

    for (const type of types) {
      if (type === '*/*') {
        return contentType.split(';')[0];
      }
      if (contentType.includes(type)) {
        return type;
      }
      // Handle shorthand like 'json' or 'html'
      if (contentType.includes(`/${type}`)) {
        return contentType.split(';')[0];
      }
    }

    return false;
  };

  /**
   * Get a parameter from params, body, or query (in that order)
   *
   * @param {string} name - Parameter name
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Parameter value
   */
  req.param = function(name, defaultValue) {
    const params = req.params || {};
    const body = req.body || {};
    const query = req.query || {};

    if (params[name] != null) return params[name];
    if (body[name] != null) return body[name];
    if (query[name] != null) return query[name];

    return defaultValue;
  };

  return req;
}

module.exports = { enhanceRequest };
