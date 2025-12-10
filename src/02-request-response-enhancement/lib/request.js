/**
 * Request Object Enhancements
 *
 * This module extends Node's IncomingMessage prototype to add
 * Express-like methods and properties to all request objects.
 *
 * Express does this to provide a cleaner, more intuitive API
 * for working with HTTP requests.
 */

'use strict';

const http = require('http');
const { URL } = require('url');

/**
 * Reference to IncomingMessage prototype.
 * Methods added here are available on all request objects.
 */
const req = http.IncomingMessage.prototype;

/**
 * Get the value of a request header.
 *
 * Case-insensitive. The Referrer and Referer headers are
 * interchangeable.
 *
 * @param {string} name - Header name
 * @returns {string|undefined} Header value
 *
 * @example
 * req.get('Content-Type')  // 'application/json'
 * req.get('content-type')  // 'application/json' (same)
 * req.get('Referrer')      // Checks both 'referrer' and 'referer'
 */
req.get = function get(name) {
  if (!name) {
    throw new TypeError('name argument is required to req.get');
  }

  if (typeof name !== 'string') {
    throw new TypeError('name must be a string to req.get');
  }

  const lc = name.toLowerCase();

  // Handle referrer/referer interchangeably
  switch (lc) {
    case 'referer':
    case 'referrer':
      return this.headers.referrer || this.headers.referer;
    default:
      return this.headers[lc];
  }
};

/**
 * Alias for req.get()
 */
req.header = req.get;

/**
 * Check if the incoming request contains the "Content-Type"
 * header field, and if it matches the given mime type.
 *
 * @param {string|string[]} types - MIME type(s) to check
 * @returns {string|false|null} Matching type or false/null
 *
 * @example
 * // With Content-Type: application/json
 * req.is('json')           // 'json'
 * req.is('application/json') // 'application/json'
 * req.is('html')           // false
 */
req.is = function is(types) {
  // Handle array of types
  if (Array.isArray(types)) {
    for (const type of types) {
      const result = this.is(type);
      if (result) return result;
    }
    return false;
  }

  const contentType = this.get('Content-Type');

  // No content-type header
  if (!contentType) {
    return null;
  }

  // Normalize type
  let normalizedType = types;

  // Handle shorthand types
  if (!types.includes('/')) {
    const typeMap = {
      'json': 'application/json',
      'html': 'text/html',
      'text': 'text/plain',
      'xml': 'application/xml',
      'urlencoded': 'application/x-www-form-urlencoded',
      'multipart': 'multipart/form-data'
    };
    normalizedType = typeMap[types] || `application/${types}`;
  }

  // Check if content type matches
  const ctLower = contentType.toLowerCase();
  const typeLower = normalizedType.toLowerCase();

  // Handle wildcards
  if (typeLower.endsWith('/*')) {
    const prefix = typeLower.slice(0, -1);
    return ctLower.startsWith(prefix) ? types : false;
  }

  // Exact match (ignoring parameters like charset)
  if (ctLower.includes(typeLower) || ctLower.split(';')[0].trim() === typeLower) {
    return types;
  }

  return false;
};

/**
 * Check if the given `type(s)` is acceptable, returning the best
 * match when true, otherwise `false`.
 *
 * @param {...string|string[]} types - MIME type(s)
 * @returns {string|false} Best matching type or false
 *
 * @example
 * // Accept: text/html
 * req.accepts('html')         // 'html'
 * req.accepts('text/html')    // 'text/html'
 * req.accepts('json', 'html') // 'html'
 *
 * // Accept: application/json
 * req.accepts('json')         // 'json'
 * req.accepts('html')         // false
 */
req.accepts = function accepts(...types) {
  // Flatten array argument
  if (types.length === 1 && Array.isArray(types[0])) {
    types = types[0];
  }

  const accept = this.get('Accept') || '*/*';
  const acceptLower = accept.toLowerCase();

  // Parse accept header into weighted list
  const acceptTypes = acceptLower
    .split(',')
    .map(part => {
      const [type, ...params] = part.trim().split(';');
      let q = 1;

      for (const param of params) {
        const [key, val] = param.trim().split('=');
        if (key === 'q') {
          q = parseFloat(val) || 1;
        }
      }

      return { type: type.trim(), q };
    })
    .sort((a, b) => b.q - a.q);

  // Check each requested type
  for (const requestedType of types) {
    let normalizedType = requestedType.toLowerCase();

    // Handle shorthand
    if (!normalizedType.includes('/')) {
      const typeMap = {
        'json': 'application/json',
        'html': 'text/html',
        'text': 'text/plain',
        'xml': 'application/xml',
        'css': 'text/css',
        'js': 'application/javascript'
      };
      normalizedType = typeMap[normalizedType] || `application/${normalizedType}`;
    }

    // Check against accept header
    for (const { type } of acceptTypes) {
      // Wildcard match
      if (type === '*/*') {
        return requestedType;
      }

      // Type wildcard (e.g., text/*)
      if (type.endsWith('/*')) {
        const prefix = type.slice(0, -1);
        if (normalizedType.startsWith(prefix)) {
          return requestedType;
        }
      }

      // Exact match
      if (type === normalizedType) {
        return requestedType;
      }
    }
  }

  return false;
};

/**
 * Check if the request accepts the given encoding(s).
 *
 * @param {...string} encodings - Encoding(s) to check
 * @returns {string|false} Best matching encoding or false
 */
req.acceptsEncodings = function acceptsEncodings(...encodings) {
  const acceptEncoding = this.get('Accept-Encoding') || 'identity';
  const encodingLower = acceptEncoding.toLowerCase();

  for (const encoding of encodings) {
    if (encodingLower.includes(encoding.toLowerCase()) || encodingLower.includes('*')) {
      return encoding;
    }
  }

  return false;
};

