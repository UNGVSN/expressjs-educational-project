/**
 * Route Index
 *
 * Centralized route registration.
 */

const express = require('express')
const router = express.Router()

const authRoutes = require('./auth')
const userRoutes = require('./users')
const postRoutes = require('./posts')

// Mount routes
router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/posts', postRoutes)

// API info
router.get('/', (req, res) => {
  res.json({
    name: 'Full Application API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /auth/register': 'Register new user',
        'POST /auth/login': 'Login',
        'POST /auth/refresh': 'Refresh access token',
        'POST /auth/logout': 'Logout',
        'POST /auth/change-password': 'Change password'
      },
      users: {
        'GET /users/me': 'Get current user',
        'PATCH /users/me': 'Update current user',
        'GET /users/me/posts': 'Get my posts',
        'GET /users': 'List users (admin)',
        'GET /users/:id': 'Get user (admin)',
        'GET /users/:id/posts': 'Get user posts'
      },
      posts: {
        'GET /posts': 'List posts',
        'GET /posts/:id': 'Get post',
        'POST /posts': 'Create post',
        'PUT /posts/:id': 'Replace post',
        'PATCH /posts/:id': 'Update post',
        'DELETE /posts/:id': 'Delete post'
      }
    }
  })
})

module.exports = router
