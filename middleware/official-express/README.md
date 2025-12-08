# Official Express Middleware

Additional middleware packages maintained by the Express.js team.

## Overview

Beyond the built-in middleware (`express.json()`, `express.urlencoded()`, `express.static()`), the Express team maintains several additional middleware packages for common functionality.

## Official Middleware Packages

| Package | Purpose | Install |
|---------|---------|---------|
| `method-override` | HTTP method override | `npm install method-override` |
| `serve-favicon` | Favicon serving | `npm install serve-favicon` |
| `response-time` | Response timing header | `npm install response-time` |
| `connect-timeout` | Request timeouts | `npm install connect-timeout` |
| `vhost` | Virtual hosting | `npm install vhost` |
| `errorhandler` | Development error handler | `npm install errorhandler` |
| `serve-index` | Directory listings | `npm install serve-index` |
| `cookie-session` | Cookie-based sessions | `npm install cookie-session` |
| `express-session` | Server-side sessions | `npm install express-session` |

## method-override

Override HTTP methods using headers or query strings. Useful for clients that don't support PUT, DELETE, etc.

### Installation

```bash
npm install method-override
```

### Basic Usage

```javascript
const express = require('express')
const methodOverride = require('method-override')

const app = express()

// Override using X-HTTP-Method-Override header
app.use(methodOverride('X-HTTP-Method-Override'))

// Override using query string: ?_method=DELETE
app.use(methodOverride('_method'))

// Now HTML forms can use PUT/DELETE
app.put('/users/:id', (req, res) => {
  res.json({ method: 'PUT', id: req.params.id })
})

app.delete('/users/:id', (req, res) => {
  res.json({ method: 'DELETE', id: req.params.id })
})
```

### HTML Form Usage

```html
<!-- DELETE request via form -->
<form action="/users/123?_method=DELETE" method="POST">
  <button type="submit">Delete User</button>
</form>

<!-- PUT request via form -->
<form action="/users/123?_method=PUT" method="POST">
  <input name="name" value="Updated Name">
  <button type="submit">Update User</button>
</form>
```

### Custom Override Function

```javascript
// Override based on custom logic
app.use(methodOverride((req, res) => {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    const method = req.body._method
    delete req.body._method
    return method
  }
}))

// With body parser (order matters!)
app.use(express.urlencoded({ extended: false }))
app.use(methodOverride((req, res) => {
  if (req.body && '_method' in req.body) {
    const method = req.body._method
    delete req.body._method
    return method
  }
}))
```

### Multiple Override Methods

```javascript
// Support multiple override methods
app.use(methodOverride('X-HTTP-Method'))          // Microsoft header
app.use(methodOverride('X-HTTP-Method-Override')) // Standard header
app.use(methodOverride('X-Method-Override'))      // Alternative header
app.use(methodOverride('_method'))                // Query string
```

### Options

```javascript
app.use(methodOverride('_method', {
  methods: ['POST', 'GET']  // Only override from these methods (default: ['POST'])
}))
```

## serve-favicon

Efficient favicon serving with caching.

### Installation

```bash
npm install serve-favicon
```

### Basic Usage

```javascript
const express = require('express')
const favicon = require('serve-favicon')
const path = require('path')

const app = express()

// Serve favicon - should be one of the first middleware
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
```

### Why Use This?

1. **Performance**: Caches the icon in memory
2. **Efficiency**: Short-circuits favicon requests before logging/other middleware
3. **ETag support**: Proper caching with ETag headers

### Options

```javascript
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico'), {
  maxAge: 86400000  // 1 day in milliseconds (default: 1 year)
}))
```

### With Different Formats

```javascript
// PNG favicon
app.use(favicon(path.join(__dirname, 'public', 'favicon.png')))

// SVG favicon (modern browsers)
app.use(favicon(path.join(__dirname, 'public', 'favicon.svg')))

// From Buffer
const iconBuffer = fs.readFileSync('./favicon.ico')
app.use(favicon(iconBuffer))
```

## response-time

Add `X-Response-Time` header with request duration.

### Installation

```bash
npm install response-time
```

### Basic Usage

```javascript
const express = require('express')
const responseTime = require('response-time')

const app = express()

// Add X-Response-Time header
app.use(responseTime())

// Response header: X-Response-Time: 2.345ms
```

### Custom Header

```javascript
// Custom header name
app.use(responseTime({
  header: 'X-Request-Duration'
}))

// Custom suffix (default: 'ms')
app.use(responseTime({
  suffix: false  // No suffix: X-Response-Time: 2.345
}))

// Digits of precision (default: 3)
app.use(responseTime({
  digits: 5  // X-Response-Time: 2.34567ms
}))
```

