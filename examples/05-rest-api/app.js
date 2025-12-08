/**
 * Example 05: REST API
 *
 * Complete RESTful API implementation with proper structure.
 */

const express = require('express')
const { v4: uuidv4 } = require('uuid')

const app = express()

// ============================================
// Middleware
// ============================================

app.use(express.json())

// Request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()
})

// ============================================
// In-Memory Database
// ============================================

const db = {
  users: [
    { id: '1', name: 'Alice', email: 'alice@example.com', createdAt: new Date().toISOString() },
    { id: '2', name: 'Bob', email: 'bob@example.com', createdAt: new Date().toISOString() }
  ],
  posts: [
    { id: '1', userId: '1', title: 'First Post', content: 'Hello World', createdAt: new Date().toISOString() },
    { id: '2', userId: '1', title: 'Second Post', content: 'Another post', createdAt: new Date().toISOString() },
    { id: '3', userId: '2', title: 'Bob\'s Post', content: 'Hi there', createdAt: new Date().toISOString() }
  ],
  comments: [
    { id: '1', postId: '1', userId: '2', text: 'Great post!', createdAt: new Date().toISOString() }
  ]
}

// ============================================
// Utility Functions
// ============================================

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

class ApiError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
  }
}

// Pagination helper
const paginate = (array, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit
  const endIndex = page * limit

  return {
    data: array.slice(startIndex, endIndex),
    pagination: {
      page,
      limit,
      total: array.length,
      pages: Math.ceil(array.length / limit),
      hasNext: endIndex < array.length,
      hasPrev: page > 1
    }
  }
}

// ============================================
// Users Routes
// ============================================

const usersRouter = express.Router()

// GET /users - List users with pagination
usersRouter.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10

  const result = paginate(db.users, page, limit)
  res.json(result)
})

// GET /users/:id - Get single user
usersRouter.get('/:id', (req, res) => {
  const user = db.users.find(u => u.id === req.params.id)

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  res.json({ data: user })
})

// POST /users - Create user
usersRouter.post('/', (req, res) => {
  const { name, email } = req.body

  if (!name || !email) {
    throw new ApiError('Name and email are required', 400)
  }

  if (db.users.find(u => u.email === email)) {
    throw new ApiError('Email already exists', 409)
  }

  const user = {
    id: uuidv4(),
    name,
    email,
    createdAt: new Date().toISOString()
  }

  db.users.push(user)
  res.status(201).json({ data: user })
})

// PUT /users/:id - Replace user
usersRouter.put('/:id', (req, res) => {
  const index = db.users.findIndex(u => u.id === req.params.id)

  if (index === -1) {
    throw new ApiError('User not found', 404)
  }

  const { name, email } = req.body

  if (!name || !email) {
    throw new ApiError('Name and email are required', 400)
  }

  db.users[index] = {
    ...db.users[index],
    name,
    email,
    updatedAt: new Date().toISOString()
  }

  res.json({ data: db.users[index] })
})

// PATCH /users/:id - Update user
usersRouter.patch('/:id', (req, res) => {
  const user = db.users.find(u => u.id === req.params.id)

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  const { name, email } = req.body

  if (name) user.name = name
  if (email) user.email = email
  user.updatedAt = new Date().toISOString()

  res.json({ data: user })
})

// DELETE /users/:id - Delete user
usersRouter.delete('/:id', (req, res) => {
  const index = db.users.findIndex(u => u.id === req.params.id)

  if (index === -1) {
    throw new ApiError('User not found', 404)
  }

  db.users.splice(index, 1)
  res.status(204).send()
})

// GET /users/:id/posts - Get user's posts
usersRouter.get('/:id/posts', (req, res) => {
  const user = db.users.find(u => u.id === req.params.id)

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  const posts = db.posts.filter(p => p.userId === req.params.id)
  res.json({ data: posts })
})

// ============================================
// Posts Routes
// ============================================

const postsRouter = express.Router()

// GET /posts - List posts with filtering
postsRouter.get('/', (req, res) => {
  const { userId, search } = req.query
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10

  let posts = [...db.posts]

  // Filter by userId
  if (userId) {
    posts = posts.filter(p => p.userId === userId)
  }

  // Search in title/content
  if (search) {
    const searchLower = search.toLowerCase()
    posts = posts.filter(p =>
      p.title.toLowerCase().includes(searchLower) ||
      p.content.toLowerCase().includes(searchLower)
    )
  }

  const result = paginate(posts, page, limit)
  res.json(result)
})

