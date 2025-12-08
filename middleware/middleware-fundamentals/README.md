# Middleware Fundamentals

Middleware functions are the foundation of Express.js. They have access to the request object (`req`), response object (`res`), and the `next` function in the application's request-response cycle.

## What is Middleware?

```javascript
// A middleware function
function middleware(req, res, next) {
  // 1. Execute any code
  console.log('Middleware executed')

  // 2. Make changes to req and res
  req.customProperty = 'value'

  // 3. End the request-response cycle
  // res.send('Done')

  // 4. Or call next() to pass control
  next()
}
```

## The Three Parameters

### req (Request)

```javascript
app.use((req, res, next) => {
  // Access request data
  console.log(req.method)      // GET, POST, etc.
  console.log(req.path)        // /users
  console.log(req.query)       // { page: '1' }
  console.log(req.body)        // { name: 'John' }
  console.log(req.headers)     // { 'content-type': '...' }

  // Add custom data for later middleware
  req.requestTime = Date.now()
  req.user = { id: 1, name: 'John' }

  next()
})
```

### res (Response)

```javascript
app.use((req, res, next) => {
  // Add helper methods
  res.success = (data) => {
    res.json({ success: true, data })
  }

  res.error = (message, status = 500) => {
    res.status(status).json({ success: false, error: message })
  }

  next()
})

// Later in route handler
app.get('/users', (req, res) => {
  res.success([{ id: 1, name: 'John' }])
})
```

### next (Function)

```javascript
app.use((req, res, next) => {
  // Pass to next middleware
  next()

  // Pass error to error handler
  // next(new Error('Something went wrong'))

  // Skip to next route
  // next('route')

  // Skip remaining router middleware
  // next('router')
})
```

## Middleware Execution Flow

```
Request arrives
       │
       ▼
┌──────────────────┐
│  Middleware 1    │
│  (logging)       │
└────────┬─────────┘
         │ next()
         ▼
┌──────────────────┐
│  Middleware 2    │
│  (auth check)    │
└────────┬─────────┘
         │ next()
         ▼
┌──────────────────┐
│  Middleware 3    │
│  (body parser)   │
└────────┬─────────┘
         │ next()
         ▼
┌──────────────────┐
│  Route Handler   │
│  res.send()      │
└────────┬─────────┘
         │
         ▼
   Response sent
```

## Using Middleware

### app.use() - All Routes

```javascript
// Runs for ALL requests
app.use((req, res, next) => {
  console.log('Time:', Date.now())
  next()
})
```

### app.use(path) - Specific Path

```javascript
// Runs for /api and /api/*
app.use('/api', (req, res, next) => {
  console.log('API request')
  next()
})
```

### Route-Specific Middleware

```javascript
function authenticate(req, res, next) {
  if (req.headers.authorization) {
    next()
  } else {
    res.status(401).send('Unauthorized')
  }
}

// Only for this route
app.get('/dashboard', authenticate, (req, res) => {
  res.send('Dashboard')
})
```

### Multiple Middleware

```javascript
// Array of middleware
app.use([middleware1, middleware2, middleware3])

// Multiple arguments
app.use(middleware1, middleware2, middleware3)

// Route with multiple middleware
app.get('/admin',
  authenticate,
  authorize('admin'),
  logAccess,
  (req, res) => {
    res.send('Admin Panel')
  }
)
```

## Creating Middleware

### Simple Middleware

```javascript
function requestLogger(req, res, next) {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
  next()
}

app.use(requestLogger)
```

### Configurable Middleware (Factory Pattern)

```javascript
function logger(options = {}) {
  const format = options.format || 'simple'

  return (req, res, next) => {
    if (format === 'detailed') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
      console.log(`  Query: ${JSON.stringify(req.query)}`)
      console.log(`  Body: ${JSON.stringify(req.body)}`)
    } else {
      console.log(`${req.method} ${req.path}`)
    }
    next()
  }
}

// Usage
app.use(logger({ format: 'detailed' }))
```

### Middleware with Closure

