# Basic Routing

Basic routing determines how your application responds to client requests at specific endpoints (URIs) using specific HTTP methods.

## Overview

```javascript
const express = require('express')
const app = express()

// GET request to root
app.get('/', (req, res) => {
  res.send('Hello World!')
})

// POST request to /users
app.post('/users', (req, res) => {
  res.send('Create user')
})

app.listen(3000)
```

## Route Structure

```javascript
app.METHOD(PATH, HANDLER)
```

- **app**: Express application instance
- **METHOD**: HTTP method in lowercase (get, post, put, delete, etc.)
- **PATH**: URL path
- **HANDLER**: Function to execute when route matches

## HTTP Methods

### GET - Retrieve Data

```javascript
// Get all users
app.get('/users', (req, res) => {
  res.json(users)
})

// Get single user
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id)
  res.json(user)
})
```

### POST - Create Data

```javascript
app.post('/users', (req, res) => {
  const newUser = {
    id: generateId(),
    ...req.body
  }
  users.push(newUser)
  res.status(201).json(newUser)
})
```

### PUT - Replace Data

```javascript
app.put('/users/:id', (req, res) => {
  const index = users.findIndex(u => u.id === req.params.id)

  if (index === -1) {
    return res.status(404).json({ error: 'User not found' })
  }

  users[index] = { id: req.params.id, ...req.body }
  res.json(users[index])
})
```

### PATCH - Update Data

```javascript
app.patch('/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id)

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  Object.assign(user, req.body)
  res.json(user)
})
```

### DELETE - Remove Data

```javascript
app.delete('/users/:id', (req, res) => {
  const index = users.findIndex(u => u.id === req.params.id)

  if (index === -1) {
    return res.status(404).json({ error: 'User not found' })
  }

  users.splice(index, 1)
  res.status(204).end()
})
```

### ALL - Match All Methods

```javascript
// Matches any HTTP method
app.all('/api/*', (req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})
```

## Response Methods

```javascript
app.get('/examples', (req, res) => {
  // Send string
  res.send('Hello')

  // Send JSON
  res.json({ message: 'Hello' })

  // Send status
  res.sendStatus(200)  // Sends 'OK'
  res.sendStatus(404)  // Sends 'Not Found'

  // Send file
  res.sendFile('/path/to/file.html')

  // Redirect
  res.redirect('/new-path')
  res.redirect(301, '/new-path')

  // Set status and send
  res.status(201).json({ created: true })
  res.status(404).send('Not found')

  // End response
  res.end()
  res.status(204).end()
})
```

## Complete CRUD Example

```javascript
const express = require('express')
const app = express()

// Middleware
app.use(express.json())

// In-memory data store
let users = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' }
]

// List all users
app.get('/users', (req, res) => {
  res.json(users)
})

// Get single user
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id)

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json(user)
})

// Create user
app.post('/users', (req, res) => {
  const { name, email } = req.body

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email required' })
  }

  const newUser = {
    id: Date.now().toString(),
    name,
    email
  }

  users.push(newUser)
  res.status(201).json(newUser)
})

// Update user
app.put('/users/:id', (req, res) => {
  const { name, email } = req.body
  const index = users.findIndex(u => u.id === req.params.id)

  if (index === -1) {
    return res.status(404).json({ error: 'User not found' })
  }

  users[index] = { id: req.params.id, name, email }
  res.json(users[index])
})

// Delete user
app.delete('/users/:id', (req, res) => {
  const index = users.findIndex(u => u.id === req.params.id)

  if (index === -1) {
    return res.status(404).json({ error: 'User not found' })
  }

  users.splice(index, 1)
  res.status(204).end()
})

app.listen(3000, () => {
  console.log('Server running on port 3000')
})
```

## Route Order Matters

```javascript
// Routes are matched in order of definition

// This route matches first
app.get('/users/me', (req, res) => {
  res.send('Current user profile')
})

// This route matches if above doesn't
app.get('/users/:id', (req, res) => {
  res.send(`User ${req.params.id}`)
})

// WRONG ORDER:
// app.get('/users/:id', handler)  // Would catch /users/me!
// app.get('/users/me', handler)   // Never reached
```

## Query Parameters

```javascript
// GET /search?q=javascript&limit=10
app.get('/search', (req, res) => {
  const { q, limit } = req.query
  res.json({
    query: q,
    limit: parseInt(limit) || 10
  })
})

// GET /users?sort=name&order=asc
app.get('/users', (req, res) => {
  const { sort, order } = req.query
  let result = [...users]

  if (sort) {
    result.sort((a, b) => {
      if (order === 'desc') {
        return b[sort].localeCompare(a[sort])
      }
      return a[sort].localeCompare(b[sort])
    })
  }

  res.json(result)
})
```

## Request Body

```javascript
// Must use body parser middleware
app.use(express.json())

app.post('/users', (req, res) => {
  console.log(req.body)  // { name: 'Alice', email: '...' }
  // Create user...
})
```

## Related

- [route-paths](../route-paths/) - Path patterns
- [route-parameters](../route-parameters/) - URL parameters
- [route-handlers](../route-handlers/) - Handler functions

---

*Basic routing is the foundation of every Express application.*
