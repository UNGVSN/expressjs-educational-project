# Error Handling

Advanced error handling patterns for Express applications.

## Overview

Proper error handling is crucial for robust applications. This covers patterns beyond basic error middleware.

## Error Hierarchy

```javascript
// errors/AppError.js
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true  // Known error
    Error.captureStackTrace(this, this.constructor)
  }
}

class ValidationError extends AppError {
  constructor(errors) {
    super('Validation failed', 400, 'VALIDATION_ERROR')
    this.errors = errors
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Not authenticated') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 403, 'FORBIDDEN')
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT')
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError
}
```

## Async Error Wrapper

```javascript
// middleware/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = asyncHandler

// Usage
const asyncHandler = require('./middleware/asyncHandler')

app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find()
  res.json(users)
}))
```

## Express-Async-Errors

```bash
npm install express-async-errors
```

```javascript
require('express-async-errors')

// Now async errors are automatically caught
app.get('/users', async (req, res) => {
  const users = await User.find()  // Errors auto-forwarded
  res.json(users)
})
```

## Centralized Error Handler

```javascript
// middleware/errorHandler.js
const logger = require('../utils/logger')

const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?.id
  })

  // Handle known operational errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: 'error',
      code: err.code,
      message: err.message,
      ...(err.errors && { errors: err.errors })
    })
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message)
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors
    })
  }

  // Handle Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(409).json({
      status: 'error',
      code: 'DUPLICATE_ERROR',
      message: `${field} already exists`
    })
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      code: 'INVALID_TOKEN',
      message: 'Invalid token'
    })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      code: 'TOKEN_EXPIRED',
      message: 'Token expired'
    })
  }

  // Unknown error - don't leak details in production
  const isProd = process.env.NODE_ENV === 'production'
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: isProd ? 'Something went wrong' : err.message,
    ...(!isProd && { stack: err.stack })
  })
}

module.exports = errorHandler
```

## 404 Handler

```javascript
// middleware/notFound.js
const { NotFoundError } = require('../errors/AppError')

const notFound = (req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl}`))
}

module.exports = notFound

// app.js
app.use('/api', routes)
app.use(notFound)       // After all routes
app.use(errorHandler)   // After notFound
```

## Error Logging

```javascript
// utils/logger.js
const winston = require('winston')

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }))
}

module.exports = logger
```

## Process-Level Errors

```javascript
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise })
  // Don't crash - but log for investigation
})

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err })
  // Graceful shutdown
  server.close(() => {
    process.exit(1)
  })

  // Force shutdown after timeout
  setTimeout(() => {
    process.exit(1)
  }, 10000)
})
```

## Graceful Shutdown

```javascript
const server = app.listen(3000)

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown`)

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed')

    // Close database connections
    await mongoose.connection.close()
    logger.info('Database connection closed')

    // Close Redis connection
    await redisClient.quit()
    logger.info('Redis connection closed')

    logger.info('Graceful shutdown completed')
    process.exit(0)
  })

  // Force shutdown if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Graceful shutdown timeout - forcing shutdown')
    process.exit(1)
  }, 30000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
```

## Error Response Format

```javascript
// Success response
{
  "status": "success",
  "data": { ... }
}

// Error response
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

## Route Error Handling

```javascript
const { NotFoundError, ValidationError } = require('../errors/AppError')
const asyncHandler = require('../middleware/asyncHandler')

router.get('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) {
    throw new NotFoundError('User')
  }
  res.json(user)
}))

router.post('/', asyncHandler(async (req, res) => {
  const { error, value } = userSchema.validate(req.body)
  if (error) {
    throw new ValidationError(error.details)
  }

  const user = await User.create(value)
  res.status(201).json(user)
}))
```

## Complete Setup

```javascript
// app.js
require('express-async-errors')
const express = require('express')
const helmet = require('helmet')
const logger = require('./utils/logger')
const routes = require('./routes')
const notFound = require('./middleware/notFound')
const errorHandler = require('./middleware/errorHandler')

const app = express()

app.use(helmet())
app.use(express.json())
app.use('/api', routes)
app.use(notFound)
app.use(errorHandler)

const server = app.listen(3000, () => {
  logger.info('Server started on port 3000')
})

// Graceful shutdown handlers
// ... (as shown above)

module.exports = app
```

## Related

- [debugging](../debugging/) - Error debugging
- [production](../production/) - Production error handling

---

*Robust error handling is essential for production Express applications.*
