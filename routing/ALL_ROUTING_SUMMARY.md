# Routing Summary

Quick reference for Express.js routing.

---

## Route Definition

```javascript
app.METHOD(PATH, HANDLER)
```

| Component | Description |
|-----------|-------------|
| METHOD | get, post, put, patch, delete, all |
| PATH | String, pattern, or RegExp |
| HANDLER | Function(s) to handle request |

## HTTP Methods

```javascript
app.get('/path', handler)     // Read
app.post('/path', handler)    // Create
app.put('/path', handler)     // Replace
app.patch('/path', handler)   // Update
app.delete('/path', handler)  // Delete
app.all('/path', handler)     // All methods
```

## Route Paths

```javascript
// String
app.get('/users', handler)

// Pattern
app.get('/ab?cd', handler)    // acd, abcd
app.get('/ab+cd', handler)    // abcd, abbcd
app.get('/ab*cd', handler)    // ab<anything>cd

// RegExp
app.get(/.*fly$/, handler)    // butterfly, dragonfly

// Parameter
app.get('/users/:id', handler)
```

## Route Parameters

```javascript
// Single parameter
app.get('/users/:id', (req, res) => {
  req.params.id  // string
})

// Multiple
app.get('/users/:userId/posts/:postId', handler)

// Optional
app.get('/users/:id?', handler)

// Constrained
app.get('/users/:id(\\d+)', handler)  // Numbers only
```

## Route Handlers

```javascript
// Single
app.get('/path', (req, res) => { })

// Multiple
app.get('/path', auth, validate, handler)

// Array
app.get('/path', [auth, validate], handler)

// next()
app.get('/path', (req, res, next) => {
  next()  // Continue
  next(err)  // Error handler
  next('route')  // Skip to next route
})
```

## Router

```javascript
const router = express.Router()

router.get('/', handler)
router.post('/', handler)
router.use(middleware)

app.use('/prefix', router)
```

## Route Chaining

```javascript
app.route('/users')
  .get(list)
  .post(create)

app.route('/users/:id')
  .get(show)
  .put(update)
  .delete(destroy)
```

## RESTful Pattern

| Method | Path | Action |
|--------|------|--------|
| GET | /resources | List |
| GET | /resources/:id | Show |
| POST | /resources | Create |
| PUT | /resources/:id | Replace |
| PATCH | /resources/:id | Update |
| DELETE | /resources/:id | Delete |

---

## Quick Examples

### Basic CRUD

```javascript
app.get('/users', listUsers)
app.get('/users/:id', getUser)
app.post('/users', createUser)
app.put('/users/:id', updateUser)
app.delete('/users/:id', deleteUser)
```

### Nested Resources

```javascript
const postsRouter = express.Router({ mergeParams: true })
postsRouter.get('/', (req, res) => {
  res.json({ userId: req.params.userId })
})

app.use('/users/:userId/posts', postsRouter)
```

### Protected Routes

```javascript
app.use('/api', authenticate)
app.get('/api/data', getData)
app.post('/api/data', createData)
```

---

*Routing is the foundation of Express applications.*
