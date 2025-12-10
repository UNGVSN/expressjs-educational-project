/**
 * Tests for Error Handling Middleware
 */

'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const {
  asyncHandler,
  notFoundHandler,
  errorLogger,
  developmentErrorHandler,
  productionErrorHandler,
  validationErrorHandler,
  rateLimitErrorHandler
} = require('../lib/middleware');

const { ValidationError, RateLimitError } = require('../lib/errors');

// Mock request/response objects
function createMocks() {
  const req = {
    method: 'GET',
    path: '/test',
    headers: { accept: 'application/json' },
    accepts: (type) => {
      const accept = req.headers.accept || '*/*';
      return accept.includes(type) || accept.includes('*/*');
    }
  };

  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      this.headers['Content-Type'] = 'application/json';
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
    set(key, value) {
      this.headers[key] = value;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
      return this;
    }
  };

  return { req, res };
}

describe('Error Handling Middleware', () => {
  describe('asyncHandler', () => {
    it('should pass async errors to next', async () => {
      const error = new Error('Async error');
      const handler = asyncHandler(async (req, res) => {
        throw error;
      });

      const { req, res } = createMocks();
      let caughtError = null;
      const next = (err) => { caughtError = err; };

      await handler(req, res, next);

      // Wait for promise to resolve
      await new Promise(resolve => setImmediate(resolve));

      assert.strictEqual(caughtError, error);
    });

    it('should handle successful async functions', async () => {
      const handler = asyncHandler(async (req, res) => {
        res.json({ success: true });
      });

      const { req, res } = createMocks();
      let nextCalled = false;
      const next = (err) => { nextCalled = !!err; };

      await handler(req, res, next);
      await new Promise(resolve => setImmediate(resolve));

      assert.deepStrictEqual(res.body, { success: true });
      assert.strictEqual(nextCalled, false);
    });

    it('should handle promise rejections', async () => {
      const handler = asyncHandler((req, res) => {
        return Promise.reject(new Error('Promise rejection'));
      });

      const { req, res } = createMocks();
      let caughtError = null;
      const next = (err) => { caughtError = err; };

      handler(req, res, next);
      await new Promise(resolve => setImmediate(resolve));

      assert.ok(caughtError);
      assert.strictEqual(caughtError.message, 'Promise rejection');
    });
  });

  describe('notFoundHandler', () => {
    it('should create 404 error', () => {
      const handler = notFoundHandler();
      const { req, res } = createMocks();
      let caughtError = null;
      const next = (err) => { caughtError = err; };

      handler(req, res, next);

      assert.ok(caughtError);
      assert.strictEqual(caughtError.statusCode, 404);
      assert.strictEqual(caughtError.status, 'fail');
      assert.ok(caughtError.message.includes('Cannot GET /test'));
    });

    it('should include method and path in message', () => {
      const handler = notFoundHandler();
      const { req, res } = createMocks();
      req.method = 'POST';
      req.path = '/api/users';

      let caughtError = null;
      const next = (err) => { caughtError = err; };

      handler(req, res, next);

      assert.strictEqual(caughtError.message, 'Cannot POST /api/users');
    });
  });

  describe('errorLogger', () => {
    it('should log errors and pass to next', () => {
      const logs = [];
      const mockLogger = {
        error: (msg) => logs.push({ level: 'error', msg }),
        warn: (msg) => logs.push({ level: 'warn', msg })
      };

      const handler = errorLogger({ logger: mockLogger });
      const { req, res } = createMocks();
      const error = new Error('Test error');
      error.statusCode = 500;

      let nextCalled = false;
      const next = (err) => { nextCalled = true; };

      handler(error, req, res, next);

      assert.ok(nextCalled);
      assert.ok(logs.length > 0);
      assert.strictEqual(logs[0].level, 'error');
      assert.ok(logs[0].msg.includes('Test error'));
    });

    it('should use warn for 4xx errors', () => {
      const logs = [];
      const mockLogger = {
        error: (msg) => logs.push({ level: 'error', msg }),
        warn: (msg) => logs.push({ level: 'warn', msg })
      };

      const handler = errorLogger({ logger: mockLogger });
      const { req, res } = createMocks();
      const error = new Error('Not found');
      error.statusCode = 404;

      handler(error, req, res, () => {});

      assert.strictEqual(logs[0].level, 'warn');
    });

    it('should include stack trace when configured', () => {
      const logs = [];
      const mockLogger = {
        error: (msg) => logs.push(msg),
        warn: (msg) => logs.push(msg)
      };

      const handler = errorLogger({ logger: mockLogger, includeStack: true });
      const { req, res } = createMocks();
      const error = new Error('Server error');
      error.statusCode = 500;

      handler(error, req, res, () => {});

      assert.ok(logs.some(log => log.includes('Error')));
    });
  });

  describe('developmentErrorHandler', () => {
    it('should include stack trace in response', () => {
      const handler = developmentErrorHandler();
      const { req, res } = createMocks();
      const error = new Error('Dev error');
      error.statusCode = 400;

      handler(error, req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.error);
      assert.strictEqual(res.body.error.message, 'Dev error');
      assert.ok(res.body.error.stack);
    });

    it('should default to 500 status code', () => {
      const handler = developmentErrorHandler();
      const { req, res } = createMocks();
      const error = new Error('Unknown error');

      handler(error, req, res, () => {});

      assert.strictEqual(res.statusCode, 500);
    });

    it('should include validation errors if present', () => {
      const handler = developmentErrorHandler();
      const { req, res } = createMocks();
      const error = new ValidationError('Validation failed', [
        { field: 'email', message: 'Invalid' }
      ]);

      handler(error, req, res, () => {});

      assert.ok(res.body.error.errors);
      assert.strictEqual(res.body.error.errors.length, 1);
    });
  });

  describe('productionErrorHandler', () => {
    it('should hide details for non-operational errors', () => {
      const handler = productionErrorHandler();
      const { req, res } = createMocks();
      const error = new Error('Database connection failed');
      // Not operational - programming error

      handler(error, req, res, () => {});

      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.body.error.message, 'Something went wrong');
      assert.ok(!res.body.error.stack);
    });

    it('should show message for operational errors', () => {
      const handler = productionErrorHandler();
      const { req, res } = createMocks();
      const error = new Error('User not found');
      error.statusCode = 404;
      error.isOperational = true;

      handler(error, req, res, () => {});

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.error.message, 'User not found');
    });
  });

  describe('validationErrorHandler', () => {
    it('should handle ValidationError', () => {
      const handler = validationErrorHandler();
      const { req, res } = createMocks();
      const error = new ValidationError('Invalid input', [
        { field: 'name', message: 'Required' },
        { field: 'email', message: 'Invalid format' }
      ]);

      let nextCalled = false;
      handler(error, req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 422);
      assert.deepStrictEqual(res.body.error.errors, error.errors);
    });

    it('should pass non-validation errors to next', () => {
      const handler = validationErrorHandler();
      const { req, res } = createMocks();
      const error = new Error('Some other error');
      error.statusCode = 500;

      let nextCalled = false;
      handler(error, req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, true);
    });

    it('should handle errors with statusCode 422', () => {
      const handler = validationErrorHandler();
      const { req, res } = createMocks();
      const error = new Error('Bad input');
      error.statusCode = 422;
      error.errors = [{ field: 'id', message: 'Invalid ID' }];

      handler(error, req, res, () => {});

      assert.strictEqual(res.statusCode, 422);
    });
  });

  describe('rateLimitErrorHandler', () => {
    it('should handle RateLimitError', () => {
      const handler = rateLimitErrorHandler();
      const { req, res } = createMocks();
      const error = new RateLimitError('Slow down!', 120);

      let nextCalled = false;
      handler(error, req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 429);
      assert.strictEqual(res.headers['Retry-After'], 120);
      assert.strictEqual(res.body.error.retryAfter, 120);
    });

    it('should pass non-rate-limit errors to next', () => {
      const handler = rateLimitErrorHandler();
      const { req, res } = createMocks();
      const error = new Error('Other error');

      let nextCalled = false;
      handler(error, req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, true);
    });

    it('should handle errors with statusCode 429', () => {
      const handler = rateLimitErrorHandler();
      const { req, res } = createMocks();
      const error = new Error('Rate limited');
      error.statusCode = 429;
      error.name = 'RateLimitError';

      handler(error, req, res, () => {});

      assert.strictEqual(res.statusCode, 429);
      assert.strictEqual(res.headers['Retry-After'], 60); // Default
    });
  });
});
