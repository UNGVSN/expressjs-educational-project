/**
 * Shared Utilities for Request/Response Enhancement
 */

'use strict';

/**
 * MIME type lookup table.
 */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wav': 'audio/wav'
};

/**
 * Look up MIME type for a file extension or path.
 *
 * @param {string} path - File path or extension
 * @returns {string|false} MIME type or false
 */
function lookup(path) {
  if (!path || typeof path !== 'string') {
    return false;
  }

  // Extract extension
  const ext = path.includes('.') ? '.' + path.split('.').pop().toLowerCase() : `.${path.toLowerCase()}`;

  return MIME_TYPES[ext] || false;
}

/**
 * Get the charset for a MIME type.
 *
 * @param {string} type - MIME type
 * @returns {string|false} Charset or false
 */
function charset(type) {
  if (!type || typeof type !== 'string') {
    return false;
  }

  // Text and JSON types should have UTF-8
  if (/^text\//.test(type) || /^application\/(json|javascript|xml)/.test(type)) {
    return 'UTF-8';
  }

  return false;
}

/**
 * Get the content-type for a file extension.
 *
 * @param {string} str - File extension or MIME type
 * @returns {string|false} Content-Type or false
 */
function contentType(str) {
  if (!str || typeof str !== 'string') {
    return false;
  }

  // Already a MIME type
  if (str.includes('/')) {
    return str;
  }

  // Look up
  let mime = lookup(str);
  if (!mime) {
    return false;
  }

  // Add charset if needed
  if (mime.includes('charset')) {
    return mime;
  }

  const cs = charset(mime);
  if (cs) {
    mime += `; charset=${cs.toLowerCase()}`;
  }

  return mime;
}

/**
 * Escape HTML special characters.
 *
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Normalize port into a number.
 *
 * @param {string|number} val - Port value
 * @returns {number|string|boolean} Normalized port
 */
function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // Named pipe
    return val;
  }

  if (port >= 0) {
    // Port number
    return port;
  }

  return false;
}

/**
 * Check if a value is a plain object.
 *
 * @param {any} val - Value to check
 * @returns {boolean}
 */
function isPlainObject(val) {
  if (val === null || typeof val !== 'object') {
    return false;
  }

  const proto = Object.getPrototypeOf(val);
  return proto === null || proto === Object.prototype;
}

/**
 * Merge objects deeply.
 *
 * @param {Object} target - Target object
 * @param {...Object} sources - Source objects
 * @returns {Object} Merged object
 */
function merge(target, ...sources) {
  for (const source of sources) {
    if (!isPlainObject(source)) continue;

    for (const key of Object.keys(source)) {
      if (isPlainObject(source[key])) {
        if (!target[key]) target[key] = {};
        merge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  return target;
}

/**
 * Parse the Accept header into a sorted array.
 *
 * @param {string} accept - Accept header value
 * @returns {Array} Sorted array of accepted types
 */
function parseAccept(accept) {
  if (!accept) {
    return [{ type: '*/*', q: 1 }];
  }

  return accept
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
}

/**
 * Compare accept types and return the best match.
 *
 * @param {string[]} available - Available types
 * @param {string} accept - Accept header
 * @returns {string|false} Best match or false
 */
function negotiateType(available, accept) {
  const accepted = parseAccept(accept);

  for (const { type } of accepted) {
    if (type === '*/*') {
      return available[0];
    }

    for (const avail of available) {
      if (type === avail) {
        return avail;
      }

      // Handle wildcards like text/*
      if (type.endsWith('/*')) {
        const prefix = type.slice(0, -1);
        if (avail.startsWith(prefix)) {
          return avail;
        }
      }
    }
  }

  return false;
}

module.exports = {
  lookup,
  charset,
  contentType,
  escapeHtml,
  normalizePort,
  isPlainObject,
  merge,
  parseAccept,
  negotiateType,
  MIME_TYPES
};
