# Express Validator

Express Validator is a set of middleware functions for validating and sanitizing request data.

## Installation

```bash
npm install express-validator
```

## Basic Usage

```javascript
const express = require('express')
const { body, validationResult } = require('express-validator')

const app = express()
app.use(express.json())

app.post('/users',
  // Validation rules
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().notEmpty(),

  // Handle validation result
  (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    // Create user with validated data
    res.json({ message: 'User created', body: req.body })
  }
)
```

## Validation Chains

### body() - Request Body

```javascript
const { body } = require('express-validator')

app.post('/users',
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  body('age').isInt({ min: 0, max: 120 }),
  handler
)
```

### query() - Query Parameters

```javascript
const { query } = require('express-validator')

app.get('/search',
  query('q').trim().notEmpty().escape(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handler
)
```

### param() - Route Parameters

```javascript
const { param } = require('express-validator')

app.get('/users/:id',
  param('id').isMongoId(),
  handler
)

app.get('/posts/:slug',
  param('slug').matches(/^[a-z0-9-]+$/),
  handler
)
```

### header() - Request Headers

```javascript
const { header } = require('express-validator')

app.post('/api/data',
  header('Authorization').exists().matches(/^Bearer .+$/),
  header('Content-Type').equals('application/json'),
  handler
)
```

### cookie() - Cookies

```javascript
const { cookie } = require('express-validator')

app.get('/dashboard',
  cookie('sessionId').isUUID(),
  handler
)
```

## Common Validators

```javascript
const { body } = require('express-validator')

// String validators
body('name').isString()
body('name').isLength({ min: 2, max: 50 })
body('name').matches(/^[a-zA-Z\s]+$/)
body('name').contains('required text')

// Email
body('email').isEmail()

// Numbers
body('age').isInt({ min: 0, max: 150 })
body('price').isFloat({ min: 0 })
body('quantity').isNumeric()

// Boolean
body('active').isBoolean()

// Date
body('birthday').isISO8601()
body('createdAt').isDate()

// Array
body('tags').isArray({ min: 1, max: 10 })
body('tags.*').isString()  // Each element

// URL
body('website').isURL()

// UUID
body('id').isUUID()

// JSON
body('metadata').isJSON()

// MongoDB ObjectId
body('userId').isMongoId()

// Credit Card
body('cardNumber').isCreditCard()

// Phone (requires libphonenumber-js)
body('phone').isMobilePhone('any')

// Postal Code
body('zip').isPostalCode('US')

// Currency
body('amount').isCurrency()
```

## Sanitizers

```javascript
const { body } = require('express-validator')

// String sanitizers
body('name').trim()                // Remove whitespace
body('name').escape()              // HTML escape
body('email').normalizeEmail()     // Lowercase, remove dots
body('text').stripLow()            // Remove control chars

// Number sanitizers
body('age').toInt()
body('price').toFloat()

// Boolean sanitizer
body('active').toBoolean()

// Date sanitizer
body('date').toDate()

// Array sanitizer
body('tags').toArray()

// Custom sanitizer
body('username').customSanitizer(value => value.toLowerCase())
```

## Validation Result

```javascript
const { validationResult } = require('express-validator')

app.post('/users', validators, (req, res) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
      // [{ location: 'body', msg: 'Invalid value', path: 'email', value: 'bad' }]
    })
  }

  // Continue with validated data
})

// Format errors differently
app.post('/users', validators, (req, res) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    // Mapped by field
    return res.status(400).json({
      errors: errors.mapped()
      // { email: { msg: '...', ... }, password: { msg: '...', ... } }
    })
  }
})
```

## Custom Error Messages

```javascript
// Per-validator message
body('email')
  .isEmail()
  .withMessage('Please provide a valid email address')
  .normalizeEmail()

body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/)
  .withMessage('Password must contain uppercase letter')
  .matches(/[0-9]/)
  .withMessage('Password must contain a number')

// Dynamic message
body('age')
  .isInt({ min: 18 })
  .withMessage((value, { req }) =>
    `Age must be at least 18, got ${value}`
  )
```

