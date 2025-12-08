/**
 * User Routes
 */

const express = require('express')
const router = express.Router()

const authService = require('../services/authService')
const postService = require('../services/postService')
const { authenticate, authorize } = require('../middleware/auth')
const { asyncHandler, formatResponse, paginate } = require('../utils/helpers')

// GET /users/me
router.get('/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = authService.getUserById(req.user.id)

    res.json(formatResponse(user))
  })
)

// PATCH /users/me
router.patch('/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = authService.updateUser(req.user.id, req.body)

    res.json(formatResponse(user, 'Profile updated'))
  })
)

// GET /users/me/posts
router.get('/me/posts',
  authenticate,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query

    const posts = postService.getUserPosts(req.user.id)
    const result = paginate(posts, Number(page), Number(limit))

    res.json(formatResponse(result))
  })
)

// GET /users (admin only)
router.get('/',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query

    const users = authService.getAllUsers()
    const result = paginate(users, Number(page), Number(limit))

    res.json(formatResponse(result))
  })
)

// GET /users/:id (admin only)
router.get('/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const user = authService.getUserById(req.params.id)

    res.json(formatResponse(user))
  })
)

// GET /users/:id/posts
router.get('/:id/posts',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query

    const posts = postService.getUserPosts(req.params.id)
    const result = paginate(posts, Number(page), Number(limit))

    res.json(formatResponse(result))
  })
)

module.exports = router
