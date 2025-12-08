# Official Express Middleware - Self-Assessment Questions

Test your understanding of official Express middleware packages.

## Conceptual Understanding

### 1. Why does method-override only work with POST by default?
<details>
<summary>Answer</summary>

POST is the safest default because:
1. **HTML Forms**: Forms can only submit GET or POST natively
2. **CSRF Protection**: POST typically has CSRF protection, so overriding from POST maintains security
3. **Safe Methods**: GET requests are supposed to be idempotent; allowing GET to become DELETE would be dangerous
4. **Caching**: GET requests may be cached by proxies; overriding to modifying methods could cause issues

```javascript
// Override only from POST (default)
app.use(methodOverride('_method'))

// Allow from GET too (less secure)
app.use(methodOverride('_method', { methods: ['POST', 'GET'] }))
```
</details>

### 2. What problem does serve-favicon solve that express.static doesn't?
<details>
<summary>Answer</summary>

serve-favicon provides several advantages:

1. **In-Memory Caching**: Icon is read once and cached in memory forever
2. **Early Short-Circuit**: Responds before logging middleware, reducing noise
3. **Proper Caching Headers**: Sets appropriate Cache-Control and ETag automatically
4. **Optimized Response**: Handles conditional requests (304) efficiently

```javascript
// express.static: Reads file each request, goes through all middleware
app.use(express.static('public'))  // favicon.ico served with all static files

// serve-favicon: Cached, short-circuits, optimized
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
```
</details>

### 3. When would you use cookie-session vs express-session?
<details>
<summary>Answer</summary>

**Use cookie-session when:**
- Session data is small (<4KB)
- You want stateless servers (horizontal scaling)
- You don't want to manage a session store
- Simple use cases (user ID, preferences)

**Use express-session when:**
- Session data is large or grows dynamically
- You need server-side session storage
- You want to invalidate sessions server-side
- You're storing sensitive data that shouldn't be in cookies
- You need session sharing across services

```javascript
// cookie-session: Stateless, simple
app.use(cookieSession({
  name: 'session',
  keys: ['secret'],
  maxAge: 24 * 60 * 60 * 1000
}))

// express-session: Full featured, requires store
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}))
```
</details>

### 4. Why should req.timedout be checked in middleware after connect-timeout?
<details>
<summary>Answer</summary>

After a timeout occurs:
1. The timeout error is passed to error handlers
2. Subsequent middleware may still try to run
3. Attempting to send a response after timeout causes errors

```javascript
// Without check: Potential "headers already sent" error
app.use(timeout('5s'))
app.use(async (req, res, next) => {
  await longOperation()
  res.json({ result })  // May fail if timed out
})

// With check: Safe
app.use(timeout('5s'))
app.use(async (req, res, next) => {
  await longOperation()
  if (!req.timedout) {
    res.json({ result })
  }
})

// Helper pattern
function haltOnTimedout(req, res, next) {
  if (!req.timedout) next()
}

app.use(timeout('5s'))
app.use(express.json())
app.use(haltOnTimedout)
app.use(routes)
```
</details>

### 5. What is req.vhost used for in vhost middleware?
<details>
<summary>Answer</summary>

`req.vhost` contains the matched wildcard values from the hostname pattern:

```javascript
// Pattern: '*.example.com'
// Request: api.example.com
// req.vhost = ['api.example.com', 'api']
// req.vhost[0] = full match
// req.vhost[1] = first wildcard capture

app.use(vhost('*.example.com', (req, res) => {
  const subdomain = req.vhost[1]  // 'api'
  res.json({ subdomain })
}))

// Multiple wildcards
// Pattern: '*.*.example.com'
// Request: us.api.example.com
// req.vhost = ['us.api.example.com', 'us', 'api']

app.use(vhost('*.*.example.com', (req, res) => {
  const region = req.vhost[1]   // 'us'
  const service = req.vhost[2]  // 'api'
  res.json({ region, service })
}))
```
</details>

## Practical Application

### 6. How would you implement HTML form support for PUT/DELETE with method-override?
<details>
<summary>Answer</summary>

```javascript
const express = require('express')
const methodOverride = require('method-override')

const app = express()

// Parse form bodies first
app.use(express.urlencoded({ extended: false }))

// Override using hidden field or query string
app.use(methodOverride('_method'))

// Or from request body
app.use(methodOverride((req, res) => {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    const method = req.body._method
    delete req.body._method
    return method
  }
}))

// Routes
app.put('/users/:id', (req, res) => {
  res.json({ method: 'PUT', id: req.params.id, body: req.body })
})

app.delete('/users/:id', (req, res) => {
  res.json({ method: 'DELETE', id: req.params.id })
})
```

