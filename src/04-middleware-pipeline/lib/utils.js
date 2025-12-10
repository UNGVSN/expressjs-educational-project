/**
 * Utility functions for the middleware pipeline
 */

'use strict';

/**
 * Check if a value is a generator function
 * @param {*} obj - Value to check
 * @returns {boolean}
 */
function isGeneratorFunction(obj) {
  const constructor = obj.constructor;
  if (!constructor) return false;
  if (
    constructor.name === 'GeneratorFunction' ||
    constructor.displayName === 'GeneratorFunction'
  ) {
    return true;
  }
  return false;
}

/**
 * Check if a value is a promise
 * @param {*} obj - Value to check
 * @returns {boolean}
 */
function isPromise(obj) {
  return !!obj && typeof obj.then === 'function';
}

/**
 * Convert a handler to async-safe version
 * Wraps sync handlers to catch thrown errors
 *
 * @param {Function} fn - Handler function
 * @returns {Function} Wrapped handler
 */
function wrapAsync(fn) {
  return function asyncHandler(req, res, next) {
    try {
      const result = fn(req, res, next);

      // If handler returns a promise, catch errors
      if (isPromise(result)) {
        result.catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Normalize path for middleware matching
 * @param {string} path - Path to normalize
 * @returns {string} Normalized path
 */
function normalizePath(path) {
  if (!path || path === '/') {
    return '/';
  }

  // Ensure leading slash
  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  // Remove trailing slash (except for root)
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  // Remove duplicate slashes
  path = path.replace(/\/+/g, '/');

  return path;
}

/**
 * Parse a path into segments
 * @param {string} path - Path to parse
 * @returns {string[]} Path segments
 */
function parsePath(path) {
  const normalized = normalizePath(path);
  return normalized.split('/').filter(Boolean);
}

/**
 * Check if path A starts with path B
 * @param {string} path - Full path
 * @param {string} prefix - Prefix to check
 * @returns {boolean}
 */
function pathStartsWith(path, prefix) {
  if (prefix === '/') {
    return true;
  }

  const normalizedPath = normalizePath(path);
  const normalizedPrefix = normalizePath(prefix);

  // Must start with prefix
  if (!normalizedPath.startsWith(normalizedPrefix)) {
    return false;
  }

  // Must be exact or followed by /
  const nextChar = normalizedPath[normalizedPrefix.length];
  return !nextChar || nextChar === '/';
}

/**
 * Remove prefix from path
 * @param {string} path - Full path
 * @param {string} prefix - Prefix to remove
 * @returns {string} Path without prefix
 */
function stripPrefix(path, prefix) {
  if (prefix === '/') {
    return path;
  }

  const normalizedPath = normalizePath(path);
  const normalizedPrefix = normalizePath(prefix);

  if (!normalizedPath.startsWith(normalizedPrefix)) {
    return normalizedPath;
  }

  const result = normalizedPath.slice(normalizedPrefix.length);
  return result || '/';
}

/**
 * Create a debug logger
 * @param {string} namespace - Debug namespace
 * @returns {Function} Debug function
 */
function createDebug(namespace) {
  const enabled = process.env.DEBUG && (
    process.env.DEBUG === '*' ||
    process.env.DEBUG.includes(namespace)
  );

  return function debug(...args) {
    if (enabled) {
      console.log(`[${namespace}]`, ...args);
    }
  };
}

/**
 * Flatten an array of potentially nested middleware
 * @param {Array} arr - Array to flatten
 * @returns {Array} Flattened array
 */
function flatten(arr) {
  return arr.reduce((acc, item) => {
    if (Array.isArray(item)) {
      return acc.concat(flatten(item));
    }
    return acc.concat(item);
  }, []);
}

/**
 * Set a property on an object with a getter
 * @param {Object} obj - Object to modify
 * @param {string} name - Property name
 * @param {Function} getter - Getter function
 */
function defineGetter(obj, name, getter) {
  Object.defineProperty(obj, name, {
    configurable: true,
    enumerable: true,
    get: getter
  });
}

module.exports = {
  isGeneratorFunction,
  isPromise,
  wrapAsync,
  normalizePath,
  parsePath,
  pathStartsWith,
  stripPrefix,
  createDebug,
  flatten,
  defineGetter
};
