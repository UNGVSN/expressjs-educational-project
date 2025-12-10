/**
 * Response Helper Utilities
 *
 * These utilities provide convenient methods for sending HTTP responses.
 * Express wraps these patterns in methods like res.json(), res.send(), etc.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Common MIME types for file serving.
 * Express uses the 'mime' package for more comprehensive support.
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
 * HTTP status code messages.
 */
const STATUS_MESSAGES = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  413: 'Payload Too Large',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout'
};

/**
 * Sends a JSON response.
 *
 * This is what Express's res.json() does internally.
 * It handles serialization, content-type, and content-length.
 *
 * @param {http.ServerResponse} res - The response object
 * @param {any} data - Data to serialize as JSON
 * @param {number} [statusCode=200] - HTTP status code
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.pretty=false] - Pretty print JSON
 * @param {Object} [options.headers={}] - Additional headers
 *
 * @example
 * sendJson(res, { message: 'Hello' });
 * sendJson(res, { error: 'Not found' }, 404);
 * sendJson(res, data, 200, { pretty: true });
 */
function sendJson(res, data, statusCode = 200, options = {}) {
  const { pretty = false, headers = {} } = options;

  // Serialize JSON
  const json = pretty
    ? JSON.stringify(data, null, 2)
    : JSON.stringify(data);

  // Calculate byte length (important for non-ASCII characters)
  const length = Buffer.byteLength(json, 'utf8');

  // Set headers
  const responseHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': length,
    ...headers
  };

  res.writeHead(statusCode, responseHeaders);
  res.end(json);
}

/**
 * Sends an HTML response.
 *
 * @param {http.ServerResponse} res - The response object
 * @param {string} html - HTML content
 * @param {number} [statusCode=200] - HTTP status code
 * @param {Object} [headers={}] - Additional headers
 *
 * @example
 * sendHtml(res, '<h1>Hello</h1>');
 * sendHtml(res, errorPage, 500);
 */
function sendHtml(res, html, statusCode = 200, headers = {}) {
  const length = Buffer.byteLength(html, 'utf8');

  const responseHeaders = {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': length,
    ...headers
  };

  res.writeHead(statusCode, responseHeaders);
  res.end(html);
}

/**
 * Sends a plain text response.
 *
 * @param {http.ServerResponse} res - The response object
 * @param {string} text - Text content
 * @param {number} [statusCode=200] - HTTP status code
 * @param {Object} [headers={}] - Additional headers
 *
 * @example
 * sendText(res, 'Hello, World!');
 * sendText(res, 'Not Found', 404);
 */
function sendText(res, text, statusCode = 200, headers = {}) {
  const length = Buffer.byteLength(text, 'utf8');

  const responseHeaders = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': length,
    ...headers
  };

  res.writeHead(statusCode, responseHeaders);
  res.end(text);
}

/**
 * Sends a file as the response.
 *
 * This is a simplified version of what Express's res.sendFile() does.
 * It handles:
 * - MIME type detection
 * - Streaming for efficiency
 * - Error handling
 *
 * @param {http.ServerResponse} res - The response object
 * @param {string} filePath - Absolute path to the file
 * @param {Object} [options] - Options
 * @param {Object} [options.headers={}] - Additional headers
 * @param {string} [options.contentType] - Override content type
 * @returns {Promise<void>}
 *
 * @example
 * await sendFile(res, '/path/to/file.html');
 * await sendFile(res, '/path/to/data.bin', { contentType: 'application/octet-stream' });
 */
function sendFile(res, filePath, options = {}) {
  return new Promise((resolve, reject) => {
    const { headers = {}, contentType } = options;

    // Get file stats
    fs.stat(filePath, (err, stats) => {
      if (err) {
        if (err.code === 'ENOENT') {
          sendError(res, 404, 'File not found');
          resolve();
          return;
        }
        sendError(res, 500, 'Error reading file');
        reject(err);
        return;
      }

      // Don't serve directories
      if (stats.isDirectory()) {
        sendError(res, 403, 'Cannot serve directory');
        resolve();
        return;
      }

      // Determine content type
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = contentType || MIME_TYPES[ext] || 'application/octet-stream';

      // Set response headers
      const responseHeaders = {
        'Content-Type': mimeType,
        'Content-Length': stats.size,
        'Last-Modified': stats.mtime.toUTCString(),
        ...headers
      };

      res.writeHead(200, responseHeaders);

      // Stream the file
      const stream = fs.createReadStream(filePath);

      stream.on('error', (streamErr) => {
        console.error('Stream error:', streamErr);
        // Response may have already started, try to end gracefully
        res.end();
        reject(streamErr);
      });

      stream.on('end', () => {
        resolve();
      });

      // Pipe file to response
      stream.pipe(res);
    });
  });
}

