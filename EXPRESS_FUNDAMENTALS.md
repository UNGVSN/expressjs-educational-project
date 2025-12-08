# Express.js Fundamentals Reference

> Based on official Express.js documentation - the definitive guide for Node.js web applications

This document serves as your reference guide for understanding the core principles and design decisions in Express.js.

---

## Table of Contents

1. [What is Express.js](#1-what-is-expressjs)
2. [Core Architecture](#2-core-architecture)
3. [The Request-Response Cycle](#3-the-request-response-cycle)
4. [Middleware System](#4-middleware-system)
5. [Routing System](#5-routing-system)
6. [Application Settings](#6-application-settings)
7. [Error Handling](#7-error-handling)
8. [Template Engines](#8-template-engines)
9. [Security Best Practices](#9-security-best-practices)
10. [Performance Best Practices](#10-performance-best-practices)
11. [Quick Reference](#11-quick-reference)

---

## 1. What is Express.js

### 1.1 Definition

**Express.js** is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.

**Key Characteristics:**
- **Minimal** - Unopinionated, doesn't force a specific structure
- **Flexible** - Easily extensible through middleware
- **Fast** - Thin layer over Node.js HTTP module
- **Robust** - Battle-tested in production environments

### 1.2 Express Philosophy

| Principle | Description |
|-----------|-------------|
| **Minimalism** | Core is small; functionality added via middleware |
| **Flexibility** | No required directory structure or patterns |
| **Middleware-centric** | Everything flows through middleware pipeline |
| **HTTP-focused** | Built specifically for HTTP servers |

### 1.3 When to Use Express

**Best For:**
- REST APIs
- Single-page application backends
- Server-rendered web applications
- Microservices
- API gateways

**Consider Alternatives For:**
- Real-time applications (consider Socket.io with Express)
- GraphQL-only APIs (consider Apollo Server)
- Highly opinionated structure needs (consider NestJS)

---

## 2. Core Architecture

### 2.1 The Express() Function

```javascript
const express = require('express')
const app = express()
```

**What `express()` returns:**
- An Express application object
- This is NOT a constructor (no `new` keyword)
- The app object has methods for routing and middleware

### 2.2 Core Objects

| Object | Purpose | Access |
|--------|---------|--------|
| `app` | Application instance | `express()` |
| `req` | Request object | Handler parameter |
| `res` | Response object | Handler parameter |
| `router` | Mini-application | `express.Router()` |

### 2.3 Object Relationships

```
express()
    │
    ▼
┌─────────┐
│   app   │ ─── Application Settings
│         │ ─── Middleware Stack
│         │ ─── Route Table
└────┬────┘
     │
     ▼ HTTP Request
┌─────────┐     ┌─────────┐
│   req   │ ──► │   res   │
│         │     │         │
│ Request │     │Response │
│  Data   │     │ Methods │
└─────────┘     └─────────┘
```

### 2.4 Application vs Router

```javascript
// Application - full Express app
const app = express()

// Router - "mini-app" for modular routes
const router = express.Router()

// Routers are mounted on apps
app.use('/api', router)
```

**Key Difference:**
- `app` can listen on a port
- `router` is mounted on an `app`
- Both support middleware and routing

---

## 3. The Request-Response Cycle

### 3.1 Lifecycle Overview

```
Client Request
      │
      ▼
┌─────────────────────┐
│  Express Server     │
│                     │
│  1. Receive Request │
│  2. Parse Headers   │
│  3. Create req/res  │
│  4. Run Middleware  │
│  5. Match Route     │
│  6. Execute Handler │
│  7. Send Response   │
└─────────────────────┘
      │
      ▼
Client Response
```

### 3.2 Request Object (req)

**Key Properties:**

| Property | Description | Example |
|----------|-------------|---------|
| `req.params` | Route parameters | `/users/:id` → `{ id: '123' }` |
| `req.query` | Query string | `?sort=name` → `{ sort: 'name' }` |
| `req.body` | Request body | `{ name: 'John' }` (requires middleware) |
| `req.headers` | HTTP headers | `{ 'content-type': 'application/json' }` |
| `req.method` | HTTP method | `'GET'`, `'POST'` |
| `req.path` | URL path | `/users/123` |
| `req.url` | Full URL | `/users/123?sort=name` |

**Key Methods:**

```javascript
req.get('Content-Type')     // Get header value
req.is('json')              // Check content type
req.accepts('html')         // Check Accept header
```

### 3.3 Response Object (res)

**Key Methods:**

| Method | Purpose | Example |
|--------|---------|---------|
| `res.send()` | Send response | `res.send('Hello')` |
| `res.json()` | Send JSON | `res.json({ name: 'John' })` |
| `res.status()` | Set status code | `res.status(404)` |
| `res.redirect()` | Redirect | `res.redirect('/login')` |
| `res.render()` | Render template | `res.render('index', { title: 'Home' })` |
| `res.sendFile()` | Send file | `res.sendFile('/path/to/file')` |
| `res.cookie()` | Set cookie | `res.cookie('token', 'abc123')` |
| `res.set()` | Set header | `res.set('X-Custom', 'value')` |

**Chaining:**

```javascript
res.status(201).json({ created: true })
```

### 3.4 Ending the Cycle

**Methods that end the response:**
- `res.send()`
- `res.json()`
- `res.end()`
- `res.sendFile()`
- `res.redirect()`
- `res.render()`

**Critical Rule:** Only ONE response can be sent per request.

```javascript
// WRONG - headers already sent error
app.get('/', (req, res) => {
  res.send('Hello')
  res.send('World')  // Error!
})

// CORRECT
app.get('/', (req, res) => {
  res.send('Hello World')
})
```

---

## 4. Middleware System

### 4.1 What is Middleware?

**Middleware** functions have access to:
- Request object (`req`)
- Response object (`res`)
- Next function (`next`)

**Middleware Can:**
- Execute any code
- Modify request/response objects
- End the request-response cycle
- Call the next middleware

### 4.2 Middleware Signature

```javascript
function middleware(req, res, next) {
  // Do something
  next()  // Call next middleware
}
```

**Critical Rule:** If middleware doesn't end the cycle, it MUST call `next()`.

### 4.3 Types of Middleware

| Type | Description | Example |
|------|-------------|---------|
| **Application-level** | Bound to `app` | `app.use(logger)` |
| **Router-level** | Bound to `router` | `router.use(auth)` |
| **Error-handling** | Four parameters | `(err, req, res, next)` |
| **Built-in** | Included with Express | `express.json()` |
| **Third-party** | npm packages | `helmet`, `cors` |

### 4.4 Middleware Execution Order

```javascript
const express = require('express')
const app = express()

// 1. Runs first
app.use((req, res, next) => {
  console.log('1. First middleware')
  next()
})

// 2. Runs second
app.use((req, res, next) => {
  console.log('2. Second middleware')
  next()
})

// 3. Runs third (route handler)
app.get('/', (req, res) => {
  console.log('3. Route handler')
  res.send('Hello')
})
```

**Output:**
```
1. First middleware
2. Second middleware
3. Route handler
```

### 4.5 Skipping Middleware

```javascript
// Skip remaining middleware in this router
next('route')

// Skip to error handler
next(new Error('Something wrong'))

// Skip all remaining non-error middleware
next('router')
```

### 4.6 Built-in Middleware

```javascript
// Parse JSON bodies
app.use(express.json())

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }))

// Serve static files
app.use(express.static('public'))
```

---

## 5. Routing System

### 5.1 Route Definition

```
app.METHOD(PATH, HANDLER)
```

| Component | Description |
|-----------|-------------|
| `app` | Express application instance |
| `METHOD` | HTTP method (get, post, put, delete, etc.) |
| `PATH` | URL path or pattern |
| `HANDLER` | Function executed when route matches |

### 5.2 HTTP Methods

```javascript
app.get('/', handler)      // Read
app.post('/', handler)     // Create
app.put('/', handler)      // Update (full)
app.patch('/', handler)    // Update (partial)
app.delete('/', handler)   // Delete
app.all('/', handler)      // All methods
```

### 5.3 Route Paths

**String Paths:**
```javascript
app.get('/', handler)           // Exact match
app.get('/users', handler)      // Exact match
app.get('/users/profile', handler)
```

**Pattern Paths:**
```javascript
app.get('/ab?cd', handler)      // acd or abcd
app.get('/ab+cd', handler)      // abcd, abbcd, abbbcd...
app.get('/ab*cd', handler)      // abcd, abXcd, abANYTHINGcd
```

**Regular Expression Paths:**
```javascript
app.get(/a/, handler)           // Contains 'a'
app.get(/.*fly$/, handler)      // Ends with 'fly'
```

### 5.4 Route Parameters

```javascript
// Single parameter
app.get('/users/:id', (req, res) => {
  res.send(`User ID: ${req.params.id}`)
})

// Multiple parameters
app.get('/users/:userId/books/:bookId', (req, res) => {
  res.json(req.params)
  // { userId: '34', bookId: '8989' }
})

// With constraints
app.get('/user/:id(\\d+)', (req, res) => {
  // Only matches numeric IDs
})
```

### 5.5 Route Handlers

**Single Handler:**
```javascript
app.get('/', (req, res) => {
  res.send('Hello')
})
```

**Multiple Handlers:**
```javascript
app.get('/',
  (req, res, next) => {
    console.log('First handler')
    next()
  },
  (req, res) => {
    res.send('Second handler')
  }
)
```

**Array of Handlers:**
```javascript
const cb0 = (req, res, next) => { next() }
const cb1 = (req, res, next) => { next() }
const cb2 = (req, res) => { res.send('Done') }

app.get('/', [cb0, cb1, cb2])
```

### 5.6 Response Methods

| Method | Description |
|--------|-------------|
| `res.download()` | Prompt file download |
| `res.end()` | End response |
| `res.json()` | Send JSON response |
| `res.jsonp()` | Send JSONP response |
| `res.redirect()` | Redirect request |
| `res.render()` | Render view template |
| `res.send()` | Send response |
| `res.sendFile()` | Send file |
| `res.sendStatus()` | Set status and send |

### 5.7 app.route() - Chainable Routes

```javascript
app.route('/book')
  .get((req, res) => {
    res.send('Get a random book')
  })
  .post((req, res) => {
    res.send('Add a book')
  })
  .put((req, res) => {
    res.send('Update the book')
  })
```

### 5.8 express.Router() - Modular Routing

**birds.js:**
```javascript
const express = require('express')
const router = express.Router()

router.use((req, res, next) => {
  console.log('Time:', Date.now())
  next()
})

router.get('/', (req, res) => {
  res.send('Birds home page')
})

router.get('/about', (req, res) => {
  res.send('About birds')
})

module.exports = router
```

**app.js:**
```javascript
const birds = require('./birds')
app.use('/birds', birds)
```

---

## 6. Application Settings

### 6.1 Setting and Getting

```javascript
// Set a setting
app.set('view engine', 'pug')

// Get a setting
app.get('view engine')  // 'pug'

// Boolean shortcuts
app.enable('trust proxy')   // app.set('trust proxy', true)
app.disable('x-powered-by') // app.set('x-powered-by', false)

// Check boolean
app.enabled('trust proxy')  // true or false
app.disabled('x-powered-by') // true or false
```

### 6.2 Common Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `env` | String | `NODE_ENV` or `'development'` | Environment mode |
| `trust proxy` | Various | `false` | Trust reverse proxy headers |
| `view cache` | Boolean | `true` in production | Cache compiled views |
| `view engine` | String | undefined | Default template engine |
| `views` | String/Array | `./views` | View template directory |
| `case sensitive routing` | Boolean | `false` | `/Foo` ≠ `/foo` |
| `strict routing` | Boolean | `false` | `/foo` ≠ `/foo/` |
| `x-powered-by` | Boolean | `true` | Send `X-Powered-By` header |
| `query parser` | Various | `'simple'` | Query string parser |

### 6.3 Trust Proxy Settings

```javascript
// Trust all proxies (use with caution)
app.set('trust proxy', true)

// Trust specific proxies
app.set('trust proxy', 'loopback')
app.set('trust proxy', '127.0.0.1')
app.set('trust proxy', ['loopback', '10.0.0.0/8'])

// Trust n hops
app.set('trust proxy', 2)

// Custom function
app.set('trust proxy', (ip) => {
  return ip === '127.0.0.1'
})
```

---

## 7. Error Handling

### 7.1 Synchronous Errors

Express catches synchronous errors automatically:

```javascript
app.get('/', (req, res) => {
  throw new Error('BROKEN')  // Express catches this
})
```

### 7.2 Asynchronous Errors

Must be passed to `next()`:

```javascript
app.get('/', (req, res, next) => {
  fs.readFile('/file', (err, data) => {
    if (err) {
      next(err)  // Pass to error handler
    } else {
      res.send(data)
    }
  })
})
```

### 7.3 Promise/Async Errors (Express 5+)

Express 5 automatically catches promise rejections:

```javascript
app.get('/', async (req, res) => {
  const user = await getUser()  // Errors auto-caught
  res.json(user)
})
```

### 7.4 Error-Handling Middleware

**Must have FOUR parameters:**

```javascript
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})
```

### 7.5 Error Handler Order

Error handlers must be defined LAST:

```javascript
// Regular middleware
app.use(express.json())

// Routes
app.get('/', handler)
app.post('/users', handler)

// 404 handler (after all routes)
app.use((req, res, next) => {
  res.status(404).send('Not Found')
})

// Error handler (very last)
app.use((err, req, res, next) => {
  res.status(500).send('Error')
})
```

### 7.6 Multiple Error Handlers

```javascript
// Log errors
function logErrors(err, req, res, next) {
  console.error(err.stack)
  next(err)
}

// Handle client errors
function clientErrorHandler(err, req, res, next) {
  if (req.xhr) {
    res.status(500).json({ error: 'Something failed!' })
  } else {
    next(err)
  }
}

// Final error handler
function errorHandler(err, req, res, next) {
  res.status(500).render('error', { error: err })
}

app.use(logErrors)
app.use(clientErrorHandler)
app.use(errorHandler)
```

---

## 8. Template Engines

### 8.1 Setup

```javascript
// Set template directory
app.set('views', './views')

// Set template engine
app.set('view engine', 'pug')
```

### 8.2 Rendering Views

```javascript
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Home',
    message: 'Hello!'
  })
})
```

### 8.3 Common Template Engines

| Engine | File Extension | Style |
|--------|---------------|-------|
| **Pug** | `.pug` | Whitespace-based |
| **EJS** | `.ejs` | HTML with JS |
| **Handlebars** | `.hbs` | Mustache-style |

### 8.4 Example: Pug Template

**views/index.pug:**
```pug
html
  head
    title= title
  body
    h1= message
```

**Rendered HTML:**
```html
<html>
  <head>
    <title>Home</title>
  </head>
  <body>
    <h1>Hello!</h1>
  </body>
</html>
```

---

## 9. Security Best Practices

### 9.1 Use Helmet

```javascript
const helmet = require('helmet')
app.use(helmet())
```

**Headers set by Helmet:**
- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-XSS-Protection`

### 9.2 Disable X-Powered-By

```javascript
app.disable('x-powered-by')
```

### 9.3 Secure Cookies

```javascript
app.use(session({
  name: 'sessionId',  // Don't use default name
  cookie: {
    secure: true,     // HTTPS only
    httpOnly: true,   // No JavaScript access
    sameSite: 'strict'
  }
}))
```

### 9.4 Validate Input

```javascript
// Use validation middleware
const { body, validationResult } = require('express-validator')

app.post('/user',
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    // Process valid input
  }
)
```

### 9.5 Rate Limiting

```javascript
const rateLimit = require('express-rate-limit')

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})

app.use(limiter)
```

### 9.6 HTTPS

- Use TLS for all connections
- Get certificates from Let's Encrypt
- Use Nginx as reverse proxy for TLS termination

---

## 10. Performance Best Practices

### 10.1 Use Compression

```javascript
const compression = require('compression')
app.use(compression())
```

### 10.2 Set NODE_ENV

```bash
NODE_ENV=production node app.js
```

**Production mode enables:**
- View template caching
- Less verbose error messages
- Various internal optimizations

### 10.3 Avoid Synchronous Functions

```javascript
// BAD - blocks event loop
const data = fs.readFileSync('/file')

// GOOD - non-blocking
fs.readFile('/file', (err, data) => {
  // ...
})

// BETTER - async/await
const data = await fs.promises.readFile('/file')
```

### 10.4 Use Caching

```javascript
// Cache static files
app.use(express.static('public', {
  maxAge: '1d'  // Cache for 1 day
}))

// Use Redis for session/data caching
```

### 10.5 Use Clustering

```javascript
const cluster = require('cluster')
const numCPUs = require('os').cpus().length

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }
} else {
  app.listen(3000)
}
```

Or use PM2:
```bash
pm2 start app.js -i max
```

### 10.6 Use Reverse Proxy

Run Express behind Nginx for:
- Static file serving
- SSL termination
- Load balancing
- Caching
- Compression

---

## 11. Quick Reference

### 11.1 Application Methods

| Method | Description |
|--------|-------------|
| `app.use()` | Mount middleware |
| `app.get()` | Route GET requests |
| `app.post()` | Route POST requests |
| `app.put()` | Route PUT requests |
| `app.delete()` | Route DELETE requests |
| `app.all()` | Route all HTTP methods |
| `app.route()` | Create chainable route |
| `app.listen()` | Start HTTP server |
| `app.set()` | Set setting |
| `app.enable()` | Enable boolean setting |
| `app.disable()` | Disable boolean setting |
| `app.render()` | Render view |

### 11.2 Request Properties

| Property | Description |
|----------|-------------|
| `req.params` | Route parameters |
| `req.query` | Query string |
| `req.body` | Request body |
| `req.headers` | HTTP headers |
| `req.method` | HTTP method |
| `req.path` | URL path |
| `req.url` | Full URL |
| `req.ip` | Client IP |
| `req.cookies` | Cookies |

### 11.3 Response Methods

| Method | Description |
|--------|-------------|
| `res.send()` | Send response |
| `res.json()` | Send JSON |
| `res.status()` | Set status |
| `res.redirect()` | Redirect |
| `res.render()` | Render view |
| `res.sendFile()` | Send file |
| `res.download()` | Download file |
| `res.cookie()` | Set cookie |
| `res.set()` | Set header |

### 11.4 Common Status Codes

| Code | Meaning | Method |
|------|---------|--------|
| 200 | OK | `res.sendStatus(200)` |
| 201 | Created | `res.status(201).json(data)` |
| 204 | No Content | `res.status(204).end()` |
| 400 | Bad Request | `res.status(400).json(error)` |
| 401 | Unauthorized | `res.status(401).json(error)` |
| 403 | Forbidden | `res.status(403).json(error)` |
| 404 | Not Found | `res.status(404).json(error)` |
| 500 | Server Error | `res.status(500).json(error)` |

### 11.5 Middleware Order

```javascript
// 1. Security headers (helmet)
// 2. Request logging (morgan)
// 3. Compression
// 4. Body parsing
// 5. Cookie parsing
// 6. Session handling
// 7. Authentication
// 8. Routes
// 9. 404 handler
// 10. Error handler
```

---

*Reference: [Express.js Official Documentation](https://expressjs.com)*