## Optional Fields

```javascript
// Optional - skip if undefined
body('nickname').optional().isLength({ min: 2 })

// Optional with options
body('bio').optional({ nullable: true }).isLength({ max: 500 })
// nullable: true - allow null values
// checkFalsy: true - treat '', 0, false as missing
```

## Custom Validators

```javascript
const { body } = require('express-validator')

// Inline custom validator
body('password').custom((value, { req }) => {
  if (value !== req.body.confirmPassword) {
    throw new Error('Passwords do not match')
  }
  return true
})

// Async custom validator
body('email').custom(async (value) => {
  const user = await User.findOne({ email: value })
  if (user) {
    throw new Error('Email already in use')
  }
  return true
})

// Reusable custom validator
const isUniqueEmail = async (value) => {
  const user = await User.findOne({ email: value })
  if (user) throw new Error('Email already in use')
  return true
}

body('email').custom(isUniqueEmail)
```

## Conditional Validation

```javascript
// Validate based on condition
body('businessName')
  .if(body('accountType').equals('business'))
  .notEmpty()
  .withMessage('Business name required for business accounts')

// Using custom logic
body('state')
  .if((value, { req }) => req.body.country === 'US')
  .isLength({ min: 2, max: 2 })
  .withMessage('US state must be 2 letter code')
```

## Validation Schemas

```javascript
const { checkSchema, validationResult } = require('express-validator')

const userSchema = {
  email: {
    isEmail: {
      errorMessage: 'Invalid email'
    },
    normalizeEmail: true
  },
  password: {
    isLength: {
      options: { min: 8 },
      errorMessage: 'Password must be at least 8 characters'
    }
  },
  name: {
    trim: true,
    notEmpty: {
      errorMessage: 'Name is required'
    },
    isLength: {
      options: { max: 100 },
      errorMessage: 'Name too long'
    }
  },
  age: {
    optional: true,
    isInt: {
      options: { min: 0, max: 150 },
      errorMessage: 'Invalid age'
    },
    toInt: true
  }
}

app.post('/users', checkSchema(userSchema), (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  // ...
})
```

## Reusable Validation Sets

```javascript
// validators/user.js
const { body } = require('express-validator')

const createUserValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
]

const updateUserValidation = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail(),

  body('name')
    .optional()
    .trim()
    .notEmpty()
]

module.exports = { createUserValidation, updateUserValidation }

// routes/users.js
const { createUserValidation, updateUserValidation } = require('../validators/user')

router.post('/', createUserValidation, handleValidation, createUser)
router.put('/:id', updateUserValidation, handleValidation, updateUser)
```

## Validation Middleware

```javascript
// middleware/validate.js
const { validationResult } = require('express-validator')

const validate = (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    })
  }

  next()
}

module.exports = validate

// Usage
const validate = require('./middleware/validate')

app.post('/users',
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  validate,  // Check validation result
  createUser
)
```

## Complete Example

```javascript
const express = require('express')
const { body, param, query, validationResult } = require('express-validator')

const app = express()
app.use(express.json())

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

// User routes
app.post('/users',
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .matches(/[A-Z]/).withMessage('Must contain uppercase')
    .matches(/[0-9]/).withMessage('Must contain number'),
  body('name').trim().notEmpty().escape(),
  body('age').optional().isInt({ min: 0, max: 150 }).toInt(),
  validate,
  (req, res) => {
    res.json({ user: req.body })
  }
)

app.get('/users/:id',
  param('id').isMongoId(),
  validate,
  (req, res) => {
    res.json({ userId: req.params.id })
  }
)

app.get('/users',
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim().escape(),
  validate,
  (req, res) => {
    res.json({ query: req.query })
  }
)

app.listen(3000)
```

## Related

- [multer](../multer/) - File uploads
- [helmet](../helmet/) - Security headers

---

*Express Validator is essential for secure input handling in Express applications.*
