# Express Rate Limit

Rate limiting middleware for Express that helps protect against brute-force attacks and API abuse.

## Installation

```bash
npm install express-rate-limit
```

## Basic Usage

```javascript
const express = require('express')
const rateLimit = require('express-rate-limit')

const app = express()

// Apply rate limiting to all requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  message: 'Too many requests, please try again later'
})

app.use(limiter)
```

## Configuration Options

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // Time window in ms
  max: 100,                       // Max requests per window
  message: 'Rate limit exceeded', // Response message
  statusCode: 429,                // HTTP status code
  standardHeaders: true,          // RateLimit-* headers
  legacyHeaders: false,           // X-RateLimit-* headers
  skipSuccessfulRequests: false,  // Count only failures
  skipFailedRequests: false,      // Count only successes
  keyGenerator: (req) => req.ip,  // Identify clients
  skip: (req) => false,           // Skip certain requests
  handler: (req, res) => {},      // Custom response handler
  store: new MemoryStore()        // Storage backend
})
```

### windowMs

```javascript
// Time window for rate limiting
rateLimit({ windowMs: 60 * 1000 })       // 1 minute
rateLimit({ windowMs: 15 * 60 * 1000 })  // 15 minutes
rateLimit({ windowMs: 60 * 60 * 1000 })  // 1 hour
```

### max

```javascript
// Maximum requests per window
rateLimit({ max: 100 })  // 100 requests

// Dynamic limit based on request
rateLimit({
  max: (req) => {
    if (req.user?.isPremium) return 1000
    return 100
  }
})
```

### message

```javascript
// String message
rateLimit({
  message: 'Too many requests'
})

// JSON message
rateLimit({
  message: {
    error: 'Too many requests',
    retryAfter: 15
  }
})

// Dynamic message
rateLimit({
  message: (req, res) => ({
    error: 'Too many requests',
    limit: res.getHeader('RateLimit-Limit'),
    remaining: res.getHeader('RateLimit-Remaining')
  })
})
```

### keyGenerator

```javascript
// By IP (default)
rateLimit({
  keyGenerator: (req) => req.ip
})

// By user ID
rateLimit({
  keyGenerator: (req) => req.user?.id || req.ip
})

// By API key
rateLimit({
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip
})

// Combined key
rateLimit({
  keyGenerator: (req) => `${req.ip}-${req.path}`
})
```

### skip

```javascript
// Skip certain requests
rateLimit({
  skip: (req) => {
    // Skip whitelisted IPs
    const whitelist = ['127.0.0.1', '::1']
    return whitelist.includes(req.ip)
  }
})

// Skip authenticated users
rateLimit({
  skip: (req) => req.isAuthenticated()
})

// Skip certain paths
rateLimit({
  skip: (req) => req.path === '/health'
})
```

### handler

```javascript
// Custom response handler
rateLimit({
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      error: 'Rate limit exceeded',
      message: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000)
    })
  }
})
```

## Response Headers

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,   // Enable standard headers
  legacyHeaders: false     // Disable legacy headers
})

// Standard headers (RFC 6585):
// RateLimit-Limit: 100
// RateLimit-Remaining: 99
// RateLimit-Reset: 1234567890

// Legacy headers (if legacyHeaders: true):
// X-RateLimit-Limit: 100
// X-RateLimit-Remaining: 99
// X-RateLimit-Reset: 1234567890
```

## Route-Specific Limits

```javascript
// Different limits for different routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
})

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,                     // 5 attempts
  message: 'Too many login attempts'
})

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many uploads'
})

// Apply to specific routes
app.use('/api/', apiLimiter)
app.use('/auth/login', authLimiter)
app.use('/upload', uploadLimiter)
```

## Storage Backends

### Memory Store (Default)

```javascript
// WARNING: Not suitable for multiple processes/servers
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
  // Uses MemoryStore by default
})
```

### Redis Store

```bash
npm install rate-limit-redis ioredis
```

```javascript
const RedisStore = require('rate-limit-redis')
const Redis = require('ioredis')

const redisClient = new Redis(process.env.REDIS_URL)

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args)
  })
})
```

### MongoDB Store

```bash
npm install rate-limit-mongo
```

```javascript
const MongoStore = require('rate-limit-mongo')

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: new MongoStore({
    uri: process.env.MONGODB_URI,
    collectionName: 'rate_limits',
    expireTimeMs: 15 * 60 * 1000
  })
})
```

## Common Patterns

### API Rate Limiting

```javascript
// General API limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip
})

app.use('/api', apiLimiter)
```

### Login Protection

```javascript
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,
  skipSuccessfulRequests: true,  // Only count failures
  message: {
    error: 'Too many failed login attempts',
    retryAfter: 3600
  }
})

app.post('/login', loginLimiter, loginHandler)
```

### Signup Protection

```javascript
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 3,
  message: 'Too many accounts created'
})

app.post('/signup', signupLimiter, signupHandler)
```

### Password Reset Protection

```javascript
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many password reset requests'
})

app.post('/forgot-password', passwordResetLimiter, forgotPasswordHandler)
```

### Tiered Rate Limiting

```javascript
// Different limits based on user type
const createTieredLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: (req) => {
      if (req.user?.plan === 'enterprise') return 10000
      if (req.user?.plan === 'pro') return 1000
      if (req.user) return 500
      return 100  // Anonymous
    },
    keyGenerator: (req) => req.user?.id || req.ip
  })
}

app.use('/api', createTieredLimiter())
```

### Slowdown Instead of Block

```bash
npm install express-slow-down
```

```javascript
const slowDown = require('express-slow-down')

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,      // Allow 50 requests, then start adding delay
  delayMs: (hits) => hits * 100,  // Add 100ms * request count
  maxDelayMs: 5000     // Max 5 second delay
})

app.use('/api', speedLimiter)
```

## Behind Proxy

```javascript
// When behind reverse proxy (nginx, load balancer)
app.set('trust proxy', 1)  // Trust first proxy

// Or be more specific
app.set('trust proxy', 'loopback')  // Trust localhost
app.set('trust proxy', '10.0.0.0/8')  // Trust IP range

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
  // Now req.ip will be correct
})
```

## Complete Example

```javascript
const express = require('express')
const rateLimit = require('express-rate-limit')
const RedisStore = require('rate-limit-redis')
const Redis = require('ioredis')

const app = express()

// Trust proxy
app.set('trust proxy', 1)

// Redis client (for production)
const redisClient = new Redis(process.env.REDIS_URL)

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args)
  }),
  skip: (req) => req.path === '/health'
})

// Strict auth limiter
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rl:auth:'
  }),
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many attempts',
      retryAfter: 3600
    })
  }
})

// Apply limiters
app.use('/api', apiLimiter)
app.use('/auth/login', authLimiter)
app.use('/auth/register', authLimiter)

// Health check (not rate limited)
app.get('/health', (req, res) => res.send('OK'))

// Routes
app.post('/auth/login', (req, res) => { /* ... */ })
app.get('/api/data', (req, res) => { /* ... */ })

app.listen(3000)
```

## Related

- [helmet](../helmet/) - Security headers
- [express-session](../express-session/) - Session management

---

*Rate limiting is essential for protecting Express applications from abuse.*
