/**
 * Path to Regular Expression Converter
 *
 * This module converts Express-style path patterns into regular expressions
 * that can be used for route matching. It extracts parameter names and
 * creates capture groups for each parameter.
 *
 * Express uses the 'path-to-regexp' npm package, but understanding how
 * it works is crucial to understanding Express routing.
 */

'use strict';

/**
 * Characters that have special meaning in regular expressions.
 * We need to escape these when they appear in path patterns.
 */
const SPECIAL_CHARS = /[\\^$.*+?()[\]{}|]/g;

/**
 * Pattern for matching route parameters.
 * Matches :name, :id, :userId, etc.
 */
const PARAM_PATTERN = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;

/**
 * Pattern for matching optional parameters.
 * Matches :name?, :id?, etc.
 */
const OPTIONAL_PARAM_PATTERN = /:([a-zA-Z_][a-zA-Z0-9_]*)\?/g;

/**
 * Convert a path pattern to a regular expression.
 *
 * Supports:
 * - Exact paths: /users -> matches only /users
 * - Parameters: /users/:id -> matches /users/123, extracts { id: '123' }
 * - Multiple params: /users/:id/posts/:postId -> { id, postId }
 * - Wildcards: /files/* -> matches /files/a/b/c
 * - Optional params: /users/:id? -> matches /users and /users/123
 *
 * @param {string|RegExp} path - Path pattern or RegExp
 * @param {Object} [options] - Options
 * @param {boolean} [options.end=true] - Match to end of string
 * @param {boolean} [options.strict=false] - Require trailing slash
 * @param {boolean} [options.sensitive=false] - Case sensitive
 * @returns {{ regexp: RegExp, keys: Array<{ name: string, optional: boolean }> }}
 *
 * @example
 * pathToRegexp('/users/:id')
 * // => { regexp: /^\/users\/([^/]+)$/, keys: [{ name: 'id', optional: false }] }
 *
 * pathToRegexp('/files/*')
 * // => { regexp: /^\/files\/(.*)$/, keys: [{ name: '0', optional: false }] }
 */
function pathToRegexp(path, options = {}) {
  const {
    end = true,
    strict = false,
    sensitive = false
  } = options;

  const keys = [];

  // If already a RegExp, just return it
  if (path instanceof RegExp) {
    return { regexp: path, keys };
  }

  // Handle array of paths
  if (Array.isArray(path)) {
    const patterns = path.map(p => pathToRegexp(p, options));
    const combined = patterns.map(p => p.regexp.source).join('|');
    return {
      regexp: new RegExp(`^(?:${combined})${end ? '$' : ''}`, sensitive ? '' : 'i'),
      keys: patterns.flatMap(p => p.keys)
    };
  }

  // Start building the pattern
  let pattern = path;
  let wildcardIndex = 0;

  // Escape special regex characters (but not our patterns)
  // Do this first, before we add our own patterns
  pattern = pattern.replace(SPECIAL_CHARS, (char) => {
    // Don't escape our special patterns
    if (char === ':' || char === '*' || char === '?') {
      return char;
    }
    return '\\' + char;
  });

  // Handle optional parameters first (before regular params)
  // :param? -> optional capture group
  // The pattern /:param? needs to match both /api and /api/v2
  // We look for \/:param? pattern and make the whole thing optional
  pattern = pattern.replace(/\\\/:([a-zA-Z_][a-zA-Z0-9_]*)\?/g, (match, name) => {
    keys.push({ name, optional: true });
    // The entire /:param segment is optional
    return '(?:\\/([^\\/]+))?';
  });

  // Also handle :param? without leading slash (at start of path)
  pattern = pattern.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)\?/g, (match, name) => {
    keys.push({ name, optional: true });
    return '([^\\/]*)?';
  });

  // Handle regular parameters
  // :param -> capture group
  pattern = pattern.replace(PARAM_PATTERN, (match, name) => {
    keys.push({ name, optional: false });
    return '([^\\/]+)';
  });

  // Handle wildcards
  // * -> match anything
  pattern = pattern.replace(/\*/g, () => {
    keys.push({ name: String(wildcardIndex++), optional: false });
    return '(.*)';
  });

  // Handle trailing slash
  if (!strict) {
    pattern = pattern.replace(/\/$/, '');
    pattern += '(?:\\/)?';
  }

  // Anchor the pattern
  if (end) {
    pattern = `^${pattern}$`;
  } else {
    pattern = `^${pattern}(?:\\/|$)`;
  }

  // Create the regexp
  const flags = sensitive ? '' : 'i';
  const regexp = new RegExp(pattern, flags);

  return { regexp, keys };
}

/**
 * Extract parameters from a path using the compiled pattern.
 *
 * @param {string} path - The actual path to match
 * @param {{ regexp: RegExp, keys: Array }} compiled - Compiled pattern
 * @returns {Object|null} Extracted parameters or null if no match
 *
 * @example
 * const compiled = pathToRegexp('/users/:id');
 * extractParams('/users/123', compiled);
 * // => { id: '123' }
 */
function extractParams(path, compiled) {
  const { regexp, keys } = compiled;
  const match = regexp.exec(path);

  if (!match) {
    return null;
  }

  const params = {};

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = match[i + 1];

    if (value !== undefined) {
      // Decode URI component
      try {
        params[key.name] = decodeURIComponent(value);
      } catch (e) {
        params[key.name] = value;
      }
    } else if (key.optional) {
      params[key.name] = undefined;
    }
  }

  return params;
}

/**
 * Check if a path matches a pattern.
 *
 * @param {string} path - Path to check
 * @param {string|RegExp} pattern - Pattern to match against
 * @returns {boolean} Whether the path matches
 */
function match(path, pattern) {
  const compiled = pathToRegexp(pattern);
  return compiled.regexp.test(path);
}

/**
 * Parse a path pattern and return a matcher function.
 *
 * @param {string|RegExp} pattern - Pattern to compile
 * @param {Object} [options] - Options
 * @returns {Function} Matcher function (path) => params | null
 *
 * @example
 * const matcher = compile('/users/:id');
 * matcher('/users/123'); // => { id: '123' }
 * matcher('/posts/123'); // => null
 */
function compile(pattern, options = {}) {
  const compiled = pathToRegexp(pattern, options);

  return function matcher(path) {
    return extractParams(path, compiled);
  };
}

/**
 * Join path segments, normalizing slashes.
 *
 * @param {...string} segments - Path segments
 * @returns {string} Joined path
 */
function joinPaths(...segments) {
  return segments
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '') || '/';
}

/**
 * Normalize a path by removing duplicate slashes and trailing slash.
 *
 * @param {string} path - Path to normalize
 * @returns {string} Normalized path
 */
function normalizePath(path) {
  if (!path || path === '/') {
    return '/';
  }

  // Remove duplicate slashes
  let normalized = path.replace(/\/+/g, '/');

  // Ensure leading slash
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }

  // Remove trailing slash (except for root)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

module.exports = {
  pathToRegexp,
  extractParams,
  match,
  compile,
  joinPaths,
  normalizePath
};
