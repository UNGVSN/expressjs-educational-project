/**
 * Content-Type Utilities
 *
 * Parse and match Content-Type headers.
 */

'use strict';

/**
 * Parse Content-Type header
 *
 * @param {string} header - Content-Type header value
 * @returns {Object} Parsed type { type, parameters }
 *
 * @example
 * parseContentType('application/json; charset=utf-8')
 * // => { type: 'application/json', parameters: { charset: 'utf-8' } }
 */
function parseContentType(header) {
  if (!header || typeof header !== 'string') {
    return null;
  }

  // Split on semicolon
  const parts = header.split(';');
  const type = parts[0].trim().toLowerCase();

  const parameters = {};

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    const eq = part.indexOf('=');

    if (eq !== -1) {
      const key = part.slice(0, eq).trim().toLowerCase();
      let value = part.slice(eq + 1).trim();

      // Remove quotes
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }

      parameters[key] = value;
    }
  }

  return { type, parameters };
}

/**
 * Check if request matches a content type
 *
 * @param {Object} req - Request object
 * @param {string|string[]|Function} types - Types to match
 * @returns {string|false} Matched type or false
 *
 * @example
 * typeIs(req, 'json') // checks for application/json
 * typeIs(req, 'application/json')
 * typeIs(req, ['json', 'urlencoded'])
 */
function typeIs(req, types) {
  const contentType = req.headers['content-type'];

  if (!contentType) {
    return false;
  }

  const parsed = parseContentType(contentType);
  if (!parsed) {
    return false;
  }

  // Support function type matcher
  if (typeof types === 'function') {
    return types(req) ? parsed.type : false;
  }

  // Normalize to array
  const typeList = Array.isArray(types) ? types : [types];

  for (const type of typeList) {
    if (matchType(parsed.type, type)) {
      return parsed.type;
    }
  }

  return false;
}

/**
 * Match a content type against a pattern
 *
 * @param {string} contentType - Actual content type
 * @param {string} pattern - Pattern to match
 * @returns {boolean} Whether it matches
 */
function matchType(contentType, pattern) {
  // Exact match
  if (contentType === pattern) {
    return true;
  }

  // Handle short forms
  const normalized = normalizeType(pattern);
  if (contentType === normalized) {
    return true;
  }

  // Handle wildcards (e.g., '*/json', 'text/*')
  if (pattern.includes('*')) {
    const [patternMain, patternSub] = pattern.split('/');
    const [typeMain, typeSub] = contentType.split('/');

    if (patternMain === '*' || patternMain === typeMain) {
      if (patternSub === '*' || patternSub === typeSub) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Normalize short type names to full MIME types
 *
 * @param {string} type - Short or full type
 * @returns {string} Full MIME type
 */
function normalizeType(type) {
  // Common shortcuts
  const shortcuts = {
    json: 'application/json',
    urlencoded: 'application/x-www-form-urlencoded',
    multipart: 'multipart/form-data',
    text: 'text/plain',
    html: 'text/html',
    xml: 'application/xml',
    bin: 'application/octet-stream',
    form: 'application/x-www-form-urlencoded'
  };

  return shortcuts[type.toLowerCase()] || type;
}

/**
 * Get charset from Content-Type header
 *
 * @param {string} header - Content-Type header
 * @returns {string|undefined} Charset or undefined
 */
function getCharset(header) {
  const parsed = parseContentType(header);
  return parsed?.parameters?.charset;
}

module.exports = {
  parseContentType,
  typeIs,
  matchType,
  normalizeType,
  getCharset
};
