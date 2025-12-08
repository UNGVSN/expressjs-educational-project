# Router Object

The `express.Router` class creates modular, mountable route handlers. A Router instance is a complete middleware and routing system, often called a "mini-app."

## Overview

```javascript
const express = require('express')
const router = express.Router()

// Define routes
router.get('/', (req, res) => res.json([]))
router.post('/', (req, res) => res.status(201).json({}))

// Mount on app
const app = express()
app.use('/users', router)
```

## Creating Routers

```javascript
const express = require('express')

// Method 1: express.Router()
const router = express.Router()

// Method 2: With options
const strictRouter = express.Router({
  caseSensitive: true,  // /Foo !== /foo
  mergeParams: true,    // Access parent params
  strict: true          // /foo !== /foo/
})
```

## Router Options

| Option | Default | Description |
|--------|---------|-------------|
| `caseSensitive` | `false` | Treat /Foo and /foo as different |
| `mergeParams` | `false` | Merge params from parent router |
| `strict` | `false` | Treat /foo and /foo/ as different |

## Defining Routes

### HTTP Methods

```javascript
router.get('/items', (req, res) => {})
router.post('/items', (req, res) => {})
router.put('/items/:id', (req, res) => {})
router.patch('/items/:id', (req, res) => {})
router.delete('/items/:id', (req, res) => {})
router.all('/items', (req, res) => {})  // All methods
```

### Route Chaining

```javascript
router.route('/users')
  .get((req, res) => {
    res.json([])
  })
  .post((req, res) => {
    res.status(201).json({ created: true })
  })

router.route('/users/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser)
```

## Router Middleware

### router.use()

```javascript
// All routes in this router
router.use(express.json())

// Specific path prefix
router.use('/admin', authenticateAdmin)

// Multiple middleware
router.use(logger, validator, rateLimiter)
```

### router.param()

Pre-process route parameters:

```javascript
router.param('id', (req, res, next, id) => {
  // Runs for any route with :id
  User.findById(id)
    .then(user => {
      if (!user) return res.status(404).send('Not found')
      req.user = user
      next()
    })
    .catch(next)
})

// Now req.user is available
router.get('/:id', (req, res) => {
  res.json(req.user)
})
```

## Mounting Routers

### On Application

```javascript
const usersRouter = require('./routes/users')
const postsRouter = require('./routes/posts')

app.use('/users', usersRouter)
app.use('/posts', postsRouter)
```

### Nested Routers

```javascript
// routes/users.js
const router = express.Router()
const postsRouter = require('./userPosts')

router.get('/', getUsers)
router.use('/:userId/posts', postsRouter)

module.exports = router

// routes/userPosts.js
const router = express.Router({ mergeParams: true })

router.get('/', (req, res) => {
  // req.params.userId available with mergeParams
  res.json({ userId: req.params.userId })
})

module.exports = router
```

## Common Patterns

### Resource Router

```javascript
// routes/users.js
const express = require('express')
const router = express.Router()

// GET /users
router.get('/', async (req, res) => {
  const users = await User.findAll()
  res.json(users)
})

// GET /users/:id
router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json(user)
})

// POST /users
router.post('/', async (req, res) => {
  const user = await User.create(req.body)
  res.status(201).json(user)
})

// PUT /users/:id
router.put('/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body)
  res.json(user)
})

// DELETE /users/:id
router.delete('/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id)
  res.status(204).end()
})

module.exports = router
```

### API Versioning

```javascript
// routes/v1/index.js
const router = express.Router()
router.use('/users', require('./users'))
router.use('/posts', require('./posts'))
module.exports = router

// routes/v2/index.js
const router = express.Router()
router.use('/users', require('./users'))  // Updated handlers
module.exports = router

// app.js
app.use('/api/v1', require('./routes/v1'))
app.use('/api/v2', require('./routes/v2'))
```

### Protected Routes

```javascript
const publicRouter = express.Router()
const protectedRouter = express.Router()

// Public routes
publicRouter.get('/login', showLogin)
publicRouter.post('/login', handleLogin)

// Protected routes
protectedRouter.use(authenticate)  // Middleware for all
protectedRouter.get('/dashboard', showDashboard)
protectedRouter.get('/profile', showProfile)

app.use(publicRouter)
app.use(protectedRouter)
```

### Router Factory

```javascript
function createResourceRouter(Model) {
  const router = express.Router()

  router.get('/', async (req, res) => {
    res.json(await Model.findAll())
  })

  router.get('/:id', async (req, res) => {
    res.json(await Model.findById(req.params.id))
  })

  router.post('/', async (req, res) => {
    res.status(201).json(await Model.create(req.body))
  })

  // ... more methods

  return router
}

// Usage
app.use('/users', createResourceRouter(User))
app.use('/posts', createResourceRouter(Post))
app.use('/comments', createResourceRouter(Comment))
```

## Error Handling

```javascript
const router = express.Router()

// Wrap async handlers
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

router.get('/:id', asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id)
  if (!item) {
    const error = new Error('Not found')
    error.status = 404
    throw error
  }
  res.json(item)
}))

// Router-specific error handler
router.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message
  })
})
```

## Related

- [application](../application/) - App methods
- [request](../request/) / [response](../response/)

## Next Steps

1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md)
2. Test knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Proceed to [Middleware](../../middleware/)

---

*Routers are the key to organizing Express applications.*
