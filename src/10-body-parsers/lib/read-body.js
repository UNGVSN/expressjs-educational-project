/**
 * Body Reader
 *
 * Reads the request body stream into a buffer.
 * Handles Content-Length validation and size limits.
 */

'use strict';

const { parseBytes } = require('./bytes');

/**
 * Read request body into a buffer
 *
 * @param {Object} req - HTTP request object
 * @param {Object} options - Reading options
 * @param {number|string} [options.limit='100kb'] - Maximum body size
 * @param {number|null} [options.length] - Expected Content-Length
 * @returns {Promise<Buffer>} Body as buffer
 */
function readBody(req, options = {}) {
  return new Promise((resolve, reject) => {
    const limit = parseBytes(options.limit) || parseBytes('100kb');
    const expectedLength = options.length;

    // Validate Content-Length if present
    if (expectedLength !== undefined && expectedLength !== null) {
      if (expectedLength > limit) {
        const err = new Error('Request body too large');
        err.type = 'entity.too.large';
        err.statusCode = 413;
        err.expected = expectedLength;
        err.limit = limit;
        return reject(err);
      }
    }

    const chunks = [];
    let received = 0;
    let done = false;

    // Handle data chunks
    const onData = (chunk) => {
      if (done) return;

      received += chunk.length;

      // Check size limit
      if (received > limit) {
        done = true;
        const err = new Error('Request body too large');
        err.type = 'entity.too.large';
        err.statusCode = 413;
        err.received = received;
        err.limit = limit;
        cleanup();
        reject(err);
        return;
      }

      chunks.push(chunk);
    };

    // Handle stream end
    const onEnd = () => {
      if (done) return;
      done = true;

      // Verify Content-Length match
      if (expectedLength !== undefined && expectedLength !== null) {
        if (received !== expectedLength) {
          const err = new Error('Request size did not match Content-Length');
          err.type = 'request.size.invalid';
          err.statusCode = 400;
          err.expected = expectedLength;
          err.received = received;
          cleanup();
          return reject(err);
        }
      }

      cleanup();
      resolve(Buffer.concat(chunks));
    };

    // Handle stream error
    const onError = (err) => {
      if (done) return;
      done = true;

      cleanup();

      err.type = err.type || 'stream.error';
      err.statusCode = err.statusCode || 400;
      reject(err);
    };

    // Handle aborted request
    const onAborted = () => {
      if (done) return;
      done = true;

      cleanup();

      const err = new Error('Request aborted');
      err.type = 'request.aborted';
      err.statusCode = 400;
      reject(err);
    };

    // Cleanup listeners
    const cleanup = () => {
      req.removeListener('data', onData);
      req.removeListener('end', onEnd);
      req.removeListener('error', onError);
      req.removeListener('close', onAborted);
    };

    // Attach listeners
    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
    req.on('close', onAborted);
  });
}

/**
 * Read body as string
 *
 * @param {Object} req - Request object
 * @param {Object} options - Options
 * @param {string} [options.encoding='utf-8'] - Character encoding
 * @returns {Promise<string>} Body as string
 */
async function readBodyAsString(req, options = {}) {
  const { encoding = 'utf-8' } = options;
  const buffer = await readBody(req, options);
  return buffer.toString(encoding);
}

module.exports = {
  readBody,
  readBodyAsString
};