/**
 * Sends a redirect response.
 *
 * @param {http.ServerResponse} res - The response object
 * @param {string} url - URL to redirect to
 * @param {number} [statusCode=302] - Redirect status code (301, 302, 303, 307, 308)
 *
 * @example
 * redirect(res, '/login');
 * redirect(res, 'https://example.com', 301);
 */
function redirect(res, url, statusCode = 302) {
  // Validate redirect status code
  const validCodes = [301, 302, 303, 307, 308];
  if (!validCodes.includes(statusCode)) {
    statusCode = 302;
  }

  // Build redirect body (for clients that don't follow redirects)
  const body = `Redirecting to ${url}`;

  res.writeHead(statusCode, {
    'Location': url,
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });

  res.end(body);
}

/**
 * Sends an error response.
 *
 * @param {http.ServerResponse} res - The response object
 * @param {number} statusCode - HTTP status code
 * @param {string} [message] - Error message (defaults to status message)
 * @param {Object} [options] - Options
 * @param {boolean} [options.json=false] - Send as JSON
 * @param {Object} [options.details] - Additional error details (for JSON)
 *
 * @example
 * sendError(res, 404);
 * sendError(res, 404, 'User not found');
 * sendError(res, 400, 'Validation failed', { json: true, details: { field: 'email' } });
 */
function sendError(res, statusCode, message, options = {}) {
  const { json = false, details } = options;

  // Use default message if not provided
  const errorMessage = message || STATUS_MESSAGES[statusCode] || 'Error';

  if (json) {
    const errorBody = {
      error: {
        status: statusCode,
        message: errorMessage,
        ...details
      }
    };
    sendJson(res, errorBody, statusCode);
  } else {
    // Send HTML error page
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Error ${statusCode}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .error {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #e74c3c;
      margin: 0 0 10px;
      font-size: 72px;
    }
    p {
      color: #666;
      margin: 0;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div class="error">
    <h1>${statusCode}</h1>
    <p>${escapeHtml(errorMessage)}</p>
  </div>
</body>
</html>`;

    sendHtml(res, html, statusCode);
  }
}

/**
 * Sets a response header.
 *
 * @param {http.ServerResponse} res - The response object
 * @param {string} name - Header name
 * @param {string|number} value - Header value
 */
function setHeader(res, name, value) {
  res.setHeader(name, value);
}

/**
 * Sets multiple response headers at once.
 *
 * @param {http.ServerResponse} res - The response object
 * @param {Object} headers - Headers object
 */
function setHeaders(res, headers) {
  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }
}

/**
 * Sets the response status code.
 *
 * @param {http.ServerResponse} res - The response object
 * @param {number} code - HTTP status code
 * @returns {http.ServerResponse} The response object (for chaining)
 */
function status(res, code) {
  res.statusCode = code;
  return res;
}

/**
 * Escapes HTML special characters to prevent XSS.
 *
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return String(str).replace(/[&<>"']/g, char => htmlEscapes[char]);
}

/**
 * Gets the MIME type for a file extension.
 *
 * @param {string} ext - File extension (with or without leading dot)
 * @returns {string} MIME type
 */
function getMimeType(ext) {
  const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
  return MIME_TYPES[normalizedExt.toLowerCase()] || 'application/octet-stream';
}

/**
 * Checks if headers have already been sent.
 *
 * @param {http.ServerResponse} res - The response object
 * @returns {boolean}
 */
function headersSent(res) {
  return res.headersSent;
}

module.exports = {
  sendJson,
  sendHtml,
  sendText,
  sendFile,
  redirect,
  sendError,
  setHeader,
  setHeaders,
  status,
  escapeHtml,
  getMimeType,
  headersSent,
  MIME_TYPES,
  STATUS_MESSAGES
};
