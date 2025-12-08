# Route Handlers

Route handlers are callback functions that execute when a route is matched. Express supports single handlers, multiple handlers, and handler arrays.

## Overview

```javascript
// Single handler
app.get('/path', (req, res) => {
  res.send('Response')
})

// Multiple handlers
app.get('/path', handler1, handler2, handler3)

// Array of handlers
app.get('/path', [handler1, handler2])
```

## Handler Signature

```javascript
// Basic handler
function handler(req, res) {
  res.send('Response')
}

// Handler with next (for middleware pattern)
function handler(req, res, next) {
  // Do something
  next()  // Pass to next handler
}

// Error handler (4 params)
function errorHandler(err, req, res, next) {
  res.status(500).json({ error: err.message })
}
```

## Single Handler

```javascript
app.get('/users', (req, res) => {
  res.json(users)
})

// Named function
function getUsers(req, res) {
  res.json(users)
}
app.get('/users', getUsers)
```

## Multiple Handlers

Handlers execute in order. Each must call `next()` to continue.

```javascript
// Inline handlers
app.get('/dashboard',
  (req, res, next) => {
    console.log('Handler 1: Logging')
    next()
  },
  (req, res, next) => {
    console.log('Handler 2: Auth check')
    if (!req.user) {
      return res.status(401).send('Unauthorized')
    }
    next()
  },
  (req, res) => {
    console.log('Handler 3: Send response')
    res.send('Dashboard')
  }
)

// Named functions
function logRequest(req, res, next) {
  console.log(`${req.method} ${req.path}`)
  next()
}

function authenticate(req, res, next) {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'No token' })
  }
  req.user = verifyToken(req.headers.authorization)
  next()
}

function getDashboard(req, res) {
  res.render('dashboard', { user: req.user })
}

app.get('/dashboard', logRequest, authenticate, getDashboard)
```

## Handler Arrays

```javascript
// Array of handlers
const middleware = [logRequest, authenticate, validateInput]

app.post('/users', middleware, createUser)

// Mixed arrays and functions
app.get('/admin',
  [authenticate, authorize('admin')],
  logAccess,
  showAdmin
)
```

## The next() Function

### Continue to Next Handler

```javascript
app.get('/path',
  (req, res, next) => {
    req.customData = 'Added by first handler'
    next()  // Continue to second handler
  },
  (req, res) => {
    res.send(req.customData)  // 'Added by first handler'
  }
)
```

### Skip to Error Handler

```javascript
app.get('/users/:id',
  (req, res, next) => {
    const user = users.find(u => u.id === req.params.id)
    if (!user) {
      const error = new Error('User not found')
      error.status = 404
      return next(error)  // Skip to error handler
    }
    req.user = user
    next()
  },
  (req, res) => {
    res.json(req.user)
  }
)

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message })
})
```

### next('route')

Skip remaining handlers for current route.

```javascript
app.get('/users/:id',
  (req, res, next) => {
    if (req.params.id === '0') {
      return next('route')  // Skip to next route
    }
    next()
  },
  (req, res) => {
    res.send('Normal user')  // Skipped when id is '0'
  }
)

// Next matching route
app.get('/users/:id', (req, res) => {
  res.send('Special user 0')  // Runs when id is '0'
})
```

## Async Handlers

### Promise-Based

```javascript
// Wrap async functions
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.findAll()
  res.json(users)
}))

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) {
    const error = new Error('Not found')
    error.status = 404
    throw error
  }
  res.json(user)
}))
```

### express-async-errors

```javascript
require('express-async-errors')

// Async errors automatically caught
app.get('/users', async (req, res) => {
  const users = await User.findAll()
  res.json(users)
})
```

### Express 5

```javascript
// Express 5 handles async errors automatically
app.get('/users', async (req, res) => {
  const users = await User.findAll()
  res.json(users)
})
```

## Common Handler Patterns

### Validation Handler

```javascript
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details
      })
    }
    req.body = value
    next()
  }
}

app.post('/users', validateBody(userSchema), createUser)
```

### Authorization Handler

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

app.delete('/users/:id', authenticate, authorize('admin'), deleteUser)
```

### Rate Limiting Handler

```javascript
function rateLimit(maxRequests, windowMs) {
  const requests = new Map()

  return (req, res, next) => {
    const key = req.ip
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean old entries
    const userRequests = (requests.get(key) || [])
      .filter(time => time > windowStart)

    if (userRequests.length >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests' })
    }

    userRequests.push(now)
    requests.set(key, userRequests)
    next()
  }
}

app.use('/api', rateLimit(100, 60000))  // 100 requests per minute
```

### Caching Handler

```javascript
function cache(duration) {
  const cached = new Map()

  return (req, res, next) => {
    const key = req.originalUrl
    const cachedResponse = cached.get(key)

    if (cachedResponse && Date.now() < cachedResponse.expiry) {
      return res.json(cachedResponse.data)
    }

    // Override res.json to cache response
    const originalJson = res.json.bind(res)
    res.json = (data) => {
      cached.set(key, {
        data,
        expiry: Date.now() + duration
      })
      originalJson(data)
    }

    next()
  }
}

app.get('/expensive', cache(60000), expensiveHandler)
```

## Handler Factory

```javascript
// Create handlers dynamically
function createHandler(message) {
  return (req, res) => {
    res.send(message)
  }
}

app.get('/hello', createHandler('Hello World'))
app.get('/goodbye', createHandler('Goodbye World'))

// CRUD handler factory
function createCRUDHandlers(Model) {
  return {
    list: async (req, res) => {
      const items = await Model.findAll()
      res.json(items)
    },
    show: async (req, res) => {
      const item = await Model.findById(req.params.id)
      res.json(item)
    },
    create: async (req, res) => {
      const item = await Model.create(req.body)
      res.status(201).json(item)
    },
    update: async (req, res) => {
      const item = await Model.findByIdAndUpdate(req.params.id, req.body)
      res.json(item)
    },
    destroy: async (req, res) => {
      await Model.findByIdAndDelete(req.params.id)
      res.status(204).end()
    }
  }
}

const userHandlers = createCRUDHandlers(User)
app.get('/users', userHandlers.list)
app.get('/users/:id', userHandlers.show)
app.post('/users', userHandlers.create)
app.put('/users/:id', userHandlers.update)
app.delete('/users/:id', userHandlers.destroy)
```

## Best Practices

1. **Use named functions** - Easier debugging
2. **Keep handlers focused** - Single responsibility
3. **Always handle errors** - Don't let promises reject silently
4. **Use middleware for cross-cutting concerns** - Auth, logging, validation
5. **Order handlers logically** - Auth before business logic
6. **Always call next() or send response** - Avoid hanging requests

## Related

- [basic-routing](../basic-routing/) - HTTP methods
- [route-parameters](../route-parameters/) - URL parameters
- [modular-routes](../modular-routes/) - Using Router

---

*Route handlers are the core of Express application logic.*
