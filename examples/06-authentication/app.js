/**
 * Example 06: Authentication
 *
 * JWT-based authentication implementation.
 */

const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

// ============================================
// Configuration
// ============================================

const config = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiration: '1h',
  refreshExpiration: '7d',
  saltRounds: 10
}

// ============================================
// In-Memory Database
// ============================================

const db = {
  users: [],
  refreshTokens: new Set()
}

// ============================================
// Utility Functions
// ============================================

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiration }
  )
}

const generateRefreshToken = (user) => {
  const token = jwt.sign(
    { id: user.id, type: 'refresh' },
    config.jwtSecret,
    { expiresIn: config.refreshExpiration }
  )
  db.refreshTokens.add(token)
  return token
}

// ============================================
// Middleware
// ============================================

// Authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, config.jwtSecret)
    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' })
    }
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

// Optional authentication (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()
  }

  const token = authHeader.split(' ')[1]

  try {
    req.user = jwt.verify(token, config.jwtSecret)
  } catch (err) {
    // Token invalid, but continue without user
  }

  next()
}

// ============================================
// Auth Routes
// ============================================

// Register
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Email, password, and name are required'
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters'
      })
    }

    // Check if user exists
    if (db.users.find(u => u.email === email)) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.saltRounds)

    // Create user
    const user = {
      id: String(db.users.length + 1),
      email,
      password: hashedPassword,
      name,
      role: 'user',
      createdAt: new Date().toISOString()
    }

    db.users.push(user)

    // Generate tokens
    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)

    res.status(201).json({
      message: 'Registration successful',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken
    })
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    // Find user
    const user = db.users.find(u => u.email === email)

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate tokens
    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken
    })
  } catch (err) {
    res.status(500).json({ error: 'Login failed' })
  }
})

// Refresh token
app.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' })
  }

  if (!db.refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' })
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwtSecret)

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' })
    }

    const user = db.users.find(u => u.id === decoded.id)

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    // Generate new access token
    const accessToken = generateAccessToken(user)

    res.json({ accessToken })
  } catch (err) {
    // Remove invalid refresh token
    db.refreshTokens.delete(refreshToken)
    return res.status(401).json({ error: 'Invalid refresh token' })
  }
})

// Logout
app.post('/auth/logout', authenticate, (req, res) => {
  const { refreshToken } = req.body

  if (refreshToken) {
    db.refreshTokens.delete(refreshToken)
  }

  res.json({ message: 'Logged out successfully' })
})

// Change password
app.post('/auth/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password required'
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters'
      })
    }

    const user = db.users.find(u => u.id === req.user.id)

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password)

    if (!isMatch) {
      return res.status(401).json({ error: 'Current password incorrect' })
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, config.saltRounds)

    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    res.status(500).json({ error: 'Password change failed' })
  }
})

// ============================================
// Protected Routes
// ============================================

// Get current user
app.get('/me', authenticate, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id)

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt
  })
})

// Update profile
app.patch('/me', authenticate, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id)

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const { name } = req.body

  if (name) {
    user.name = name
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  })
})

// ============================================
// Admin Routes
// ============================================

// List all users (admin only)
app.get('/admin/users', authenticate, authorize('admin'), (req, res) => {
  const users = db.users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt
  }))

  res.json({ users })
})

// Change user role (admin only)
app.patch('/admin/users/:id/role', authenticate, authorize('admin'), (req, res) => {
  const user = db.users.find(u => u.id === req.params.id)

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const { role } = req.body

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  user.role = role

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  })
})

// ============================================
// Public Routes with Optional Auth
// ============================================

app.get('/content', optionalAuth, (req, res) => {
  const content = {
    public: 'This content is visible to everyone',
    timestamp: new Date().toISOString()
  }

  if (req.user) {
    content.private = 'This content is only visible when logged in'
    content.user = req.user.email
  }

  res.json(content)
})

// ============================================
// Create admin user on startup
// ============================================

const createAdminUser = async () => {
  const adminPassword = await bcrypt.hash('admin123', config.saltRounds)
  db.users.push({
    id: '0',
    email: 'admin@example.com',
    password: adminPassword,
    name: 'Admin',
    role: 'admin',
    createdAt: new Date().toISOString()
  })
}

// Start server
const PORT = process.env.PORT || 3000

createAdminUser().then(() => {
  app.listen(PORT, () => {
    console.log(`Auth server running on http://localhost:${PORT}`)
    console.log('\nDefault admin:')
    console.log('  Email: admin@example.com')
    console.log('  Password: admin123')
    console.log('\nEndpoints:')
    console.log('  POST /auth/register        - Register new user')
    console.log('  POST /auth/login           - Login')
    console.log('  POST /auth/refresh         - Refresh access token')
    console.log('  POST /auth/logout          - Logout')
    console.log('  POST /auth/change-password - Change password')
    console.log('\n  GET  /me                   - Get current user')
    console.log('  PATCH /me                  - Update profile')
    console.log('\n  GET  /admin/users          - List users (admin)')
    console.log('  PATCH /admin/users/:id/role - Change role (admin)')
    console.log('\n  GET  /content              - Public/private content')
  })
})
