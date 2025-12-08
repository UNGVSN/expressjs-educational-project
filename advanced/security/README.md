# Security

Security best practices for Express applications to protect against common vulnerabilities.

## Overview

Security is crucial for production applications. This covers common vulnerabilities and how to prevent them.

## Common Vulnerabilities

| Vulnerability | Prevention |
|--------------|------------|
| XSS | Escape output, CSP headers |
| CSRF | CSRF tokens, SameSite cookies |
| SQL/NoSQL Injection | Parameterized queries |
| Broken Authentication | Secure sessions, rate limiting |
| Sensitive Data Exposure | HTTPS, encryption |
| Insecure Dependencies | Regular updates, audits |

## Helmet - Security Headers

```bash
npm install helmet
```

```javascript
const helmet = require('helmet')

// Use all defaults
app.use(helmet())

// Custom configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))
```

## Rate Limiting

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit')

// General API limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,
  message: { error: 'Too many requests' }
})
app.use('/api', apiLimiter)

// Strict limit for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,
  skipSuccessfulRequests: true
})
app.use('/auth/login', authLimiter)
```

## Input Validation

```bash
npm install express-validator
```

```javascript
const { body, validationResult } = require('express-validator')

app.post('/users',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 })
    .matches(/[A-Z]/).withMessage('Must contain uppercase')
    .matches(/[0-9]/).withMessage('Must contain number'),
  body('name').trim().escape().notEmpty(),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  },
  createUser
)
```

## SQL Injection Prevention

```javascript
// BAD - String concatenation
const query = `SELECT * FROM users WHERE id = ${userId}`  // Vulnerable!

// GOOD - Parameterized queries
// MySQL
const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId])

// PostgreSQL
const result = await client.query('SELECT * FROM users WHERE id = $1', [userId])

// MongoDB (Mongoose)
const user = await User.findById(userId)  // Safe by design
```

## NoSQL Injection Prevention

```javascript
// BAD - Direct user input
const user = await User.findOne({ email: req.body.email })
// Input: { "$gt": "" } would match any user!

// GOOD - Validate and sanitize
const { body } = require('express-validator')

app.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').isString(),
  async (req, res) => {
    const { email, password } = req.body
    const user = await User.findOne({ email: String(email) })
    // ...
  }
)
```

## XSS Prevention

```javascript
// 1. Use template engine auto-escaping
// EJS: <%= userInput %>  (escaped)
// EJS: <%- userInput %>  (raw - avoid)

// 2. Set Content-Security-Policy
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],  // No inline scripts
  }
}))

// 3. Sanitize user input
const sanitizeHtml = require('sanitize-html')
const clean = sanitizeHtml(dirtyHtml)

// 4. Set httpOnly cookies
res.cookie('session', token, {
  httpOnly: true,  // Not accessible via JavaScript
  secure: true,
  sameSite: 'strict'
})
```

## CSRF Protection

```bash
npm install csurf
```

```javascript
const csrf = require('csurf')

// For form-based apps
app.use(csrf())

app.get('/form', (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() })
})

// In template
// <input type="hidden" name="_csrf" value="<%= csrfToken %>">
```

For APIs, use SameSite cookies and verify Origin header:

```javascript
// API CSRF protection
app.use((req, res, next) => {
  const origin = req.headers.origin
  const allowedOrigins = ['https://myapp.com']

  if (req.method !== 'GET' && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Invalid origin' })
  }
  next()
})
```

## Secure Session Configuration

```javascript
const session = require('express-session')

app.use(session({
  name: 'sessionId',  // Change default name
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000  // 1 day
  }
}))
```

## Password Security

```javascript
const bcrypt = require('bcrypt')

// Hash password
const hash = await bcrypt.hash(password, 12)

// Verify password
const match = await bcrypt.compare(password, hash)

// Never store plain passwords
// Never log passwords
// Use timing-safe comparison (bcrypt does this)
```

## JWT Security

```javascript
const jwt = require('jsonwebtoken')

// Generate token
const token = jwt.sign(
  { sub: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }  // Short expiry
)

// Verify token
const decoded = jwt.verify(token, process.env.JWT_SECRET)

// Store secret securely
// Use short expiry times
// Implement refresh tokens
// Don't store sensitive data in payload
```

## HTTPS

```javascript
// In production, always use HTTPS
// Usually handled by reverse proxy (nginx)

// Trust proxy header
app.set('trust proxy', 1)

// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    next()
  } else {
    res.redirect(`https://${req.hostname}${req.url}`)
  }
})

// HSTS header (via Helmet)
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true
}))
```

## File Upload Security

```javascript
const multer = require('multer')

const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5MB limit
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  }
})

// Don't use original filename
const storage = multer.diskStorage({
  filename: (req, file, cb) => {
    const uniqueName = crypto.randomUUID() + path.extname(file.originalname)
    cb(null, uniqueName)
  }
})

// Scan uploaded files for malware
// Store outside web root
// Set appropriate permissions
```

## Dependency Security

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Update dependencies
npm update

# Use tools like Snyk
npm install -g snyk
snyk test
```

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Set security headers (Helmet)
- [ ] Implement rate limiting
- [ ] Validate and sanitize input
- [ ] Use parameterized queries
- [ ] Hash passwords with bcrypt
- [ ] Secure session cookies
- [ ] Implement CSRF protection
- [ ] Keep dependencies updated
- [ ] Log security events
- [ ] Use environment variables for secrets

## Related

- [error-handling](../error-handling/) - Secure error handling
- [production](../production/) - Production security

---

*Security is essential for protecting users and data in Express applications.*
