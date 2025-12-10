/**
 * Static File Middleware
 *
 * Serves static files from a directory.
 * Equivalent to express.static()
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { sendFile } = require('./send');

/**
 * Create static file serving middleware
 * @param {string} root - Root directory to serve files from
 * @param {object} options - Configuration options
 * @returns {Function} Middleware function
 */
function serveStatic(root, options = {}) {
  // Validate root
  if (!root || typeof root !== 'string') {
    throw new TypeError('root path required');
  }

  // Resolve root to absolute path
  const rootPath = path.resolve(root);

  // Default options
  const opts = {
    index: options.index !== false ? (options.index || ['index.html']) : false,
    dotfiles: options.dotfiles || 'ignore', // 'allow', 'deny', 'ignore'
    extensions: options.extensions || false,
    etag: options.etag !== false,
    lastModified: options.lastModified !== false,
    maxAge: parseMaxAge(options.maxAge),
    redirect: options.redirect !== false,
    setHeaders: options.setHeaders || null,
    fallthrough: options.fallthrough !== false,
    acceptRanges: options.acceptRanges !== false
  };

  // Normalize index to array
  if (opts.index && !Array.isArray(opts.index)) {
    opts.index = [opts.index];
  }

  // Normalize extensions to array
  if (opts.extensions && !Array.isArray(opts.extensions)) {
    opts.extensions = [opts.extensions];
  }

  /**
   * Static middleware function
   */
  return async function staticMiddleware(req, res, next) {
    // Only handle GET and HEAD
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (opts.fallthrough) {
        return next();
      }
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD');
      res.end('Method Not Allowed');
      return;
    }

    // Get the URL path
    let urlPath = req.path || parseUrl(req.url);

    // Decode URL
    try {
      urlPath = decodeURIComponent(urlPath);
    } catch {
      if (opts.fallthrough) {
        return next();
      }
      res.statusCode = 400;
      res.end('Bad Request');
      return;
    }

    // Prevent null bytes
    if (urlPath.includes('\0')) {
      if (opts.fallthrough) {
        return next();
      }
      res.statusCode = 400;
      res.end('Bad Request');
      return;
    }

    // Handle dotfiles
    if (containsDotFile(urlPath)) {
      switch (opts.dotfiles) {
        case 'deny':
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        case 'ignore':
          if (opts.fallthrough) {
            return next();
          }
          res.statusCode = 404;
          res.end('Not Found');
          return;
        // 'allow' falls through
      }
    }

    // Build file path (remove leading slash, normalize)
    const relativePath = path.normalize(urlPath).replace(/^[/\\]+/, '');
    const filePath = path.join(rootPath, relativePath);

    // Security: prevent path traversal
    if (!filePath.startsWith(rootPath)) {
      if (opts.fallthrough) {
        return next();
      }
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    try {
      // Check if path exists
      const stat = await statAsync(filePath);

      // Handle directory
      if (stat && stat.isDirectory()) {
        // Redirect /dir to /dir/ if needed
        if (opts.redirect && !urlPath.endsWith('/')) {
          res.statusCode = 301;
          res.setHeader('Location', urlPath + '/');
          res.end();
          return;
        }

        // Try index files
        if (opts.index) {
          for (const indexFile of opts.index) {
            const indexPath = path.join(filePath, indexFile);
            const indexStat = await statAsync(indexPath);

            if (indexStat && indexStat.isFile()) {
              return await serveFile(req, res, indexPath, opts);
            }
          }
        }

        // No index found
        if (opts.fallthrough) {
          return next();
        }
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }

      // Handle file
      if (stat && stat.isFile()) {
        return await serveFile(req, res, filePath, opts);
      }

      // Try extension fallbacks
      if (opts.extensions) {
        for (const ext of opts.extensions) {
          const extPath = filePath + '.' + ext.replace(/^\./, '');
          const extStat = await statAsync(extPath);

          if (extStat && extStat.isFile()) {
            return await serveFile(req, res, extPath, opts);
          }
        }
      }

      // Not found
      if (opts.fallthrough) {
        return next();
      }
      res.statusCode = 404;
      res.end('Not Found');

    } catch (err) {
      // Handle errors
      if (opts.fallthrough && (err.status === 404 || err.code === 'ENOENT')) {
        return next();
      }

      // Pass error to error handler
      next(err);
    }
  };
}

/**
 * Serve a file with options
 */
async function serveFile(req, res, filePath, opts) {
  // Custom headers callback
  if (opts.setHeaders) {
    const stat = await statAsync(filePath);
    opts.setHeaders(res, filePath, stat);
  }

  return sendFile(req, res, filePath, {
    etag: opts.etag,
    lastModified: opts.lastModified,
    maxAge: opts.maxAge,
    acceptRanges: opts.acceptRanges
  });
}

/**
 * Parse URL path from URL string
 */
function parseUrl(url) {
  if (!url) return '/';
  const queryIndex = url.indexOf('?');
  return queryIndex === -1 ? url : url.slice(0, queryIndex);
}

/**
 * Check if path contains dotfile
 */
function containsDotFile(urlPath) {
  const parts = urlPath.split(/[/\\]/);
  for (const part of parts) {
    if (part.startsWith('.') && part !== '.' && part !== '..') {
      return true;
    }
  }
  return false;
}

/**
 * Parse max-age option
 */
function parseMaxAge(val) {
  if (typeof val === 'number') {
    return val;
  }

  if (typeof val === 'string') {
    // Parse duration string (1d, 1h, 1m, 1s)
    const match = val.match(/^(\d+)(d|h|m|s)?$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      const unit = (match[2] || 's').toLowerCase();
      const multipliers = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
      return num * (multipliers[unit] || 1000);
    }
  }

  return 0;
}

/**
 * Promisified fs.stat
 */
function statAsync(filePath) {
  return new Promise((resolve) => {
    fs.stat(filePath, (err, stat) => {
      if (err) {
        resolve(null);
      } else {
        resolve(stat);
      }
    });
  });
}

module.exports = serveStatic;
