/**
 * Tests for Custom Error Classes
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalError,
  ServiceUnavailableError
} = require('../lib/errors');

describe('Custom Error Classes', () => {
  describe('AppError (base class)', () => {
    it('should create error with message and status code', () => {
      const error = new AppError('Something went wrong', 500);

      assert.strictEqual(error.message, 'Something went wrong');
      assert.strictEqual(error.statusCode, 500);
      assert.strictEqual(error.status, 'error');
      assert.strictEqual(error.isOperational, true);
    });

    it('should default to 500 status code', () => {
      const error = new AppError('Error');
      assert.strictEqual(error.statusCode, 500);
    });

    it('should set status to "fail" for 4xx errors', () => {
      const error = new AppError('Not found', 404);
      assert.strictEqual(error.status, 'fail');
    });

    it('should set status to "error" for 5xx errors', () => {
      const error = new AppError('Server error', 500);
      assert.strictEqual(error.status, 'error');
    });

    it('should capture stack trace', () => {
      const error = new AppError('Test');
      assert.ok(error.stack);
      // Stack trace should contain the error message and file reference
      assert.ok(error.stack.includes('Test') || error.stack.includes('errors.test.js'));
    });

    it('should serialize to JSON', () => {
      const error = new AppError('Test error', 400);
      const json = error.toJSON();

      assert.deepStrictEqual(json, {
        message: 'Test error',
        statusCode: 400,
        status: 'fail'
      });
    });

    it('should be instanceof Error', () => {
      const error = new AppError('Test');
      assert.ok(error instanceof Error);
      assert.ok(error instanceof AppError);
    });
  });

  describe('BadRequestError (400)', () => {
    it('should create 400 error with default message', () => {
      const error = new BadRequestError();

      assert.strictEqual(error.message, 'Bad Request');
      assert.strictEqual(error.statusCode, 400);
      assert.strictEqual(error.status, 'fail');
      assert.strictEqual(error.name, 'BadRequestError');
    });

    it('should accept custom message', () => {
      const error = new BadRequestError('Invalid input');
      assert.strictEqual(error.message, 'Invalid input');
    });
  });

  describe('UnauthorizedError (401)', () => {
    it('should create 401 error', () => {
      const error = new UnauthorizedError();

      assert.strictEqual(error.message, 'Unauthorized');
      assert.strictEqual(error.statusCode, 401);
      assert.strictEqual(error.name, 'UnauthorizedError');
    });

    it('should accept custom message', () => {
      const error = new UnauthorizedError('Invalid token');
      assert.strictEqual(error.message, 'Invalid token');
    });
  });

  describe('ForbiddenError (403)', () => {
    it('should create 403 error', () => {
      const error = new ForbiddenError();

      assert.strictEqual(error.message, 'Forbidden');
      assert.strictEqual(error.statusCode, 403);
      assert.strictEqual(error.name, 'ForbiddenError');
    });

    it('should accept custom message', () => {
      const error = new ForbiddenError('Access denied');
      assert.strictEqual(error.message, 'Access denied');
    });
  });

  describe('NotFoundError (404)', () => {
    it('should create 404 error', () => {
      const error = new NotFoundError();

      assert.strictEqual(error.message, 'Not Found');
      assert.strictEqual(error.statusCode, 404);
      assert.strictEqual(error.name, 'NotFoundError');
    });

    it('should accept custom message', () => {
      const error = new NotFoundError('User not found');
      assert.strictEqual(error.message, 'User not found');
    });
  });

  describe('ConflictError (409)', () => {
    it('should create 409 error', () => {
      const error = new ConflictError();

      assert.strictEqual(error.message, 'Conflict');
      assert.strictEqual(error.statusCode, 409);
      assert.strictEqual(error.name, 'ConflictError');
    });

    it('should accept custom message', () => {
      const error = new ConflictError('Email already exists');
      assert.strictEqual(error.message, 'Email already exists');
    });
  });

  describe('ValidationError (422)', () => {
    it('should create 422 error with validation details', () => {
      const errors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'age', message: 'Must be a number' }
      ];
      const error = new ValidationError('Validation failed', errors);

      assert.strictEqual(error.message, 'Validation failed');
      assert.strictEqual(error.statusCode, 422);
      assert.strictEqual(error.name, 'ValidationError');
      assert.deepStrictEqual(error.errors, errors);
    });

    it('should default to empty errors array', () => {
      const error = new ValidationError();
      assert.deepStrictEqual(error.errors, []);
    });

    it('should serialize errors to JSON', () => {
      const errors = [{ field: 'name', message: 'Required' }];
      const error = new ValidationError('Invalid', errors);
      const json = error.toJSON();

      assert.deepStrictEqual(json.errors, errors);
    });
  });

  describe('RateLimitError (429)', () => {
    it('should create 429 error with retry info', () => {
      const error = new RateLimitError('Too many requests', 120);

      assert.strictEqual(error.message, 'Too many requests');
      assert.strictEqual(error.statusCode, 429);
      assert.strictEqual(error.name, 'RateLimitError');
      assert.strictEqual(error.retryAfter, 120);
    });

    it('should default retryAfter to 60 seconds', () => {
      const error = new RateLimitError();
      assert.strictEqual(error.retryAfter, 60);
    });
  });

  describe('InternalError (500)', () => {
    it('should create 500 error', () => {
      const error = new InternalError();

      assert.strictEqual(error.message, 'Internal Server Error');
      assert.strictEqual(error.statusCode, 500);
      assert.strictEqual(error.status, 'error');
      assert.strictEqual(error.name, 'InternalError');
    });
  });

  describe('ServiceUnavailableError (503)', () => {
    it('should create 503 error', () => {
      const error = new ServiceUnavailableError();

      assert.strictEqual(error.message, 'Service Unavailable');
      assert.strictEqual(error.statusCode, 503);
      assert.strictEqual(error.name, 'ServiceUnavailableError');
    });

    it('should accept custom message', () => {
      const error = new ServiceUnavailableError('Database is down');
      assert.strictEqual(error.message, 'Database is down');
    });
  });

  describe('Error inheritance', () => {
    it('all errors should be instances of AppError', () => {
      const errors = [
        new BadRequestError(),
        new UnauthorizedError(),
        new ForbiddenError(),
        new NotFoundError(),
        new ConflictError(),
        new ValidationError(),
        new RateLimitError(),
        new InternalError(),
        new ServiceUnavailableError()
      ];

      for (const err of errors) {
        assert.ok(err instanceof AppError, `${err.name} should extend AppError`);
        assert.ok(err instanceof Error, `${err.name} should extend Error`);
        assert.strictEqual(err.isOperational, true);
      }
    });
  });
});