```javascript
function rateLimit(windowMs, maxRequests) {
  const requests = new Map()

  return (req, res, next) => {
    const ip = req.ip
    const now = Date.now()

    // Clean old entries
    if (requests.has(ip)) {
      const data = requests.get(ip)
      if (now - data.start > windowMs) {
        requests.set(ip, { start: now, count: 1 })
      } else if (data.count >= maxRequests) {
        return res.status(429).send('Too many requests')
      } else {
        data.count++
      }
    } else {
      requests.set(ip, { start: now, count: 1 })
    }

    next()
  }
}

// 100 requests per minute
app.use(rateLimit(60000, 100))
```

## Async Middleware

### Promise-Based

```javascript
app.use(async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId)
    req.user = user
    next()
  } catch (err) {
    next(err)
  }
})
```

### Async Wrapper

```javascript
// Wrapper function
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

// Usage
app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.findAll()
  res.json(users)
}))

// No try/catch needed - errors automatically passed to error handler
```

## Modifying Request/Response

### Adding Properties to Request

```javascript
// Add request ID
app.use((req, res, next) => {
  req.id = crypto.randomUUID()
  next()
})

// Add timing
app.use((req, res, next) => {
  req.startTime = process.hrtime()
  next()
})
```

### Adding Methods to Response

```javascript
app.use((req, res, next) => {
  // Standard JSON response format
  res.success = function(data, status = 200) {
    return this.status(status).json({
      success: true,
      data
    })
  }

  res.fail = function(message, status = 400) {
    return this.status(status).json({
      success: false,
      error: message
    })
  }

  next()
})

// Usage
app.post('/users', (req, res) => {
  if (!req.body.name) {
    return res.fail('Name is required')
  }
  // Create user...
  res.success(user, 201)
})
```

## Ending the Request

Middleware can end the request-response cycle:

```javascript
// Authentication middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization

  if (!token) {
    // Ends request - no next() called
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    req.user = verifyToken(token)
    next()  // Continue to next middleware
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

## next() Variations

### next() - Continue

```javascript
app.use((req, res, next) => {
  // Do something
  next()  // Pass to next middleware
})
```

### next(error) - Error Handling

```javascript
app.use((req, res, next) => {
  if (!req.body.name) {
    const error = new Error('Name is required')
    error.status = 400
    return next(error)  // Skip to error handler
  }
  next()
})
```

### next('route') - Skip Route Handlers

```javascript
app.get('/user/:id',
  (req, res, next) => {
    if (req.params.id === '0') {
      return next('route')  // Skip remaining handlers for this route
    }
    next()
  },
  (req, res) => {
    res.send('User found')
  }
)

// This handles id === '0'
app.get('/user/:id', (req, res) => {
  res.send('Special user')
})
```

### next('router') - Exit Router

```javascript
const router = express.Router()

router.use((req, res, next) => {
  if (!req.headers.authorization) {
    return next('router')  // Exit this router entirely
  }
  next()
})

router.get('/protected', (req, res) => {
  res.send('Protected content')
})
```

## Common Patterns

### Request Logging

```javascript
app.use((req, res, next) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`)
  })

  next()
})
```

### Request Validation

```javascript
function validateBody(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({ error: error.details[0].message })
    }
    next()
  }
}

// Usage with Joi
const userSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required()
})

app.post('/users', validateBody(userSchema), createUser)
```

### Conditional Middleware

```javascript
function conditionalMiddleware(condition, middleware) {
  return (req, res, next) => {
    if (condition(req)) {
      return middleware(req, res, next)
    }
    next()
  }
}

// Only authenticate API routes
app.use(conditionalMiddleware(
  req => req.path.startsWith('/api'),
  authenticate
))
```

## Related

- [application-level](../application-level/) - app.use()
- [router-level](../router-level/) - router.use()
- [error-handling](../error-handling/) - Error middleware

## Next Steps

1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md)
2. Test knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Learn [application-level](../application-level/) middleware

---

*Understanding middleware fundamentals is essential for Express development.*
