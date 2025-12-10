/**
 * Cookie Parser Middleware
 *
 * Parses Cookie header and populates req.cookies and req.signedCookies.
 * Similar to the 'cookie-parser' npm package.
 */

'use strict';

const { parse } = require('./cookie');
const { unsign, isSigned } = require('./signed');

/**
 * Create cookie parser middleware
 *
 * @param {string|string[]} [secret] - Secret(s) for signed cookies
 * @param {Object} [options] - Parser options
 * @param {Function} [options.decode] - Custom decode function
 * @returns {Function} Express middleware
 *
 * @example
 * // Basic usage (unsigned cookies only)
 * app.use(cookieParser());
 *
 * // With secret for signed cookies
 * app.use(cookieParser('my-secret'));
 *
 * // With multiple secrets (key rotation)
 * app.use(cookieParser(['new-secret', 'old-secret']));
 */
function cookieParser(secret, options = {}) {
  // Handle case where options is first argument
  if (secret && typeof secret === 'object' && !Array.isArray(secret)) {
    options = secret;
    secret = undefined;
  }

  return function cookieParserMiddleware(req, res, next) {
    // Skip if already parsed
    if (req.cookies) {
      return next();
    }

    // Initialize cookie objects
    req.cookies = {};
    req.signedCookies = {};

    // Store secret on request for later use
    req.secret = secret;

    // Get cookie header
    const cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      return next();
    }

    // Parse cookies
    try {
      const cookies = parse(cookieHeader, options);

      // Separate signed and unsigned cookies
      for (const [name, value] of Object.entries(cookies)) {
        if (secret && isSigned(value)) {
          // Try to verify signed cookie
          const unsigned = unsign(value, secret);

          if (unsigned !== false) {
            req.signedCookies[name] = unsigned;
          } else {
            // Signature invalid - cookie was tampered
            req.signedCookies[name] = false;
          }
        } else {
          // Unsigned cookie
          req.cookies[name] = value;
        }
      }
    } catch (err) {
      return next(err);
    }

    next();
  };
}

/**
 * JSON cookie parser
 *
 * Parse JSON-encoded cookie values
 *
 * @param {string} str - Cookie value
 * @returns {*} Parsed value or original string
 */
function JSONCookie(str) {
  if (typeof str !== 'string' || !str.startsWith('j:')) {
    return str;
  }

  try {
    return JSON.parse(str.slice(2));
  } catch (e) {
    return str;
  }
}

/**
 * Parse all JSON cookies in an object
 *
 * @param {Object} obj - Object with cookie values
 * @returns {Object} Object with parsed JSON values
 */
function JSONCookies(obj) {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    result[key] = JSONCookie(value);
  }

  return result;
}

module.exports = cookieParser;
module.exports.cookieParser = cookieParser;
module.exports.JSONCookie = JSONCookie;
module.exports.JSONCookies = JSONCookies;
