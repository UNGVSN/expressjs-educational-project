# Route Methods

Express provides methods for all HTTP request methods. These methods define how your application responds to different types of requests.

## Overview

```javascript
app.get('/path', handler)     // GET request
app.post('/path', handler)    // POST request
app.put('/path', handler)     // PUT request
app.delete('/path', handler)  // DELETE request
app.all('/path', handler)     // All methods
```

## HTTP Methods in Express

### GET

Retrieve resources. Should be idempotent (same result every time).

```javascript
// Get all resources
app.get('/users', (req, res) => {
  res.json(users)
})

// Get single resource
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id)
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json(user)
})

// Get with query parameters
app.get('/search', (req, res) => {
  const { q, limit, offset } = req.query
  const results = search(q, { limit, offset })
  res.json(results)
})
```

### POST

Create new resources or trigger actions.

```javascript
// Create resource
app.post('/users', (req, res) => {
  const user = createUser(req.body)
  res.status(201).json(user)
})

// Trigger action
app.post('/users/:id/verify', (req, res) => {
  verifyUser(req.params.id)
  res.json({ message: 'User verified' })
})

// File upload
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ file: req.file })
})
```

### PUT

Replace entire resource. Should be idempotent.

```javascript
// Replace resource
app.put('/users/:id', (req, res) => {
  const { name, email, role } = req.body
  const user = replaceUser(req.params.id, { name, email, role })
  res.json(user)
})

// Upsert (create if not exists)
app.put('/settings/:key', (req, res) => {
  const setting = upsertSetting(req.params.key, req.body.value)
  res.json(setting)
})
```

### PATCH

Partial update of resource.

```javascript
// Partial update
app.patch('/users/:id', (req, res) => {
  const user = updateUser(req.params.id, req.body)
  res.json(user)
})

// JSON Patch (RFC 6902)
app.patch('/users/:id', (req, res) => {
  // req.body = [{ op: 'replace', path: '/name', value: 'New Name' }]
  const user = applyPatch(req.params.id, req.body)
  res.json(user)
})
```

### DELETE

Remove resource.

```javascript
// Delete resource
app.delete('/users/:id', (req, res) => {
  deleteUser(req.params.id)
  res.status(204).end()  // No Content
})

// Soft delete
app.delete('/posts/:id', (req, res) => {
  softDeletePost(req.params.id)
  res.json({ message: 'Post archived' })
})
```

### OPTIONS

Get supported methods for a resource.

```javascript
app.options('/users', (req, res) => {
  res.set('Allow', 'GET, POST, OPTIONS')
  res.status(204).end()
})

// Automatic OPTIONS for CORS (handled by cors middleware)
app.use(cors())
```

### HEAD

Same as GET but without response body.

```javascript
// Express automatically handles HEAD for GET routes
app.get('/users', (req, res) => {
  res.json(users)
})
// HEAD /users will return headers only

// Explicit HEAD handler
app.head('/files/:id', (req, res) => {
  const file = getFileMetadata(req.params.id)
  res.set('Content-Length', file.size)
  res.set('Content-Type', file.mimetype)
  res.status(200).end()
})
```

### ALL

Match all HTTP methods.

```javascript
// Match any method
app.all('/api/*', (req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// 404 handler for API
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' })
})
```

## Method Chaining with route()

```javascript
app.route('/users')
  .get((req, res) => {
    res.json(users)
  })
  .post((req, res) => {
    const user = createUser(req.body)
    res.status(201).json(user)
  })

app.route('/users/:id')
  .get(getUser)
  .put(replaceUser)
  .patch(updateUser)
  .delete(deleteUser)
```

## RESTful API Design

### Standard Endpoints

| Method | Path | Action | Description |
|--------|------|--------|-------------|
| GET | /resources | index | List all |
| GET | /resources/:id | show | Get one |
| POST | /resources | create | Create new |
| PUT | /resources/:id | replace | Replace entire |
| PATCH | /resources/:id | update | Partial update |
| DELETE | /resources/:id | destroy | Remove |

### Complete Example

```javascript
const express = require('express')
const router = express.Router()

// List all users
router.get('/', async (req, res) => {
  const { page = 1, limit = 10, sort = 'createdAt' } = req.query
  const users = await User.find()
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
  const total = await User.countDocuments()

  res.json({
    data: users,
    meta: { page: parseInt(page), limit: parseInt(limit), total }
  })
})

// Get single user
router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  res.json(user)
})

// Create user
router.post('/', async (req, res) => {
  try {
    const user = await User.create(req.body)
    res.status(201).json(user)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email already exists' })
    }
    throw err
  }
})

// Replace user
router.put('/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true, overwrite: true }
  )
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  res.json(user)
})

// Update user
router.patch('/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  )
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  res.json(user)
})

// Delete user
router.delete('/:id', async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  res.status(204).end()
})

module.exports = router
```

## Method Override

For clients that don't support PUT/PATCH/DELETE:

```javascript
const methodOverride = require('method-override')

// Override with header
app.use(methodOverride('X-HTTP-Method-Override'))

// Override with query parameter
app.use(methodOverride('_method'))

// Client can now use:
// POST /users/123?_method=DELETE
// POST /users/123 with header X-HTTP-Method-Override: DELETE
```

## HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Not authorized |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable | Validation error |
| 500 | Server Error | Internal error |

## Related

- [basic-routing](../basic-routing/) - Basic routing
- [route-handlers](../route-handlers/) - Handler functions
- [modular-routes](../modular-routes/) - Using Router

---

*HTTP methods define the semantics of your API endpoints.*