### Custom Function

```javascript
// Custom handling
app.use(responseTime((req, res, time) => {
  // time is in milliseconds

  // Custom header
  res.setHeader('X-Response-Time', `${Math.round(time)}ms`)

  // Log slow requests
  if (time > 1000) {
    console.warn(`Slow request: ${req.method} ${req.url} - ${time}ms`)
  }

  // Send to metrics system
  metrics.timing('http.response_time', time, {
    method: req.method,
    path: req.route?.path || req.path,
    status: res.statusCode
  })
}))
```

### Integration with Monitoring

```javascript
const responseTime = require('response-time')
const prometheus = require('prom-client')

// Prometheus histogram
const httpDuration = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000]
})

app.use(responseTime((req, res, time) => {
  httpDuration.observe(
    {
      method: req.method,
      route: req.route?.path || 'unknown',
      status: res.statusCode
    },
    time
  )
}))
```

## connect-timeout

Set request timeout and handle timeout errors.

### Installation

```bash
npm install connect-timeout
```

### Basic Usage

```javascript
const express = require('express')
const timeout = require('connect-timeout')

const app = express()

// Set 5 second timeout for all requests
app.use(timeout('5s'))

// Check timeout in subsequent middleware
app.use((req, res, next) => {
  if (!req.timedout) next()
})
```

### Route-Specific Timeout

```javascript
// Different timeouts for different routes
app.get('/quick', timeout('1s'), (req, res) => {
  res.json({ fast: true })
})

app.get('/slow', timeout('30s'), async (req, res) => {
  // Long-running operation
  const result = await longOperation()
  if (!req.timedout) {
    res.json(result)
  }
})
```

### Handling Timeouts

```javascript
const timeout = require('connect-timeout')

app.use(timeout('5s'))

// Middleware must check req.timedout
app.use(async (req, res, next) => {
  await someAsyncOperation()

  // IMPORTANT: Check if timed out before continuing
  if (!req.timedout) {
    next()
  }
})

// Timeout error handler
app.use((err, req, res, next) => {
  if (req.timedout) {
    res.status(503).json({
      error: 'Service timeout',
      message: 'Request took too long to process'
    })
  } else {
    next(err)
  }
})
```

### Options

```javascript
app.use(timeout('5s', {
  respond: true  // Automatically send 503 (default: true)
}))

// With respond: false, handle manually
app.use(timeout('5s', { respond: false }))

app.use((req, res, next) => {
  req.on('timeout', () => {
    // Custom timeout handling
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request Timeout' })
    }
  })
  next()
})
```

### Helper Function

```javascript
// Create timeout-aware middleware wrapper
function haltOnTimedout(req, res, next) {
  if (!req.timedout) next()
}

app.use(timeout('5s'))
app.use(express.json())
app.use(haltOnTimedout)  // Check after body parsing
app.use(routes)
app.use(haltOnTimedout)  // Check after routes
app.use(errorHandler)
```

## vhost

Virtual host routing for handling multiple domains.

### Installation

```bash
npm install vhost
```

### Basic Usage

```javascript
const express = require('express')
const vhost = require('vhost')

const app = express()

// Main application
const mainApp = express()
mainApp.get('/', (req, res) => {
  res.send('Welcome to example.com')
})

// API application
const apiApp = express()
apiApp.get('/', (req, res) => {
  res.json({ api: 'v1' })
})

// Admin application
const adminApp = express()
adminApp.get('/', (req, res) => {
  res.send('Admin Panel')
})

// Mount applications
app.use(vhost('example.com', mainApp))
app.use(vhost('api.example.com', apiApp))
app.use(vhost('admin.example.com', adminApp))

app.listen(80)
```

### Wildcard Subdomains

```javascript
// Match any subdomain
app.use(vhost('*.example.com', (req, res) => {
  // req.vhost contains match info
  const subdomain = req.vhost[0]  // The matched wildcard
  res.send(`Subdomain: ${subdomain}`)
}))

// User subdomains
const userApp = express()
userApp.get('/', (req, res) => {
  const username = req.vhost[0]
  res.send(`Profile for ${username}`)
})
app.use(vhost('*.users.example.com', userApp))
```

### Multiple Wildcards

```javascript
// Match region.service.example.com
app.use(vhost('*.*.example.com', (req, res) => {
  const region = req.vhost[0]
  const service = req.vhost[1]
  res.json({ region, service })
}))
```

### Development Setup

