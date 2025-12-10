/**
 * Request Parsing Utilities
 *
 * These utilities handle parsing of incoming HTTP requests.
 * Express does all of this internally - here we expose the logic
 * so you can understand exactly what happens.
 */

'use strict';

const { URL } = require('url');

/**
 * Parses the request URL into its components.
 *
 * Node.js gives us req.url which is just the path + query string.
 * We need to parse this into usable parts.
 *
 * @param {http.IncomingMessage} req - The request object
 * @returns {Object} Parsed URL information
 *
 * @example
 * // For request to: http://localhost:3000/users?page=1&sort=name
 * parseUrl(req)
 * // Returns:
 * // {
 * //   path: '/users',
 * //   query: { page: '1', sort: 'name' },
 * //   search: '?page=1&sort=name',
 * //   href: '/users?page=1&sort=name',
 * //   pathname: '/users'
 * // }
 */
function parseUrl(req) {
  // Handle missing or malformed URLs
  if (!req.url) {
    return {
      path: '/',
      pathname: '/',
      query: {},
      search: '',
      href: '/'
    };
  }

  try {
    // Build full URL (required for URL constructor)
    // We use a dummy base since we only care about path/query
    const host = req.headers.host || 'localhost';
    const protocol = req.socket?.encrypted ? 'https' : 'http';
    const fullUrl = `${protocol}://${host}${req.url}`;

    const parsed = new URL(fullUrl);

    // Convert URLSearchParams to plain object
    const query = {};
    for (const [key, value] of parsed.searchParams) {
      // Handle multiple values for same key
      if (query[key] !== undefined) {
        if (Array.isArray(query[key])) {
          query[key].push(value);
        } else {
          query[key] = [query[key], value];
        }
      } else {
        query[key] = value;
      }
    }

    return {
      path: parsed.pathname,
      pathname: parsed.pathname,
      query,
      search: parsed.search,
      href: req.url,
      host: parsed.host,
      hostname: parsed.hostname,
      port: parsed.port
    };
  } catch (err) {
    // Fallback for malformed URLs
    console.error('URL parse error:', err.message);
    return {
      path: req.url.split('?')[0] || '/',
      pathname: req.url.split('?')[0] || '/',
      query: {},
      search: '',
      href: req.url
    };
  }
}

/**
 * Parses a query string into an object.
 *
 * Handles various query string formats:
 * - Simple: ?foo=bar&baz=qux
 * - Arrays: ?items[]=1&items[]=2
 * - Nested: ?user[name]=John&user[age]=30 (basic support)
 * - Encoded: ?search=hello%20world
 *
 * @param {string} queryString - The query string to parse
 * @returns {Object} Parsed key-value pairs
 *
 * @example
 * parseQueryString('?page=1&sort=name')
 * // Returns: { page: '1', sort: 'name' }
 *
 * parseQueryString('items[]=a&items[]=b')
 * // Returns: { items: ['a', 'b'] }
 */
function parseQueryString(queryString) {
  if (!queryString) {
    return {};
  }

  // Remove leading ? if present
  const qs = queryString.startsWith('?')
    ? queryString.slice(1)
    : queryString;

  if (!qs) {
    return {};
  }

  const params = {};

  // Split by & and process each pair
  for (const pair of qs.split('&')) {
    if (!pair) continue;

    // Split key=value (handle missing value)
    const eqIndex = pair.indexOf('=');
    let key, value;

    if (eqIndex === -1) {
      key = decodeURIComponent(pair);
      value = '';
    } else {
      key = decodeURIComponent(pair.slice(0, eqIndex));
      value = decodeURIComponent(pair.slice(eqIndex + 1));
    }

    // Handle array notation: items[]=1&items[]=2
    if (key.endsWith('[]')) {
      const arrayKey = key.slice(0, -2);
      if (!params[arrayKey]) {
        params[arrayKey] = [];
      }
      params[arrayKey].push(value);
    }
    // Handle bracket notation: user[name]=John
    else if (key.includes('[') && key.includes(']')) {
      const match = key.match(/^([^\[]+)\[([^\]]*)\]$/);
      if (match) {
        const [, objKey, propKey] = match;
        if (!params[objKey]) {
          params[objKey] = {};
        }
        params[objKey][propKey] = value;
      } else {
        params[key] = value;
      }
    }
    // Handle duplicate keys as arrays
    else if (params[key] !== undefined) {
      if (Array.isArray(params[key])) {
        params[key].push(value);
      } else {
        params[key] = [params[key], value];
      }
    }
    // Simple key=value
    else {
      params[key] = value;
    }
  }

  return params;
}

