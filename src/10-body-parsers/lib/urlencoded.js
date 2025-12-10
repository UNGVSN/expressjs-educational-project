/**
 * URL-Encoded Body Parser
 *
 * Parses application/x-www-form-urlencoded request bodies.
 * Equivalent to express.urlencoded()
 */

'use strict';

const { readBodyAsString } = require('./read-body');
const { typeIs, getCharset } = require('./content-type');
const { parseBytes } = require('./bytes');

/**
 * Create URL-encoded body parser middleware
 *
 * @param {Object} options - Parser options
 * @param {boolean} [options.extended=true] - Use extended parsing (nested objects)
 * @param {string|number} [options.limit='100kb'] - Max body size
 * @param {number} [options.parameterLimit=1000] - Max number of parameters
 * @param {string|string[]|Function} [options.type='application/x-www-form-urlencoded'] - Content types
 * @returns {Function} Express middleware
 */
function urlencoded(options = {}) {
  const {
    extended = true,
    limit = '100kb',
    parameterLimit = 1000,
    type = 'application/x-www-form-urlencoded'
  } = options;

  const bytesLimit = parseBytes(limit);

  return function urlencodedParser(req, res, next) {
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

        // Parse URL-encoded data
        try {
          if (extended) {
            req.body = parseExtended(body, { parameterLimit });
          } else {
            req.body = parseSimple(body, { parameterLimit });
          }
          next();
        } catch (e) {
          const err = new Error('Invalid URL-encoded data');
          err.type = 'entity.parse.failed';
          err.statusCode = 400;
          next(err);
        }
      })
      .catch(next);
  };
}

/**
 * Simple URL-encoded parser (like querystring module)
 * Does not support nested objects
 *
 * @param {string} body - URL-encoded body
 * @param {Object} options - Parse options
 * @returns {Object} Parsed data
 */
function parseSimple(body, options = {}) {
  const { parameterLimit = 1000 } = options;
  const result = {};
  const pairs = body.split('&');

  if (pairs.length > parameterLimit) {
    const err = new Error('Too many parameters');
    err.type = 'parameters.too.many';
    err.statusCode = 413;
    throw err;
  }

  for (const pair of pairs) {
    if (!pair) continue;

    const idx = pair.indexOf('=');
    let key, value;

    if (idx === -1) {
      key = decodeURIComponent(pair);
      value = '';
    } else {
      key = decodeURIComponent(pair.slice(0, idx));
      value = decodeURIComponent(pair.slice(idx + 1));
    }

    // Handle duplicate keys - convert to array
    if (key in result) {
      if (Array.isArray(result[key])) {
        result[key].push(value);
      } else {
        result[key] = [result[key], value];
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Extended URL-encoded parser (like qs module)
 * Supports nested objects and arrays
 *
 * @param {string} body - URL-encoded body
 * @param {Object} options - Parse options
 * @returns {Object} Parsed data
 *
 * @example
 * parseExtended('user[name]=John&user[age]=30')
 * // => { user: { name: 'John', age: '30' } }
 *
 * parseExtended('colors[]=red&colors[]=blue')
 * // => { colors: ['red', 'blue'] }
 */
function parseExtended(body, options = {}) {
  const { parameterLimit = 1000 } = options;
  const result = {};
  const pairs = body.split('&');

  if (pairs.length > parameterLimit) {
    const err = new Error('Too many parameters');
    err.type = 'parameters.too.many';
    err.statusCode = 413;
    throw err;
  }

  for (const pair of pairs) {
    if (!pair) continue;

    const idx = pair.indexOf('=');
    let key, value;

    if (idx === -1) {
      key = decodeURIComponent(pair);
      value = '';
    } else {
      key = decodeURIComponent(pair.slice(0, idx));
      value = decodeURIComponent(pair.slice(idx + 1));
    }

    // Parse nested keys like user[name] or items[]
    setNestedValue(result, key, value);
  }

  return result;
}

/**
 * Set a nested value in an object using bracket notation
 *
 * @param {Object} obj - Target object
 * @param {string} key - Key with possible bracket notation
 * @param {*} value - Value to set
 */
function setNestedValue(obj, key, value) {
  // Check for bracket notation
  const bracketIndex = key.indexOf('[');

  if (bracketIndex === -1) {
    // Simple key
    if (key in obj) {
      if (Array.isArray(obj[key])) {
        obj[key].push(value);
      } else {
        obj[key] = [obj[key], value];
      }
    } else {
      obj[key] = value;
    }
    return;
  }

  // Parse bracket notation
  const rootKey = key.slice(0, bracketIndex);
  const path = parseBrackets(key.slice(bracketIndex));

  if (!(rootKey in obj)) {
    // Determine if first level should be array or object
    if (path[0] === '' || !isNaN(parseInt(path[0], 10))) {
      obj[rootKey] = [];
    } else {
      obj[rootKey] = {};
    }
  }

  // Navigate and set value
  let current = obj[rootKey];
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];
    const nextSegment = path[i + 1];

    if (segment === '') {
      // Array push - get next available index
      const idx = current.length;
      if (nextSegment === '' || !isNaN(parseInt(nextSegment, 10))) {
        current[idx] = [];
      } else {
        current[idx] = {};
      }
      current = current[idx];
    } else if (!isNaN(parseInt(segment, 10))) {
      // Numeric index
      const idx = parseInt(segment, 10);
      if (current[idx] === undefined) {
        if (nextSegment === '' || !isNaN(parseInt(nextSegment, 10))) {
          current[idx] = [];
        } else {
          current[idx] = {};
        }
      }
      current = current[idx];
    } else {
      // Object key
      if (current[segment] === undefined) {
        if (nextSegment === '' || !isNaN(parseInt(nextSegment, 10))) {
          current[segment] = [];
        } else {
          current[segment] = {};
        }
      }
      current = current[segment];
    }
  }

  // Set final value
  const lastSegment = path[path.length - 1];
  if (lastSegment === '') {
    // Array push
    current.push(value);
  } else if (!isNaN(parseInt(lastSegment, 10))) {
    current[parseInt(lastSegment, 10)] = value;
  } else {
    current[lastSegment] = value;
  }
}

/**
 * Parse bracket notation into path segments
 *
 * @param {string} brackets - Bracket portion of key
 * @returns {string[]} Path segments
 *
 * @example
 * parseBrackets('[name]')     // => ['name']
 * parseBrackets('[0][name]')  // => ['0', 'name']
 * parseBrackets('[]')         // => ['']
 */
function parseBrackets(brackets) {
  const path = [];
  const regex = /\[([^\]]*)\]/g;
  let match;

  while ((match = regex.exec(brackets)) !== null) {
    path.push(match[1]);
  }

  return path;
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

module.exports = urlencoded;
module.exports.urlencoded = urlencoded;
module.exports.parseSimple = parseSimple;
module.exports.parseExtended = parseExtended;