// GET /posts/:id - Get single post
postsRouter.get('/:id', (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id)

  if (!post) {
    throw new ApiError('Post not found', 404)
  }

  // Include author info
  const author = db.users.find(u => u.id === post.userId)

  res.json({
    data: {
      ...post,
      author: author ? { id: author.id, name: author.name } : null
    }
  })
})

// POST /posts - Create post
postsRouter.post('/', (req, res) => {
  const { userId, title, content } = req.body

  if (!userId || !title || !content) {
    throw new ApiError('userId, title, and content are required', 400)
  }

  if (!db.users.find(u => u.id === userId)) {
    throw new ApiError('User not found', 404)
  }

  const post = {
    id: uuidv4(),
    userId,
    title,
    content,
    createdAt: new Date().toISOString()
  }

  db.posts.push(post)
  res.status(201).json({ data: post })
})

// PUT /posts/:id - Replace post
postsRouter.put('/:id', (req, res) => {
  const index = db.posts.findIndex(p => p.id === req.params.id)

  if (index === -1) {
    throw new ApiError('Post not found', 404)
  }

  const { title, content } = req.body

  if (!title || !content) {
    throw new ApiError('Title and content are required', 400)
  }

  db.posts[index] = {
    ...db.posts[index],
    title,
    content,
    updatedAt: new Date().toISOString()
  }

  res.json({ data: db.posts[index] })
})

// DELETE /posts/:id - Delete post
postsRouter.delete('/:id', (req, res) => {
  const index = db.posts.findIndex(p => p.id === req.params.id)

  if (index === -1) {
    throw new ApiError('Post not found', 404)
  }

  // Also delete associated comments
  db.comments = db.comments.filter(c => c.postId !== req.params.id)

  db.posts.splice(index, 1)
  res.status(204).send()
})

// GET /posts/:id/comments - Get post comments
postsRouter.get('/:id/comments', (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id)

  if (!post) {
    throw new ApiError('Post not found', 404)
  }

  const comments = db.comments.filter(c => c.postId === req.params.id)
  res.json({ data: comments })
})

// POST /posts/:id/comments - Add comment
postsRouter.post('/:id/comments', (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id)

  if (!post) {
    throw new ApiError('Post not found', 404)
  }

  const { userId, text } = req.body

  if (!userId || !text) {
    throw new ApiError('userId and text are required', 400)
  }

  if (!db.users.find(u => u.id === userId)) {
    throw new ApiError('User not found', 404)
  }

  const comment = {
    id: uuidv4(),
    postId: req.params.id,
    userId,
    text,
    createdAt: new Date().toISOString()
  }

  db.comments.push(comment)
  res.status(201).json({ data: comment })
})

// ============================================
// Mount Routers
// ============================================

app.use('/api/users', usersRouter)
app.use('/api/posts', postsRouter)

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'REST API Example',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      posts: '/api/posts'
    }
  })
})

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((req, res, next) => {
  next(new ApiError('Not found', 404))
})

// Error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    error: {
      message: err.message,
      status: statusCode
    }
  })
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`REST API running on http://localhost:${PORT}`)
  console.log('\nEndpoints:')
  console.log('  GET    /api              - API info')
  console.log('\n  Users:')
  console.log('  GET    /api/users        - List users')
  console.log('  GET    /api/users/:id    - Get user')
  console.log('  POST   /api/users        - Create user')
  console.log('  PUT    /api/users/:id    - Replace user')
  console.log('  PATCH  /api/users/:id    - Update user')
  console.log('  DELETE /api/users/:id    - Delete user')
  console.log('  GET    /api/users/:id/posts - User posts')
  console.log('\n  Posts:')
  console.log('  GET    /api/posts        - List posts')
  console.log('  GET    /api/posts/:id    - Get post')
  console.log('  POST   /api/posts        - Create post')
  console.log('  PUT    /api/posts/:id    - Replace post')
  console.log('  DELETE /api/posts/:id    - Delete post')
  console.log('  GET    /api/posts/:id/comments - Post comments')
  console.log('  POST   /api/posts/:id/comments - Add comment')
})
