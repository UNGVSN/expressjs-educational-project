/**
 * Response Object Enhancements
 *
 * This module extends Node's ServerResponse prototype to add
 * Express-like methods for sending responses.
 *
 * These methods make it much easier to send common response types
 * and enable method chaining.
 */

'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');

/**
 * Reference to ServerResponse prototype.
 * Methods added here are available on all response objects.
 */
const res = http.ServerResponse.prototype;

/**
 * Common MIME types mapping.
 */
const MIME_TYPES = {
  'html': 'text/html; charset=utf-8',
  'htm': 'text/html; charset=utf-8',
  'txt': 'text/plain; charset=utf-8',
  'text': 'text/plain; charset=utf-8',
  'json': 'application/json; charset=utf-8',
  'xml': 'application/xml; charset=utf-8',
  'css': 'text/css; charset=utf-8',
  'js': 'application/javascript; charset=utf-8',
  'javascript': 'application/javascript; charset=utf-8',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'svg': 'image/svg+xml',
  'ico': 'image/x-icon',
  'webp': 'image/webp',
  'pdf': 'application/pdf',
  'zip': 'application/zip',
  'mp3': 'audio/mpeg',
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'woff': 'font/woff',
  'woff2': 'font/woff2',
  'ttf': 'font/ttf',
  'eot': 'application/vnd.ms-fontobject',
  'otf': 'font/otf',
  'bin': 'application/octet-stream'
};

/**
 * Set status `code`.
 *
 * @param {number} code - HTTP status code
 * @returns {ServerResponse} this (for chaining)
 *
 * @example
 * res.status(200).json({ success: true })
 * res.status(404).send('Not Found')
 */
res.status = function status(code) {
  this.statusCode = code;
  return this;
};

/**
 * Set response header `field` to `val`, or pass an object of headers.
 *
 * @param {string|Object} field - Header name or object of headers
 * @param {string} [val] - Header value
 * @returns {ServerResponse} this (for chaining)
 *
 * @example
 * res.set('Content-Type', 'text/plain')
 * res.set({ 'Content-Type': 'text/plain', 'X-Custom': 'value' })
 */
res.set = function set(field, val) {
  if (arguments.length === 2) {
    // Single header
    let value = Array.isArray(val) ? val.map(String) : String(val);

    // Add charset to content-type if not present
    if (field.toLowerCase() === 'content-type') {
      if (Array.isArray(value)) {
        throw new TypeError('Content-Type cannot be set to an Array');
      }
      if (!/;\s*charset\s*=/.test(value)) {
        const match = value.match(/^(text\/|application\/json)/);
        if (match) {
          value += '; charset=utf-8';
        }
      }
    }

    this.setHeader(field, value);
  } else if (typeof field === 'object') {
    // Multiple headers
    for (const key in field) {
      this.set(key, field[key]);
    }
  }

  return this;
};

/**
 * Alias for `res.set()`
 */
res.header = res.set;

/**
 * Get the value of a response header.
 *
 * @param {string} field - Header name
 * @returns {string|undefined} Header value
 */
res.get = function get(field) {
  return this.getHeader(field);
};

/**
 * Append additional header `field` with value `val`.
 *
 * @param {string} field - Header name
 * @param {string|string[]} val - Header value(s)
 * @returns {ServerResponse} this (for chaining)
 *
 * @example
 * res.append('Set-Cookie', 'foo=bar')
 * res.append('Set-Cookie', 'baz=qux')
 */
res.append = function append(field, val) {
  const prev = this.get(field);
  let value = val;

  if (prev) {
    // Concat the values
    value = Array.isArray(prev)
      ? prev.concat(val)
      : Array.isArray(val)
        ? [prev].concat(val)
        : [prev, val];
  }

  return this.set(field, value);
};

