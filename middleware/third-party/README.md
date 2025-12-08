# Third-Party Middleware

Third-party middleware packages extend Express functionality. These are npm packages that follow the Express middleware pattern.

## Overview

```javascript
// Install third-party middleware
// npm install helmet cors morgan compression

const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const morgan = require('morgan')
const compression = require('compression')

const app = express()

// Use third-party middleware
app.use(helmet())
app.use(cors())
app.use(morgan('dev'))
app.use(compression())
```

## Popular Middleware

| Package | Purpose | Documentation |
|---------|---------|---------------|
| helmet | Security headers | [helmet](./helmet/) |
| cors | Cross-origin requests | [cors](./cors/) |
| morgan | HTTP logging | [morgan](./morgan/) |
| compression | Response compression | [compression](./compression/) |
| express-session | Session management | [express-session](./express-session/) |
| passport | Authentication | [passport](./passport/) |
| multer | File uploads | [multer](./multer/) |
| express-validator | Input validation | [express-validator](./express-validator/) |
| express-rate-limit | Rate limiting | [rate-limiter](./rate-limiter/) |

## Quick Setup

### Security & Performance Stack

```javascript
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const compression = require('compression')

const app = express()

// Security
app.use(helmet())
app.use(cors())

// Performance
app.use(compression())

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
```

### Logging Stack

```javascript
const morgan = require('morgan')
const fs = require('fs')
const path = require('path')

// Development: Log to console
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// Production: Log to file
if (process.env.NODE_ENV === 'production') {
  const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'),
    { flags: 'a' }
  )
  app.use(morgan('combined', { stream: accessLogStream }))
}
```

### Authentication Stack

```javascript
const session = require('express-session')
const passport = require('passport')

// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}))

// Passport
app.use(passport.initialize())
app.use(passport.session())
```

### Validation Stack

```javascript
const { body, validationResult } = require('express-validator')

app.post('/users',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().notEmpty(),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    // Create user...
  }
)
```

### File Upload Stack

```javascript
const multer = require('multer')

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }  // 5MB
})

app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ file: req.file })
})
```

### Rate Limiting Stack

```javascript
const rateLimit = require('express-rate-limit')

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false
})

app.use('/api', limiter)
```

## Recommended Order

```javascript
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const compression = require('compression')
const morgan = require('morgan')
const session = require('express-session')
const passport = require('passport')
const rateLimit = require('express-rate-limit')

const app = express()

// 1. Security headers (first)
app.use(helmet())

// 2. CORS (before routes)
app.use(cors())

// 3. Compression (before response)
app.use(compression())

// 4. Request logging
app.use(morgan('dev'))

// 5. Rate limiting
app.use(rateLimit({ windowMs: 60000, max: 100 }))

// 6. Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 7. Static files
app.use(express.static('public'))

// 8. Session management
app.use(session(sessionConfig))

// 9. Authentication
app.use(passport.initialize())
app.use(passport.session())

// 10. Routes
app.use('/api', apiRoutes)

// 11. Error handling
app.use(errorHandler)
```

## Categories

### Security
- [helmet](./helmet/) - Set security HTTP headers
- [cors](./cors/) - Enable CORS
- [rate-limiter](./rate-limiter/) - Rate limiting

### Parsing & Processing
- [multer](./multer/) - File upload handling
- [express-validator](./express-validator/) - Input validation

### Session & Auth
- [express-session](./express-session/) - Session management
- [passport](./passport/) - Authentication strategies

### Logging & Monitoring
- [morgan](./morgan/) - HTTP request logging

### Performance
- [compression](./compression/) - Response compression

## Learning Path

1. Start with [helmet](./helmet/) and [cors](./cors/) for basic security
2. Add [morgan](./morgan/) for logging
3. Learn [compression](./compression/) for performance
4. Implement [express-session](./express-session/) for sessions
5. Add [passport](./passport/) for authentication
6. Use [multer](./multer/) for file uploads
7. Add [express-validator](./express-validator/) for validation
8. Implement [rate-limiter](./rate-limiter/) for protection

---

*Third-party middleware provides production-ready solutions for common Express needs.*
