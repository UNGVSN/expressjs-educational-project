# Express Session

Session middleware for Express that stores session data on the server and manages session cookies.

## Installation

```bash
npm install express-session
```

## Basic Usage

```javascript
const express = require('express')
const session = require('express-session')

const app = express()

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}))

app.get('/', (req, res) => {
  // Access session data
  req.session.views = (req.session.views || 0) + 1
  res.send(`Views: ${req.session.views}`)
})
```

## How Sessions Work

```
1. First Request (no session)
   Browser → Server
   Server creates session, stores data, sets cookie
   Server → Browser (Set-Cookie: connect.sid=abc123)

2. Subsequent Requests
   Browser → Server (Cookie: connect.sid=abc123)
   Server looks up session by ID
   Session data available in req.session
```

## Options

```javascript
app.use(session({
  cookie: {
    domain: '.example.com',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,  // 1 day
    path: '/',
    sameSite: 'lax',
    secure: false
  },
  genid: (req) => uuid(),
  name: 'connect.sid',
  proxy: undefined,
  resave: false,
  rolling: false,
  saveUninitialized: false,
  secret: 'keyboard cat',
  store: new MemoryStore(),
  unset: 'keep'
}))
```

### secret (Required)

```javascript
// Single secret
app.use(session({
  secret: process.env.SESSION_SECRET
}))

// Multiple secrets (for rotation)
app.use(session({
  secret: ['current-secret', 'old-secret']
}))
// New sessions use first secret
// Old sessions validated against all secrets
```

### cookie

```javascript
app.use(session({
  cookie: {
    // Cookie domain
    domain: '.example.com',  // All subdomains

    // Prevent JavaScript access
    httpOnly: true,  // Default: true

    // Cookie lifetime (milliseconds)
    maxAge: 24 * 60 * 60 * 1000,  // 1 day
    // expires: new Date(...)  // Alternative

    // Cookie path
    path: '/',  // Default

    // CSRF protection
    sameSite: 'lax',   // 'strict', 'lax', 'none'

    // HTTPS only
    secure: process.env.NODE_ENV === 'production'
  }
}))
```

### resave

```javascript
// Resave session even if not modified
app.use(session({
  resave: false  // Recommended: false
}))
// true: Always save (may cause race conditions)
// false: Only save if modified
```

### saveUninitialized

```javascript
// Save new sessions that haven't been modified
app.use(session({
  saveUninitialized: false  // Recommended: false
}))
// true: Save all new sessions
// false: Don't save empty sessions (better for compliance)
```

### rolling

```javascript
// Reset cookie maxAge on every response
app.use(session({
  rolling: true  // Extend session on activity
}))
```

### name

```javascript
// Change cookie name (default: connect.sid)
app.use(session({
  name: 'myapp.sid'
}))
```

## Session Stores

### Memory Store (Default - Development Only)

```javascript
// WARNING: Not for production!
// - Memory leak risk
// - Lost on restart
// - Not scalable
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
  // Uses MemoryStore by default
}))
```

### Redis Store

```bash
npm install connect-redis redis
```

```javascript
const RedisStore = require('connect-redis').default
const { createClient } = require('redis')

const redisClient = createClient({ url: process.env.REDIS_URL })
redisClient.connect()

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
```

### MongoDB Store

```bash
npm install connect-mongo
```

```javascript
const MongoStore = require('connect-mongo')

app.use(session({
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60  // 1 day in seconds
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
```

### PostgreSQL Store

```bash
npm install connect-pg-simple pg
```

```javascript
const PgStore = require('connect-pg-simple')(session)
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

app.use(session({
  store: new PgStore({ pool }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
```

## Session API

### Read/Write Data

```javascript
app.get('/profile', (req, res) => {
  // Read session data
  const user = req.session.user

  // Write session data
  req.session.lastAccess = new Date()

  res.json({ user, lastAccess: req.session.lastAccess })
})
```

