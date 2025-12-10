/**
 * MIME Type Mapping
 *
 * Maps file extensions to MIME types for proper Content-Type headers.
 */

'use strict';

/**
 * MIME type database
 * Key: extension (without dot)
 * Value: MIME type
 */
const mimeTypes = {
  // Text
  'html': 'text/html; charset=utf-8',
  'htm': 'text/html; charset=utf-8',
  'css': 'text/css; charset=utf-8',
  'js': 'text/javascript; charset=utf-8',
  'mjs': 'text/javascript; charset=utf-8',
  'json': 'application/json; charset=utf-8',
  'xml': 'application/xml; charset=utf-8',
  'txt': 'text/plain; charset=utf-8',
  'csv': 'text/csv; charset=utf-8',
  'md': 'text/markdown; charset=utf-8',

  // Images
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  'ico': 'image/x-icon',
  'bmp': 'image/bmp',
  'avif': 'image/avif',

  // Fonts
  'woff': 'font/woff',
  'woff2': 'font/woff2',
  'ttf': 'font/ttf',
  'otf': 'font/otf',
  'eot': 'application/vnd.ms-fontobject',

  // Audio
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'ogg': 'audio/ogg',
  'flac': 'audio/flac',
  'm4a': 'audio/mp4',

  // Video
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'ogv': 'video/ogg',
  'mov': 'video/quicktime',
  'avi': 'video/x-msvideo',

  // Documents
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Archives
  'zip': 'application/zip',
  'gz': 'application/gzip',
  'tar': 'application/x-tar',
  'rar': 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',

  // Web
  'wasm': 'application/wasm',
  'map': 'application/json',

  // Manifest
  'webmanifest': 'application/manifest+json',
  'manifest': 'text/cache-manifest'
};

/**
 * Default MIME type for unknown extensions
 */
const defaultType = 'application/octet-stream';

/**
 * Get MIME type for a file path or extension
 * @param {string} pathOrExt - File path or extension
 * @returns {string} MIME type
 */
function lookup(pathOrExt) {
  if (!pathOrExt || typeof pathOrExt !== 'string') {
    return defaultType;
  }

  // Extract extension
  let ext = pathOrExt;

  // If it looks like a path, extract extension
  const lastDot = pathOrExt.lastIndexOf('.');
  if (lastDot !== -1) {
    ext = pathOrExt.slice(lastDot + 1);
  }

  // Normalize to lowercase, remove leading dot if present
  ext = ext.toLowerCase().replace(/^\./, '');

  return mimeTypes[ext] || defaultType;
}

/**
 * Get the charset for a MIME type
 * @param {string} mimeType - MIME type
 * @returns {string|false} Charset or false if none
 */
function charset(mimeType) {
  if (!mimeType || typeof mimeType !== 'string') {
    return false;
  }

  // Check if charset is already in MIME type
  if (mimeType.includes('charset=')) {
    const match = mimeType.match(/charset=([^\s;]+)/i);
    return match ? match[1] : false;
  }

  // Text types should have charset
  if (mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/javascript' ||
      mimeType === 'application/xml') {
    return 'utf-8';
  }

  return false;
}

/**
 * Get content type with charset if applicable
 * @param {string} pathOrExt - File path or extension
 * @returns {string} Content-Type header value
 */
function contentType(pathOrExt) {
  const mime = lookup(pathOrExt);

  // If charset already included, return as-is
  if (mime.includes('charset=')) {
    return mime;
  }

  // Add charset if applicable
  const cs = charset(mime);
  if (cs) {
    return `${mime}; charset=${cs}`;
  }

  return mime;
}

/**
 * Check if a MIME type is compressible
 * @param {string} mimeType - MIME type
 * @returns {boolean} True if compressible
 */
function compressible(mimeType) {
  if (!mimeType || typeof mimeType !== 'string') {
    return false;
  }

  // Extract base type without charset
  const baseType = mimeType.split(';')[0].trim().toLowerCase();

  // Text types are compressible
  if (baseType.startsWith('text/')) {
    return true;
  }

  // JSON, JavaScript, XML are compressible
  if (baseType === 'application/json' ||
      baseType === 'application/javascript' ||
      baseType === 'application/xml' ||
      baseType.endsWith('+json') ||
      baseType.endsWith('+xml')) {
    return true;
  }

  // SVG is compressible
  if (baseType === 'image/svg+xml') {
    return true;
  }

  return false;
}

/**
 * Define a custom MIME type
 * @param {string} ext - Extension (without dot)
 * @param {string} type - MIME type
 */
function define(ext, type) {
  if (typeof ext === 'string' && typeof type === 'string') {
    mimeTypes[ext.toLowerCase().replace(/^\./, '')] = type;
  }
}

module.exports = {
  lookup,
  charset,
  contentType,
  compressible,
  define,
  types: mimeTypes,
  defaultType
};
