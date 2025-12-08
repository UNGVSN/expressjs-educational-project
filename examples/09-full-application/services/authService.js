/**
 * Authentication Service
 */

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const config = require('../config')
const { UnauthorizedError, ConflictError, NotFoundError } = require('../utils/errors')

// In-memory user store (replace with database in production)
const users = new Map()
const refreshTokens = new Set()

// Initialize with admin user
const initializeAdmin = async () => {
  const adminId = 'admin-001'
  const hashedPassword = await bcrypt.hash('admin123', config.bcryptRounds)

  users.set(adminId, {
    id: adminId,
    email: 'admin@example.com',
    password: hashedPassword,
    name: 'Administrator',
    role: 'admin',
    createdAt: new Date().toISOString()
  })
}

// Generate tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  )

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn }
  )

  refreshTokens.add(refreshToken)

  return { accessToken, refreshToken }
}

// Register user
const register = async ({ email, password, name }) => {
  // Check if email exists
  for (const user of users.values()) {
    if (user.email === email) {
      throw new ConflictError('Email already registered')
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, config.bcryptRounds)

  // Create user
  const user = {
    id: uuidv4(),
    email,
    password: hashedPassword,
    name,
    role: 'user',
    createdAt: new Date().toISOString()
  }

  users.set(user.id, user)

  // Generate tokens
  const tokens = generateTokens(user)

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    ...tokens
  }
}

// Login user
const login = async ({ email, password }) => {
  // Find user
  let user = null
  for (const u of users.values()) {
    if (u.email === email) {
      user = u
      break
    }
  }

  if (!user) {
    throw new UnauthorizedError('Invalid credentials')
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.password)

  if (!isMatch) {
    throw new UnauthorizedError('Invalid credentials')
  }

  // Generate tokens
  const tokens = generateTokens(user)

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    ...tokens
  }
}

// Refresh token
const refresh = (refreshToken) => {
  if (!refreshTokens.has(refreshToken)) {
    throw new UnauthorizedError('Invalid refresh token')
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwt.secret)

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type')
    }

    const user = users.get(decoded.id)

    if (!user) {
      throw new NotFoundError('User')
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    )

    return { accessToken }
  } catch (err) {
    refreshTokens.delete(refreshToken)
    throw new UnauthorizedError('Invalid refresh token')
  }
}

// Logout
const logout = (refreshToken) => {
  if (refreshToken) {
    refreshTokens.delete(refreshToken)
  }
}

// Change password
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = users.get(userId)

  if (!user) {
    throw new NotFoundError('User')
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password)

  if (!isMatch) {
    throw new UnauthorizedError('Current password is incorrect')
  }

  user.password = await bcrypt.hash(newPassword, config.bcryptRounds)
  user.updatedAt = new Date().toISOString()
}

// Get user by ID
const getUserById = (id) => {
  const user = users.get(id)

  if (!user) {
    throw new NotFoundError('User')
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt
  }
}

// Get all users (admin)
const getAllUsers = () => {
  return Array.from(users.values()).map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt
  }))
}

// Update user
const updateUser = (userId, updates) => {
  const user = users.get(userId)

  if (!user) {
    throw new NotFoundError('User')
  }

  if (updates.name) user.name = updates.name
  user.updatedAt = new Date().toISOString()

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  }
}

module.exports = {
  initializeAdmin,
  register,
  login,
  refresh,
  logout,
  changePassword,
  getUserById,
  getAllUsers,
  updateUser
}
