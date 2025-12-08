# Middleware

Middleware functions are the backbone of Express.js. They have access to the request object (req), the response object (res), and the next function in the application's request-response cycle.

## Overview

```javascript
app.use((req, res, next) => {
  // Middleware function
  // Has access to req, res, and next
  console.log('Request received')
  next()  // Pass to next middleware
})
```

## Middleware Flow

```
Request
    │
    ▼
┌─────────────────┐
│   Middleware 1  │──────┐
└─────────────────┘      │
    │ next()             │ Can:
    ▼                    │ - Modify req/res
┌─────────────────┐      │ - End request
│   Middleware 2  │      │ - Call next()
└─────────────────┘      │ - Call next(err)
    │ next()             │
    ▼                    │
┌─────────────────┐      │
│  Route Handler  │──────┘
└─────────────────┘
    │ res.send()
    ▼
Response
```

## Types of Middleware

| Type | Description |
|------|-------------|
| [Application-level](./application-level/) | Bound to app instance |
| [Router-level](./router-level/) | Bound to router instance |
| [Error-handling](./error-handling/) | Four parameters: (err, req, res, next) |
| [Built-in](./built-in/) | Express built-ins (json, static, etc.) |
| [Third-party](./third-party/) | npm packages (helmet, morgan, etc.) |

## Modules

### Fundamentals
- [middleware-fundamentals](./middleware-fundamentals/) - Core concepts

### By Level
- [application-level](./application-level/) - app.use()
- [router-level](./router-level/) - router.use()
- [error-handling](./error-handling/) - Error middleware

### Built-in Middleware
- [express.json](./built-in/express-json/) - JSON body parser
- [express.urlencoded](./built-in/express-urlencoded/) - Form parser
- [express.static](./built-in/express-static/) - Static files
- [express.raw](./built-in/express-raw/) - Raw body
- [express.text](./built-in/express-text/) - Text body

### Third-party Middleware
- [helmet](./third-party/helmet/) - Security headers
- [cors](./third-party/cors/) - Cross-origin requests
- [morgan](./third-party/morgan/) - HTTP logging
- [compression](./third-party/compression/) - Response compression
- [express-session](./third-party/express-session/) - Sessions
- [passport](./third-party/passport/) - Authentication
- [multer](./third-party/multer/) - File uploads
- [express-validator](./third-party/express-validator/) - Validation
- [rate-limiter](./third-party/rate-limiter/) - Rate limiting

## Quick Reference

### Basic Middleware

```javascript
// Run for all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// Run for specific path
app.use('/api', (req, res, next) => {
  next()
})

// Multiple middleware
app.use(middleware1, middleware2, middleware3)
```

### Route-Specific Middleware

```javascript
app.get('/admin', authenticate, authorize, (req, res) => {
  res.send('Admin area')
})
```

### Error Middleware

```javascript
// Must have 4 parameters
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})
```

### Common Built-in

```javascript
app.use(express.json())                    // Parse JSON bodies
app.use(express.urlencoded({ extended: true }))  // Parse forms
app.use(express.static('public'))          // Serve static files
```

### Common Third-party

```javascript
const helmet = require('helmet')
const cors = require('cors')
const morgan = require('morgan')
const compression = require('compression')

app.use(helmet())          // Security headers
app.use(cors())            // CORS
app.use(morgan('dev'))     // Logging
app.use(compression())     // Gzip
```

## Middleware Order

Order matters! Middleware executes in the order it's defined:

```javascript
// 1. Security headers first
app.use(helmet())

// 2. CORS before routes
app.use(cors())

// 3. Logging
app.use(morgan('dev'))

// 4. Body parsers
app.use(express.json())

// 5. Session/Auth
app.use(session(config))
app.use(passport.initialize())

// 6. Routes
app.use('/api', apiRoutes)

// 7. 404 handler (after routes)
app.use((req, res) => {
  res.status(404).send('Not Found')
})

// 8. Error handler (always last)
app.use((err, req, res, next) => {
  res.status(500).send('Error')
})
```

## Creating Custom Middleware

```javascript
// Simple middleware
function logger(req, res, next) {
  console.log(`${req.method} ${req.path}`)
  next()
}

// Configurable middleware
function requestLogger(options = {}) {
  return (req, res, next) => {
    if (options.detailed) {
      console.log(`${req.method} ${req.path} - ${req.ip}`)
    } else {
      console.log(`${req.method} ${req.path}`)
    }
    next()
  }
}

// Usage
app.use(logger)
app.use(requestLogger({ detailed: true }))
```

## Async Middleware

```javascript
// Wrap async functions
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

// Usage
app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find()
  res.json(users)
}))
```

## Learning Path

1. Start with [middleware-fundamentals](./middleware-fundamentals/)
2. Understand [application-level](./application-level/) and [router-level](./router-level/)
3. Master [error-handling](./error-handling/)
4. Learn [built-in](./built-in/) middleware
5. Explore [third-party](./third-party/) middleware

---

*Middleware is the heart of Express. Master it to build robust applications.*
