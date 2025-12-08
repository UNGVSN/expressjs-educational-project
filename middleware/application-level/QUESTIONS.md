# Application-Level Middleware Questions

**Q1: What's the difference between app.use() and app.get()?**

<details>
<summary>Answer</summary>

| Feature | app.use() | app.get() |
|---------|-----------|-----------|
| HTTP Method | All methods | GET only |
| Path Matching | Prefix-based | Exact (with params) |
| Purpose | Middleware | Route handler |

```javascript
app.use('/api', middleware)
// Matches: /api, /api/users, /api/users/123

app.get('/api', handler)
// Matches: /api only

app.get('/api/:resource', handler)
// Matches: /api/users, /api/posts (exact with param)
```
</details>

---

**Q2: What happens to req.path when middleware is mounted with a path?**

<details>
<summary>Answer</summary>

The mount path is stripped from `req.path`:

```javascript
app.use('/api', (req, res, next) => {
  // For request to /api/users/123:
  req.originalUrl  // '/api/users/123' - original
  req.baseUrl      // '/api' - mount path
  req.path         // '/users/123' - stripped!
  next()
})
```
</details>

---

**Q3: How do you apply middleware to multiple paths?**

<details>
<summary>Answer</summary>

```javascript
// Array of paths
app.use(['/api', '/v1', '/v2'], apiMiddleware)

// Or multiple app.use calls
app.use('/api', apiMiddleware)
app.use('/v1', apiMiddleware)
app.use('/v2', apiMiddleware)
```
</details>

---

**Q4: What's the correct order for common middleware?**

<details>
<summary>Answer</summary>

```javascript
// 1. Security first
app.use(helmet())

// 2. CORS before routes
app.use(cors())

// 3. Logging
app.use(morgan('dev'))

// 4. Body parsers
app.use(express.json())

// 5. Static files (often before auth)
app.use(express.static('public'))

// 6. Authentication
app.use(authenticate)

// 7. Routes
app.use('/api', routes)

// 8. 404 handler
app.use(notFoundHandler)

// 9. Error handler (always last)
app.use(errorHandler)
```
</details>

---

**Q5: How do you skip middleware for certain paths?**

<details>
<summary>Answer</summary>

```javascript
// Helper function
function unless(paths, middleware) {
  return (req, res, next) => {
    if (paths.some(p => req.path.startsWith(p))) {
      return next()
    }
    middleware(req, res, next)
  }
}

// Usage: Skip auth for public routes
app.use(unless(['/login', '/register'], authenticate))
```
</details>

---

**Q6: How do you mount a sub-application?**

<details>
<summary>Answer</summary>

```javascript
// api.js
const api = express()
api.get('/users', getUsers)
api.post('/users', createUser)
module.exports = api

// app.js
const api = require('./api')
app.use('/api', api)

// Routes become: GET /api/users, POST /api/users
```
</details>

---

**Q7: How do you create middleware that adds response helpers?**

<details>
<summary>Answer</summary>

```javascript
app.use((req, res, next) => {
  res.success = function(data, status = 200) {
    return this.status(status).json({ success: true, data })
  }

  res.error = function(message, status = 400) {
    return this.status(status).json({ success: false, error: message })
  }

  next()
})

// Usage
app.get('/user/:id', (req, res) => {
  const user = findUser(req.params.id)
  if (!user) return res.error('Not found', 404)
  res.success(user)
})
```
</details>

---

**Q8: How do you apply middleware to a specific route with multiple handlers?**

<details>
<summary>Answer</summary>

```javascript
// Method 1: Inline middleware array
app.post('/users',
  authenticate,
  validateBody(userSchema),
  authorize('admin'),
  createUser
)

// Method 2: Array syntax
app.post('/users', [authenticate, validateBody(userSchema), authorize('admin')], createUser)

// All handlers execute in order if each calls next()
```
</details>

---

**Q9: What does app.all() do?**

<details>
<summary>Answer</summary>

Matches all HTTP methods for a path:

```javascript
// Runs for GET, POST, PUT, DELETE, etc. to /users
app.all('/users', (req, res, next) => {
  console.log(`${req.method} /users`)
  next()
})

// Common use: API key validation for all methods
app.all('/api/*', validateApiKey)
```
</details>

---

**Q10: How do you measure response time in middleware?**

<details>
<summary>Answer</summary>

```javascript
app.use((req, res, next) => {
  const start = process.hrtime()

  // Override res.send to capture timing
  const originalSend = res.send
  res.send = function(...args) {
    const [seconds, nanoseconds] = process.hrtime(start)
    const ms = (seconds * 1000 + nanoseconds / 1e6).toFixed(2)
    res.set('X-Response-Time', `${ms}ms`)
    return originalSend.apply(this, args)
  }

  next()
})
```
</details>

---

## Self-Assessment

- [ ] I understand the difference between app.use() and app.METHOD()
- [ ] I know how path matching and stripping work
- [ ] I can apply middleware to specific paths
- [ ] I understand the recommended middleware order
- [ ] I can skip middleware for certain routes
- [ ] I can mount sub-applications
- [ ] I can create middleware that enhances req/res
- [ ] I understand app.all() behavior

---

*Application-level middleware is essential for Express development.*
