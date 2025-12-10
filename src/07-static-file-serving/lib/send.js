/**
 * Send File Utilities
 *
 * Handles streaming files with proper headers, caching, and error handling.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const mime = require('./mime');

/**
 * Generate ETag from file stats
 * @param {fs.Stats} stat - File stats
 * @returns {string} ETag value
 */
function generateETag(stat) {
  const mtime = stat.mtime.getTime().toString(16);
  const size = stat.size.toString(16);
  return `"${size}-${mtime}"`;
}

/**
 * Check if the request is fresh (client cache is valid)
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @returns {boolean} True if fresh
 */
function isFresh(req, res) {
  // Check If-None-Match (ETag)
  const ifNoneMatch = req.headers['if-none-match'];
  const etag = res.getHeader('ETag');

  if (ifNoneMatch && etag) {
    // Handle weak ETags
    const clientEtag = ifNoneMatch.replace(/^W\//, '');
    const serverEtag = etag.replace(/^W\//, '');

    if (clientEtag === serverEtag || clientEtag === '*') {
      return true;
    }
  }

  // Check If-Modified-Since
  const ifModifiedSince = req.headers['if-modified-since'];
  const lastModified = res.getHeader('Last-Modified');

  if (ifModifiedSince && lastModified) {
    const clientDate = new Date(ifModifiedSince);
    const serverDate = new Date(lastModified);

    if (!isNaN(clientDate.getTime()) && clientDate >= serverDate) {
      return true;
    }
  }

  return false;
}

/**
 * Parse range header
 * @param {string} range - Range header value
 * @param {number} size - File size
 * @returns {object|null} Range object { start, end } or null if invalid
 */
function parseRange(range, size) {
  if (!range || !range.startsWith('bytes=')) {
    return null;
  }

  const parts = range.slice(6).split('-');
  let start = parseInt(parts[0], 10);
  let end = parseInt(parts[1], 10);

  if (isNaN(start)) {
    // Suffix range: -500 means last 500 bytes
    start = Math.max(0, size - end);
    end = size - 1;
  } else if (isNaN(end)) {
    // Open-ended range: 500- means from byte 500 to end
    end = size - 1;
  }

  // Validate range
  if (start < 0 || start > end || start >= size) {
    return null;
  }

  // Clamp end to file size
  end = Math.min(end, size - 1);

  return { start, end };
}

/**
 * Send a file to the response
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {string} filePath - Absolute path to file
 * @param {object} options - Options
 * @returns {Promise<void>}
 */
async function sendFile(req, res, filePath, options = {}) {
  const {
    etag = true,
    lastModified = true,
    maxAge = 0,
    cacheControl = true,
    acceptRanges = true,
    headers = {}
  } = options;

  return new Promise((resolve, reject) => {
    // Get file stats
    fs.stat(filePath, (err, stat) => {
      if (err) {
        if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
          err.status = 404;
        } else if (err.code === 'EACCES') {
          err.status = 403;
        }
        return reject(err);
      }

      // Must be a file
      if (!stat.isFile()) {
        const error = new Error('Not a file');
        error.status = 404;
        return reject(error);
      }

      // Set Content-Type
      const contentType = mime.contentType(filePath);
      res.setHeader('Content-Type', contentType);

      // Set custom headers
      for (const [key, value] of Object.entries(headers)) {
        res.setHeader(key, value);
      }

      // Set caching headers
      if (etag) {
        res.setHeader('ETag', generateETag(stat));
      }

      if (lastModified) {
        res.setHeader('Last-Modified', stat.mtime.toUTCString());
      }

      if (cacheControl) {
        const maxAgeSeconds = typeof maxAge === 'number'
          ? Math.floor(maxAge / 1000)
          : 0;
        res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}`);
      }

      if (acceptRanges) {
        res.setHeader('Accept-Ranges', 'bytes');
      }

      // Check if client cache is fresh
      if (isFresh(req, res)) {
        res.statusCode = 304;
        res.end();
        return resolve();
      }

      // Handle HEAD request
      if (req.method === 'HEAD') {
        res.setHeader('Content-Length', stat.size);
        res.end();
        return resolve();
      }

      // Handle range requests
      const rangeHeader = req.headers.range;
      const range = acceptRanges ? parseRange(rangeHeader, stat.size) : null;

      if (rangeHeader && !range) {
        // Invalid range
        res.statusCode = 416; // Range Not Satisfiable
        res.setHeader('Content-Range', `bytes */${stat.size}`);
        res.end();
        return resolve();
      }

      let start = 0;
      let end = stat.size - 1;

      if (range) {
        start = range.start;
        end = range.end;
        res.statusCode = 206; // Partial Content
        res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
        res.setHeader('Content-Length', end - start + 1);
      } else {
        res.setHeader('Content-Length', stat.size);
      }

      // Create read stream and pipe to response
      const stream = fs.createReadStream(filePath, { start, end });

      stream.on('error', (streamErr) => {
        // Don't fail if response is already ended
        if (!res.writableEnded) {
          reject(streamErr);
        }
      });

      stream.on('end', () => {
        resolve();
      });

      stream.pipe(res);
    });
  });
}

/**
 * Send a file with download disposition
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {string} filePath - Absolute path to file
 * @param {string} filename - Download filename
 * @param {object} options - Options
 */
async function sendFileDownload(req, res, filePath, filename, options = {}) {
  const disposition = `attachment; filename="${encodeURIComponent(filename || path.basename(filePath))}"`;

  return sendFile(req, res, filePath, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Disposition': disposition
    }
  });
}

module.exports = {
  sendFile,
  sendFileDownload,
  generateETag,
  isFresh,
  parseRange
};
