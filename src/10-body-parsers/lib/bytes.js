/**
 * Bytes Parser
 *
 * Parses human-readable byte strings to numbers and vice versa.
 * e.g., "1kb" -> 1024, "1mb" -> 1048576
 */

'use strict';

/**
 * Byte unit multipliers
 */
const UNITS = {
  b: 1,
  kb: 1024,
  mb: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
  tb: 1024 * 1024 * 1024 * 1024
};

/**
 * Parse a byte string to a number
 *
 * @param {string|number} value - Value to parse
 * @returns {number|null} Number of bytes or null if invalid
 *
 * @example
 * parseBytes('1kb') // => 1024
 * parseBytes('100') // => 100
 * parseBytes(1024)  // => 1024
 */
function parseBytes(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  // Match number and optional unit
  const match = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb|tb)?$/i.exec(value.trim());

  if (!match) {
    return null;
  }

  const number = parseFloat(match[1]);
  const unit = (match[2] || 'b').toLowerCase();

  if (!UNITS[unit]) {
    return null;
  }

  return Math.floor(number * UNITS[unit]);
}

/**
 * Format bytes to human-readable string
 *
 * @param {number} bytes - Number of bytes
 * @param {Object} [options] - Formatting options
 * @param {number} [options.decimals=2] - Decimal places
 * @returns {string} Formatted string
 *
 * @example
 * formatBytes(1024)    // => "1 KB"
 * formatBytes(1536)    // => "1.5 KB"
 */
function formatBytes(bytes, options = {}) {
  const { decimals = 2 } = options;

  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

module.exports = {
  parseBytes,
  formatBytes,
  UNITS
};
