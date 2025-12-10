/**
 * Custom Error Classes
 *
 * Provides meaningful error types for different situations.
 */

'use strict';

/**
 * Base application error
 * All custom errors extend from this
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Distinguishes from programming errors

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      status: this.status
    };
  }
}

/**
 * 400 Bad Request - Invalid input
 */
class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

/**
 * 401 Unauthorized - Authentication required
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 403 Forbidden - Access denied
 */
class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 Not Found - Resource doesn't exist
 */
class NotFoundError extends AppError {
  constructor(message = 'Not Found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * 409 Conflict - Resource conflict
 */
class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * 422 Unprocessable Entity - Validation failed
 */
class ValidationError extends AppError {
  constructor(message = 'Validation Error', errors = []) {
    super(message, 422);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors
    };
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
class RateLimitError extends AppError {
  constructor(message = 'Too Many Requests', retryAfter = 60) {
    super(message, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * 500 Internal Server Error
 */
class InternalError extends AppError {
  constructor(message = 'Internal Server Error') {
    super(message, 500);
    this.name = 'InternalError';
  }
}

/**
 * 503 Service Unavailable
 */
class ServiceUnavailableError extends AppError {
  constructor(message = 'Service Unavailable') {
    super(message, 503);
    this.name = 'ServiceUnavailableError';
  }
}

module.exports = {
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
};
