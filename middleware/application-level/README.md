# Application-Level Middleware

Application-level middleware is bound to an instance of the Express application using `app.use()` or `app.METHOD()`.

## Overview

```javascript
const express = require('express')
const app = express()

// Middleware bound to the app
app.use((req, res, next) => {
  console.log('Time:', Date.now())
  next()
})
```

## app.use()

### No Path - All Requests

```javascript
// Runs for every request
app.use((req, res, next) => {
  req.requestTime = Date.now()
  next()
})
```

### With Path - Path Prefix

```javascript
// Runs for /api, /api/users, /api/posts, etc.
app.use('/api', (req, res, next) => {
  console.log('API request')
  next()
})

// Note: Path matching is prefix-based
app.use('/user', middleware)  // Matches /user, /user/123, /user/profile
```

### Multiple Middleware

```javascript
// Multiple functions
app.use(middleware1, middleware2, middleware3)

// Array of functions
app.use([middleware1, middleware2, middleware3])

// Mixed
app.use(middleware1, [middleware2, middleware3], middleware4)
```

## app.METHOD()

### Route-Specific Middleware

```javascript
// Only GET requests to /users
app.get('/users', (req, res, next) => {
  console.log('GET /users')
  next()
}, (req, res) => {
  res.json([])
})

// Only POST requests to /users
app.post('/users', validateBody, (req, res) => {
  res.status(201).json({})
})
```

### All HTTP Methods

```javascript
// Runs for any method to /users
app.all('/users', (req, res, next) => {
  console.log(`${req.method} /users`)
  next()
})
```

## Middleware Execution Order

```javascript
const express = require('express')
const app = express()

// 1. First - Runs for all requests
app.use((req, res, next) => {
  console.log('1. Global middleware')
  next()
})

// 2. Second - Runs for /api/*
app.use('/api', (req, res, next) => {
  console.log('2. API middleware')
  next()
})

// 3. Third - Route handler
app.get('/api/users', (req, res) => {
  console.log('3. Route handler')
  res.json([])
})

// Request to GET /api/users logs:
// 1. Global middleware
// 2. API middleware
// 3. Route handler
```

## Common Patterns

### Request Logging

```javascript
app.use((req, res, next) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`)
  })

  next()
})
```

### Request ID

```javascript
const { randomUUID } = require('crypto')

app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID()
  res.set('X-Request-ID', req.id)
  next()
})
```

### Authentication Check

```javascript
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    req.user = verifyToken(token)
    next()
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// Apply to all /api routes
app.use('/api', authenticate)

// Or specific routes
app.get('/api/profile', authenticate, getProfile)
```

### Authorization

```javascript
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    next()
  }
}

// Admin only
app.use('/admin', authenticate, authorize('admin'))

// Multiple roles
app.delete('/posts/:id', authenticate, authorize('admin', 'moderator'), deletePost)
```

### Response Helpers

```javascript
app.use((req, res, next) => {
  res.success = function(data, status = 200) {
    return this.status(status).json({
      success: true,
      data
    })
  }

  res.error = function(message, status = 400, code = null) {
    return this.status(status).json({
      success: false,
      error: { message, code }
    })
  }

  next()
})

// Usage
app.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) {
    return res.error('User not found', 404, 'USER_NOT_FOUND')
  }
  res.success(user)
})
```

### Request Validation

```javascript
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false })

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      })
    }

    req.body = value  // Use validated/transformed value
    next()
  }
}

// Usage with Joi
const createUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  age: Joi.number().min(0).max(150)
})

app.post('/users', validateBody(createUserSchema), createUser)
```

### Conditional Middleware

```javascript
function unless(paths, middleware) {
  return (req, res, next) => {
    if (paths.some(path => req.path.startsWith(path))) {
      return next()
    }
    return middleware(req, res, next)
  }
}

// Skip auth for public routes
app.use(unless(['/login', '/register', '/public'], authenticate))
```

### Response Time Header

```javascript
app.use((req, res, next) => {
  const start = process.hrtime()

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start)
    const duration = (seconds * 1000 + nanoseconds / 1e6).toFixed(2)
    // Note: Header already sent, this is for logging
  })

  // Set header before response is sent
  const originalSend = res.send
  res.send = function(...args) {
    const [seconds, nanoseconds] = process.hrtime(start)
    const duration = (seconds * 1000 + nanoseconds / 1e6).toFixed(2)
    res.set('X-Response-Time', `${duration}ms`)
    return originalSend.apply(this, args)
  }

  next()
})
```

## Recommended Order

```javascript
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const morgan = require('morgan')

const app = express()

// 1. Security headers (first!)
app.use(helmet())

// 2. CORS (before routes)
app.use(cors())

// 3. Request logging
app.use(morgan('dev'))

// 4. Body parsers
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 5. Static files
app.use(express.static('public'))

// 6. Custom middleware
app.use(requestId)
app.use(responseHelpers)

// 7. Session/Authentication
app.use(session(sessionConfig))
app.use(passport.initialize())
app.use(passport.session())

// 8. Routes
app.use('/api', apiRoutes)
app.use('/', webRoutes)

// 9. 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// 10. Error handler (always last)
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message })
})
```

## Sub-Applications

Mount another Express app as middleware:

```javascript
// api/index.js
const api = express()
api.get('/users', getUsers)
api.get('/posts', getPosts)
module.exports = api

// app.js
const api = require('./api')
app.use('/api', api)  // Mount sub-app at /api
```

## Related

- [middleware-fundamentals](../middleware-fundamentals/) - Core concepts
- [router-level](../router-level/) - Router middleware
- [error-handling](../error-handling/) - Error handlers

## Next Steps

1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md)
2. Test knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Learn [router-level](../router-level/) middleware

---

*Application-level middleware provides global behavior for your Express app.*
