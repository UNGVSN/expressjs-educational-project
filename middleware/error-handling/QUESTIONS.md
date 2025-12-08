# Error-Handling Middleware Questions

**Q1: How does Express identify error-handling middleware?**

<details>
<summary>Answer</summary>

By the number of function parameters (must be exactly 4):

```javascript
// Regular middleware (3 params)
function middleware(req, res, next) { }

// Error handler (4 params)
function errorHandler(err, req, res, next) { }

// Express checks: fn.length === 4
```

Important: Even if you don't use `next`, you must include it:
```javascript
// WRONG - won't be recognized as error handler
app.use((err, req, res) => { })  // length = 3

// CORRECT
app.use((err, req, res, next) => { })  // length = 4
```
</details>

---

**Q2: How do you pass errors to error-handling middleware?**

<details>
<summary>Answer</summary>

Call `next()` with an error argument:

```javascript
app.get('/users/:id', (req, res, next) => {
  const user = findUser(req.params.id)

  if (!user) {
    const error = new Error('User not found')
    error.status = 404
    return next(error)  // Pass to error handler
  }

  res.json(user)
})

// Error handler receives it
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message })
})
```
</details>

---

**Q3: Why doesn't throwing in async functions work in Express 4?**

<details>
<summary>Answer</summary>

Express 4 doesn't catch promise rejections:

```javascript
// This error is NOT caught by Express 4
app.get('/async', async (req, res) => {
  throw new Error('Async error')  // Unhandled rejection!
})

// Solutions:
// 1. try/catch
app.get('/async', async (req, res, next) => {
  try {
    throw new Error('Async error')
  } catch (err) {
    next(err)
  }
})

// 2. Async wrapper
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

app.get('/async', asyncHandler(async (req, res) => {
  throw new Error('Async error')  // Now caught!
}))
```

Express 5 catches async errors automatically.
</details>

---

**Q4: How do you chain multiple error handlers?**

<details>
<summary>Answer</summary>

Call `next(err)` to pass to next error handler:

```javascript
// 1. Log errors
app.use((err, req, res, next) => {
  console.error(err)
  next(err)  // Pass to next handler
})

// 2. Handle specific errors
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  next(err)  // Pass others
})

// 3. Catch-all
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Server error' })
})
```
</details>

---

**Q5: How do you handle 404 (Not Found) errors?**

<details>
<summary>Answer</summary>

Add middleware after all routes but before error handlers:

```javascript
// All routes
app.use('/api', apiRoutes)

// 404 handler (no matching route found)
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`)
  error.status = 404
  next(error)
})

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message })
})
```
</details>

---

**Q6: How do you create custom error classes?**

<details>
<summary>Answer</summary>

```javascript
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

// Usage
app.get('/users/:id', (req, res, next) => {
  const user = findUser(req.params.id)
  if (!user) return next(new NotFoundError('User'))
  res.json(user)
})
```
</details>

---

**Q7: How do you show different error details in development vs production?**

<details>
<summary>Answer</summary>

```javascript
app.use((err, req, res, next) => {
  const status = err.status || 500
  const isProd = process.env.NODE_ENV === 'production'

  const response = {
    error: {
      message: isProd && status === 500
        ? 'Internal Server Error'
        : err.message,
      code: err.code
    }
  }

  // Include stack trace only in development
  if (!isProd) {
    response.error.stack = err.stack
  }

  res.status(status).json(response)
})
```
</details>

---

**Q8: How do you handle database-specific errors?**

<details>
<summary>Answer</summary>

```javascript
app.use((err, req, res, next) => {
  // MongoDB duplicate key
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate entry',
      field: Object.keys(err.keyValue)[0]
    })
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: Object.values(err.errors).map(e => e.message)
    })
  }

  // Invalid ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: `Invalid ${err.path}`
    })
  }

  next(err)
})
```
</details>

---

**Q9: Where should error handlers be placed?**

<details>
<summary>Answer</summary>

Always LAST in the middleware stack:

```javascript
// 1. Body parsers
app.use(express.json())

// 2. Routes
app.use('/api', routes)

// 3. 404 handler (after routes)
app.use((req, res, next) => {
  next(new NotFoundError())
})

// 4. Error handlers (always last!)
app.use(logErrors)
app.use(handleValidationErrors)
app.use(handleAllErrors)
```

If error handlers are before routes, routes won't be reachable after an error.
</details>

---

**Q10: What's the difference between operational and programming errors?**

<details>
<summary>Answer</summary>

| Type | Examples | Handling |
|------|----------|----------|
| Operational | Invalid input, network failure, DB error | Return error to client |
| Programming | Null reference, type error, syntax error | Log and restart |

```javascript
class OperationalError extends Error {
  constructor(message, status) {
    super(message)
    this.isOperational = true
    this.status = status
  }
}

app.use((err, req, res, next) => {
  if (err.isOperational) {
    // Safe to show to user
    res.status(err.status).json({ error: err.message })
  } else {
    // Bug - log and generic response
    console.error('BUG:', err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})
```
</details>

---

## Self-Assessment

- [ ] I understand the 4-parameter signature requirement
- [ ] I can pass errors using next(error)
- [ ] I can handle async errors in Express 4
- [ ] I can chain multiple error handlers
- [ ] I can handle 404 errors
- [ ] I can create custom error classes
- [ ] I understand dev vs production error responses
- [ ] I know where to place error handlers

---

*Proper error handling is essential for production-ready Express applications.*
