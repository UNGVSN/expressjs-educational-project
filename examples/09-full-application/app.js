/**
 * Example 09: Full Application
 *
 * Production-ready Express.js application demonstrating
 * all concepts covered in the educational project.
 */

const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const compression = require('compression')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const config = require('./config')
const routes = require('./routes')
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler')
const authService = require('./services/authService')

// Create Express application
const app = express()

// ============================================
// Security Middleware
// ============================================

// Helmet - Security headers
app.use(helmet())

// CORS
app.use(cors(config.cors))

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later',
      status: 429
    }
  }
})
app.use('/api', limiter)

// ============================================
// Utility Middleware
// ============================================

// Compression
app.use(compression())

// Request logging
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.logLevel))
}

// Body parsing
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// Trust proxy (for rate limiting behind reverse proxy)
if (config.isProduction) {
  app.set('trust proxy', 1)
}

// ============================================
// Health Check
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv
  })
})

// ============================================
// API Routes
// ============================================

app.use('/api', routes)

// ============================================
// Error Handling
// ============================================

app.use(notFoundHandler)
app.use(errorHandler)

// ============================================
// Graceful Shutdown
// ============================================

const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`)

  server.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })

  // Force close after 10s
  setTimeout(() => {
    console.error('Forcing shutdown...')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason)
})

// ============================================
// Start Server
// ============================================

let server

const startServer = async () => {
  // Initialize admin user
  await authService.initializeAdmin()

  server = app.listen(config.port, () => {
    console.log('='.repeat(50))
    console.log('Full Application Server')
    console.log('='.repeat(50))
    console.log(`Environment: ${config.nodeEnv}`)
    console.log(`Server:      http://localhost:${config.port}`)
    console.log(`API:         http://localhost:${config.port}/api`)
    console.log(`Health:      http://localhost:${config.port}/health`)
    console.log('='.repeat(50))
    console.log('\nDefault admin credentials:')
    console.log('  Email: admin@example.com')
    console.log('  Password: admin123')
    console.log('\nEndpoints:')
    console.log('  Auth:')
    console.log('    POST /api/auth/register')
    console.log('    POST /api/auth/login')
    console.log('    POST /api/auth/refresh')
    console.log('    POST /api/auth/logout')
    console.log('    POST /api/auth/change-password')
    console.log('\n  Users:')
    console.log('    GET  /api/users/me')
    console.log('    PATCH /api/users/me')
    console.log('    GET  /api/users/me/posts')
    console.log('    GET  /api/users (admin)')
    console.log('    GET  /api/users/:id (admin)')
    console.log('\n  Posts:')
    console.log('    GET  /api/posts')
    console.log('    GET  /api/posts/:id')
    console.log('    POST /api/posts')
    console.log('    PUT/PATCH /api/posts/:id')
    console.log('    DELETE /api/posts/:id')
    console.log('='.repeat(50))
  })
}

startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

module.exports = app