```javascript
// Development with localhost
app.use(vhost('localhost', mainApp))
app.use(vhost('api.localhost', apiApp))

// Or use environment-based hosts
const host = process.env.NODE_ENV === 'production'
  ? 'example.com'
  : 'localhost'

app.use(vhost(host, mainApp))
app.use(vhost(`api.${host}`, apiApp))
```

### RegExp Matching

```javascript
// Using RegExp for complex matching
app.use(vhost(/^([a-z]+)\.example\.com$/i, (req, res) => {
  const subdomain = req.vhost[1]  // First capture group
  res.send(`Matched: ${subdomain}`)
}))
```

## errorhandler

Development-only error handler with stack traces.

### Installation

```bash
npm install errorhandler
```

### Basic Usage

```javascript
const express = require('express')
const errorhandler = require('errorhandler')

const app = express()

// Only use in development!
if (process.env.NODE_ENV === 'development') {
  app.use(errorhandler())
}
```

### Options

```javascript
app.use(errorhandler({
  log: true  // Log errors to console (default: true in development)
}))

// Custom logger
app.use(errorhandler({
  log: (err, str, req) => {
    console.error('Error in %s %s', req.method, req.url)
    console.error(str)
  }
}))
```

### HTML vs JSON Response

```javascript
// Automatically responds with HTML or JSON based on Accept header
// Accept: text/html -> HTML page with stack trace
// Accept: application/json -> JSON error object
```

### Production Alternative

```javascript
// Development
if (app.get('env') === 'development') {
  app.use(errorhandler())
}

// Production - custom error handler
if (app.get('env') === 'production') {
  app.use((err, req, res, next) => {
    console.error(err)

    res.status(err.status || 500).json({
      error: {
        message: 'Internal Server Error',
        // Don't expose error details in production
      }
    })
  })
}
```

## serve-index

Serve directory listings for static file serving.

### Installation

```bash
npm install serve-index
```

### Basic Usage

```javascript
const express = require('express')
const serveIndex = require('serve-index')

const app = express()

// Serve files and directory listing
app.use('/files', express.static('public/files'))
app.use('/files', serveIndex('public/files'))

// Now /files shows directory listing
// And files are served from /files/filename.ext
```

### Options

```javascript
app.use('/files', serveIndex('public/files', {
  icons: true,           // Show icons (default: false)
  hidden: false,         // Show hidden files (default: false)
  view: 'details',       // 'tiles' or 'details' (default: 'tiles')

  // Custom filter function
  filter: (filename, index, files, dir) => {
    // Return true to show, false to hide
    return !filename.startsWith('.')
  },

  // Custom stylesheet
  stylesheet: '/custom-style.css',

  // Custom template
  template: (locals, callback) => {
    // locals.directory - current directory
    // locals.files - array of file objects
    // locals.path - request path
    const html = generateCustomHTML(locals)
    callback(null, html)
  }
}))
```

### File Download Support

```javascript
// Add download support
app.use('/files', express.static('public/files', {
  setHeaders: (res, path) => {
    res.set('Content-Disposition', 'attachment')
  }
}))
app.use('/files', serveIndex('public/files', { icons: true }))
```

## cookie-session

Simple cookie-based session middleware.

### Installation

```bash
npm install cookie-session
```

### Basic Usage

```javascript
const express = require('express')
const cookieSession = require('cookie-session')

const app = express()

app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2'],  // Keys for signing cookies

  // Cookie options
  maxAge: 24 * 60 * 60 * 1000  // 24 hours
}))

app.get('/', (req, res) => {
  // Views counter
  req.session.views = (req.session.views || 0) + 1
  res.send(`Views: ${req.session.views}`)
})
```

### Options

```javascript
app.use(cookieSession({
  name: 'session',             // Cookie name
  keys: ['secret1', 'secret2'], // Signing keys (rotates)
  secret: 'single-secret',     // Alternative to keys

  // Cookie options
  maxAge: 86400000,            // Expiry in ms (default: session)
  expires: new Date(...),      // Specific expiry date
  path: '/',                   // Cookie path
  domain: '.example.com',      // Cookie domain
  secure: true,                // HTTPS only
  httpOnly: true,              // No JavaScript access
  signed: true,                // Sign cookies (default: true)
  overwrite: true,             // Overwrite same-name cookies
  sameSite: 'strict'           // SameSite attribute
}))
```

### Session Methods

```javascript
app.post('/login', (req, res) => {
  req.session.userId = user.id
  req.session.isAuthenticated = true
  res.redirect('/')
})

app.post('/logout', (req, res) => {
  req.session = null  // Destroy session
  res.redirect('/login')
})

app.get('/profile', (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect('/login')
  }
  res.render('profile', { userId: req.session.userId })
})
```

### Key Rotation