HTML forms:
```html
<!-- Query string method -->
<form action="/users/123?_method=PUT" method="POST">
  <input name="name" value="Updated Name">
  <button type="submit">Update</button>
</form>

<!-- Hidden field method -->
<form action="/users/123" method="POST">
  <input type="hidden" name="_method" value="DELETE">
  <button type="submit">Delete</button>
</form>
```
</details>

### 7. Implement response time tracking with custom metrics collection
<details>
<summary>Answer</summary>

```javascript
const express = require('express')
const responseTime = require('response-time')

const app = express()

// Metrics storage (in production, use Prometheus, StatsD, etc.)
const metrics = {
  requests: [],
  slowRequests: [],

  record(data) {
    this.requests.push(data)
    if (data.time > 1000) {
      this.slowRequests.push(data)
    }
  },

  getStats() {
    const times = this.requests.map(r => r.time)
    return {
      count: times.length,
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      slowCount: this.slowRequests.length
    }
  }
}

// Response time with metrics
app.use(responseTime((req, res, time) => {
  // Set header
  res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`)

  // Record metrics
  metrics.record({
    method: req.method,
    path: req.route?.path || req.path,
    status: res.statusCode,
    time: time,
    timestamp: Date.now()
  })

  // Log slow requests
  if (time > 1000) {
    console.warn(`Slow request: ${req.method} ${req.url} - ${time.toFixed(2)}ms`)
  }
}))

// Routes
app.get('/', (req, res) => res.json({ hello: 'world' }))

app.get('/slow', async (req, res) => {
  await new Promise(r => setTimeout(r, 1500))
  res.json({ slow: true })
})

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json(metrics.getStats())
})
```
</details>

### 8. Set up multi-domain hosting with vhost
<details>
<summary>Answer</summary>

```javascript
const express = require('express')
const vhost = require('vhost')

// Main website
const mainApp = express()
mainApp.set('view engine', 'pug')
mainApp.get('/', (req, res) => res.render('home'))
mainApp.get('/about', (req, res) => res.render('about'))

// API service
const apiApp = express()
apiApp.use(express.json())
apiApp.get('/users', (req, res) => res.json([{ id: 1, name: 'John' }]))
apiApp.post('/users', (req, res) => res.status(201).json(req.body))

// Admin panel
const adminApp = express()
adminApp.use(authMiddleware)
adminApp.get('/', (req, res) => res.render('admin/dashboard'))

// Blog subdomains (user.blog.example.com)
const blogApp = express()
blogApp.get('/', (req, res) => {
  const username = req.vhost[1]
  res.render('blog', { username })
})

// Main application
const app = express()

// Mount virtual hosts
app.use(vhost('example.com', mainApp))
app.use(vhost('www.example.com', mainApp))
app.use(vhost('api.example.com', apiApp))
app.use(vhost('admin.example.com', adminApp))
app.use(vhost('*.blog.example.com', blogApp))

// Fallback for unmatched hosts
app.use((req, res) => {
  res.status(404).json({
    error: 'Unknown host',
    host: req.headers.host
  })
})

// Development with localhost
if (process.env.NODE_ENV === 'development') {
  app.use(vhost('localhost', mainApp))
  app.use(vhost('api.localhost', apiApp))
  app.use(vhost('admin.localhost', adminApp))
}

app.listen(80)
```
</details>

### 9. Implement secure session management with express-session and Redis
<details>
<summary>Answer</summary>

```javascript
const express = require('express')
const session = require('express-session')
const RedisStore = require('connect-redis').default
const { createClient } = require('redis')

const app = express()

// Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
})
redisClient.connect().catch(console.error)

// Handle Redis errors
redisClient.on('error', (err) => console.error('Redis error:', err))

// Session configuration
const sessionConfig = {
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:',
    ttl: 86400  // 1 day in seconds
  }),

  secret: process.env.SESSION_SECRET,
  name: 'sessionId',  // Change from default 'connect.sid'

  resave: false,
  saveUninitialized: false,

  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,  // 1 day
    domain: process.env.COOKIE_DOMAIN
  },

  // Custom session ID generator
  genid: (req) => {
    return require('crypto').randomUUID()
  }
}

// Trust proxy in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
  sessionConfig.cookie.secure = true
}

app.use(session(sessionConfig))

// Routes
app.post('/login', async (req, res) => {
  // Authenticate user...
  const user = await authenticate(req.body)

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  // Regenerate session on login (security best practice)
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Session error' })

    req.session.userId = user.id
    req.session.isAuthenticated = true
    req.session.loginTime = Date.now()

    res.json({ message: 'Logged in', userId: user.id })
  })
})

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' })

    res.clearCookie('sessionId')
    res.json({ message: 'Logged out' })
  })
})

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.isAuthenticated) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  next()
}

