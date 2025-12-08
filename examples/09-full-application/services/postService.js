/**
 * Post Service
 */

const { v4: uuidv4 } = require('uuid')
const { NotFoundError, ForbiddenError } = require('../utils/errors')

// In-memory post store
const posts = new Map()

// Create post
const createPost = (userId, { title, content, tags = [] }) => {
  const post = {
    id: uuidv4(),
    userId,
    title,
    content,
    tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  posts.set(post.id, post)

  return post
}

// Get post by ID
const getPostById = (id) => {
  const post = posts.get(id)

  if (!post) {
    throw new NotFoundError('Post')
  }

  return post
}

// Get all posts with filters
const getAllPosts = ({ userId, tag, search } = {}) => {
  let result = Array.from(posts.values())

  if (userId) {
    result = result.filter(p => p.userId === userId)
  }

  if (tag) {
    result = result.filter(p => p.tags.includes(tag))
  }

  if (search) {
    const searchLower = search.toLowerCase()
    result = result.filter(p =>
      p.title.toLowerCase().includes(searchLower) ||
      p.content.toLowerCase().includes(searchLower)
    )
  }

  // Sort by createdAt descending
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return result
}

// Update post
const updatePost = (id, userId, userRole, updates) => {
  const post = posts.get(id)

  if (!post) {
    throw new NotFoundError('Post')
  }

  // Check ownership
  if (post.userId !== userId && userRole !== 'admin') {
    throw new ForbiddenError('You do not own this post')
  }

  if (updates.title) post.title = updates.title
  if (updates.content) post.content = updates.content
  if (updates.tags) post.tags = updates.tags

  post.updatedAt = new Date().toISOString()

  return post
}

// Delete post
const deletePost = (id, userId, userRole) => {
  const post = posts.get(id)

  if (!post) {
    throw new NotFoundError('Post')
  }

  // Check ownership
  if (post.userId !== userId && userRole !== 'admin') {
    throw new ForbiddenError('You do not own this post')
  }

  posts.delete(id)
}

// Get user's posts
const getUserPosts = (userId) => {
  return Array.from(posts.values())
    .filter(p => p.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

module.exports = {
  createPost,
  getPostById,
  getAllPosts,
  updatePost,
  deletePost,
  getUserPosts
}
