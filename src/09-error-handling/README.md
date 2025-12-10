# Step 09: Error Handling System

Learn how Express.js handles errors throughout the request lifecycle.

## What You'll Learn

1. **Error middleware signature** - The 4-argument pattern (err, req, res, next)
2. **Synchronous errors** - Automatic catching in route handlers
3. **Asynchronous errors** - Using next(err) pattern
4. **Custom error classes** - Creating meaningful error types
5. **Error responses** - JSON vs HTML error pages
6. **Production vs development** - Environment-specific error handling

## Core Concepts

### Error-Handling Middleware

Express recognizes error handlers by their **4 parameters**:

```javascript
// Regular middleware: 3 parameters
app.use((req, res, next) => {
  next();
});

// Error middleware: 4 parameters
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
```

### Error Flow

```
Request → Middleware → Route Handler
                          ↓
                      Error thrown
                          ↓
                      next(err)
                          ↓
              Skip regular middleware
                          ↓
              Find error middleware (4 args)
                          ↓
              Handle error → Response
```

### Catching Synchronous Errors

Express automatically catches errors thrown in synchronous code:

```javascript
app.get('/sync-error', (req, res) => {
  throw new Error('Sync error!'); // Automatically caught
});
```

### Catching Asynchronous Errors

Async errors must be passed to `next()`:

```javascript
// Callbacks - must call next(err)
app.get('/callback', (req, res, next) => {
  fs.readFile('/missing', (err, data) => {
    if (err) return next(err); // Pass to error handler
    res.send(data);
  });
});

// Promises - must call next(err) or use wrapper
app.get('/promise', (req, res, next) => {
  fetchData()
    .then(data => res.json(data))
    .catch(next); // Pass error to next
});

// Async/await - wrap in try/catch or use wrapper
app.get('/async', async (req, res, next) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (err) {
    next(err);
  }
});
```

### Async Handler Wrapper

Simplify async error handling:

```javascript
// Wrapper function
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage
app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.findAll(); // Errors auto-caught
  res.json(users);
}));
```

## Custom Error Classes

Create meaningful error types:

```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}

// Usage
app.get('/users/:id', async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new NotFoundError('User not found'));
  }
  res.json(user);
});
```

## Error Middleware Patterns

### Basic Error Handler

```javascript
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: {
      message,
      status: statusCode
    }
  });
});
```

### Development vs Production

```javascript
// Development - show full details
const developmentErrors = (err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    error: err.message,
    stack: err.stack,
    details: err
  });
};

// Production - hide sensitive info
const productionErrors = (err, req, res, next) => {
  // Operational errors (expected) - send message
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  // Programming errors - send generic message
  console.error('ERROR:', err);
  res.status(500).json({
    error: 'Something went wrong'
  });
};

// Choose based on environment
app.use(process.env.NODE_ENV === 'production'
  ? productionErrors
  : developmentErrors
);
```

### HTML vs JSON Responses

```javascript
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Check what the client accepts
  if (req.accepts('html')) {
    res.status(statusCode).render('error', {
      message: err.message,
      error: process.env.NODE_ENV === 'production' ? {} : err
    });
  } else {
    res.status(statusCode).json({
      error: err.message
    });
  }
});
```

## Multiple Error Handlers

Chain error handlers for different concerns:

```javascript
// Log errors
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${err.message}`);
  next(err); // Pass to next error handler
});

// Handle validation errors
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors
    });
  }
  next(err);
});

// Handle not found
app.use((err, req, res, next) => {
  if (err.statusCode === 404) {
    return res.status(404).json({
      error: err.message || 'Not found'
    });
  }
  next(err);
});

// Final catch-all
app.use((err, req, res, next) => {
  res.status(500).json({
    error: 'Internal server error'
  });
});
```

## 404 Handling

Handle routes that don't match:

```javascript
// After all routes
app.use((req, res, next) => {
  const err = new Error(`Cannot ${req.method} ${req.path}`);
  err.statusCode = 404;
  next(err);
});
```

## Running Examples

```bash
# Basic error handling
npm run example:basic

# Custom error classes
npm run example:custom

# Async error handling
npm run example:async

# Production error handling
npm run example:production
```

## Running Tests

```bash
npm test
```

## Key Takeaways

1. **Error middleware has 4 parameters**: (err, req, res, next)
2. **Sync errors are auto-caught** in route handlers
3. **Async errors need next(err)** or wrapper functions
4. **Custom error classes** provide meaningful error types
5. **Different environments** need different error handling
6. **Chain error handlers** for separation of concerns
7. **Always have a final catch-all** error handler

## Next Step

[Step 10: Body Parsers](../10-body-parsers/README.md) - Learn how Express parses request bodies.