app.get('/profile', requireAuth, (req, res) => {
  res.json({
    userId: req.session.userId,
    loginTime: req.session.loginTime
  })
})
```
</details>

### 10. Create a timeout-safe API with connect-timeout
<details>
<summary>Answer</summary>

```javascript
const express = require('express')
const timeout = require('connect-timeout')

const app = express()

// Global timeout
app.use(timeout('30s'))

// Helper to halt on timeout
function haltOnTimedout(req, res, next) {
  if (!req.timedout) next()
}

// Body parsing
app.use(express.json())
app.use(haltOnTimedout)

// Routes with different timeouts
app.get('/quick', timeout('5s'), async (req, res) => {
  const data = await quickOperation()
  if (!req.timedout) {
    res.json(data)
  }
})

app.post('/upload', timeout('5m'), async (req, res) => {
  // Long upload operation
  const result = await handleUpload(req)
  if (!req.timedout) {
    res.json(result)
  }
})

// Wrapper for async handlers
function timeoutSafe(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next)
    } catch (err) {
      if (!req.timedout) {
        next(err)
      }
    }
  }
}

app.get('/data', timeoutSafe(async (req, res) => {
  const data = await fetchData()

  if (!req.timedout) {
    res.json(data)
  }
}))

// Error handler for timeouts
app.use((err, req, res, next) => {
  if (req.timedout) {
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Service Timeout',
        message: 'Request took too long to process',
        timeout: err.timeout
      })
    }
    return
  }

  next(err)
})

// Alternative: Custom timeout handling
app.get('/custom-timeout', timeout('10s', { respond: false }), (req, res) => {
  req.on('timeout', () => {
    if (!res.headersSent) {
      res.status(408).json({
        error: 'Request Timeout',
        retryAfter: 5
      })
    }
  })

  performOperation(req, res)
})
```
</details>

## Troubleshooting

### 11. Why might method-override not be working?
<details>
<summary>Answer</summary>

Common issues:

1. **Body parser order**: Must come BEFORE method-override if using body field
```javascript
// Wrong order
app.use(methodOverride((req) => req.body._method))
app.use(express.urlencoded({ extended: false }))

// Correct order
app.use(express.urlencoded({ extended: false }))
app.use(methodOverride((req) => req.body._method))
```

2. **Wrong HTTP method**: Default only overrides POST
```javascript
// Won't work with GET
app.use(methodOverride('_method'))
// GET /users/1?_method=DELETE - Still GET

// Need to allow GET
app.use(methodOverride('_method', { methods: ['POST', 'GET'] }))
```

3. **Case sensitivity**: Methods must be uppercase
```html
<!-- Won't work -->
<input type="hidden" name="_method" value="delete">

<!-- Works -->
<input type="hidden" name="_method" value="DELETE">
```

4. **Query vs body**: Using wrong source
```javascript
// Only checks query string
app.use(methodOverride('_method'))

// Form with hidden field won't work
// Need body override
app.use(methodOverride((req) => {
  if (req.body?._method) {
    const method = req.body._method
    delete req.body._method
    return method
  }
}))
```
</details>

### 12. Why is errorhandler showing in production?
<details>
<summary>Answer</summary>

**Problem:** Stack traces visible in production

**Causes:**
1. Not checking environment before applying
2. `NODE_ENV` not set properly

**Solutions:**

```javascript
// Always check environment
if (app.get('env') === 'development') {
  app.use(errorhandler())
}

// Or use NODE_ENV directly
if (process.env.NODE_ENV !== 'production') {
  app.use(errorhandler())
}

// Ensure NODE_ENV is set in production
// In deployment: NODE_ENV=production npm start
// Or in package.json
{
  "scripts": {
    "start": "NODE_ENV=production node server.js"
  }
}

// Production error handler
if (process.env.NODE_ENV === 'production') {
  app.use((err, req, res, next) => {
    // Log error internally
    console.error(err)

    // Send safe response
    res.status(err.status || 500).json({
      error: 'Internal Server Error'
      // NO stack trace
    })
  })
}
```
</details>

### 13. Why aren't sessions persisting across requests?
<details>
<summary>Answer</summary>

Common causes:

1. **saveUninitialized: false with empty session**
```javascript
// Session not saved if nothing added
app.use(session({ saveUninitialized: false }))

app.get('/visit', (req, res) => {
  // First request: no session saved
  res.json({ visited: true })
})

// Fix: Add data to session
app.get('/visit', (req, res) => {
  req.session.visited = true  // Now session saves
  res.json({ visited: true })
})
```

2. **Secure cookie over HTTP**
```javascript
// Won't work over HTTP
app.use(session({
  cookie: { secure: true }  // Requires HTTPS
}))

