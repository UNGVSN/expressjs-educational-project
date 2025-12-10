/**
 * Signed Cookie Utilities
 *
 * HMAC-based cookie signing and verification.
 * Prevents cookie tampering by appending a signature.
 */

'use strict';

const crypto = require('crypto');

/**
 * Sign a cookie value using HMAC-SHA256
 *
 * @param {string} value - Value to sign
 * @param {string|string[]} secret - Secret key(s) for signing
 * @returns {string} Signed value in format: s:value.signature
 *
 * @example
 * sign('john', 'my-secret')
 * // => 's:john.DGDsE8P...'
 */
function sign(value, secret) {
  if (typeof value !== 'string') {
    throw new TypeError('Cookie value must be a string');
  }

  // Use first secret if array is provided
  const key = Array.isArray(secret) ? secret[0] : secret;

  if (!key || typeof key !== 'string') {
    throw new TypeError('Secret must be a non-empty string');
  }

  // Create HMAC signature
  const signature = crypto
    .createHmac('sha256', key)
    .update(value)
    .digest('base64')
    .replace(/=+$/, ''); // Remove padding

  // Return signed value with prefix
  return `s:${value}.${signature}`;
}

/**
 * Unsign and verify a signed cookie value
 *
 * @param {string} signedValue - Signed value to verify
 * @param {string|string[]} secret - Secret key(s) for verification
 * @returns {string|false} Original value if valid, false if tampered
 *
 * @example
 * unsign('s:john.DGDsE8P...', 'my-secret')
 * // => 'john'
 *
 * unsign('s:john.wrongsignature', 'my-secret')
 * // => false
 */
function unsign(signedValue, secret) {
  if (typeof signedValue !== 'string') {
    return false;
  }

  // Check for signed cookie prefix
  if (!signedValue.startsWith('s:')) {
    return false;
  }

  // Remove prefix
  const withoutPrefix = signedValue.slice(2);

  // Find last dot (signature separator)
  const lastDotIndex = withoutPrefix.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return false;
  }

  // Split value and signature
  const value = withoutPrefix.slice(0, lastDotIndex);
  const signature = withoutPrefix.slice(lastDotIndex + 1);

  // Get secrets array
  const secrets = Array.isArray(secret) ? secret : [secret];

  // Try each secret (supports key rotation)
  for (const key of secrets) {
    if (!key || typeof key !== 'string') {
      continue;
    }

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', key)
      .update(value)
      .digest('base64')
      .replace(/=+$/, '');

    // Use timing-safe comparison to prevent timing attacks
    if (timingSafeEqual(signature, expectedSignature)) {
      return value;
    }
  }

  // Signature didn't match any secret
  return false;
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks by always taking the same time
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  // Pad to same length to prevent length-based timing attacks
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    // Compare against itself to maintain constant time
    crypto.timingSafeEqual(aBuffer, aBuffer);
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

/**
 * Check if a value is signed (has the s: prefix)
 *
 * @param {string} value - Value to check
 * @returns {boolean} True if value appears to be signed
 */
function isSigned(value) {
  return typeof value === 'string' && value.startsWith('s:');
}

module.exports = {
  sign,
  unsign,
  isSigned
};
