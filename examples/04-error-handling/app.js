/**
 * Example 04: Error Handling
 *
 * Demonstrates comprehensive error handling patterns.
 */

const express = require('express')
const app = express()

app.use(express.json())

// ============================================
// Custom Error Classes
// ============================================

class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404)
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400)
    this.errors = errors
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401)
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403)
  }
}

// ============================================
// Async Handler Wrapper
// ============================================

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// ============================================
// Sample Data
// ============================================

const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
]

// ============================================
// Routes Demonstrating Error Types
// ============================================

// Synchronous error
app.get('/sync-error', (req, res) => {
  throw new Error('Synchronous error')
})

// Async error (wrong way - won't be caught)
app.get('/async-error-wrong', async (req, res) => {
  // This error won't be caught by Express default handler
  // The server will crash without asyncHandler
  throw new Error('Async error')
})

// Async error (correct way with asyncHandler)
app.get('/async-error', asyncHandler(async (req, res) => {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100))
  throw new Error('Async error handled correctly')
}))

// Custom errors
app.get('/users/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    throw new ValidationError('Invalid user ID', [
      { field: 'id', message: 'Must be a number' }
    ])
  }

  const user = users.find(u => u.id === id)

  if (!user) {
    throw new NotFoundError('User')
  }

  res.json(user)
}))

// Validation error
app.post('/users', asyncHandler(async (req, res) => {
  const { name, email } = req.body
  const errors = []

  if (!name) {
    errors.push({ field: 'name', message: 'Name is required' })
  }
  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' })
  }
  if (email && !email.includes('@')) {
    errors.push({ field: 'email', message: 'Invalid email format' })
  }

  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors)
  }

  const newUser = { id: users.length + 1, name, email }
  users.push(newUser)
  res.status(201).json(newUser)
}))

// Authorization errors
app.get('/admin', (req, res) => {
  const token = req.headers.authorization

  if (!token) {
    throw new UnauthorizedError('Token required')
  }

  if (token !== 'Bearer admin-token') {
    throw new ForbiddenError('Admin access required')
  }

  res.json({ message: 'Admin area' })
})

// Simulated database error
app.get('/db-error', asyncHandler(async (req, res) => {
  // Simulate database connection error
  const dbError = new Error('ECONNREFUSED')
  dbError.code = 'ECONNREFUSED'
  throw dbError
}))

// Simulated timeout
app.get('/timeout', asyncHandler(async (req, res) => {
  await new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), 100)
  })
}))

// ============================================
// 404 Handler
// ============================================

app.use((req, res, next) => {
  next(new NotFoundError('Route'))
})

// ============================================
// Error Handler
// ============================================

// Development error handler (shows stack trace)
const developmentErrorHandler = (err, req, res, next) => {
  console.error('Error:', err)

  const response = {
    status: err.status || 'error',
    message: err.message,
    errors: err.errors,
    stack: err.stack
  }

  res.status(err.statusCode || 500).json(response)
}

// Production error handler (hides implementation details)
const productionErrorHandler = (err, req, res, next) => {
  // Log error for monitoring
  console.error('Error:', err.message)

  // Operational errors: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errors: err.errors
    })
  }

  // Programming or unknown errors: don't leak details
  // Handle specific error types
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      status: 'error',
      message: 'Service temporarily unavailable'
    })
  }

  if (err.name === 'SyntaxError' && err.status === 400) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid JSON'
    })
  }

  // Generic error response
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong'
  })
}

// Choose error handler based on environment
const isProduction = process.env.NODE_ENV === 'production'
app.use(isProduction ? productionErrorHandler : developmentErrorHandler)

// ============================================
// Uncaught Exception Handler
// ============================================

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason)
  // Optionally exit: process.exit(1)
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log('\nTest routes:')
  console.log('  GET  /sync-error        - Synchronous error')
  console.log('  GET  /async-error       - Async error (handled)')
  console.log('  GET  /users/1           - Valid user')
  console.log('  GET  /users/999         - Not found error')
  console.log('  GET  /users/abc         - Validation error')
  console.log('  POST /users             - Create user (validation)')
  console.log('  GET  /admin             - Auth errors')
  console.log('  GET  /db-error          - Database error')
  console.log('  GET  /not-found         - 404 error')
})
