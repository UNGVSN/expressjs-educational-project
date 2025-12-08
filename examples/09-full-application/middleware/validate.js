/**
 * Validation Middleware
 */

const { ValidationError } = require('../utils/errors')

// Generic validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const errors = []

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field]

      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({ field, message: `${field} is required` })
        continue
      }

      // Skip other validations if value is empty and not required
      if (value === undefined || value === null || value === '') {
        continue
      }

      // Type check
      if (rules.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value
        if (actualType !== rules.type) {
          errors.push({ field, message: `${field} must be a ${rules.type}` })
          continue
        }
      }

      // Min length
      if (rules.minLength && value.length < rules.minLength) {
        errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` })
      }

      // Max length
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push({ field, message: `${field} must be at most ${rules.maxLength} characters` })
      }

      // Pattern
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push({ field, message: rules.message || `${field} format is invalid` })
      }

      // Enum
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` })
      }

      // Custom validation
      if (rules.custom) {
        const result = rules.custom(value, req.body)
        if (result !== true) {
          errors.push({ field, message: result })
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors)
    }

    next()
  }
}

// Common validation schemas
const schemas = {
  register: {
    email: {
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Invalid email format'
    },
    password: {
      required: true,
      type: 'string',
      minLength: 6,
      maxLength: 100
    },
    name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 50
    }
  },

  login: {
    email: {
      required: true,
      type: 'string'
    },
    password: {
      required: true,
      type: 'string'
    }
  },

  createPost: {
    title: {
      required: true,
      type: 'string',
      minLength: 3,
      maxLength: 200
    },
    content: {
      required: true,
      type: 'string',
      minLength: 10
    },
    tags: {
      type: 'array'
    }
  },

  updatePost: {
    title: {
      type: 'string',
      minLength: 3,
      maxLength: 200
    },
    content: {
      type: 'string',
      minLength: 10
    },
    tags: {
      type: 'array'
    }
  }
}

module.exports = {
  validate,
  schemas
}
