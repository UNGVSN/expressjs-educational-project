# Router-Level Middleware

Router-level middleware works the same way as application-level middleware, except it's bound to an instance of `express.Router()`.

## Overview

```javascript
const express = require('express')
const router = express.Router()

// Middleware bound to the router
router.use((req, res, next) => {
  console.log('Router middleware')
  next()
})

router.get('/users', (req, res) => {
  res.json([])
})

// Mount on app
app.use('/api', router)
```

## Creating Router Middleware

### router.use()

```javascript
const router = express.Router()

// All routes in this router
router.use((req, res, next) => {
  console.log('Time:', Date.now())
  next()
})

// Specific path within router
router.use('/admin', (req, res, next) => {
  console.log('Admin access')
  next()
})
```

### router.METHOD()

```javascript
// Route-specific middleware
router.get('/users', authenticate, (req, res) => {
  res.json([])
})

router.post('/users', authenticate, validateBody, (req, res) => {
  res.status(201).json({})
})
```

### router.all()

```javascript
// All HTTP methods
router.all('/data', (req, res, next) => {
  console.log(`${req.method} /data`)
  next()
})
```

## Router Options

```javascript
// Router with options
const router = express.Router({
  caseSensitive: true,   // /Foo !== /foo
  mergeParams: true,     // Access parent params
  strict: true           // /foo !== /foo/
})
```

### mergeParams

```javascript
// Parent router
const usersRouter = express.Router()
usersRouter.use('/:userId/posts', postsRouter)

// Child router with mergeParams
const postsRouter = express.Router({ mergeParams: true })
postsRouter.get('/', (req, res) => {
  // Can access parent's :userId
  const { userId } = req.params
  res.json({ userId, posts: [] })
})

// Request to /users/123/posts
// req.params = { userId: '123' }
```

## Scoped Middleware

### Authentication by Router

```javascript
// Public router - no auth
const publicRouter = express.Router()
publicRouter.get('/login', showLogin)
publicRouter.post('/login', handleLogin)
publicRouter.get('/register', showRegister)
publicRouter.post('/register', handleRegister)

// Protected router - requires auth
const protectedRouter = express.Router()
protectedRouter.use(authenticate)  // All routes protected
protectedRouter.get('/dashboard', showDashboard)
protectedRouter.get('/profile', showProfile)
protectedRouter.put('/profile', updateProfile)

// Mount both
app.use(publicRouter)
app.use(protectedRouter)
```

### Role-Based Access

```javascript
// Admin router
const adminRouter = express.Router()
adminRouter.use(authenticate)
adminRouter.use(authorize('admin'))

adminRouter.get('/users', listAllUsers)
adminRouter.delete('/users/:id', deleteUser)
adminRouter.get('/logs', viewLogs)

// Moderator router
const modRouter = express.Router()
modRouter.use(authenticate)
modRouter.use(authorize('admin', 'moderator'))

modRouter.get('/reports', viewReports)
modRouter.put('/posts/:id/approve', approvePost)

// Mount
app.use('/admin', adminRouter)
app.use('/mod', modRouter)
```

## Middleware Execution Order

```javascript
const router = express.Router()

// 1. Router-level middleware (runs first)
router.use((req, res, next) => {
  console.log('1. Router middleware')
  next()
})

// 2. Path-specific middleware
router.use('/users', (req, res, next) => {
  console.log('2. Users middleware')
  next()
})

// 3. Route handler
router.get('/users', (req, res) => {
  console.log('3. Route handler')
  res.json([])
})

app.use('/api', router)

// Request to GET /api/users logs:
// 1. Router middleware
// 2. Users middleware
// 3. Route handler
```

## Common Patterns

### API Versioning

```javascript
// v1 routes
const v1Router = express.Router()
v1Router.use(v1Middleware)
v1Router.get('/users', v1GetUsers)

// v2 routes (different implementation)
const v2Router = express.Router()
v2Router.use(v2Middleware)
v2Router.get('/users', v2GetUsers)

// Mount versions
app.use('/api/v1', v1Router)
app.use('/api/v2', v2Router)
```

### Resource Routers

```javascript
function createResourceRouter(controller, middleware = []) {
  const router = express.Router()

  // Apply any shared middleware
  middleware.forEach(mw => router.use(mw))

  // CRUD routes
  router.get('/', controller.list)
  router.get('/:id', controller.get)
  router.post('/', controller.create)
  router.put('/:id', controller.update)
  router.delete('/:id', controller.delete)

  return router
}

// Usage
const usersRouter = createResourceRouter(usersController, [authenticate])
const postsRouter = createResourceRouter(postsController, [authenticate, validatePost])

app.use('/users', usersRouter)
app.use('/posts', postsRouter)
```

### Feature Routers

```javascript
// auth.router.js
const router = express.Router()
router.post('/login', login)
router.post('/logout', logout)
router.post('/register', register)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
module.exports = router

// users.router.js
const router = express.Router()
router.use(authenticate)  // All user routes need auth
router.get('/', listUsers)
router.get('/:id', getUser)
router.put('/:id', updateUser)
module.exports = router

// app.js
app.use('/auth', require('./routes/auth.router'))
app.use('/users', require('./routes/users.router'))
```

### Request Preprocessing

```javascript
const router = express.Router()

// Preprocess :id parameter
router.param('id', async (req, res, next, id) => {
  try {
    const item = await Item.findById(id)
    if (!item) {
      return res.status(404).json({ error: 'Not found' })
    }
    req.item = item
    next()
  } catch (err) {
    next(err)
  }
})

// All routes with :id have req.item available
router.get('/:id', (req, res) => {
  res.json(req.item)
})

router.put('/:id', (req, res) => {
  Object.assign(req.item, req.body)
  req.item.save()
  res.json(req.item)
})

router.delete('/:id', (req, res) => {
  req.item.remove()
  res.status(204).end()
})
```

### Error Handling per Router

```javascript
const router = express.Router()

router.get('/users', asyncHandler(getUsers))
router.post('/users', asyncHandler(createUser))

// Router-specific error handler
router.use((err, req, res, next) => {
  // Handle errors specific to this router
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors
    })
  }
  // Pass other errors to app error handler
  next(err)
})
```

## Nested Routers

```javascript
// users/index.js
const usersRouter = express.Router()
const postsRouter = require('./posts')
const commentsRouter = require('./comments')

usersRouter.get('/', listUsers)
usersRouter.get('/:userId', getUser)

// Nest posts under users
usersRouter.use('/:userId/posts', postsRouter)
usersRouter.use('/:userId/comments', commentsRouter)

module.exports = usersRouter

// users/posts.js
const postsRouter = express.Router({ mergeParams: true })

postsRouter.get('/', (req, res) => {
  // req.params.userId from parent
  res.json({ userId: req.params.userId, posts: [] })
})

module.exports = postsRouter
```

## Comparison: App vs Router Middleware

| Feature | app.use() | router.use() |
|---------|-----------|--------------|
| Scope | Entire application | Specific router |
| Mounting | - | Must mount on app |
| Settings | app.set() available | No settings |
| Nesting | Sub-apps | Nested routers |
| Use case | Global middleware | Scoped middleware |

## Related

- [middleware-fundamentals](../middleware-fundamentals/) - Core concepts
- [application-level](../application-level/) - App middleware
- [error-handling](../error-handling/) - Error handlers

## Next Steps

1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md)
2. Test knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Learn [error-handling](../error-handling/) middleware

---

*Router-level middleware provides scoped, modular middleware for your Express app.*