// Fix: Conditional secure
cookie: {
  secure: process.env.NODE_ENV === 'production'
}
```

3. **Missing trust proxy behind reverse proxy**
```javascript
// Cookie not set when behind proxy
app.use(session({
  cookie: { secure: true }
}))

// Fix: Trust proxy
app.set('trust proxy', 1)
```

4. **Store connection issues**
```javascript
// Redis not connected
const store = new RedisStore({ client: redisClient })

// Check connection
redisClient.on('error', (err) => {
  console.error('Redis error:', err)
})

redisClient.on('connect', () => {
  console.log('Redis connected')
})
```

5. **SameSite cookie issues**
```javascript
// Cross-site requests blocked
cookie: { sameSite: 'strict' }

// For cross-origin: Use 'none' with secure
cookie: {
  sameSite: 'none',
  secure: true
}
```
</details>

## Architecture Questions

### 14. How would you implement session sharing across multiple services?
<details>
<summary>Answer</summary>

```javascript
// Shared session configuration
const sessionConfig = {
  name: 'shared_session',
  secret: process.env.SHARED_SESSION_SECRET,
  cookie: {
    domain: '.example.com',  // Share across subdomains
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  },
  store: new RedisStore({
    client: sharedRedisClient,
    prefix: 'shared:sess:'
  }),
  resave: false,
  saveUninitialized: false
}

// Service A (api.example.com)
const apiApp = express()
apiApp.use(session(sessionConfig))

apiApp.get('/user', (req, res) => {
  res.json({ userId: req.session.userId })
})

// Service B (app.example.com)
const webApp = express()
webApp.use(session(sessionConfig))

webApp.post('/login', (req, res) => {
  req.session.userId = user.id
  res.redirect('/dashboard')
})

// Both services share session via:
// 1. Same cookie domain (.example.com)
// 2. Same Redis store
// 3. Same session secret
// 4. Same cookie name

// Alternative: JWT tokens for stateless sharing
const jwt = require('jsonwebtoken')

function createToken(user) {
  return jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  )
}

function verifyToken(req, res, next) {
  const token = req.cookies.auth_token
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
}
```
</details>

### 15. Design a graceful timeout system for mixed sync/async operations
<details>
<summary>Answer</summary>

```javascript
const express = require('express')
const timeout = require('connect-timeout')

const app = express()

// Timeout context manager
class TimeoutContext {
  constructor(req) {
    this.req = req
    this.aborted = false
  }

  check() {
    if (this.req.timedout) {
      this.aborted = true
      throw new Error('Operation aborted due to timeout')
    }
    return true
  }

  async run(fn) {
    if (this.req.timedout) return null
    return await fn()
  }
}

// Middleware to add timeout context
app.use(timeout('30s'))
app.use((req, res, next) => {
  req.timeoutContext = new TimeoutContext(req)
  next()
})

// Async handler wrapper
function withTimeout(handler) {
  return async (req, res, next) => {
    const ctx = req.timeoutContext

    try {
      const result = await handler(req, res, ctx)

      if (!req.timedout && !res.headersSent) {
        res.json(result)
      }
    } catch (err) {
      if (!req.timedout) {
        next(err)
      }
    }
  }
}

// Usage
app.get('/complex', withTimeout(async (req, res, ctx) => {
  // Step 1: Database query
  ctx.check()
  const users = await ctx.run(() => User.find())

  // Step 2: External API call
  ctx.check()
  const enriched = await ctx.run(() => enrichUsers(users))

  // Step 3: Processing
  ctx.check()
  const processed = processData(enriched)

  return { users: processed }
}))

// Streaming with timeout
app.get('/stream', timeout('60s'), (req, res) => {
  const stream = createDataStream()

  req.on('timeout', () => {
    stream.destroy()
    if (!res.headersSent) {
      res.status(503).end()
    }
  })

  stream.on('data', (chunk) => {
    if (!req.timedout) {
      res.write(chunk)
    }
  })

  stream.on('end', () => {
    if (!req.timedout) {
      res.end()
    }
  })
})

// Cleanup on timeout
app.post('/process', timeout('30s'), async (req, res, next) => {
  const resources = []

  req.on('timeout', async () => {
    // Cleanup any acquired resources
    for (const resource of resources) {
      await resource.release()
    }
  })

  try {
    resources.push(await acquireResource())
    // ... processing
    if (!req.timedout) {
      res.json({ success: true })
    }
  } catch (err) {
    if (!req.timedout) next(err)
  } finally {
    // Release resources
    for (const resource of resources) {
      await resource.release()
    }
  }
})
```
</details>

## Related Topics

- [Middleware Fundamentals Questions](../middleware-fundamentals/QUESTIONS.md)
- [Built-in Middleware Questions](../built-in/QUESTIONS.md)
- [Security Questions](../../advanced/security/QUESTIONS.md)
