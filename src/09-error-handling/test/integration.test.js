/**
 * Integration Tests for Error Handling System
 */

'use strict';

const { describe, it, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const createApp = require('../lib/index');
const {
  NotFoundError,
  BadRequestError,
  ValidationError,
  asyncHandler
} = require('../lib/index');

// Helper to make HTTP requests
function request(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

describe('Error Handling Integration', () => {
  let app;
  let server;
  let port;

  beforeEach(() => {
    app = createApp();
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  describe('Synchronous errors', () => {
    it('should catch errors thrown in route handlers', async () => {
      app.get('/sync-error', (req, res) => {
        throw new Error('Sync error thrown!');
      });

      server = app.listen(0);
      port = server.address().port;

      const res = await request({
        hostname: 'localhost',
        port,
        path: '/sync-error',
        method: 'GET'
      });

      server.close();

      assert.strictEqual(res.statusCode, 500);
      assert.ok(res.body.error);
      assert.ok(res.body.error.message.includes('Sync error'));
    });

    it('should use error statusCode when available', async () => {
      app.get('/not-found', (req, res) => {
        throw new NotFoundError('Resource not found');
      });

      server = app.listen(0);
      port = server.address().port;

      const res = await request({
        hostname: 'localhost',
        port,
        path: '/not-found',
        method: 'GET'
      });

      server.close();

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.error.message, 'Resource not found');
    });
  });

  describe('Asynchronous errors', () => {
    it('should catch async errors with asyncHandler', async () => {
      app.get('/async-error', asyncHandler(async (req, res) => {
        await Promise.resolve();
        throw new BadRequestError('Async validation failed');
      }));

      server = app.listen(0);
      port = server.address().port;

      const res = await request({
        hostname: 'localhost',
        port,
        path: '/async-error',
        method: 'GET'
      });

      server.close();

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error.message, 'Async validation failed');
    });

    it('should catch promise rejections', async () => {
      app.get('/promise-reject', asyncHandler(async (req, res) => {
        return Promise.reject(new Error('Promise rejected'));
      }));

      server = app.listen(0);
      port = server.address().port;

      const res = await request({
        hostname: 'localhost',
        port,
        path: '/promise-reject',
        method: 'GET'
      });

      server.close();

      assert.strictEqual(res.statusCode, 500);
    });
  });

  describe('Error middleware chain', () => {
    it('should pass errors through error middleware chain', async () => {
      const logs = [];

      app.get('/chained', (req, res) => {
        throw new ValidationError('Invalid data', [{ field: 'name' }]);
      });

      // Error logger
      app.use((err, req, res, next) => {
        logs.push('logged: ' + err.message);
        next(err);
      });

      // Validation handler
      app.use((err, req, res, next) => {
        if (err.name === 'ValidationError') {
          logs.push('validation handled');
          return res.status(422).json({
            error: { message: err.message, errors: err.errors }
          });
        }
        next(err);
      });

      server = app.listen(0);
      port = server.address().port;

      const res = await request({
        hostname: 'localhost',
        port,
        path: '/chained',
        method: 'GET'
      });

      server.close();

      assert.strictEqual(res.statusCode, 422);
      assert.deepStrictEqual(logs, ['logged: Invalid data', 'validation handled']);
    });

    it('should skip non-error middleware when error exists', async () => {
      const called = [];

      app.get('/skip-test', (req, res) => {
        throw new Error('Initial error');
      });

      // Regular middleware - should be skipped
      app.use((req, res, next) => {
        called.push('regular');
        next();
      });

      // Error middleware - should be called
      app.use((err, req, res, next) => {
        called.push('error');
        res.status(500).json({ error: { message: err.message } });
      });

      server = app.listen(0);
      port = server.address().port;

      await request({
        hostname: 'localhost',
        port,
        path: '/skip-test',
        method: 'GET'
      });

      server.close();

      assert.deepStrictEqual(called, ['error']);
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unmatched routes', async () => {
      app.get('/exists', (req, res) => {
        res.json({ ok: true });
      });

      server = app.listen(0);
      port = server.address().port;

      const res = await request({
        hostname: 'localhost',
        port,
        path: '/does-not-exist',
        method: 'GET'
      });

      server.close();

      assert.strictEqual(res.statusCode, 404);
      assert.ok(res.body.error.message.includes('Cannot GET'));
    });

    it('should handle 404 with custom handler', async () => {
      app.get('/exists', (req, res) => {
        res.json({ ok: true });
      });

      // Custom 404 handler
      app.use((req, res, next) => {
        const err = new Error(`Route ${req.path} not found`);
        err.statusCode = 404;
        next(err);
      });

      // Error handler
      app.use((err, req, res, next) => {
        res.status(err.statusCode || 500).json({
          error: { message: err.message, custom: true }
        });
      });

      server = app.listen(0);
      port = server.address().port;

      const res = await request({
        hostname: 'localhost',
        port,
        path: '/missing',
        method: 'GET'
      });

      server.close();

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.error.custom, true);
    });
  });

  describe('next(err) pattern', () => {
    it('should allow passing errors via next()', async () => {
      app.get('/next-error', (req, res, next) => {
        // Simulate async operation
        setTimeout(() => {
          next(new BadRequestError('Passed via next'));
        }, 10);
      });

      app.use((err, req, res, next) => {
        res.status(err.statusCode).json({
          error: { message: err.message }
        });
      });

      server = app.listen(0);
      port = server.address().port;

      const res = await request({
        hostname: 'localhost',
        port,
        path: '/next-error',
        method: 'GET'
      });

      server.close();

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error.message, 'Passed via next');
    });
  });

  describe('Error in error handler', () => {
    it('should handle errors thrown in error handlers', async () => {
      app.get('/double-error', (req, res) => {
        throw new Error('First error');
      });

      // Error handler that throws
      app.use((err, req, res, next) => {
        throw new Error('Second error in handler');
      });

      // Final handler should catch it
      app.use((err, req, res, next) => {
        res.status(500).json({
          error: { message: 'Caught: ' + err.message }
        });
      });

      server = app.listen(0);
      port = server.address().port;

      const res = await request({
        hostname: 'localhost',
        port,
        path: '/double-error',
        method: 'GET'
      });

      server.close();

      assert.strictEqual(res.statusCode, 500);
      assert.ok(res.body.error.message.includes('Second error'));
    });
  });
});
