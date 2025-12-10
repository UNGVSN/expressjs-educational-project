/**
 * Shared Utilities
 *
 * Common utility functions used throughout the HTTP server foundation.
 */

'use strict';

/**
 * Checks if a value is a plain object.
 *
 * @param {any} value - Value to check
 * @returns {boolean}
 */
function isPlainObject(value) {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Deep merges objects together.
 *
 * @param {Object} target - Target object
 * @param {...Object} sources - Source objects
 * @returns {Object} Merged object
 */
function deepMerge(target, ...sources) {
  if (!sources.length) return target;

  const source = sources.shift();

  if (isPlainObject(target) && isPlainObject(source)) {
    for (const key in source) {
      if (isPlainObject(source[key])) {
        if (!target[key]) {
          target[key] = {};
        }
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  return deepMerge(target, ...sources);
}

/**
 * Safely parses JSON, returning null on error.
 *
 * @param {string} str - JSON string to parse
 * @returns {any|null} Parsed value or null
 */
function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Generates a unique request ID.
 *
 * @returns {string} Unique ID
 */
function generateRequestId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/**
 * Formats bytes into human-readable string.
 *
 * @param {number} bytes - Byte count
 * @param {number} [decimals=2] - Decimal places
 * @returns {string} Formatted string
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formats a duration in milliseconds to human-readable string.
 *
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted string
 */
function formatDuration(ms) {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}μs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Normalizes a path by removing trailing slashes and ensuring leading slash.
 *
 * @param {string} path - Path to normalize
 * @returns {string} Normalized path
 */
function normalizePath(path) {
  if (!path || path === '/') {
    return '/';
  }

  // Ensure leading slash
  let normalized = path.startsWith('/') ? path : `/${path}`;

  // Remove trailing slash (except for root)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Joins path segments together.
 *
 * @param {...string} segments - Path segments
 * @returns {string} Joined path
 */
function joinPaths(...segments) {
  const joined = segments
    .filter(Boolean)
    .map((s, i) => {
      // Remove leading slash from non-first segments
      if (i > 0 && s.startsWith('/')) {
        s = s.slice(1);
      }
      // Remove trailing slash
      if (s.endsWith('/')) {
        s = s.slice(0, -1);
      }
      return s;
    })
    .join('/');

  return normalizePath(joined);
}

/**
 * Parses a cookie string into an object.
 *
 * @param {string} cookieString - Cookie header value
 * @returns {Object} Parsed cookies
 */
function parseCookies(cookieString) {
  if (!cookieString) {
    return {};
  }

  const cookies = {};

  for (const pair of cookieString.split(';')) {
    const [name, ...valueParts] = pair.trim().split('=');
    if (name) {
      const value = valueParts.join('='); // Handle values with = in them
      cookies[name.trim()] = decodeURIComponent(value || '');
    }
  }

  return cookies;
}

/**
 * Serializes a cookie for Set-Cookie header.
 *
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {Object} [options] - Cookie options
 * @param {Date|number} [options.expires] - Expiration date or timestamp
 * @param {number} [options.maxAge] - Max age in seconds
 * @param {string} [options.domain] - Domain
 * @param {string} [options.path='/'] - Path
 * @param {boolean} [options.secure] - Secure flag
 * @param {boolean} [options.httpOnly] - HttpOnly flag
 * @param {string} [options.sameSite] - SameSite attribute
 * @returns {string} Serialized cookie
 */
function serializeCookie(name, value, options = {}) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];

  if (options.expires) {
    const date = options.expires instanceof Date
      ? options.expires
      : new Date(options.expires);
    parts.push(`Expires=${date.toUTCString()}`);
  }

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  } else {
    parts.push('Path=/');
  }

  if (options.secure) {
    parts.push('Secure');
  }

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  return parts.join('; ');
}

/**
 * Creates a deferred promise.
 *
 * @returns {Object} Object with promise, resolve, and reject
 */
function createDeferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Adds a timeout to a promise.
 *
 * @param {Promise} promise - Promise to wrap
 * @param {number} ms - Timeout in milliseconds
 * @param {string} [message='Operation timed out'] - Timeout error message
 * @returns {Promise}
 */
function withTimeout(promise, ms, message = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    })
  ]);
}

/**
 * Debounces a function.
 *
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, wait) {
  let timeout;

  return function debounced(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Throttles a function.
 *
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(fn, limit) {
  let lastCall = 0;

  return function throttled(...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}

module.exports = {
  isPlainObject,
  deepMerge,
  safeJsonParse,
  generateRequestId,
  formatBytes,
  formatDuration,
  normalizePath,
  joinPaths,
  parseCookies,
  serializeCookie,
  createDeferred,
  withTimeout,
  debounce,
  throttle
};
