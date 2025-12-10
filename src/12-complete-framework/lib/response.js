/**
 * Response - Enhanced response object
 *
 * Adds Express-like methods to the Node.js response object.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { serialize: serializeCookie } = require('../../11-cookies-sessions/lib/cookie');
const { sign: signCookie } = require('../../11-cookies-sessions/lib/signed');

// Common MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml'
};

/**
 * Enhance the response object with Express-like methods
 *
 * @param {http.IncomingMessage} req - Node.js request object
 * @param {http.ServerResponse} res - Node.js response object
 * @param {Object} app - Application reference
 */
function enhanceResponse(req, res, app) {
  // Store references
  res.req = req;
  res.app = app;
  res.locals = {};

  /**
   * Set status code
   *
   * @param {number} code - HTTP status code
   * @returns {Response} For chaining
   */
  res.status = function(code) {
    res.statusCode = code;
    return res;
  };

  /**
   * Set a header or multiple headers
   *
   * @param {string|Object} field - Header name or object
   * @param {string} [val] - Header value
   * @returns {Response} For chaining
   */
  res.set = function(field, val) {
    if (typeof field === 'object') {
      for (const key in field) {
        res.setHeader(key, field[key]);
      }
    } else {
      res.setHeader(field, val);
    }
    return res;
  };

  // Alias for set
  res.header = res.set;

  /**
   * Get a header value
   *
   * @param {string} field - Header name
   * @returns {string|undefined} Header value
   */
  res.get = function(field) {
    return res.getHeader(field);
  };

  /**
   * Set Content-Type header
   *
   * @param {string} type - Content type
   * @returns {Response} For chaining
   */
  res.type = function(type) {
    const contentType = type.includes('/')
      ? type
      : MIME_TYPES['.' + type] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    return res;
  };

  // Alias
  res.contentType = res.type;

  /**
   * Send a JSON response
   *
   * @param {*} data - Data to send
   * @returns {Response} For chaining
   */
  res.json = function(data) {
    const body = JSON.stringify(data);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Length', Buffer.byteLength(body));
    res.end(body);
    return res;
  };

  /**
   * Send a JSONP response
   *
   * @param {*} data - Data to send
   * @returns {Response} For chaining
   */
  res.jsonp = function(data) {
    const callback = req.query.callback || req.query.cb;
    const body = JSON.stringify(data);

    if (callback) {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(`/**/ typeof ${callback} === 'function' && ${callback}(${body});`);
    } else {
      res.json(data);
    }

    return res;
  };

  /**
   * Send a response
   *
   * @param {*} body - Response body
   * @returns {Response} For chaining
   */
  res.send = function(body) {
    let chunk = body;
    let type = res.getHeader('Content-Type');

    // Determine content type and convert body
    if (typeof body === 'object' && body !== null) {
      if (Buffer.isBuffer(body)) {
        type = type || 'application/octet-stream';
        chunk = body;
      } else {
        return res.json(body);
      }
    } else if (typeof body === 'string') {
      type = type || 'text/html';
      chunk = body;
    } else if (typeof body === 'number') {
      // Deprecated: send status
      res.statusCode = body;
      chunk = String(body);
    }

    // Set headers
    if (type) {
      res.setHeader('Content-Type', type);
    }
    if (chunk) {
      res.setHeader('Content-Length', Buffer.byteLength(chunk));
    }

    // Send
    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(chunk);
    }

    return res;
  };

  /**
   * Send a file
   *
   * @param {string} filePath - Path to file
   * @param {Object} [options] - Options
   * @param {Function} [callback] - Callback
   */
  res.sendFile = function(filePath, options = {}, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    const root = options.root || '';
    const fullPath = root ? path.join(root, filePath) : filePath;

    fs.stat(fullPath, (err, stats) => {
      if (err) {
        if (callback) return callback(err);
        res.status(404).send('Not Found');
        return;
      }

      if (!stats.isFile()) {
        if (callback) return callback(new Error('Not a file'));
        res.status(404).send('Not Found');
        return;
      }

      // Set content type
      const ext = path.extname(fullPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stats.size);

      // Stream file
      const stream = fs.createReadStream(fullPath);
      stream.on('error', (err) => {
        if (callback) callback(err);
        else res.status(500).send('Internal Server Error');
      });
      stream.on('end', () => {
        if (callback) callback();
      });
      stream.pipe(res);
    });
  };

  /**
   * Set a cookie
   *
   * @param {string} name - Cookie name
   * @param {*} value - Cookie value
   * @param {Object} [options] - Cookie options
   * @returns {Response} For chaining
   */
  res.cookie = function(name, value, options = {}) {
    const opts = { path: '/', ...options };

    // Handle JSON values
    let val = value;
    if (typeof value === 'object' && value !== null) {
      val = 'j:' + JSON.stringify(value);
    } else {
      val = String(value);
    }

    // Sign cookie if requested
    if (opts.signed) {
      if (!req.secret) {
        throw new Error('cookieParser("secret") required for signed cookies');
      }
      val = signCookie(val, req.secret);
      delete opts.signed;
    }

    // Handle maxAge -> expires conversion
    if (opts.maxAge != null) {
      opts.expires = new Date(Date.now() + opts.maxAge);
    }

    // Serialize cookie
    const cookieStr = serializeCookie(name, val, opts);

    // Append to existing cookies
    const existing = res.getHeader('Set-Cookie');
    if (existing) {
      const cookies = Array.isArray(existing) ? existing : [existing];
      cookies.push(cookieStr);
      res.setHeader('Set-Cookie', cookies);
    } else {
      res.setHeader('Set-Cookie', cookieStr);
    }

    return res;
  };

  /**
   * Clear a cookie
   *
   * @param {string} name - Cookie name
   * @param {Object} [options] - Cookie options
   * @returns {Response} For chaining
   */
  res.clearCookie = function(name, options = {}) {
    return res.cookie(name, '', {
      ...options,
      path: options.path || '/',
      expires: new Date(1),
      maxAge: 0
    });
  };

  /**
   * Redirect to a URL
   *
   * @param {number|string} statusOrUrl - Status code or URL
   * @param {string} [url] - URL if status provided
   * @returns {Response} For chaining
   */
  res.redirect = function(statusOrUrl, url) {
    let status = 302;
    let location = statusOrUrl;

    if (typeof statusOrUrl === 'number') {
      status = statusOrUrl;
      location = url;
    }

    // Handle back redirect
    if (location === 'back') {
      location = req.get('Referrer') || '/';
    }

    res.statusCode = status;
    res.setHeader('Location', location);
    res.setHeader('Content-Type', 'text/html');
    res.end(`Redirecting to <a href="${location}">${location}</a>`);

    return res;
  };

  /**
   * Render a view
   *
   * @param {string} view - View name
   * @param {Object} [options] - View data
   * @param {Function} [callback] - Callback
   */
  res.render = function(view, options = {}, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    // Merge with locals
    const data = { ...app.locals, ...res.locals, ...options };

    // Render using app's render method
    app.render(view, data, (err, html) => {
      if (err) {
        if (callback) return callback(err);
        throw err;
      }

      if (callback) {
        callback(null, html);
      } else {
        res.send(html);
      }
    });
  };

  /**
   * Send download response
   *
   * @param {string} filePath - Path to file
   * @param {string} [filename] - Download filename
   * @param {Object} [options] - Options
   * @param {Function} [callback] - Callback
   */
  res.download = function(filePath, filename, options, callback) {
    // Handle optional arguments
    if (typeof filename === 'function') {
      callback = filename;
      filename = path.basename(filePath);
      options = {};
    } else if (typeof filename === 'object') {
      options = filename;
      filename = path.basename(filePath);
      callback = options;
    } else if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    filename = filename || path.basename(filePath);
    options = options || {};

    // Set Content-Disposition header
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.sendFile(filePath, options, callback);
  };

  /**
   * Add Vary header
   *
   * @param {string} field - Field to vary on
   * @returns {Response} For chaining
   */
  res.vary = function(field) {
    const existing = res.getHeader('Vary');
    const value = existing ? `${existing}, ${field}` : field;
    res.setHeader('Vary', value);
    return res;
  };

  /**
   * Set Link header
   *
   * @param {Object} links - Link relations
   * @returns {Response} For chaining
   */
  res.links = function(links) {
    const parts = [];
    for (const rel in links) {
      parts.push(`<${links[rel]}>; rel="${rel}"`);
    }
    res.setHeader('Link', parts.join(', '));
    return res;
  };

  /**
   * Send status without body
   *
   * @param {number} code - Status code
   */
  res.sendStatus = function(code) {
    const statusMessages = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      301: 'Moved Permanently',
      302: 'Found',
      304: 'Not Modified',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error'
    };

    res.statusCode = code;
    res.end(statusMessages[code] || String(code));
  };

  /**
   * Format response based on Accept header
   *
   * @param {Object} obj - Object mapping types to handlers
   */
  res.format = function(obj) {
    const accept = req.accepts(...Object.keys(obj));

    if (accept) {
      obj[accept](req, res);
    } else if (obj.default) {
      obj.default(req, res);
    } else {
      res.status(406).send('Not Acceptable');
    }
  };

  return res;
}

module.exports = { enhanceResponse };
