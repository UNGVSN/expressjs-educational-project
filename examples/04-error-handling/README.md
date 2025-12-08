# Example 04: Error Handling

Comprehensive demonstration of Express.js error handling patterns.

## What You'll Learn

- Custom error classes
- Async error handling
- Centralized error handler
- Development vs production errors
- Process-level error handling

## Running the Example

```bash
npm install
npm start

# Production mode
NODE_ENV=production npm start
```

## Testing Errors

```bash
# Synchronous error
curl http://localhost:3000/sync-error

# Async error
curl http://localhost:3000/async-error

# Not found (valid ID format)
curl http://localhost:3000/users/999

# Validation error (invalid ID)
curl http://localhost:3000/users/abc

# Create user (missing fields)
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{}'

# Create user (invalid email)
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"invalid"}'

# Unauthorized
curl http://localhost:3000/admin

# Forbidden
curl http://localhost:3000/admin \
  -H "Authorization: Bearer wrong-token"

# 404
curl http://localhost:3000/nonexistent
```

## Key Concepts

### Custom Error Classes

```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
    this.isOperational = true
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404)
  }
}
```

### Async Handler Wrapper

```javascript
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// Usage
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) throw new NotFoundError('User')
  res.json(user)
}))
```

### Centralized Error Handler

```javascript
app.use((err, req, res, next) => {
  // Operational errors: send message
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    })
  }

  // Programming errors: generic message
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong'
  })
})
```

### Error Response Format

**Development:**
```json
{
  "status": "fail",
  "message": "User not found",
  "stack": "NotFoundError: User not found\n    at..."
}
```

**Production:**
```json
{
  "status": "fail",
  "message": "User not found"
}
```

## Error Types

| Type | Status | Use Case |
|------|--------|----------|
| ValidationError | 400 | Invalid input |
| UnauthorizedError | 401 | Missing/invalid auth |
| ForbiddenError | 403 | Insufficient permissions |
| NotFoundError | 404 | Resource not found |
| AppError | 500 | Server errors |

## Exercises

1. Add a `ConflictError` (409) for duplicate resources
2. Implement error logging to file
3. Add request ID to error responses
4. Create error response with localized messages

## Next Steps

→ [05-rest-api](../05-rest-api/) - Build a complete REST API
