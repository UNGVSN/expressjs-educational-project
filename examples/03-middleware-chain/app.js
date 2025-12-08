/**
 * Example 03: Middleware Chain
 *
 * Demonstrates middleware patterns and execution flow.
 */

const express = require('express')
const app = express()

// ============================================
// Application-Level Middleware
// ============================================

// Request logger - runs on every request
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.url}`)
  req.requestTime = timestamp
  next()
})

// Parse JSON bodies
app.use(express.json())

// ============================================
// Custom Middleware Functions
// ============================================

// Authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const token = authHeader.split(' ')[1]

  // Simulate token validation
  if (token === 'valid-token') {
    req.user = { id: 1, name: 'John Doe', role: 'user' }
    next()
  } else if (token === 'admin-token') {
    req.user = { id: 2, name: 'Admin', role: 'admin' }
    next()
  } else {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// Authorization middleware factory
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    next()
  }
}

// Validation middleware factory
const validateBody = (requiredFields) => {
  return (req, res, next) => {
    const missing = requiredFields.filter(field => !req.body[field])

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        fields: missing
      })
    }

    next()
  }
}

// Response time middleware
const responseTime = (req, res, next) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`  Response time: ${duration}ms`)
  })

  next()
}

// Apply response time to all routes
app.use(responseTime)

// ============================================
// Path-Specific Middleware
// ============================================

// Only runs for /api/* routes
app.use('/api', (req, res, next) => {
  console.log('  API route accessed')
  res.set('X-API-Version', '1.0')
  next()
})

// ============================================
// Routes
// ============================================

// Public route
app.get('/', (req, res) => {
  res.json({
    message: 'Public route',
    requestTime: req.requestTime
  })
})

// Protected route with single middleware
app.get('/profile', authenticate, (req, res) => {
  res.json({
    message: 'Protected route',
    user: req.user
  })
})

// Protected route with multiple middleware
app.post('/posts',
  authenticate,
  validateBody(['title', 'content']),
  (req, res) => {
    res.status(201).json({
      message: 'Post created',
      post: {
        id: 1,
        ...req.body,
        author: req.user.name
      }
    })
  }
)

// Admin-only route
app.delete('/users/:id',
  authenticate,
  authorize('admin'),
  (req, res) => {
    res.json({
      message: `User ${req.params.id} deleted`,
      deletedBy: req.user.name
    })
  }
)

// ============================================
// Router-Level Middleware
// ============================================

const apiRouter = express.Router()

// Router-specific middleware
apiRouter.use((req, res, next) => {
  console.log('  Router middleware')
  next()
})

apiRouter.get('/status', (req, res) => {
  res.json({ status: 'ok', version: '1.0' })
})

apiRouter.get('/protected', authenticate, (req, res) => {
  res.json({ message: 'Protected API route', user: req.user })
})

app.use('/api', apiRouter)

// ============================================
// Middleware Chain Demonstration
// ============================================

const middlewareA = (req, res, next) => {
  console.log('  Middleware A - before')
  req.chain = ['A']
  next()
  console.log('  Middleware A - after')
}

const middlewareB = (req, res, next) => {
  console.log('  Middleware B - before')
  req.chain.push('B')
  next()
  console.log('  Middleware B - after')
}

const middlewareC = (req, res, next) => {
  console.log('  Middleware C - before')
  req.chain.push('C')
  next()
  console.log('  Middleware C - after')
}

app.get('/chain', middlewareA, middlewareB, middlewareC, (req, res) => {
  console.log('  Route handler')
  req.chain.push('Handler')
  res.json({ chain: req.chain })
})

// ============================================
// Conditional Middleware
// ============================================

const conditionalAuth = (req, res, next) => {
  // Skip auth for GET requests
  if (req.method === 'GET') {
    return next()
  }
  authenticate(req, res, next)
}

app.use('/data', conditionalAuth)

app.get('/data', (req, res) => {
  res.json({ message: 'Public data access' })
})

app.post('/data', (req, res) => {
  res.json({ message: 'Protected data write', user: req.user })
})

// ============================================
// Error-Handling Middleware
// ============================================

// Route that throws error
app.get('/error', (req, res, next) => {
  const error = new Error('Something went wrong')
  error.status = 500
  next(error)
})

// Async error simulation
app.get('/async-error', async (req, res, next) => {
  try {
    throw new Error('Async error')
  } catch (err) {
    next(err)
  }
})

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' })
})

// Error handler (must have 4 parameters)
app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  res.status(err.status || 500).json({
    error: err.message
  })
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log('\nTest routes:')
  console.log('  Public:')
  console.log('    GET  /              - Public route')
  console.log('    GET  /chain         - Middleware chain demo')
  console.log('    GET  /api/status    - API status')
  console.log('\n  Protected (use Bearer valid-token):')
  console.log('    GET  /profile       - User profile')
  console.log('    POST /posts         - Create post')
  console.log('    GET  /api/protected - Protected API')
  console.log('\n  Admin (use Bearer admin-token):')
  console.log('    DELETE /users/:id   - Delete user')
  console.log('\n  Errors:')
  console.log('    GET  /error         - Sync error')
  console.log('    GET  /async-error   - Async error')
})