/**
 * Set Content-Type response header.
 *
 * @param {string} type - MIME type or extension
 * @returns {ServerResponse} this (for chaining)
 *
 * @example
 * res.type('html')           // text/html; charset=utf-8
 * res.type('application/json') // application/json; charset=utf-8
 * res.type('.png')           // image/png
 */
res.type = function type(type) {
  // Remove leading dot
  const normalizedType = type.startsWith('.') ? type.slice(1) : type;

  // Look up MIME type
  const contentType = MIME_TYPES[normalizedType] || type;

  return this.set('Content-Type', contentType);
};

/**
 * Alias for res.type()
 */
res.contentType = res.type;

/**
 * Send a JSON response.
 *
 * @param {any} obj - Data to send as JSON
 * @returns {ServerResponse} this
 *
 * @example
 * res.json({ user: 'tobi' })
 * res.json(null)
 * res.status(500).json({ error: 'message' })
 */
res.json = function json(obj) {
  // Settings
  const app = this.app;
  const escape = app?.get?.('json escape') ?? false;
  const replacer = app?.get?.('json replacer') ?? null;
  const spaces = app?.get?.('json spaces') ?? (app?.get?.('env') === 'development' ? 2 : 0);

  // Stringify
  let body = JSON.stringify(obj, replacer, spaces);

  // Escape characters for security
  if (escape) {
    body = body
      .replace(/[<>&]/g, (c) => {
        switch (c) {
          case '<': return '\\u003c';
          case '>': return '\\u003e';
          case '&': return '\\u0026';
          default: return c;
        }
      });
  }

  // Set content type if not set
  if (!this.get('Content-Type')) {
    this.set('Content-Type', 'application/json; charset=utf-8');
  }

  return this.send(body);
};

/**
 * Send a JSONP response.
 *
 * @param {any} obj - Data to send
 * @returns {ServerResponse} this
 *
 * @example
 * res.jsonp({ user: 'tobi' })
 * // => callback({"user":"tobi"})
 */
res.jsonp = function jsonp(obj) {
  const app = this.app;
  const replacer = app?.get?.('json replacer') ?? null;
  const spaces = app?.get?.('json spaces') ?? 0;
  let body = JSON.stringify(obj, replacer, spaces);

  // Get callback name
  let callback = this.req?.query?.callback;

  // Sanitize callback name
  if (Array.isArray(callback)) {
    callback = callback[0];
  }

  if (typeof callback === 'string' && callback.length !== 0) {
    // Validate callback name
    callback = callback.replace(/[^\w$.[\]]/g, '');

    // Escape for security
    body = body
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');

    // Wrap in callback
    body = `/**/ typeof ${callback} === 'function' && ${callback}(${body});`;

    // Content type
    if (!this.get('Content-Type')) {
      this.set('X-Content-Type-Options', 'nosniff');
      this.set('Content-Type', 'text/javascript; charset=utf-8');
    }
  }

  return this.send(body);
};

/**
 * Send a response.
 *
 * @param {string|number|boolean|object|Buffer} body - Response body
 * @returns {ServerResponse} this
 *
 * @example
 * res.send({ some: 'json' })
 * res.send('<p>some html</p>')
 * res.send('Sorry, we cannot find that!')
 * res.send(Buffer.from('hello'))
 * res.status(404).send('Not Found')
 */
