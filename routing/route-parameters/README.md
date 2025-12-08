# Route Parameters

Route parameters are named URL segments used to capture values at specific positions in the URL.

## Overview

```javascript
// Define parameter with :name
app.get('/users/:id', (req, res) => {
  // Access via req.params
  const userId = req.params.id
  res.send(`User ID: ${userId}`)
})

// GET /users/123 -> { id: '123' }
// GET /users/abc -> { id: 'abc' }
```

## Basic Parameters

### Single Parameter

```javascript
app.get('/users/:id', (req, res) => {
  res.json({ userId: req.params.id })
})
// GET /users/42 -> { userId: '42' }
```

### Multiple Parameters

```javascript
app.get('/users/:userId/posts/:postId', (req, res) => {
  const { userId, postId } = req.params
  res.json({ userId, postId })
})
// GET /users/1/posts/5 -> { userId: '1', postId: '5' }
```

### Parameters in Path

```javascript
app.get('/flights/:from-:to', (req, res) => {
  res.json({
    from: req.params.from,
    to: req.params.to
  })
})
// GET /flights/NYC-LAX -> { from: 'NYC', to: 'LAX' }

app.get('/files/:name.:ext', (req, res) => {
  res.json({
    name: req.params.name,
    ext: req.params.ext
  })
})
// GET /files/document.pdf -> { name: 'document', ext: 'pdf' }
```

## Parameter Patterns

### Constrained Parameters

```javascript
// Only match numbers
app.get('/users/:id(\\d+)', (req, res) => {
  res.send(`User ID: ${req.params.id}`)
})
// GET /users/123 -> matches
// GET /users/abc -> does NOT match (404)

// Only match specific format
app.get('/posts/:slug([a-z-]+)', (req, res) => {
  res.send(`Post: ${req.params.slug}`)
})
// GET /posts/my-first-post -> matches
// GET /posts/Post123 -> does NOT match
```

### Optional Parameters

```javascript
// Parameter may or may not exist
app.get('/users/:id?', (req, res) => {
  if (req.params.id) {
    res.send(`User ID: ${req.params.id}`)
  } else {
    res.send('All users')
  }
})
// GET /users -> 'All users'
// GET /users/123 -> 'User ID: 123'
```

## router.param() Middleware

Pre-process parameters before route handlers.

```javascript
const router = express.Router()

// Runs for any route with :id
router.param('id', (req, res, next, id) => {
  // Validate ID format
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid ID format' })
  }

  // Convert to number
  req.params.id = parseInt(id)
  next()
})

router.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id, type: typeof req.params.id })
})
// GET /users/123 -> { id: 123, type: 'number' }
// GET /users/abc -> 400 Invalid ID format
```

### Load Resource

```javascript
router.param('userId', async (req, res, next, id) => {
  try {
    const user = await User.findById(id)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
})

// Now req.user is available in all routes with :userId
router.get('/users/:userId', (req, res) => {
  res.json(req.user)  // Already loaded
})

router.put('/users/:userId', (req, res) => {
  Object.assign(req.user, req.body)
  // Save...
  res.json(req.user)
})

router.delete('/users/:userId', (req, res) => {
  // Delete req.user...
  res.status(204).end()
})
```

## Common Patterns

### RESTful Resource

```javascript
const router = express.Router()

// Preload user
router.param('id', async (req, res, next, id) => {
  const user = await User.findById(id)
  if (!user) return res.status(404).json({ error: 'Not found' })
  req.user = user
  next()
})

// CRUD operations
router.get('/', listUsers)
router.get('/:id', (req, res) => res.json(req.user))
router.post('/', createUser)
router.put('/:id', updateUser)
router.delete('/:id', deleteUser)

app.use('/users', router)
```

### Nested Resources

```javascript
// /users/:userId/posts/:postId/comments/:commentId
const commentsRouter = express.Router({ mergeParams: true })

commentsRouter.get('/', (req, res) => {
  // Access all parent params
  const { userId, postId } = req.params
  res.json({ userId, postId, comments: [] })
})

const postsRouter = express.Router({ mergeParams: true })
postsRouter.use('/:postId/comments', commentsRouter)

const usersRouter = express.Router()
usersRouter.use('/:userId/posts', postsRouter)

app.use('/users', usersRouter)
```

### Slug-Based Routes

```javascript
// GET /posts/how-to-learn-express
app.get('/posts/:slug', async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug })

  if (!post) {
    return res.status(404).json({ error: 'Post not found' })
  }

  res.json(post)
})
```

### UUID Parameters

```javascript
const uuidRegex = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

app.get(`/resources/:id(${uuidRegex})`, (req, res) => {
  res.json({ id: req.params.id })
})
// GET /resources/550e8400-e29b-41d4-a716-446655440000 -> matches
// GET /resources/123 -> does NOT match
```

### Multiple ID Formats

```javascript
// Support both numeric IDs and slugs
app.get('/posts/:identifier', async (req, res) => {
  const { identifier } = req.params
  let post

  if (/^\d+$/.test(identifier)) {
    // Numeric ID
    post = await Post.findById(identifier)
  } else {
    // Slug
    post = await Post.findOne({ slug: identifier })
  }

  if (!post) {
    return res.status(404).json({ error: 'Post not found' })
  }

  res.json(post)
})
```

## Parameter Validation

```javascript
const { param, validationResult } = require('express-validator')

app.get('/users/:id',
  param('id').isInt({ min: 1 }).withMessage('ID must be positive integer'),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    // Handle request...
  }
)
```

## Important Notes

1. **Parameters are always strings** - Convert if needed
2. **Order matters** - Specific routes before parameterized
3. **Use mergeParams** - For nested routers
4. **Validate parameters** - Don't trust user input
5. **Use router.param()** - For reusable preprocessing

## Related

- [route-paths](../route-paths/) - Path patterns
- [route-handlers](../route-handlers/) - Handler functions
- [modular-routes](../modular-routes/) - Using Router

---

*Route parameters enable dynamic, RESTful URLs in Express applications.*
