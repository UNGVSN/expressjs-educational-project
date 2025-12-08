# Modular Routes

Express Router allows you to create modular, mountable route handlers. A Router instance is a complete middleware and routing system, often called a "mini-app."

## Overview

```javascript
// routes/users.js
const express = require('express')
const router = express.Router()

router.get('/', getUsers)
router.get('/:id', getUser)
router.post('/', createUser)

module.exports = router

// app.js
const usersRouter = require('./routes/users')
app.use('/users', usersRouter)
```

## Creating a Router

```javascript
const express = require('express')
const router = express.Router()

// Define routes on router
router.get('/', (req, res) => {
  res.send('Router home')
})

router.get('/about', (req, res) => {
  res.send('Router about')
})

module.exports = router
```

## Router Options

```javascript
const router = express.Router({
  caseSensitive: true,   // /Foo !== /foo
  mergeParams: true,     // Inherit params from parent
  strict: true           // /foo !== /foo/
})
```

## Mounting Routers

### Basic Mounting

```javascript
const express = require('express')
const app = express()

const usersRouter = require('./routes/users')
const postsRouter = require('./routes/posts')

// Mount at path prefix
app.use('/users', usersRouter)  // /users/*
app.use('/posts', postsRouter)  // /posts/*
```

### Nested Mounting

```javascript
// routes/users.js
const router = express.Router()
const profileRouter = require('./profile')
const settingsRouter = require('./settings')

router.use('/profile', profileRouter)
router.use('/settings', settingsRouter)

module.exports = router

// Results in:
// /users/profile/*
// /users/settings/*
```

## File Structure Patterns

### Feature-Based Structure

```
src/
├── users/
│   ├── users.router.js
│   ├── users.controller.js
│   ├── users.service.js
│   └── users.model.js
├── posts/
│   ├── posts.router.js
│   ├── posts.controller.js
│   ├── posts.service.js
│   └── posts.model.js
└── app.js
```

```javascript
// users/users.router.js
const router = express.Router()
const controller = require('./users.controller')

router.get('/', controller.list)
router.get('/:id', controller.show)
router.post('/', controller.create)
router.put('/:id', controller.update)
router.delete('/:id', controller.destroy)

module.exports = router

// app.js
app.use('/users', require('./users/users.router'))
app.use('/posts', require('./posts/posts.router'))
```

### Route File Structure

```
routes/
├── index.js
├── users.js
├── posts.js
├── comments.js
└── auth.js
```

```javascript
// routes/index.js
const express = require('express')
const router = express.Router()

router.use('/users', require('./users'))
router.use('/posts', require('./posts'))
router.use('/comments', require('./comments'))
router.use('/auth', require('./auth'))

module.exports = router

// app.js
app.use('/api', require('./routes'))
```

### API Versioning

```
routes/
├── v1/
│   ├── index.js
│   ├── users.js
│   └── posts.js
└── v2/
    ├── index.js
    ├── users.js
    └── posts.js
```

```javascript
// routes/v1/index.js
const router = express.Router()
router.use('/users', require('./users'))
router.use('/posts', require('./posts'))
module.exports = router

// routes/v2/index.js
const router = express.Router()
router.use('/users', require('./users'))  // Different implementation
module.exports = router

// app.js
app.use('/api/v1', require('./routes/v1'))
app.use('/api/v2', require('./routes/v2'))
```

## Router Middleware

```javascript
const router = express.Router()

// Apply to all routes in this router
router.use(authenticate)

// Apply to specific path
router.use('/:id', loadResource)

// Multiple middleware
router.use(logRequest, validateApiKey)
```

## Router.param()

Pre-process route parameters.

```javascript
const router = express.Router()

// Runs for any route with :id
router.param('id', async (req, res, next, id) => {
  try {
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ error: 'Not found' })
    }
    req.user = user
    next()
  } catch (err) {
    next(err)
  }
})

// Routes can use req.user
router.get('/:id', (req, res) => res.json(req.user))
router.put('/:id', (req, res) => { /* update req.user */ })
router.delete('/:id', (req, res) => { /* delete req.user */ })
```

## mergeParams Option

Access parent router parameters.

```javascript
// /users/:userId/posts/:postId

// posts.router.js
const router = express.Router({ mergeParams: true })

router.get('/', (req, res) => {
  // req.params.userId from parent router
  res.json({ userId: req.params.userId })
})

router.get('/:postId', (req, res) => {
  // Both params available
  res.json({
    userId: req.params.userId,
    postId: req.params.postId
  })
})

module.exports = router

// users.router.js
const postsRouter = require('./posts.router')
router.use('/:userId/posts', postsRouter)
```

## Complete Example

```javascript
// routes/users.js
const express = require('express')
const router = express.Router()
const { authenticate, authorize } = require('../middleware/auth')
const { validate } = require('../middleware/validation')
const { userSchema } = require('../schemas/user')
const controller = require('../controllers/users')

// Public routes
router.post('/register', validate(userSchema), controller.register)
router.post('/login', controller.login)

// Protected routes
router.use(authenticate)

router.get('/me', controller.getProfile)
router.put('/me', validate(userSchema), controller.updateProfile)

// Admin routes
router.use(authorize('admin'))

router.get('/', controller.list)
router.get('/:id', controller.show)
router.delete('/:id', controller.destroy)

module.exports = router

// controllers/users.js
exports.list = async (req, res) => {
  const users = await User.find()
  res.json(users)
}

exports.show = async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json(user)
}

exports.register = async (req, res) => {
  const user = await User.create(req.body)
  res.status(201).json(user)
}

exports.login = async (req, res) => {
  // Authentication logic...
}

exports.getProfile = (req, res) => {
  res.json(req.user)
}

exports.updateProfile = async (req, res) => {
  Object.assign(req.user, req.body)
  await req.user.save()
  res.json(req.user)
}

exports.destroy = async (req, res) => {
  await User.findByIdAndDelete(req.params.id)
  res.status(204).end()
}

// app.js
const express = require('express')
const app = express()

app.use(express.json())
app.use('/api/users', require('./routes/users'))
app.use('/api/posts', require('./routes/posts'))

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message })
})

app.listen(3000)
```

## Best Practices

1. **One router per resource** - Keep routers focused
2. **Use meaningful file names** - `users.router.js` or `users.routes.js`
3. **Apply middleware at router level** - Not on every route
4. **Use mergeParams for nested resources** - Access parent params
5. **Export router, not app** - Keep app.js clean
6. **Group related routes** - Public, authenticated, admin

## Related

- [basic-routing](../basic-routing/) - Basic routing
- [route-parameters](../route-parameters/) - URL parameters
- [route-handlers](../route-handlers/) - Handler functions

---

*Modular routes are essential for organizing large Express applications.*
