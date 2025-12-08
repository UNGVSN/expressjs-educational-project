/**
 * Utility Helpers
 */

// Async handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// Pagination helper
const paginate = (array, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit
  const endIndex = page * limit

  return {
    data: array.slice(startIndex, endIndex),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: array.length,
      pages: Math.ceil(array.length / limit),
      hasNext: endIndex < array.length,
      hasPrev: page > 1
    }
  }
}

// Response formatter
const formatResponse = (data, message = 'Success') => ({
  success: true,
  message,
  data
})

// Pick specific fields from object
const pick = (obj, keys) => {
  return keys.reduce((acc, key) => {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
      acc[key] = obj[key]
    }
    return acc
  }, {})
}

// Omit specific fields from object
const omit = (obj, keys) => {
  return Object.keys(obj).reduce((acc, key) => {
    if (!keys.includes(key)) {
      acc[key] = obj[key]
    }
    return acc
  }, {})
}

module.exports = {
  asyncHandler,
  paginate,
  formatResponse,
  pick,
  omit
}
