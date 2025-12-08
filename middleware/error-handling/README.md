# Error-Handling Middleware

Error-handling middleware is defined with four arguments: `(err, req, res, next)`. Express recognizes this signature and routes errors to these handlers.

## Overview

```javascript
// Error-handling middleware must have 4 parameters
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})
```

## Basic Error Handling

### Catching Errors

```javascript
const express = require('express')
const app = express()

// Route that throws an error
app.get('/error', (req, res) => {
  throw new Error('Something went wrong!')
})

// Error handler catches it
app.use((err, req, res, next) => {
  console.error(err.message)
  res.status(500).json({ error: err.message })
})
```

### Passing Errors with next()

```javascript
app.get('/users/:id', (req, res, next) => {
  const user = users.find(u => u.id === req.params.id)

  if (!user) {
    // Create error and pass to error handler
    const error = new Error('User not found')
    error.status = 404
    return next(error)
  }

  res.json(user)
})

// Error handler receives the error
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message
  })
})
```

## Multiple Error Handlers

### Chaining Error Handlers

```javascript
// Log all errors
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${err.stack}`)
  next(err)  // Pass to next error handler
})

// Handle validation errors
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors
    })
  }
  next(err)  // Pass to next error handler
})

// Handle authentication errors
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Invalid token'
    })
  }
  next(err)
})

// Default error handler (catch-all)
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  })
})
```

## Custom Error Classes

### Creating Custom Errors

```javascript
// errors/AppError.js
class AppError extends Error {
  constructor(message, status = 500, code = null) {
    super(message)
    this.name = this.constructor.name
    this.status = status
    this.code = code
    Error.captureStackTrace(this, this.constructor)
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

class ValidationError extends AppError {
  constructor(errors) {
    super('Validation failed', 400, 'VALIDATION_ERROR')
    this.errors = errors
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError
}
```

### Using Custom Errors

```javascript
const { NotFoundError, ValidationError } = require('./errors/AppError')

app.get('/users/:id', (req, res, next) => {
  const user = users.find(u => u.id === req.params.id)
  if (!user) {
    return next(new NotFoundError('User'))
  }
  res.json(user)
})

app.post('/users', (req, res, next) => {
  const errors = validateUser(req.body)
  if (errors.length > 0) {
    return next(new ValidationError(errors))
  }
  // Create user...
})
```

## Async Error Handling

### The Problem

```javascript
// This won't catch async errors!
app.get('/users', async (req, res) => {
  const users = await User.findAll()  // If this throws...
  res.json(users)
})
// Error is unhandled promise rejection
```

### Solution 1: try/catch

```javascript
app.get('/users', async (req, res, next) => {
  try {
    const users = await User.findAll()
    res.json(users)
  } catch (err) {
    next(err)
  }
})
```

### Solution 2: Async Wrapper

```javascript
// Wrapper function
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

// Usage
app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.findAll()
  res.json(users)
}))
// Errors automatically passed to error handler
```

### Solution 3: express-async-errors

```javascript
// Install: npm install express-async-errors
require('express-async-errors')

// Now async errors are caught automatically
app.get('/users', async (req, res) => {
  const users = await User.findAll()
  res.json(users)
})
// No wrapper needed!
```

## Error Handler Patterns

### Development vs Production

```javascript
// Development: Show full error details
function developmentErrorHandler(err, req, res, next) {
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      stack: err.stack,
      code: err.code
    }
  })
}

// Production: Hide sensitive details
function productionErrorHandler(err, req, res, next) {
  // Log error internally
  console.error(err)

  // Send safe response
  res.status(err.status || 500).json({
    error: {
      message: err.status < 500 ? err.message : 'Internal Server Error',
      code: err.code
    }
  })
}

// Use appropriate handler
if (process.env.NODE_ENV === 'production') {
  app.use(productionErrorHandler)
} else {
  app.use(developmentErrorHandler)
}
```

### API Error Response Format

```javascript
app.use((err, req, res, next) => {
  const status = err.status || 500
  const response = {
    success: false,
    error: {
      message: err.message,
      code: err.code || 'INTERNAL_ERROR',
      ...(err.errors && { details: err.errors })
    },
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  }

  res.status(status).json(response)
})
```

### HTML Error Pages

```javascript
// For web applications
app.use((err, req, res, next) => {
  const status = err.status || 500

  // API requests get JSON
  if (req.accepts('json')) {
    return res.status(status).json({ error: err.message })
  }

  // Web requests get HTML
  res.status(status).render('error', {
    message: err.message,
    status,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : null
  })
})
```

## 404 Handler

```javascript
// 404 handler (after all routes, before error handlers)
app.use((req, res, next) => {
  const error = new Error('Not Found')
  error.status = 404
  next(error)
})

// Or simpler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' })
})
```

## Complete Error Handling Setup

```javascript
const express = require('express')
const app = express()

// Routes
app.use('/api', apiRoutes)

// 404 Handler
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`)
  error.status = 404
  next(error)
})

// Error Logger
app.use((err, req, res, next) => {
  console.error({
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack
  })
  next(err)
})

// Error Response
app.use((err, req, res, next) => {
  const status = err.status || 500
  const isProd = process.env.NODE_ENV === 'production'

  res.status(status).json({
    success: false,
    error: {
      message: isProd && status === 500 ? 'Internal Server Error' : err.message,
      code: err.code || 'INTERNAL_ERROR',
      ...(err.errors && { details: err.errors }),
      ...(!isProd && { stack: err.stack })
    }
  })
})
```

## Database Error Handling

```javascript
app.use((err, req, res, next) => {
  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate entry',
      field: Object.keys(err.keyValue)[0]
    })
  }

  // MongoDB validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message)
    return res.status(400).json({ error: 'Validation failed', details: errors })
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid ${err.path}: ${err.value}` })
  }

  next(err)
})
```

## External Service Error Handling

```javascript
const axios = require('axios')

app.get('/external', asyncHandler(async (req, res) => {
  try {
    const response = await axios.get('https://api.external.com/data')
    res.json(response.data)
  } catch (err) {
    // Transform external service error
    const error = new Error('External service unavailable')
    error.status = 503
    error.code = 'SERVICE_UNAVAILABLE'
    throw error
  }
}))
```

## Related

- [middleware-fundamentals](../middleware-fundamentals/) - Core concepts
- [application-level](../application-level/) - App middleware
- [router-level](../router-level/) - Router middleware

## Next Steps

1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md)
2. Test knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Learn [built-in](../built-in/) middleware

---

*Proper error handling is crucial for robust Express applications.*