res.send = function send(body) {
  let chunk = body;
  let encoding;
  const req = this.req;
  let type;

  // Allow status / body
  if (arguments.length === 2) {
    // res.send(body, status) - deprecated
    if (typeof arguments[0] !== 'number' && typeof arguments[1] === 'number') {
      this.statusCode = arguments[1];
    } else {
      // res.send(status, body)
      this.statusCode = arguments[0];
      chunk = arguments[1];
    }
  }

  // Disambiguate res.send(status)
  if (typeof chunk === 'number' && arguments.length === 1) {
    // res.send(status) - deprecated
    if (!this.get('Content-Type')) {
      this.type('text');
    }
    this.statusCode = chunk;
    chunk = http.STATUS_CODES[chunk] || String(chunk);
  }

  // Handle different chunk types
  switch (typeof chunk) {
    case 'string':
      if (!this.get('Content-Type')) {
        // Detect HTML
        if (chunk.charAt(0) === '<') {
          this.type('html');
        } else {
          this.type('text');
        }
      }
      break;

    case 'boolean':
    case 'number':
      if (!this.get('Content-Type')) {
        this.type('text');
      }
      chunk = String(chunk);
      break;

    case 'object':
      if (chunk === null) {
        chunk = '';
      } else if (Buffer.isBuffer(chunk)) {
        if (!this.get('Content-Type')) {
          this.type('bin');
        }
      } else {
        // Object - send as JSON
        return this.json(chunk);
      }
      break;
  }

  // Determine encoding
  if (typeof chunk === 'string') {
    encoding = 'utf8';
    type = this.get('Content-Type');

    // Reflect this in content-type
    if (typeof type === 'string') {
      this.set('Content-Type', type);
    }
  }

  // Populate Content-Length
  let len;
  if (chunk !== undefined) {
    if (Buffer.isBuffer(chunk)) {
      len = chunk.length;
    } else if (typeof chunk === 'string') {
      // Get length before conversion
      len = Buffer.byteLength(chunk, encoding);
    }

    this.set('Content-Length', len);
  }

  // ETag support (optional)
  // Skipped for simplicity - real Express generates ETag

  // Freshness check
  // Skipped for simplicity

  // Strip body for HEAD
  if (req?.method === 'HEAD') {
    this.end();
  } else {
    this.end(chunk, encoding);
  }

  return this;
};

/**
 * Send given HTTP status code with its default message.
 *
 * @param {number} statusCode - HTTP status code
 * @returns {ServerResponse} this
 *
 * @example
 * res.sendStatus(200) // OK
 * res.sendStatus(404) // Not Found
 */
res.sendStatus = function sendStatus(statusCode) {
  const body = http.STATUS_CODES[statusCode] || String(statusCode);

  this.statusCode = statusCode;
  this.type('text');

  return this.send(body);
};

/**
 * Redirect to the given `url` with optional status code (default 302).
 *
 * @param {number|string} statusOrUrl - Status code or URL
 * @param {string} [url] - URL if status provided first
 * @returns {ServerResponse} this
 *
 * @example
 * res.redirect('/foo/bar')
 * res.redirect(301, '/moved')
 * res.redirect('http://example.com')
 * res.redirect('back')
 */
