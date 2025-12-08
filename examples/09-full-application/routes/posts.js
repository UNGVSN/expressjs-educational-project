/**
 * Post Routes
 */

const express = require('express')
const router = express.Router()

const postService = require('../services/postService')
const { authenticate, optionalAuth } = require('../middleware/auth')
const { validate, schemas } = require('../middleware/validate')
const { asyncHandler, formatResponse, paginate } = require('../utils/helpers')

// GET /posts
router.get('/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, userId, tag, search } = req.query

    const posts = postService.getAllPosts({ userId, tag, search })
    const result = paginate(posts, Number(page), Number(limit))

    res.json(formatResponse(result))
  })
)

// GET /posts/:id
router.get('/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const post = postService.getPostById(req.params.id)

    res.json(formatResponse(post))
  })
)

// POST /posts
router.post('/',
  authenticate,
  validate(schemas.createPost),
  asyncHandler(async (req, res) => {
    const post = postService.createPost(req.user.id, req.body)

    res.status(201).json(formatResponse(post, 'Post created'))
  })
)

// PUT /posts/:id
router.put('/:id',
  authenticate,
  validate(schemas.createPost),
  asyncHandler(async (req, res) => {
    const post = postService.updatePost(
      req.params.id,
      req.user.id,
      req.user.role,
      req.body
    )

    res.json(formatResponse(post, 'Post updated'))
  })
)

// PATCH /posts/:id
router.patch('/:id',
  authenticate,
  validate(schemas.updatePost),
  asyncHandler(async (req, res) => {
    const post = postService.updatePost(
      req.params.id,
      req.user.id,
      req.user.role,
      req.body
    )

    res.json(formatResponse(post, 'Post updated'))
  })
)

// DELETE /posts/:id
router.delete('/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    postService.deletePost(req.params.id, req.user.id, req.user.role)

    res.status(204).send()
  })
)

module.exports = router
