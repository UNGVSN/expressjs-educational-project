/**
 * Example 02: Basic Routing
 *
 * Demonstrates HTTP methods, route parameters, and query strings.
 */

const express = require('express')
const app = express()

// Parse JSON bodies
app.use(express.json())

// In-memory data store
let items = [
  { id: 1, name: 'Item 1', description: 'First item' },
  { id: 2, name: 'Item 2', description: 'Second item' },
  { id: 3, name: 'Item 3', description: 'Third item' }
]
let nextId = 4

// ============================================
// HTTP Methods
// ============================================

// GET - Retrieve all items
app.get('/items', (req, res) => {
  // Query string filtering
  const { name } = req.query

  if (name) {
    const filtered = items.filter(item =>
      item.name.toLowerCase().includes(name.toLowerCase())
    )
    return res.json(filtered)
  }

  res.json(items)
})

// GET - Retrieve single item by ID
app.get('/items/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const item = items.find(i => i.id === id)

  if (!item) {
    return res.status(404).json({ error: 'Item not found' })
  }

  res.json(item)
})

// POST - Create new item
app.post('/items', (req, res) => {
  const { name, description } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  const newItem = {
    id: nextId++,
    name,
    description: description || ''
  }

  items.push(newItem)
  res.status(201).json(newItem)
})

// PUT - Replace entire item
app.put('/items/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const index = items.findIndex(i => i.id === id)

  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' })
  }

  const { name, description } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  items[index] = { id, name, description: description || '' }
  res.json(items[index])
})

// PATCH - Update partial item
app.patch('/items/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const item = items.find(i => i.id === id)

  if (!item) {
    return res.status(404).json({ error: 'Item not found' })
  }

  const { name, description } = req.body

  if (name !== undefined) item.name = name
  if (description !== undefined) item.description = description

  res.json(item)
})

// DELETE - Remove item
app.delete('/items/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const index = items.findIndex(i => i.id === id)

  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' })
  }

  items.splice(index, 1)
  res.status(204).send()
})

// ============================================
// Route Parameters
// ============================================

// Multiple parameters
app.get('/users/:userId/posts/:postId', (req, res) => {
  const { userId, postId } = req.params
  res.json({
    message: 'Route parameters example',
    userId,
    postId
  })
})

// Optional segments using multiple routes
app.get('/files/*', (req, res) => {
  const filePath = req.params[0]
  res.json({
    message: 'Wildcard route',
    path: filePath
  })
})

// ============================================
// Query Strings
// ============================================

app.get('/search', (req, res) => {
  const { q, page = 1, limit = 10, sort } = req.query

  res.json({
    message: 'Query string example',
    query: q,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit)
    },
    sort: sort || 'default'
  })
})

// ============================================
// app.route() - Chained routes
// ============================================

app.route('/products')
  .get((req, res) => {
    res.json({ message: 'Get all products' })
  })
  .post((req, res) => {
    res.json({ message: 'Create product' })
  })

app.route('/products/:id')
  .get((req, res) => {
    res.json({ message: `Get product ${req.params.id}` })
  })
  .put((req, res) => {
    res.json({ message: `Update product ${req.params.id}` })
  })
  .delete((req, res) => {
    res.json({ message: `Delete product ${req.params.id}` })
  })

// ============================================
// Response Methods
// ============================================

app.get('/response/json', (req, res) => {
  res.json({ type: 'json', data: [1, 2, 3] })
})

app.get('/response/send', (req, res) => {
  res.send('Plain text response')
})

app.get('/response/status', (req, res) => {
  res.status(201).json({ message: 'Created' })
})

app.get('/response/redirect', (req, res) => {
  res.redirect('/items')
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log('\nAvailable routes:')
  console.log('  Items CRUD:')
  console.log('    GET    /items          - List all items')
  console.log('    GET    /items/:id      - Get single item')
  console.log('    POST   /items          - Create item')
  console.log('    PUT    /items/:id      - Replace item')
  console.log('    PATCH  /items/:id      - Update item')
  console.log('    DELETE /items/:id      - Delete item')
  console.log('\n  Parameters:')
  console.log('    GET /users/:userId/posts/:postId')
  console.log('    GET /files/*')
  console.log('    GET /search?q=term&page=1&limit=10')
  console.log('\n  Products (chained):')
  console.log('    GET/POST /products')
  console.log('    GET/PUT/DELETE /products/:id')
})