res.redirect = function redirect(statusOrUrl, url) {
  let status = 302;
  let address = statusOrUrl;

  // Handle res.redirect(status, url)
  if (typeof statusOrUrl === 'number') {
    status = statusOrUrl;
    address = url;
  }

  // Handle 'back' redirect
  if (address === 'back') {
    address = this.req?.get?.('Referrer') || '/';
  }

  // Set redirect headers
  this.statusCode = status;
  this.set('Location', address);

  // Send redirect body
  const body = `Redirecting to ${address}`;
  this.set('Content-Type', 'text/plain; charset=utf-8');
  this.set('Content-Length', Buffer.byteLength(body));

  // Support text/html for redirect
  if (this.req?.accepts?.('html')) {
    const htmlBody = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0;url=${address}">
<title>Redirecting to ${address}</title>
</head>
<body>
<p>Redirecting to <a href="${address}">${address}</a></p>
</body>
</html>`;
    this.set('Content-Type', 'text/html; charset=utf-8');
    this.set('Content-Length', Buffer.byteLength(htmlBody));
    this.end(htmlBody);
  } else {
    this.end(body);
  }

  return this;
};

/**
 * Set Link header field with the given `links`.
 *
 * @param {Object} links - Links object
 * @returns {ServerResponse} this
 *
 * @example
 * res.links({
 *   next: 'http://api.example.com/users?page=2',
 *   last: 'http://api.example.com/users?page=5'
 * })
 */
res.links = function links(links) {
  let link = this.get('Link') || '';
  if (link) link += ', ';

  const linkHeader = Object.keys(links)
    .map(rel => `<${links[rel]}>; rel="${rel}"`)
    .join(', ');

  return this.set('Link', link + linkHeader);
};

/**
 * Set the location header to `url`.
 *
 * @param {string} url - Location URL
 * @returns {ServerResponse} this
 */
res.location = function location(url) {
  return this.set('Location', url);
};

/**
 * Clear a cookie.
 *
 * @param {string} name - Cookie name
 * @param {Object} [options] - Cookie options
 * @returns {ServerResponse} this
 */
res.clearCookie = function clearCookie(name, options = {}) {
  const opts = {
    path: '/',
    ...options,
    expires: new Date(1)
  };

  return this.cookie(name, '', opts);
};

/**
 * Set cookie `name` to `value`.
 *
 * @param {string} name - Cookie name
 * @param {string|Object} value - Cookie value
 * @param {Object} [options] - Cookie options
 * @returns {ServerResponse} this
 *
 * @example
 * res.cookie('name', 'tobi')
 * res.cookie('rememberme', '1', { maxAge: 900000, httpOnly: true })
 */
res.cookie = function cookie(name, value, options = {}) {
  const opts = { path: '/', ...options };

  // Handle object values
  const val = typeof value === 'object'
    ? 'j:' + JSON.stringify(value)
    : String(value);

  // Build cookie string
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(val)}`;

  if (opts.maxAge != null) {
    const maxAge = opts.maxAge - 0;
    if (!isNaN(maxAge)) {
      cookie += `; Max-Age=${Math.floor(maxAge / 1000)}`;
    }
  }

  if (opts.domain) {
    cookie += `; Domain=${opts.domain}`;
  }

  if (opts.path) {
    cookie += `; Path=${opts.path}`;
  }

  if (opts.expires) {
    cookie += `; Expires=${opts.expires.toUTCString()}`;
  }

  if (opts.httpOnly) {
    cookie += '; HttpOnly';
  }

  if (opts.secure) {
    cookie += '; Secure';
  }

  if (opts.sameSite) {
    const sameSite = typeof opts.sameSite === 'string'
      ? opts.sameSite
      : (opts.sameSite === true ? 'Strict' : undefined);

    if (sameSite) {
      cookie += `; SameSite=${sameSite}`;
    }
  }

  // Append to Set-Cookie header
  return this.append('Set-Cookie', cookie);
};

/**
 * Set the Vary header.
 *
 * @param {string|string[]} field - Header field(s)
 * @returns {ServerResponse} this
 */
res.vary = function vary(field) {
  const fields = Array.isArray(field) ? field : [field];
  const existing = this.get('Vary');

  let vary = existing ? existing.split(/\s*,\s*/) : [];
  vary = [...new Set([...vary, ...fields])];

  return this.set('Vary', vary.join(', '));
};

/**
 * Respond to the Acceptable formats using an `obj`
 * of mime-type callbacks.
 *
 * @param {Object} obj - Object mapping content types to handlers
 * @returns {ServerResponse} this
 *
 * @example
 * res.format({
 *   'text/plain': () => res.send('hey'),
 *   'text/html': () => res.send('<p>hey</p>'),
 *   'application/json': () => res.json({ message: 'hey' }),
 *   default: () => res.status(406).send('Not Acceptable')
 * })
 */
res.format = function format(obj) {
  const req = this.req;
  const keys = Object.keys(obj).filter(v => v !== 'default');

  const key = keys.length > 0 ? req?.accepts?.(keys) : false;

  this.vary('Accept');

  if (key) {
    this.set('Content-Type', key);
    obj[key](req, this);
  } else if (obj.default) {
    obj.default(req, this);
  } else {
    this.status(406).send('Not Acceptable');
  }

  return this;
};

/**
 * Export the extended response prototype.
 */
module.exports = res;
