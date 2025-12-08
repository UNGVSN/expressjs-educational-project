# Example 03: Middleware Chain

Comprehensive demonstration of Express.js middleware patterns.

## What You'll Learn

- Application-level middleware
- Router-level middleware
- Middleware execution order
- Custom middleware factories
- Error-handling middleware
- Conditional middleware

## Running the Example

```bash
npm install
npm start
```

## Testing the Routes

### Public Routes

```bash
# Home
curl http://localhost:3000/

# Middleware chain visualization
curl http://localhost:3000/chain

# API status
curl http://localhost:3000/api/status
```

### Protected Routes

```bash
# Profile (user token)
curl http://localhost:3000/profile \
  -H "Authorization: Bearer valid-token"

# Create post (with validation)
curl -X POST http://localhost:3000/posts \
  -H "Authorization: Bearer valid-token" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Post","content":"Hello World"}'

# Missing token
curl http://localhost:3000/profile
# Returns: {"error":"No token provided"}

# Invalid token
curl http://localhost:3000/profile \
  -H "Authorization: Bearer wrong-token"
# Returns: {"error":"Invalid token"}
```

### Admin Routes

```bash
# Delete user (admin only)
curl -X DELETE http://localhost:3000/users/123 \
  -H "Authorization: Bearer admin-token"

# Forbidden (user token)
curl -X DELETE http://localhost:3000/users/123 \
  -H "Authorization: Bearer valid-token"
# Returns: {"error":"Insufficient permissions"}
```

## Key Concepts

### Middleware Execution Order

```
Request → Middleware A → Middleware B → Route Handler
                                              ↓
Response ← Middleware A ← Middleware B ← Response
```

The `/chain` endpoint demonstrates this:
```
Middleware A - before
  Middleware B - before
    Middleware C - before
      Route handler
    Middleware C - after
  Middleware B - after
Middleware A - after
```

### Middleware Factory Pattern

```javascript
// Factory that returns middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}

// Usage
app.delete('/admin', authenticate, authorize('admin'), handler)
```

### Multiple Middleware

```javascript
// Array of middleware
app.post('/posts',
  authenticate,
  validateBody(['title', 'content']),
  (req, res) => { /* handler */ }
)
```

### Error Handling

```javascript
// Error-handling middleware (4 parameters)
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message
  })
})
```

## Middleware Order

```javascript
// 1. Logger (all requests)
app.use(logger)

// 2. Body parsers
app.use(express.json())

// 3. Static files
app.use(express.static('public'))

// 4. Route-specific middleware
app.use('/api', apiMiddleware)

// 5. Routes
app.use('/api', apiRouter)

// 6. 404 handler
app.use(notFoundHandler)

// 7. Error handler (must be last)
app.use(errorHandler)
```

## Exercises

1. Add request ID middleware that assigns unique IDs
2. Create a rate limiter middleware
3. Implement logging to file instead of console
4. Add request/response body logging

## Next Steps

→ [04-error-handling](../04-error-handling/) - Master error handling patterns
