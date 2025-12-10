/**
 * Cookie Parsing and Serialization
 *
 * Low-level utilities for working with HTTP cookies.
 * Similar to the 'cookie' npm package.
 */

'use strict';

/**
 * Parse a Cookie header string into an object
 *
 * @param {string} str - Cookie header value
 * @param {Object} [options] - Parse options
 * @param {Function} [options.decode] - Custom decode function (default: decodeURIComponent)
 * @returns {Object} Parsed cookies
 *
 * @example
 * parse('name=value; other=data')
 * // => { name: 'value', other: 'data' }
 */
function parse(str, options = {}) {
  if (typeof str !== 'string') {
    throw new TypeError('Cookie header must be a string');
  }

  const cookies = {};
  const decode = options.decode || decodeURIComponent;

  // Handle empty string
  if (!str.trim()) {
    return cookies;
  }

  // Split by semicolon and process each pair
  const pairs = str.split(';');

  for (const pair of pairs) {
    const idx = pair.indexOf('=');

    // Skip if no equals sign found
    if (idx < 0) {
      continue;
    }

    const key = pair.substring(0, idx).trim();
    let value = pair.substring(idx + 1).trim();

    // Skip empty keys
    if (!key) {
      continue;
    }

    // Remove quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    // Only set if not already set (first value wins)
    if (cookies[key] === undefined) {
      try {
        cookies[key] = decode(value);
      } catch (e) {
        // If decode fails, use raw value
        cookies[key] = value;
      }
    }
  }

  return cookies;
}

/**
 * Serialize a cookie name-value pair into a Set-Cookie header string
 *
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {Object} [options] - Cookie options
 * @param {string} [options.domain] - Domain attribute
 * @param {Function} [options.encode] - Custom encode function
 * @param {Date} [options.expires] - Expires attribute
 * @param {boolean} [options.httpOnly] - HttpOnly attribute
 * @param {number} [options.maxAge] - Max-Age attribute (in milliseconds)
 * @param {string} [options.path] - Path attribute
 * @param {string} [options.priority] - Priority attribute (low, medium, high)
 * @param {boolean|string} [options.sameSite] - SameSite attribute
 * @param {boolean} [options.secure] - Secure attribute
 * @param {boolean} [options.partitioned] - Partitioned attribute (CHIPS)
 * @returns {string} Set-Cookie header value
 *
 * @example
 * serialize('session', 'abc123', { httpOnly: true, maxAge: 3600000 })
 * // => 'session=abc123; Max-Age=3600; HttpOnly'
 */
function serialize(name, value, options = {}) {
  const encode = options.encode || encodeURIComponent;

  // Validate cookie name
  if (!isValidCookieName(name)) {
    throw new TypeError('Invalid cookie name');
  }

  // Encode the value
  const encodedValue = encode(value);

  // Validate encoded value
  if (!isValidCookieValue(encodedValue)) {
    throw new TypeError('Invalid cookie value');
  }

  // Start building the cookie string
  let cookie = `${name}=${encodedValue}`;

  // Add Max-Age (convert from milliseconds to seconds)
  if (options.maxAge != null) {
    const maxAge = Math.floor(options.maxAge / 1000);
    if (!Number.isFinite(maxAge)) {
      throw new TypeError('maxAge must be a finite number');
    }
    cookie += `; Max-Age=${maxAge}`;
  }

  // Add Domain
  if (options.domain) {
    if (!isValidDomain(options.domain)) {
      throw new TypeError('Invalid domain');
    }
    cookie += `; Domain=${options.domain}`;
  }

  // Add Path
  if (options.path) {
    if (!isValidPath(options.path)) {
      throw new TypeError('Invalid path');
    }
    cookie += `; Path=${options.path}`;
  }

  // Add Expires
  if (options.expires) {
    if (!(options.expires instanceof Date)) {
      throw new TypeError('expires must be a Date');
    }
    cookie += `; Expires=${options.expires.toUTCString()}`;
  }

  // Add HttpOnly
  if (options.httpOnly) {
    cookie += '; HttpOnly';
  }

  // Add Secure
  if (options.secure) {
    cookie += '; Secure';
  }

  // Add SameSite
  if (options.sameSite) {
    const sameSite = typeof options.sameSite === 'string'
      ? options.sameSite.toLowerCase()
      : 'strict';

    switch (sameSite) {
      case 'strict':
        cookie += '; SameSite=Strict';
        break;
      case 'lax':
        cookie += '; SameSite=Lax';
        break;
      case 'none':
        cookie += '; SameSite=None';
        break;
      default:
        throw new TypeError('Invalid SameSite value');
    }
  }

  // Add Priority
  if (options.priority) {
    const priority = options.priority.toLowerCase();
    switch (priority) {
      case 'low':
        cookie += '; Priority=Low';
        break;
      case 'medium':
        cookie += '; Priority=Medium';
        break;
      case 'high':
        cookie += '; Priority=High';
        break;
      default:
        throw new TypeError('Invalid Priority value');
    }
  }

  // Add Partitioned (CHIPS)
  if (options.partitioned) {
    cookie += '; Partitioned';
  }

  return cookie;
}

/**
 * Validate cookie name according to RFC 6265
 * Cookie names cannot contain control characters, spaces, or separators
 */
function isValidCookieName(name) {
  if (typeof name !== 'string' || !name) {
    return false;
  }

  // Check for invalid characters (RFC 6265 token)
  // eslint-disable-next-line no-control-regex
  const invalidChars = /[\x00-\x1f\x7f\s"(),/:;<=>?@[\\\]{}]/;
  return !invalidChars.test(name);
}

/**
 * Validate cookie value
 * Cookie values cannot contain control characters, semicolons, or backslashes
 */
function isValidCookieValue(value) {
  if (typeof value !== 'string') {
    return false;
  }

  // Check for invalid characters
  // eslint-disable-next-line no-control-regex
  const invalidChars = /[\x00-\x1f\x7f;\\]/;
  return !invalidChars.test(value);
}

/**
 * Validate domain attribute
 */
function isValidDomain(domain) {
  if (typeof domain !== 'string' || !domain) {
    return false;
  }
  // Basic validation - no semicolons or whitespace
  return !/[;\s]/.test(domain);
}

/**
 * Validate path attribute
 */
function isValidPath(path) {
  if (typeof path !== 'string') {
    return false;
  }
  // Path cannot contain semicolons
  return !path.includes(';');
}

module.exports = {
  parse,
  serialize
};