### Session ID

```javascript
app.get('/info', (req, res) => {
  res.json({
    sessionID: req.sessionID,
    // or req.session.id
  })
})
```

### Regenerate Session

```javascript
// After login - prevent session fixation
app.post('/login', (req, res) => {
  // Authenticate user...

  req.session.regenerate((err) => {
    if (err) return res.status(500).send('Error')

    // Store user info in new session
    req.session.user = user
    res.redirect('/dashboard')
  })
})
```

### Destroy Session

```javascript
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).send('Error')

    res.clearCookie('connect.sid')
    res.redirect('/login')
  })
})
```

### Save Session

```javascript
// Force save session
app.post('/important', (req, res) => {
  req.session.importantData = data

  req.session.save((err) => {
    if (err) return res.status(500).send('Error')
    res.send('Saved')
  })
})
```

### Reload Session

```javascript
// Reload session from store
app.get('/refresh', (req, res) => {
  req.session.reload((err) => {
    if (err) return res.status(500).send('Error')
    res.json(req.session)
  })
})
```

### Touch Session

```javascript
// Update session expiry without modifying data
app.get('/keep-alive', (req, res) => {
  req.session.touch()
  res.send('Session refreshed')
})
```

## Common Patterns

### Authentication

```javascript
// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await authenticate(email, password)

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).send('Error')

    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role
    }

    res.json({ message: 'Logged in', user: req.session.user })
  })
})

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  next()
}

// Protected route
app.get('/dashboard', requireAuth, (req, res) => {
  res.json({ user: req.session.user })
})
```

### Flash Messages

```javascript
// Set flash message
app.post('/action', (req, res) => {
  // Do something...
  req.session.flash = { type: 'success', message: 'Action completed!' }
  res.redirect('/result')
})

// Display and clear flash
app.get('/result', (req, res) => {
  const flash = req.session.flash
  delete req.session.flash  // Clear after reading

  res.render('result', { flash })
})
```

### Shopping Cart

```javascript
// Add to cart
app.post('/cart/add', (req, res) => {
  const { productId, quantity } = req.body

  if (!req.session.cart) {
    req.session.cart = []
  }

  const existing = req.session.cart.find(item => item.productId === productId)
  if (existing) {
    existing.quantity += quantity
  } else {
    req.session.cart.push({ productId, quantity })
  }

  res.json({ cart: req.session.cart })
})

// View cart
app.get('/cart', (req, res) => {
  res.json({ cart: req.session.cart || [] })
})
```

### Production Configuration

```javascript
const session = require('express-session')
const RedisStore = require('connect-redis').default
const redis = require('redis')

const isProduction = process.env.NODE_ENV === 'production'

const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  name: 'myapp.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000  // 1 day
  }
}

// Use Redis in production
if (isProduction) {
  const redisClient = redis.createClient({ url: process.env.REDIS_URL })
  redisClient.connect()
  sessionConfig.store = new RedisStore({ client: redisClient })
}

// Trust proxy in production (if behind load balancer)
if (isProduction) {
  app.set('trust proxy', 1)
}

app.use(session(sessionConfig))
```

## Security Best Practices

```javascript
app.use(session({
  secret: process.env.SESSION_SECRET,  // Use env variable
  name: 'myapp.sid',                    // Change default name
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,        // Prevent XSS access
    secure: true,          // HTTPS only
    sameSite: 'strict',    // CSRF protection
    maxAge: 3600000        // Short lifetime
  }
}))

// Regenerate on privilege change
app.post('/login', (req, res) => {
  req.session.regenerate(...)  // New session ID
})

// Destroy completely on logout
app.post('/logout', (req, res) => {
  req.session.destroy(...)
  res.clearCookie('myapp.sid')
})
```

## Related

- [passport](../passport/) - Authentication
- [helmet](../helmet/) - Security headers

---

*Express Session is essential for maintaining user state across requests.*
