/**
 * Authentication Middleware
 */

const jwt = require('jsonwebtoken')
const config = require('../config')
const { UnauthorizedError, ForbiddenError } = require('../utils/errors')

// Verify JWT token
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Access token required')
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, config.jwt.secret)
    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token expired')
    }
    throw new UnauthorizedError('Invalid token')
  }
}

// Optional authentication
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()
  }

  try {
    const token = authHeader.split(' ')[1]
    req.user = jwt.verify(token, config.jwt.secret)
  } catch (err) {
    // Invalid token, continue without user
  }

  next()
}

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions')
    }

    next()
  }
}

// Resource ownership check
const isOwner = (getResourceUserId) => {
  return (req, res, next) => {
    const resourceUserId = getResourceUserId(req)

    if (req.user.role === 'admin') {
      return next()
    }

    if (req.user.id !== resourceUserId) {
      throw new ForbiddenError('You do not own this resource')
    }

    next()
  }
}

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  isOwner
}
