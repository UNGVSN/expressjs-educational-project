# Express Function

The `express()` function is the top-level function exported by the Express module. It creates an Express application.

## Overview

```javascript
const express = require('express')
const app = express()
```

This simple call creates a full-featured web application with routing, middleware support, and HTTP utilities.

## How It Works

### What express() Returns

```javascript
const express = require('express')
const app = express()

// app is a function
typeof app  // 'function'

// With signature (req, res, next)
// It can be passed to http.createServer
const http = require('http')
http.createServer(app).listen(3000)

// app also has methods
typeof app.get    // 'function'
typeof app.use    // 'function'
typeof app.listen // 'function'
```

### The Application as a Function

```javascript
// Internally, Express does something like:
function createApplication() {
  // Create a function that handles requests
  const app = function(req, res, next) {
    app.handle(req, res, next)
  }

  // Mix in EventEmitter
  Object.setPrototypeOf(app, require('events').EventEmitter.prototype)

  // Add Express methods
  app.use = function() { /* ... */ }
  app.get = function() { /* ... */ }
  // ... more methods

  // Initialize
  app.init()

  return app
}

module.exports = createApplication
```

## Built-in Middleware

Express exports built-in middleware as properties:

```javascript
const express = require('express')

// JSON body parser
express.json()
// Parses application/json

// URL-encoded body parser
express.urlencoded({ extended: true })
// Parses application/x-www-form-urlencoded

// Static file serving
express.static('public')
// Serves files from directory

// Raw body parser
express.raw()
// Returns Buffer

// Text body parser
express.text()
// Returns string

// Usage
const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))
```

## express.Router()

Creates a new router instance:

```javascript
const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.send('Router root')
})

// Mount on app
const app = express()
app.use('/api', router)
```

## Application Creation Patterns

### Basic Application

```javascript
const express = require('express')
const app = express()

app.get('/', (req, res) => {
  res.send('Hello World')
})

app.listen(3000)
```

### Factory Pattern

```javascript
// app.js
const express = require('express')

function createApp() {
  const app = express()

  // Configure middleware
  app.use(express.json())

  // Configure routes
  app.get('/', (req, res) => res.send('Hello'))

  return app
}

module.exports = createApp

// server.js
const createApp = require('./app')
const app = createApp()
app.listen(3000)

// test.js
const createApp = require('./app')
const request = require('supertest')
const app = createApp()
// Test fresh app instance
```

### Module Pattern

```javascript
// app/index.js
const express = require('express')
const routes = require('./routes')
const middleware = require('./middleware')

const app = express()

// Apply middleware
middleware(app)

// Apply routes
routes(app)

module.exports = app

// app/middleware.js
module.exports = function(app) {
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
}

// app/routes.js
module.exports = function(app) {
  app.get('/', (req, res) => res.send('Hello'))
  app.use('/api', require('./api'))
}
```

### Class-Based Pattern

```javascript
const express = require('express')

class Application {
  constructor() {
    this.app = express()
    this.configureMiddleware()
    this.configureRoutes()
  }

  configureMiddleware() {
    this.app.use(express.json())
  }

  configureRoutes() {
    this.app.get('/', (req, res) => res.send('Hello'))
  }

  listen(port) {
    return this.app.listen(port)
  }
}

// Usage
const application = new Application()
application.listen(3000)
```

## Multiple Applications

```javascript
const express = require('express')

// Main app
const app = express()

// Sub-application
const api = express()
api.get('/users', (req, res) => res.json([]))

// Admin sub-application
const admin = express()
admin.get('/dashboard', (req, res) => res.send('Admin'))

// Mount sub-apps
app.use('/api', api)
app.use('/admin', admin)

app.listen(3000)
```

## Testing Applications

```javascript
const express = require('express')
const request = require('supertest')

// Create testable app
function createApp() {
  const app = express()
  app.get('/', (req, res) => res.json({ status: 'ok' }))
  return app
}

// Test without starting server
describe('GET /', () => {
  it('returns status ok', async () => {
    const app = createApp()
    const response = await request(app).get('/')
    expect(response.body.status).toBe('ok')
  })
})
```

## Related

- [application](../application/) - App object methods
- [router](../router/) - Router creation

## Next Steps

1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md)
2. Test knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Move to [application](../application/)

---

*The express() function is the entry point to Express.js.*
