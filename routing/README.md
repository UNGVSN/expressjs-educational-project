# Routing

Routing refers to how an application's endpoints (URIs) respond to client requests. Express routing is the core of how the framework handles HTTP requests.

## Overview

```javascript
const express = require('express')
const app = express()

// Basic route
app.get('/', (req, res) => {
  res.send('Hello World')
})

// Route with parameter
app.get('/users/:id', (req, res) => {
  res.send(`User ${req.params.id}`)
})
```

## Route Definition Structure

```javascript
app.METHOD(PATH, HANDLER)
```

| Component | Description |
|-----------|-------------|
| `app` | Express application instance |
| `METHOD` | HTTP method (get, post, put, delete, etc.) |
| `PATH` | URL path or pattern |
| `HANDLER` | Function(s) executed when route matches |

## Modules

### Fundamentals
- [basic-routing](./basic-routing/) - HTTP methods and simple routes
- [route-paths](./route-paths/) - Path patterns and matching
- [route-parameters](./route-parameters/) - URL parameters
- [route-handlers](./route-handlers/) - Handler functions and chaining

### Advanced
- [route-methods](./route-methods/) - All HTTP methods
- [modular-routes](./modular-routes/) - express.Router()

## Quick Reference

### HTTP Methods

```javascript
app.get('/resource', handler)     // Read
app.post('/resource', handler)    // Create
app.put('/resource/:id', handler) // Replace
app.patch('/resource/:id', handler) // Update
app.delete('/resource/:id', handler) // Delete
app.all('/resource', handler)     // All methods
```

### Route Paths

```javascript
// String paths
app.get('/', handler)
app.get('/about', handler)
app.get('/users/profile', handler)

// Path patterns
app.get('/ab?cd', handler)      // acd or abcd
app.get('/ab+cd', handler)      // abcd, abbcd, abbbcd...
app.get('/ab*cd', handler)      // ab<anything>cd
app.get('/ab(cd)?e', handler)   // abe or abcde

// Regular expressions
app.get(/.*fly$/, handler)      // butterfly, dragonfly
```

### Route Parameters

```javascript
// Single parameter
app.get('/users/:id', (req, res) => {
  res.send(req.params.id)
})

// Multiple parameters
app.get('/users/:userId/posts/:postId', (req, res) => {
  const { userId, postId } = req.params
})

// Optional parameter
app.get('/users/:id?', handler)

// Parameter with pattern
app.get('/users/:id(\\d+)', handler)  // Numbers only
```

### Route Handlers

```javascript
// Single handler
app.get('/path', (req, res) => {
  res.send('Response')
})

// Multiple handlers
app.get('/path', handler1, handler2, handler3)

// Array of handlers
app.get('/path', [handler1, handler2], handler3)

// Handler with next()
app.get('/path',
  (req, res, next) => {
    console.log('First handler')
    next()
  },
  (req, res) => {
    res.send('Second handler')
  }
)
```

### Route Chaining

```javascript
app.route('/users')
  .get((req, res) => {
    res.send('Get all users')
  })
  .post((req, res) => {
    res.send('Create user')
  })

app.route('/users/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser)
```

### Router (Modular Routes)

```javascript
// routes/users.js
const express = require('express')
const router = express.Router()

router.get('/', getUsers)
router.get('/:id', getUser)
router.post('/', createUser)
router.put('/:id', updateUser)
router.delete('/:id', deleteUser)

module.exports = router

// app.js
const usersRouter = require('./routes/users')
app.use('/users', usersRouter)
```

## Route Matching Order

Routes are matched in definition order. First match wins.

```javascript
// Specific routes first
app.get('/users/new', showNewUserForm)  // Must be before :id

// Then parameterized routes
app.get('/users/:id', getUser)

// Catch-all last
app.get('*', notFound)
```

## Common Patterns

### RESTful Routes

```javascript
const router = express.Router()

router.get('/', list)           // GET /resources
router.get('/:id', show)        // GET /resources/:id
router.post('/', create)        // POST /resources
router.put('/:id', update)      // PUT /resources/:id
router.patch('/:id', patch)     // PATCH /resources/:id
router.delete('/:id', destroy)  // DELETE /resources/:id

app.use('/resources', router)
```

### Nested Resources

```javascript
// /users/:userId/posts
const postsRouter = express.Router({ mergeParams: true })

postsRouter.get('/', (req, res) => {
  // req.params.userId available
  res.send(`Posts for user ${req.params.userId}`)
})

const usersRouter = express.Router()
usersRouter.use('/:userId/posts', postsRouter)

app.use('/users', usersRouter)
```

### Route Groups

```javascript
// Public routes
app.get('/login', showLogin)
app.post('/login', handleLogin)
app.get('/register', showRegister)

// Protected routes (with middleware)
app.use('/dashboard', authenticate)
app.get('/dashboard', showDashboard)
app.get('/dashboard/settings', showSettings)
```

## Learning Path

1. Start with [basic-routing](./basic-routing/) - HTTP methods
2. Learn [route-paths](./route-paths/) - Path patterns
3. Master [route-parameters](./route-parameters/) - Dynamic routes
4. Understand [route-handlers](./route-handlers/) - Handler functions
5. Explore [route-methods](./route-methods/) - All methods
6. Build with [modular-routes](./modular-routes/) - Organize routes

---

*Routing is the foundation of Express applications.*