/**
 * Gets the client's IP address from the request.
 *
 * Handles various scenarios:
 * - Direct connection (req.socket.remoteAddress)
 * - Behind proxy (X-Forwarded-For header)
 * - Behind load balancer (X-Real-IP header)
 *
 * @param {http.IncomingMessage} req - The request object
 * @returns {string} The client IP address
 */
function getClientIp(req) {
  // Check X-Forwarded-For header (comma-separated list)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // First IP in the list is the original client
    return forwardedFor.split(',')[0].trim();
  }

  // Check X-Real-IP header
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }

  // Fall back to socket remote address
  const remoteAddress = req.socket?.remoteAddress;

  // Handle IPv6 localhost
  if (remoteAddress === '::1') {
    return '127.0.0.1';
  }

  // Handle IPv6-mapped IPv4
  if (remoteAddress?.startsWith('::ffff:')) {
    return remoteAddress.slice(7);
  }

  return remoteAddress || 'unknown';
}

/**
 * Reads the request body as a string.
 *
 * The request body is streamed, so we need to collect all chunks.
 * This is what Express middleware like body-parser does.
 *
 * @param {http.IncomingMessage} req - The request object
 * @param {Object} [options] - Options
 * @param {number} [options.limit=1048576] - Max body size in bytes (1MB default)
 * @returns {Promise<string>} The body as a string
 *
 * @example
 * const body = await readBody(req);
 * const data = JSON.parse(body);
 */
function readBody(req, options = {}) {
  return new Promise((resolve, reject) => {
    const limit = options.limit || 1024 * 1024; // 1MB default
    const chunks = [];
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;

      // Check size limit
      if (size > limit) {
        req.destroy();
        reject(new Error(`Request body exceeds limit of ${limit} bytes`));
        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      resolve(body);
    });

    req.on('error', (err) => {
      reject(err);
    });

    // Handle aborted requests
    req.on('aborted', () => {
      reject(new Error('Request aborted'));
    });
  });
}

/**
 * Reads the request body as JSON.
 *
 * @param {http.IncomingMessage} req - The request object
 * @param {Object} [options] - Options passed to readBody
 * @returns {Promise<any>} The parsed JSON
 * @throws {Error} If body is not valid JSON
 */
async function readJsonBody(req, options = {}) {
  const body = await readBody(req, options);

  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch (err) {
    const error = new Error('Invalid JSON in request body');
    error.status = 400;
    throw error;
  }
}

/**
 * Gets a specific header value (case-insensitive).
 *
 * @param {http.IncomingMessage} req - The request object
 * @param {string} name - Header name
 * @returns {string|undefined} The header value
 */
function getHeader(req, name) {
  return req.headers[name.toLowerCase()];
}

/**
 * Checks if the request accepts a specific content type.
 *
 * @param {http.IncomingMessage} req - The request object
 * @param {string} type - Content type to check (e.g., 'json', 'html')
 * @returns {boolean} Whether the type is accepted
 */
function accepts(req, type) {
  const accept = req.headers['accept'] || '*/*';

  // Map shorthand to full MIME types
  const mimeTypes = {
    'json': 'application/json',
    'html': 'text/html',
    'text': 'text/plain',
    'xml': 'application/xml'
  };

  const fullType = mimeTypes[type] || type;

  // Check if accepted
  return accept.includes(fullType) ||
         accept.includes('*/*') ||
         accept.includes(fullType.split('/')[0] + '/*');
}

/**
 * Checks if the request content type matches.
 *
 * @param {http.IncomingMessage} req - The request object
 * @param {string} type - Content type to check
 * @returns {boolean} Whether the content type matches
 */
function isContentType(req, type) {
  const contentType = req.headers['content-type'] || '';
  return contentType.includes(type);
}

module.exports = {
  parseUrl,
  parseQueryString,
  getClientIp,
  readBody,
  readJsonBody,
  getHeader,
  accepts,
  isContentType
};
