# Error-Handling Middleware Design Analysis

## Why Four Parameters?

### Signature Detection

```javascript
// Express checks function length to identify error handlers
function isErrorHandler(fn) {
  return fn.length === 4
}

// Regular middleware
function middleware(req, res, next) { }  // length = 3

// Error handler
function errorHandler(err, req, res, next) { }  // length = 4
```

### Implications

```javascript
// This WON'T work as error handler (only 3 params visible)
app.use((err, req, res) => {  // No next = length 3
  res.status(500).json({ error: err.message })
})

// MUST include next even if unused
app.use((err, req, res, next) => {  // length 4
  res.status(500).json({ error: err.message })
})
```

## Error Propagation Flow

### How Errors Flow

```javascript
// Normal flow
Request → Middleware1 → Middleware2 → Route → Response

// Error flow
Request → Middleware1 → ERROR! → ErrorHandler1 → ErrorHandler2 → Response
                        ↓
                  Skips regular middleware
```

### Implementation

```javascript
// Simplified Express error routing
function dispatch(req, res, done) {
  let index = 0

  function next(err) {
    const layer = stack[index++]
    if (!layer) return done(err)

    if (err) {
      // Error mode: skip to error handlers
      if (layer.handle.length === 4) {
        layer.handle(err, req, res, next)
      } else {
        next(err)  // Skip non-error handlers
      }
    } else {
      // Normal mode: skip error handlers
      if (layer.handle.length < 4) {
        layer.handle(req, res, next)
      } else {
        next()  // Skip error handlers
      }
    }
  }

  next()
}
```

## Throwing vs next(err)

### Synchronous Errors

```javascript
// Throwing works in sync code
app.get('/sync', (req, res) => {
  throw new Error('Sync error')  // Caught by Express
})

// Equivalent to
app.get('/sync', (req, res, next) => {
  try {
    throw new Error('Sync error')
  } catch (err) {
    next(err)
  }
})
```

### Asynchronous Errors

```javascript
// Throwing in async code is NOT caught
app.get('/async', async (req, res) => {
  throw new Error('Async error')  // Unhandled rejection!
})

// Must use next(err) or try/catch
app.get('/async', async (req, res, next) => {
  try {
    throw new Error('Async error')
  } catch (err) {
    next(err)  // Now it's caught
  }
})
```

### Express 5 Difference

```javascript
// Express 5 catches async errors automatically
// Express 4 requires manual handling

// Express 5 behavior
app.get('/async', async (req, res) => {
  throw new Error('Async error')
  // Automatically caught and passed to error handler
})
```

## Error Handler Chain

### Chaining Logic

```javascript
// Error handlers can pass errors forward
app.use((err, req, res, next) => {
  // Handle specific error
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  // Pass other errors forward
  next(err)
})

app.use((err, req, res, next) => {
  // Catch-all for remaining errors
  res.status(500).json({ error: 'Server error' })
})
```

### Why Chain?

```javascript
// Separation of concerns
// 1. Logging
app.use((err, req, res, next) => {
  logger.error({ err, req })
  next(err)
})

// 2. Transform errors
app.use((err, req, res, next) => {
  if (err.code === 'ECONNREFUSED') {
    err.status = 503
    err.message = 'Service unavailable'
  }
  next(err)
})

// 3. Send response
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message })
})
```

## Error Class Design

### Standard Error Properties

```javascript
class AppError extends Error {
  constructor(message, status, code) {
    super(message)

    // Standard properties
    this.name = this.constructor.name  // 'AppError'
    this.status = status               // HTTP status code
    this.code = code                   // App error code
    this.timestamp = new Date()

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code
    }
  }
}
```

### Operational vs Programming Errors

```javascript
// Operational: Expected errors (user input, network, etc.)
class OperationalError extends AppError {
  constructor(message, status, code) {
    super(message, status, code)
    this.isOperational = true
  }
}

// Programming: Bugs (null reference, type errors)
// These should crash in development, be logged in production

app.use((err, req, res, next) => {
  if (err.isOperational) {
    // Safe to show to user
    res.status(err.status).json({ error: err.message })
  } else {
    // Bug - log and send generic message
    console.error('PROGRAMMING ERROR:', err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})
```

## Performance Considerations

### Error Creation Cost

```javascript
// Creating Error is expensive (captures stack trace)
// Don't create errors unnecessarily

// BAD: Creates error for every request
app.use((req, res, next) => {
  req.validationError = new ValidationError()  // Always created
  next()
})

// GOOD: Create only when needed
app.use((req, res, next) => {
  if (!isValid(req.body)) {
    return next(new ValidationError())
  }
  next()
})
```

### Error Handler Position

```javascript
// Error handlers should be last
// Don't add regular middleware after error handlers

app.use('/api', apiRoutes)
app.use(errorHandler)       // Last

// NOT this:
app.use(errorHandler)
app.use('/api', apiRoutes)  // Won't be reached after error!
```

## Uncaught Exceptions

### Process-Level Handling

```javascript
// Catch uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  // Clean up and exit
  process.exit(1)
})

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason)
  // In Node.js 15+, this causes exit by default
})
```

### Graceful Shutdown

```javascript
process.on('uncaughtException', (err) => {
  console.error('Fatal error:', err)

  // Stop accepting new connections
  server.close(() => {
    // Close database connections
    db.close()
    // Exit with failure
    process.exit(1)
  })

  // Force exit if graceful shutdown fails
  setTimeout(() => {
    process.exit(1)
  }, 10000)
})
```

## Testing Error Handlers

```javascript
// Test error handlers directly
describe('Error Handler', () => {
  it('should return 404 for NotFoundError', () => {
    const err = new NotFoundError('User')
    const req = {}
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    const next = jest.fn()

    errorHandler(err, req, res, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({
      error: 'User not found'
    })
  })
})
```

## Key Takeaways

1. **Four Parameters** - Required for Express to recognize error handler
2. **Skip Behavior** - Errors skip regular middleware, go to error handlers
3. **Async Handling** - Must explicitly catch async errors (Express 4)
4. **Chain Pattern** - Multiple handlers for logging, transformation, response
5. **Error Classes** - Structured errors improve handling
6. **Operational vs Programming** - Handle differently

---

*Understanding error handling internals helps build robust applications.*
