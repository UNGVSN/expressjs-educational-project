# Middleware Fundamentals Questions

**Q1: What are the three parameters of a middleware function?**

<details>
<summary>Answer</summary>

```javascript
function middleware(req, res, next) {
  // req - Request object (incoming data)
  // res - Response object (outgoing data)
  // next - Function to pass control to next middleware
}
```

| Parameter | Purpose |
|-----------|---------|
| `req` | Access request data, add custom properties |
| `res` | Send response, add helper methods |
| `next` | Continue chain or pass errors |
</details>

---

**Q2: What happens if you don't call next()?**

<details>
<summary>Answer</summary>

The request hangs - no further middleware or routes execute:

```javascript
app.use((req, res, next) => {
  console.log('This runs')
  // next() not called!
})

app.get('/', (req, res) => {
  // This NEVER runs
  res.send('Hello')
})
```

Either call `next()` to continue OR end the request with `res.send()`.
</details>

---

**Q3: How do you pass data between middleware?**

<details>
<summary>Answer</summary>

Attach properties to the `req` object:

```javascript
// First middleware
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID()
  req.startTime = Date.now()
  next()
})

// Later middleware
app.use((req, res, next) => {
  console.log(`Request ${req.requestId} started at ${req.startTime}`)
  next()
})
```
</details>

---

**Q4: How do you create configurable middleware?**

<details>
<summary>Answer</summary>

Use the factory pattern - return a function from a function:

```javascript
function rateLimit(options) {
  const { windowMs = 60000, max = 100 } = options
  const requests = new Map()

  // Return the actual middleware
  return (req, res, next) => {
    const ip = req.ip
    // Rate limiting logic using options...
    next()
  }
}

// Usage - factory is called, returns middleware
app.use(rateLimit({ windowMs: 60000, max: 50 }))
```
</details>

---

**Q5: What's the difference between next() and next(error)?**

<details>
<summary>Answer</summary>

```javascript
// next() - Continue to next middleware
app.use((req, res, next) => {
  next()  // Goes to next middleware in stack
})

// next(error) - Skip to error handler
app.use((req, res, next) => {
  if (!req.body.name) {
    const err = new Error('Name required')
    err.status = 400
    return next(err)  // Skips to error handling middleware
  }
  next()
})

// Error handler (4 parameters)
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message })
})
```
</details>

---

**Q6: How do you handle async middleware properly?**

<details>
<summary>Answer</summary>

Wrap async functions to catch promise rejections:

```javascript
// Wrapper function
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

// Usage
app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.findAll()  // If this throws...
  res.json(users)
}))
// ...error is automatically passed to error handler
```

Express 5 handles this automatically.
</details>

---

**Q7: Why does middleware order matter?**

<details>
<summary>Answer</summary>

Middleware executes in the order it's defined:

```javascript
// WRONG ORDER
app.post('/users', (req, res) => {
  console.log(req.body)  // undefined - parser not run yet!
})
app.use(express.json())  // Too late!

// CORRECT ORDER
app.use(express.json())  // Parse body first
app.post('/users', (req, res) => {
  console.log(req.body)  // { name: 'John' }
})
```

Rule: Middleware that prepares data must come before middleware that uses it.
</details>

---

**Q8: How do you apply middleware to only specific routes?**

<details>
<summary>Answer</summary>

Three ways:

```javascript
// 1. Path prefix with app.use
app.use('/api', apiMiddleware)

// 2. Route-specific middleware
app.get('/admin', authenticate, authorize, adminHandler)

// 3. Router-level middleware
const adminRouter = express.Router()
adminRouter.use(authenticate)
adminRouter.use(authorize)
app.use('/admin', adminRouter)
```
</details>

---

**Q9: How do you intercept responses in middleware?**

<details>
<summary>Answer</summary>

Override response methods or use events:

```javascript
// Method override
app.use((req, res, next) => {
  const originalJson = res.json

  res.json = function(data) {
    console.log('Response data:', data)
    return originalJson.call(this, data)
  }

  next()
})

// Response events
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`${res.statusCode} - ${Date.now() - req.startTime}ms`)
  })
  next()
})
```
</details>

---

**Q10: What does next('route') do?**

<details>
<summary>Answer</summary>

Skips remaining handlers for the current route:

```javascript
app.get('/user/:id',
  (req, res, next) => {
    if (req.params.id === '0') {
      return next('route')  // Skip to next app.get('/user/:id')
    }
    next()
  },
  (req, res) => {
    res.send('Regular user')  // Skipped when id is '0'
  }
)

app.get('/user/:id', (req, res) => {
  res.send('Special case for id 0')  // Runs when id is '0'
})
```
</details>

---

## Self-Assessment

- [ ] I understand the three middleware parameters (req, res, next)
- [ ] I know what happens when next() is not called
- [ ] I can pass data between middleware using req
- [ ] I can create configurable middleware with the factory pattern
- [ ] I understand the difference between next() and next(error)
- [ ] I can handle async middleware properly
- [ ] I understand why middleware order matters
- [ ] I can apply middleware to specific routes
- [ ] I can intercept responses in middleware

---

*Mastering middleware fundamentals is essential for Express development.*
