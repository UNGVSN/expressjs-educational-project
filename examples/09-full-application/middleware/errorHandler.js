/**
 * Error Handling Middleware
 */

const config = require('../config')

// Not found handler
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      status: 404
    }
  })
}

// Global error handler
const errorHandler = (err, req, res, next) => {
  // Log error
  console.error(`[${new Date().toISOString()}] Error:`, err.message)

  if (!config.isProduction) {
    console.error(err.stack)
  }

  // Operational errors (expected)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        status: err.statusCode,
        ...(err.errors && { errors: err.errors })
      }
    })
  }

  // Handle specific error types

  // JSON parse error
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid JSON',
        status: 400
      }
    })
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token',
        status: 401
      }
    })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token expired',
        status: 401
      }
    })
  }

  // Programming errors (unexpected)
  const response = {
    success: false,
    error: {
      message: config.isProduction ? 'Internal server error' : err.message,
      status: 500
    }
  }

  if (!config.isProduction) {
    response.error.stack = err.stack
  }

  res.status(500).json(response)
}

module.exports = {
  notFoundHandler,
  errorHandler
}