```javascript
// Old key, new key - supports rotation
const keys = [
  process.env.SESSION_KEY_NEW,
  process.env.SESSION_KEY_OLD
]

app.use(cookieSession({
  name: 'session',
  keys: keys
}))
// Cookies signed with old key are still valid
// New cookies signed with first (newest) key
```

### When to Use cookie-session vs express-session

| cookie-session | express-session |
|----------------|-----------------|
| Data stored in cookie | Data stored on server |
| Max ~4KB data | Unlimited data |
| Stateless | Requires session store |
| No server-side cleanup | Need to clean up old sessions |
| Better for simple data | Better for complex sessions |

## express-session

Server-side session with store support.

### Installation

```bash
npm install express-session
```

### Basic Usage

```javascript
const express = require('express')
const session = require('express-session')

const app = express()

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}))

app.get('/', (req, res) => {
  req.session.views = (req.session.views || 0) + 1
  res.send(`Views: ${req.session.views}`)
})
```

### All Options

```javascript
app.use(session({
  // Required
  secret: 'my-secret',           // Or array for rotation

  // Recommended settings
  resave: false,                 // Don't save unchanged sessions
  saveUninitialized: false,      // Don't save empty sessions

  // Cookie options
  cookie: {
    secure: true,                // HTTPS only
    httpOnly: true,              // No JavaScript access
    maxAge: 86400000,            // 1 day
    sameSite: 'strict',          // CSRF protection
    domain: '.example.com',
    path: '/'
  },

  // Session ID
  genid: (req) => {
    return generateUUID()        // Custom ID generator
  },
  name: 'sessionId',             // Cookie name (default: connect.sid)

  // Rolling sessions
  rolling: false,                // Reset maxAge on each request

  // Proxy trust
  proxy: true,                   // Trust first proxy

  // Store
  store: new RedisStore({ ... }) // Session store
}))
```

### Session Stores

```javascript
// Redis store
const RedisStore = require('connect-redis').default
const { createClient } = require('redis')

const redisClient = createClient()
redisClient.connect()

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}))

// MongoDB store
const MongoStore = require('connect-mongo')

app.use(session({
  store: MongoStore.create({
    mongoUrl: 'mongodb://localhost/sessions'
  }),
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}))

// PostgreSQL store
const pgSession = require('connect-pg-simple')(session)

app.use(session({
  store: new pgSession({
    pool: pgPool,
    tableName: 'user_sessions'
  }),
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}))
```

### Session Methods

```javascript
// Regenerate session (security: after login)
req.session.regenerate((err) => {
  if (err) return next(err)
  req.session.userId = user.id
  res.redirect('/')
})

// Destroy session
req.session.destroy((err) => {
  if (err) return next(err)
  res.redirect('/login')
})

// Reload session from store
req.session.reload((err) => {
  if (err) return next(err)
  // Session refreshed
})

// Save session explicitly
req.session.save((err) => {
  if (err) return next(err)
  // Session saved
})

// Touch session (update expiry)
req.session.touch()
```

### Session Properties

```javascript
app.get('/info', (req, res) => {
  res.json({
    id: req.session.id,
    cookie: req.session.cookie,
    maxAge: req.session.cookie.maxAge,
    expires: req.session.cookie.expires
  })
})
```

## Best Practices

### 1. Order Matters

```javascript
// Correct order
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))  // First
app.use(responseTime())                                           // Early
app.use(timeout('30s'))                                           // Before routes
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(methodOverride('_method'))                                // After body parser
app.use(session({ ... }))
app.use(routes)
app.use(errorhandler())                                           // Last
```

### 2. Environment-Specific Middleware

```javascript
const isDev = app.get('env') === 'development'

// Development only
if (isDev) {
  app.use(errorhandler())
}

// Production only
if (!isDev) {
  app.use(helmet())
  app.use(compression())
}
```

### 3. Security Considerations

```javascript
// Secure session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,  // Use environment variable
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 3600000  // 1 hour
  }
}))
```

### 4. Combine Related Middleware

```javascript
// Create middleware stack
const securityMiddleware = [
  helmet(),
  cors({ origin: 'https://example.com' }),
  session({ ... })
]

const parsingMiddleware = [
  express.json({ limit: '10kb' }),
  express.urlencoded({ extended: false }),
  methodOverride('_method')
]

app.use(securityMiddleware)
app.use(parsingMiddleware)
```

## Related Topics

- [Built-in Middleware](../built-in/README.md)
- [Third-party Middleware](../third-party/README.md)
- [Middleware Fundamentals](../middleware-fundamentals/README.md)
- [Security](../../advanced/security/README.md)
