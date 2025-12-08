# Router-Level Middleware Design Analysis

## Router Architecture

### Router as Mini-Application

```javascript
// Router shares much with Application
class Router {
  constructor(options) {
    this.stack = []
    this.caseSensitive = options.caseSensitive || false
    this.mergeParams = options.mergeParams || false
    this.strict = options.strict || false
  }

  use(path, ...handlers) { /* ... */ }
  get(path, ...handlers) { /* ... */ }
  post(path, ...handlers) { /* ... */ }
  // ... other HTTP methods
}

// But Application has additional features
class Application extends Router {
  constructor() {
    super()
    this.settings = {}
    this.locals = {}
  }

  listen(port) { /* ... */ }
  set(key, value) { /* ... */ }
  render(view, options, callback) { /* ... */ }
}
```

### Why Use Router vs App?

```javascript
// Router advantages:
// 1. No server overhead - can't call listen()
// 2. Lighter weight - no settings, locals, views
// 3. Composable - mount anywhere, multiple times
// 4. Encapsulated - scoped middleware/routes

// App advantages:
// 1. Full Express features
// 2. Global settings
// 3. Template rendering
// 4. Required for server creation
```

## Stack Management

### Layer Storage

```javascript
// Both App and Router use stack of layers
router.stack = [
  Layer { path: '/', handle: middleware, route: undefined },
  Layer { path: '/users', handle: route, route: Route },
  Layer { path: '/', handle: errorHandler, route: undefined }
]
```

### Path Resolution

```javascript
// When router is mounted:
app.use('/api', router)

// Request path: /api/users/123

// App level:
// - Matches /api prefix
// - Strips /api, passes /users/123 to router

// Router level:
// - Sees path as /users/123
// - req.baseUrl = '/api'
// - req.originalUrl = '/api/users/123'
```

## mergeParams Internals

### Parameter Inheritance Problem

```javascript
// Without mergeParams
const parent = express.Router()
const child = express.Router()

parent.use('/:parentId/child', child)

child.get('/:childId', (req, res) => {
  req.params.parentId  // undefined!
  req.params.childId   // '456'
})

// Parent params are lost when entering child router
```

### mergeParams Solution

```javascript
// With mergeParams
const child = express.Router({ mergeParams: true })

child.get('/:childId', (req, res) => {
  req.params.parentId  // '123'
  req.params.childId   // '456'
})

// How it works internally:
function processParams(layer, req) {
  const params = layer.keys.reduce((acc, key, i) => {
    acc[key.name] = layer.match[i + 1]
    return acc
  }, {})

  if (this.mergeParams) {
    // Merge with existing params
    req.params = Object.assign({}, req.params, params)
  } else {
    // Replace params
    req.params = params
  }
}
```

## Router Options Deep Dive

### caseSensitive

```javascript
// Default: false
const router = express.Router()
router.get('/Users', handler)
// Matches: /users, /Users, /USERS

// With caseSensitive: true
const router = express.Router({ caseSensitive: true })
router.get('/Users', handler)
// Matches: /Users only
```

### strict

```javascript
// Default: false
const router = express.Router()
router.get('/users', handler)
// Matches: /users, /users/

// With strict: true
const router = express.Router({ strict: true })
router.get('/users', handler)
// Matches: /users only (not /users/)
```

### How Options Propagate

```javascript
// Router options only affect that router
const strictRouter = express.Router({ strict: true })
const normalRouter = express.Router()

strictRouter.use('/nested', normalRouter)

// strictRouter: strict matching
// normalRouter: normal matching (doesn't inherit strict)
```

## Scoping Benefits

### Isolated Middleware

```javascript
// Each router has its own middleware stack
const publicRouter = express.Router()
const privateRouter = express.Router()

privateRouter.use(authenticate)  // Only privateRouter routes

// No cross-contamination
publicRouter.get('/health', handler)  // No auth check
privateRouter.get('/data', handler)   // Auth required
```

### Independent Error Handling

```javascript
const apiRouter = express.Router()
const webRouter = express.Router()

// API returns JSON errors
apiRouter.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message })
})

// Web returns HTML errors
webRouter.use((err, req, res, next) => {
  res.status(err.status || 500).render('error', { error: err })
})

// Each router handles errors differently
```

## Performance Considerations

### Router Mounting Overhead

```javascript
// Each router.use() adds to the stack
// Deep nesting = more layers to traverse

// Consider flattening for performance-critical paths:
// Instead of:
app.use('/api', apiRouter)
apiRouter.use('/v1', v1Router)
v1Router.use('/users', usersRouter)
// Path: /api/v1/users - 3 routers

// Consider:
app.use('/api/v1/users', usersRouter)
// Path: /api/v1/users - 1 router (but less modular)
```

### Router Reuse

```javascript
// Routers can be mounted multiple times
const metricsRouter = express.Router()
metricsRouter.get('/health', healthCheck)
metricsRouter.get('/ready', readyCheck)

// Mount on multiple paths
app.use('/api/v1', metricsRouter)
app.use('/api/v2', metricsRouter)
app.use('/internal', metricsRouter)

// Same router, different mount points
```

## router.param() Implementation

### Parameter Preprocessing

```javascript
// Internal representation
router._params = {
  'id': [preprocessor1, preprocessor2],
  'userId': [userLoader]
}

// When route matches with :id
// 1. Find all param preprocessors for 'id'
// 2. Execute each in order
// 3. Then execute route handler
```

### Execution Flow

```javascript
router.param('id', loader)
router.get('/:id', handler)

// Request to /:id
// 1. Route matches
// 2. param('id') callback runs
// 3. Route handler runs

function processParams(req, res, done) {
  const params = Object.keys(req.params)
  let i = 0

  function processNext() {
    if (i >= params.length) return done()

    const name = params[i++]
    const fns = this._params[name] || []

    // Execute all preprocessors for this param
    runCallbacks(fns, req, res, processNext)
  }

  processNext()
}
```

## Best Practices

### Router Organization

```javascript
// routes/index.js - Central router management
const express = require('express')
const router = express.Router()

// Mount feature routers
router.use('/auth', require('./auth'))
router.use('/users', require('./users'))
router.use('/posts', require('./posts'))

module.exports = router

// app.js
app.use('/api', require('./routes'))
```

### Middleware Placement

```javascript
const router = express.Router()

// 1. Parser/Transform middleware first
router.use(transformRequest)

// 2. Validation middleware
router.use(validateRequest)

// 3. Auth middleware (if scoped to router)
router.use(authenticate)

// 4. Routes
router.get('/', handler)

// 5. Error handling last
router.use(errorHandler)
```

## Key Takeaways

1. **Mini-App** - Router is App without server features
2. **Scoped Middleware** - Each router has isolated stack
3. **mergeParams** - Enables parent param access
4. **Composable** - Mount anywhere, reuse freely
5. **Performance** - Deep nesting adds overhead
6. **Encapsulation** - Keep related routes/middleware together

---

*Understanding router internals helps design modular, maintainable applications.*
