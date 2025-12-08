# Middleware Summary

Quick reference for Express.js middleware.

---

## Middleware Pattern

```javascript
// The middleware signature
function middleware(req, res, next) {
  // 1. Execute code
  // 2. Modify req/res
  // 3. Call next() or end response
}

// Error handler (4 params)
function errorHandler(err, req, res, next) {
  res.status(500).json({ error: err.message })
}
```

## Middleware Types

| Type | Usage |
|------|-------|
| Application-level | `app.use(middleware)` |
| Router-level | `router.use(middleware)` |
| Error-handling | 4 parameters: `(err, req, res, next)` |
| Built-in | `express.json()`, `express.static()` |
| Third-party | npm packages |

## Built-in Middleware

```javascript
app.use(express.json())                    // Parse JSON bodies
app.use(express.urlencoded({ extended: true }))  // Parse forms
app.use(express.static('public'))          // Serve static files
app.use(express.raw())                     // Parse raw bodies
app.use(express.text())                    // Parse text bodies
```

## Essential Third-Party

```javascript
const helmet = require('helmet')
const cors = require('cors')
const morgan = require('morgan')
const compression = require('compression')

app.use(helmet())          // Security headers
app.use(cors())            // CORS
app.use(morgan('dev'))     // Logging
app.use(compression())     // Gzip compression
```

## Recommended Order

```javascript
// 1. Security
app.use(helmet())
app.use(cors())

// 2. Compression
app.use(compression())

// 3. Logging
app.use(morgan('dev'))

// 4. Rate limiting
app.use(rateLimit({ ... }))

// 5. Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 6. Static files
app.use(express.static('public'))

// 7. Session/Auth
app.use(session({ ... }))
app.use(passport.initialize())

// 8. Routes
app.use('/api', routes)

// 9. 404 handler
app.use((req, res) => res.status(404).send('Not Found'))

// 10. Error handler (LAST)
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message })
})
```

## Common Patterns

### Authentication Middleware

```javascript
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token' })
  try {
    req.user = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
```

### Async Handler

```javascript
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.findAll()
  res.json(users)
}))
```

### Configurable Middleware

```javascript
function logger(options = {}) {
  return (req, res, next) => {
    if (options.detailed) {
      console.log(`${req.method} ${req.path} - ${req.ip}`)
    } else {
      console.log(`${req.method} ${req.path}`)
    }
    next()
  }
}

app.use(logger({ detailed: true }))
```

---

## Quick Reference Table

| Package | Purpose | Install |
|---------|---------|---------|
| helmet | Security headers | `npm i helmet` |
| cors | Cross-origin requests | `npm i cors` |
| morgan | HTTP logging | `npm i morgan` |
| compression | Response compression | `npm i compression` |
| express-session | Sessions | `npm i express-session` |
| passport | Authentication | `npm i passport` |
| multer | File uploads | `npm i multer` |
| express-validator | Validation | `npm i express-validator` |
| express-rate-limit | Rate limiting | `npm i express-rate-limit` |

---

*Middleware is the heart of Express applications.*
