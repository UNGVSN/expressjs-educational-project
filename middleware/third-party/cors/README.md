# CORS

CORS (Cross-Origin Resource Sharing) middleware enables cross-origin requests to your Express server.

## Installation

```bash
npm install cors
```

## Basic Usage

```javascript
const express = require('express')
const cors = require('cors')

const app = express()

// Enable CORS for all routes
app.use(cors())
```

## What is CORS?

CORS is a security feature that restricts web pages from making requests to a different domain than the one serving the page.

```
Browser on https://frontend.com
    │
    ├── Request to https://frontend.com/page  ✓ Same origin
    │
    └── Request to https://api.backend.com/data  ✗ Cross-origin (blocked by default)
```

With CORS middleware, the server tells browsers which origins are allowed.

## Configuration Options

```javascript
app.use(cors({
  origin: 'http://example.com',        // Allowed origin(s)
  methods: ['GET', 'POST'],            // Allowed methods
  allowedHeaders: ['Content-Type'],    // Allowed headers
  exposedHeaders: ['X-Custom-Header'], // Headers exposed to browser
  credentials: true,                    // Allow cookies
  maxAge: 86400,                        // Preflight cache time (seconds)
  preflightContinue: false,            // Pass preflight to next handler
  optionsSuccessStatus: 204            // Status for OPTIONS requests
}))
```

### origin

```javascript
// Allow all origins (default)
app.use(cors())

// Allow specific origin
app.use(cors({
  origin: 'http://example.com'
}))

// Allow multiple origins
app.use(cors({
  origin: ['http://example.com', 'http://another.com']
}))

// Dynamic origin
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['http://example.com', 'http://another.com']

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}))

// Allow all origins (explicit)
app.use(cors({
  origin: '*'
}))

// Regex pattern
app.use(cors({
  origin: /\.example\.com$/  // Any subdomain of example.com
}))
```

### methods

```javascript
// Allow specific HTTP methods
app.use(cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}))

// String format
app.use(cors({
  methods: 'GET,POST,PUT,DELETE'
}))
```

### allowedHeaders

```javascript
// Headers the client can send
app.use(cors({
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))
```

### exposedHeaders

```javascript
// Headers the client can read from response
app.use(cors({
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
}))
```

### credentials

```javascript
// Allow cookies and authentication headers
app.use(cors({
  origin: 'http://example.com',  // Must specify origin (not *)
  credentials: true
}))

// Client must also set credentials
// fetch(url, { credentials: 'include' })
```

### maxAge

```javascript
// Cache preflight response for 24 hours
app.use(cors({
  maxAge: 86400  // seconds
}))
```

## Route-Specific CORS

```javascript
const cors = require('cors')

// Different CORS for different routes
app.get('/public', cors(), (req, res) => {
  res.json({ message: 'Open to all' })
})

app.get('/api/data', cors({ origin: 'http://example.com' }), (req, res) => {
  res.json({ message: 'Only from example.com' })
})

// No CORS for internal routes
app.get('/internal', (req, res) => {
  res.json({ message: 'Same-origin only' })
})
```

## Common Patterns

### API Server

```javascript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  credentials: true,
  maxAge: 86400
}

app.use(cors(corsOptions))
```

### Development vs Production

```javascript
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://myapp.com', 'https://admin.myapp.com']
    : true,  // Allow all in development
  credentials: true
}

app.use(cors(corsOptions))
```

### Whitelist with Database

```javascript
const getAllowedOrigins = async () => {
  // Fetch from database or config
  return ['http://example.com', 'http://another.com']
}

app.use(cors({
  origin: async (origin, callback) => {
    const allowedOrigins = await getAllowedOrigins()

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}))
```

### With Credentials (Cookies)

```javascript
// Server
app.use(cors({
  origin: 'http://frontend.com',  // Cannot use * with credentials
  credentials: true
}))

app.use(session({
  cookie: {
    sameSite: 'none',  // Required for cross-origin cookies
    secure: true       // Required for sameSite: 'none'
  }
}))

// Client
fetch('http://api.example.com/data', {
  credentials: 'include'  // Send cookies
})
```

### Preflight Requests

```javascript
// Handle preflight manually if needed
app.options('/api/*', cors())  // Enable preflight for /api routes

// Or let cors() handle it automatically
app.use(cors())
```

## CORS Headers Explained

```
# Simple Response Headers
Access-Control-Allow-Origin: http://example.com
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Custom-Header

# Preflight Response Headers
Access-Control-Allow-Methods: GET, POST, PUT
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

## Error Handling

```javascript
app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('CORS not allowed'))
    }
  }
}))

// Handle CORS errors
app.use((err, req, res, next) => {
  if (err.message === 'CORS not allowed') {
    return res.status(403).json({ error: 'CORS not allowed for this origin' })
  }
  next(err)
})
```

## Troubleshooting

### Common Issues

```javascript
// Issue: "No 'Access-Control-Allow-Origin' header"
// Solution: Add CORS middleware before routes
app.use(cors())  // Must be before routes
app.use('/api', routes)

// Issue: Cookies not sent
// Solution: Enable credentials on both sides
// Server:
app.use(cors({ origin: 'http://example.com', credentials: true }))
// Client:
fetch(url, { credentials: 'include' })

// Issue: Custom headers not working
// Solution: Add to allowedHeaders
app.use(cors({ allowedHeaders: ['Content-Type', 'X-Custom-Header'] }))

// Issue: Response headers not accessible
// Solution: Add to exposedHeaders
app.use(cors({ exposedHeaders: ['X-Total-Count'] }))
```

## Security Considerations

```javascript
// DON'T: Allow all origins with credentials
app.use(cors({
  origin: '*',
  credentials: true  // This is invalid and won't work
}))

// DO: Specify origins when using credentials
app.use(cors({
  origin: ['http://example.com'],
  credentials: true
}))

// DON'T: Allow all origins in production
app.use(cors())  // Allows any origin

// DO: Whitelist specific origins in production
app.use(cors({
  origin: ['https://myapp.com', 'https://admin.myapp.com']
}))
```

## Related

- [helmet](../helmet/) - Security headers
- [express-session](../express-session/) - Session management

---

*CORS is essential for APIs consumed by web applications from different domains.*