/**
 * Check if the request accepts the given language(s).
 *
 * @param {...string} languages - Language(s) to check
 * @returns {string|false} Best matching language or false
 */
req.acceptsLanguages = function acceptsLanguages(...languages) {
  const acceptLanguage = this.get('Accept-Language') || '*';
  const languageLower = acceptLanguage.toLowerCase();

  for (const lang of languages) {
    if (languageLower.includes(lang.toLowerCase()) || languageLower.includes('*')) {
      return lang;
    }
  }

  return false;
};

/**
 * Parse Range header field, capping to the given `size`.
 *
 * @param {number} size - Maximum size
 * @param {Object} [options] - Options
 * @returns {Array|number} Array of ranges or error code
 */
req.range = function range(size, options = {}) {
  const rangeHeader = this.get('Range');
  if (!rangeHeader) return undefined;

  // Parse the range header
  const ranges = [];
  const parts = rangeHeader.replace(/bytes=/, '').split(',');

  for (const part of parts) {
    const [start, end] = part.trim().split('-');

    const range = {
      start: start ? parseInt(start, 10) : size - parseInt(end, 10),
      end: end ? parseInt(end, 10) : size - 1
    };

    // Validate range
    if (range.start > range.end || range.start < 0 || range.end >= size) {
      return -1; // Unsatisfiable
    }

    ranges.push(range);
  }

  ranges.type = 'bytes';
  return ranges;
};

/**
 * Check if the request is fresh (for caching).
 *
 * @returns {boolean} True if request is fresh
 */
Object.defineProperty(req, 'fresh', {
  get: function() {
    const method = this.method;
    const status = this.res?.statusCode;

    // Only GET and HEAD can be fresh
    if (method !== 'GET' && method !== 'HEAD') {
      return false;
    }

    // 2xx or 304 response
    if ((status >= 200 && status < 300) || status === 304) {
      // Check cache headers
      const modifiedSince = this.get('If-Modified-Since');
      const noneMatch = this.get('If-None-Match');

      if (!modifiedSince && !noneMatch) {
        return false;
      }

      // TODO: Full freshness check implementation
      return false;
    }

    return false;
  }
});

/**
 * Check if the request is stale (opposite of fresh).
 */
Object.defineProperty(req, 'stale', {
  get: function() {
    return !this.fresh;
  }
});

/**
 * Check if the request was an XMLHttpRequest.
 */
Object.defineProperty(req, 'xhr', {
  get: function() {
    const val = this.get('X-Requested-With') || '';
    return val.toLowerCase() === 'xmlhttprequest';
  }
});

/**
 * Return the protocol string "http" or "https".
 */
Object.defineProperty(req, 'protocol', {
  get: function() {
    // Check X-Forwarded-Proto header (when behind proxy)
    const proto = this.get('X-Forwarded-Proto');
    if (proto) {
      return proto.split(',')[0].trim();
    }

    // Check socket encryption
    return this.socket?.encrypted ? 'https' : 'http';
  }
});

/**
 * Check if the request is secure (HTTPS).
 */
Object.defineProperty(req, 'secure', {
  get: function() {
    return this.protocol === 'https';
  }
});

/**
 * Return subdomains as an array.
 */
Object.defineProperty(req, 'subdomains', {
  get: function() {
    const hostname = this.hostname;
    if (!hostname) return [];

    const offset = this.app?.get?.('subdomain offset') || 2;
    const parts = hostname.split('.');

    return parts.slice(0, -offset).reverse();
  }
});

/**
 * Short-hand for `url.parse(req.url).pathname`.
 */
Object.defineProperty(req, 'path', {
  get: function() {
    if (this._path !== undefined) return this._path;
    return (this.url || '').split('?')[0];
  },
  set: function(val) {
    this._path = val;
  }
});

/**
 * Parse the "Host" header field to a hostname.
 */
Object.defineProperty(req, 'hostname', {
  get: function() {
    if (this._hostname !== undefined) return this._hostname;

    // Check X-Forwarded-Host first (for proxies)
    let host = this.get('X-Forwarded-Host');

    if (!host) {
      host = this.get('Host');
    }

    if (!host) return undefined;

    // IPv6 literal support
    const offset = host[0] === '[' ? host.indexOf(']') + 1 : 0;
    const index = host.indexOf(':', offset);

    return index !== -1 ? host.substring(0, index) : host;
  },
  set: function(val) {
    this._hostname = val;
  }
});

/**
 * Return the remote address (client IP).
 */
Object.defineProperty(req, 'ip', {
  get: function() {
    if (this._ip !== undefined) return this._ip;

    // Check X-Forwarded-For
    const forwardedFor = this.get('X-Forwarded-For');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    // Check X-Real-IP
    const realIp = this.get('X-Real-IP');
    if (realIp) {
      return realIp;
    }

    // Fall back to socket
    const remoteAddress = this.socket?.remoteAddress;

    // Normalize IPv6 localhost
    if (remoteAddress === '::1') {
      return '127.0.0.1';
    }

    // Normalize IPv6-mapped IPv4
    if (remoteAddress?.startsWith('::ffff:')) {
      return remoteAddress.slice(7);
    }

    return remoteAddress || 'unknown';
  },
  set: function(val) {
    this._ip = val;
  }
});

/**
 * Return all remote addresses (when behind proxies).
 */
Object.defineProperty(req, 'ips', {
  get: function() {
    const forwardedFor = this.get('X-Forwarded-For');
    if (!forwardedFor) return [];

    return forwardedFor.split(',').map(ip => ip.trim());
  }
});

/**
 * Export the extended request prototype.
 * This allows other modules to add more methods.
 */
module.exports = req;
