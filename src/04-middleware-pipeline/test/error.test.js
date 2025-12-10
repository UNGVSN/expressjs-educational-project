/**
 * Error Handling Middleware Tests
 *
 * Tests for error propagation and error handling middleware
 * in the pipeline.
 */

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const createApp = require('../lib');

// Dynamic port allocation
let portCounter = 7200;
function getPort() {
  return portCounter++;
}

// Helper to make HTTP requests
async function request(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        res.body = data;
        res.json = () => {
          try {
            return JSON.parse(data);
          } catch (e) {
            return null;
          }
        };
        resolve(res);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

describe('Error Handling', () => {
  let server;

  afterEach((_, done) => {
    if (server) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('should catch errors passed to next()', async () => {
    const app = createApp();
    let errorHandled = false;

    app.get('/test', (req, res, next) => {
      next(new Error('Something went wrong'));
    });

    // Error handling middleware (4 args)
    app.use((err, req, res, next) => {
      errorHandled = true;
      res.status(500).json({ error: err.message });
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/test', method: 'GET' });

    assert.strictEqual(errorHandled, true);
    assert.strictEqual(res.statusCode, 500);
    assert.deepStrictEqual(res.json(), { error: 'Something went wrong' });
  });

  it('should catch thrown errors', async () => {
    const app = createApp();

    app.get('/test', (req, res, next) => {
      throw new Error('Thrown error');
    });

    app.use((err, req, res, next) => {
      res.status(500).json({ error: err.message });
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/test', method: 'GET' });

    assert.strictEqual(res.statusCode, 500);
    assert.deepStrictEqual(res.json(), { error: 'Thrown error' });
  });

  it('should skip regular middleware when error is passed', async () => {
    const app = createApp();
    let regularCalled = false;

    app.get('/test', (req, res, next) => {
      next(new Error('Error'));
    });

    // Regular middleware (should be skipped)
    app.use((req, res, next) => {
      regularCalled = true;
      next();
    });

    // Error middleware (should be called)
    app.use((err, req, res, next) => {
      res.status(500).json({ error: err.message });
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    await request({ port, path: '/test', method: 'GET' });

    assert.strictEqual(regularCalled, false);
  });

  it('should skip error middleware when no error', async () => {
    const app = createApp();
    let errorCalled = false;

    app.get('/test', (req, res, next) => {
      next(); // No error
    });

    // Error middleware (should be skipped)
    app.use((err, req, res, next) => {
      errorCalled = true;
      next();
    });

    // Regular middleware (should be called)
    app.use((req, res, next) => {
      res.end('done');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    await request({ port, path: '/test', method: 'GET' });

    assert.strictEqual(errorCalled, false);
  });

  it('should allow error handler to call next(err) to pass to another handler', async () => {
    const app = createApp();
    const handlers = [];

    app.get('/test', (req, res, next) => {
      next(new Error('Original error'));
    });

    // First error handler
    app.use((err, req, res, next) => {
      handlers.push('first');
      err.message += ' - handled';
      next(err);
    });

    // Second error handler
    app.use((err, req, res, next) => {
      handlers.push('second');
      res.status(500).json({ error: err.message });
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/test', method: 'GET' });

    assert.deepStrictEqual(handlers, ['first', 'second']);
    assert.deepStrictEqual(res.json(), { error: 'Original error - handled' });
  });

  it('should use default error handler when no custom handler', async () => {
    const app = createApp();

    app.get('/test', (req, res, next) => {
      const err = new Error('Unhandled error');
      err.status = 503;
      next(err);
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/test', method: 'GET' });

    assert.strictEqual(res.statusCode, 503);
    assert.deepStrictEqual(res.json(), { error: 'Unhandled error' });
  });

  it('should preserve error status code', async () => {
    const app = createApp();

    app.get('/test', (req, res, next) => {
      const err = new Error('Not Found');
      err.status = 404;
      next(err);
    });

    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({ error: err.message });
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/test', method: 'GET' });

    assert.strictEqual(res.statusCode, 404);
  });
});

describe('Error Recovery', () => {
  let server;

  afterEach((_, done) => {
    if (server) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('should allow error handler to recover and call next() without error', async () => {
    const app = createApp();

    app.get('/test', (req, res, next) => {
      next(new Error('Error'));
    });

    // Recovery middleware
    app.use((err, req, res, next) => {
      // Log error, recover, continue
      req.recovered = true;
      next(); // No error - recovered
    });

    // Continue normal flow
    app.use((req, res, next) => {
      res.json({ recovered: req.recovered || false });
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/test', method: 'GET' });

    assert.deepStrictEqual(res.json(), { recovered: true });
  });
});
