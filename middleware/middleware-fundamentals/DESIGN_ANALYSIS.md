# Middleware Fundamentals Design Analysis

## The Middleware Pattern

Express middleware implements the Chain of Responsibility pattern:

```javascript
// Conceptual implementation
class MiddlewareChain {
  constructor() {
    this.stack = []
  }

  use(fn) {
    this.stack.push(fn)
  }

  handle(req, res) {
    let index = 0

    const next = (err) => {
      if (err) {
        return this.handleError(err, req, res)
      }

      const middleware = this.stack[index++]
      if (middleware) {
        middleware(req, res, next)
      }
    }

    next()
  }
}
```

## Why Three Parameters?

### req - Shared State Container

```javascript
// Middleware can attach data to req
app.use((req, res, next) => {
  req.startTime = Date.now()
  next()
})

// Later middleware/routes can access it
app.use((req, res, next) => {
  console.log(`Request started at ${req.startTime}`)
  next()
})
```

Design decision: Using req as shared state allows data to flow through the middleware chain without global state or complex dependency injection.

### res - Response Builder

```javascript
// res accumulates response settings
app.use((req, res, next) => {
  res.set('X-Request-ID', req.id)
  next()
})

app.use((req, res, next) => {
  res.set('X-Response-Time', Date.now() - req.startTime)
  next()
})

// Final handler sends accumulated response
app.get('/', (req, res) => {
  res.json({ message: 'Hello' })
  // Includes all headers set by middleware
})
```

### next - Control Flow Mechanism

```javascript
// next() enables:
// 1. Sequential execution
// 2. Early termination
// 3. Error propagation
// 4. Route skipping

function next(err) {
  if (err) {
    // Find error handler (4 params)
    return errorHandler(err, req, res, next)
  }
  // Find next matching middleware
  const layer = stack[index++]
  if (layer) {
    layer.handle(req, res, next)
  }
}
```

## Middleware Stack Implementation

### Layer Structure

```javascript
// Each middleware creates a Layer
class Layer {
  constructor(path, fn) {
    this.path = path
    this.handle = fn
    this.regexp = pathToRegexp(path)
  }

  match(path) {
    return this.regexp.test(path)
  }
}

// Stack is array of Layers
app.stack = [
  Layer { path: '/', handle: logger },
  Layer { path: '/', handle: bodyParser },
  Layer { path: '/api', handle: apiMiddleware },
  Layer { path: '/api/users', handle: route }
]
```

### Matching Algorithm

```javascript
function handleRequest(req, res) {
  let index = 0

  function next(err) {
    // Find next matching layer
    while (index < stack.length) {
      const layer = stack[index++]

      if (layer.match(req.path)) {
        if (err && layer.handle.length === 4) {
          // Error handler
          return layer.handle(err, req, res, next)
        } else if (!err && layer.handle.length < 4) {
          // Regular middleware
          return layer.handle(req, res, next)
        }
      }
    }

    // No more middleware
    if (err) {
      res.status(500).send('Internal Server Error')
    } else {
      res.status(404).send('Not Found')
    }
  }

  next()
}
```

## Order Matters

### Execution Sequence

```javascript
// Middleware executes in definition order
app.use(first)   // 1
app.use(second)  // 2
app.use(third)   // 3

// First must call next() for second to run
function first(req, res, next) {
  console.log('First')
  next()  // Without this, chain stops here
}
```

### Why Order is Critical

```javascript
// WRONG: Body parser after route
app.post('/users', (req, res) => {
  console.log(req.body)  // undefined!
})
app.use(express.json())

// CORRECT: Body parser before route
app.use(express.json())
app.post('/users', (req, res) => {
  console.log(req.body)  // { name: 'John' }
})
```

## Async Middleware Design

### The Problem

```javascript
// This doesn't work properly
app.use(async (req, res, next) => {
  const user = await User.find(req.userId)
  req.user = user
  next()  // Works, but errors aren't caught
})

// If User.find throws, it's an unhandled rejection
```

### The Solution: Async Wrapper

```javascript
// Wrapper catches promise rejections
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// Now errors are passed to error handler
app.use(asyncHandler(async (req, res, next) => {
  const user = await User.find(req.userId)
  req.user = user
  next()
}))
```

### Express 5 Built-in Support

```javascript
// Express 5 handles async automatically
app.use(async (req, res, next) => {
  const user = await User.find(req.userId)
  req.user = user
  next()
})
// Rejections automatically call next(err)
```

## Factory Pattern for Configuration

### Why Factories?

```javascript
// Simple middleware - no configuration needed
function simpleLogger(req, res, next) {
  console.log(req.method, req.path)
  next()
}

// Configurable middleware - needs factory
function logger(options) {
  // Closure captures options
  return function(req, res, next) {
    if (options.timestamps) {
      console.log(new Date(), req.method, req.path)
    } else {
      console.log(req.method, req.path)
    }
    next()
  }
}

// Factory is called once at setup
app.use(logger({ timestamps: true }))
// Returns configured middleware function
```

### Common Factory Pattern

```javascript
// Most third-party middleware uses this pattern
const helmet = require('helmet')
const cors = require('cors')
const morgan = require('morgan')

// All return middleware functions
app.use(helmet())
app.use(cors({ origin: 'http://example.com' }))
app.use(morgan('dev'))
```

## Response Lifecycle Hooks

### Intercepting Response

```javascript
app.use((req, res, next) => {
  // Store original method
  const originalSend = res.send

  // Override
  res.send = function(body) {
    // Intercept before sending
    console.log('Response body:', body)

    // Call original
    return originalSend.call(this, body)
  }

  next()
})
```

### Response Events

```javascript
app.use((req, res, next) => {
  // When response headers are sent
  res.on('finish', () => {
    console.log('Response finished:', res.statusCode)
  })

  // When connection closes (including errors)
  res.on('close', () => {
    console.log('Connection closed')
  })

  next()
})
```

## Performance Considerations

### Middleware Overhead

```javascript
// Each middleware adds latency
app.use(middleware1)  // +1ms
app.use(middleware2)  // +2ms
app.use(middleware3)  // +1ms
// Total: +4ms per request

// Solution: Conditional middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return apiMiddleware(req, res, next)
  }
  next()
})
```

### Avoid Blocking Operations

```javascript
// BAD: Synchronous file read
app.use((req, res, next) => {
  const data = fs.readFileSync('large-file.json')  // Blocks!
  req.data = data
  next()
})

// GOOD: Async with caching
let cachedData = null
app.use(async (req, res, next) => {
  if (!cachedData) {
    cachedData = await fs.promises.readFile('large-file.json')
  }
  req.data = cachedData
  next()
})
```

## Key Takeaways

1. **Chain of Responsibility** - Middleware passes control via next()
2. **Shared State** - req object carries data through chain
3. **Order Dependent** - Definition order = execution order
4. **Factory Pattern** - For configurable middleware
5. **Async Handling** - Requires wrapper or Express 5
6. **Single Responsibility** - Each middleware does one thing

---

*Understanding middleware internals helps debug issues and build better applications.*
