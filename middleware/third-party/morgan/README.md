# Morgan

Morgan is an HTTP request logger middleware for Express. It logs request details to help with debugging and monitoring.

## Installation

```bash
npm install morgan
```

## Basic Usage

```javascript
const express = require('express')
const morgan = require('morgan')

const app = express()

// Use predefined format
app.use(morgan('dev'))
```

## Predefined Formats

```javascript
// Combined - Standard Apache combined log format
app.use(morgan('combined'))
// Output: ::1 - - [01/Jan/2024:12:00:00 +0000] "GET /api HTTP/1.1" 200 123 "-" "Mozilla/5.0..."

// Common - Standard Apache common log format
app.use(morgan('common'))
// Output: ::1 - - [01/Jan/2024:12:00:00 +0000] "GET /api HTTP/1.1" 200 123

// Dev - Colored by status code (for development)
app.use(morgan('dev'))
// Output: GET /api 200 5.123 ms - 123

// Short - Shorter than default, includes response time
app.use(morgan('short'))
// Output: ::1 - GET /api HTTP/1.1 200 123 - 5.123 ms

// Tiny - Minimal output
app.use(morgan('tiny'))
// Output: GET /api 200 123 - 5.123 ms
```

## Custom Formats

### Format String

```javascript
// Custom format string
app.use(morgan(':method :url :status :response-time ms'))
// Output: GET /api 200 5.123 ms

// With date
app.use(morgan(':date[iso] :method :url :status'))
// Output: 2024-01-01T12:00:00.000Z GET /api 200

// With request headers
app.use(morgan(':method :url :status - :req[content-type]'))
```

### Available Tokens

| Token | Description |
|-------|-------------|
| `:method` | HTTP method |
| `:url` | Request URL |
| `:status` | Response status code |
| `:response-time` | Response time in ms |
| `:date[format]` | UTC date (clf, iso, web) |
| `:http-version` | HTTP version |
| `:referrer` | Referrer header |
| `:remote-addr` | Remote IP address |
| `:remote-user` | Authenticated user |
| `:req[header]` | Request header |
| `:res[header]` | Response header |
| `:total-time` | Total time in ms |
| `:user-agent` | User-Agent header |

### Custom Tokens

```javascript
// Define custom token
morgan.token('id', (req) => req.id)
morgan.token('user', (req) => req.user?.name || 'anonymous')
morgan.token('body', (req) => JSON.stringify(req.body))

// Use in format
app.use(morgan(':id :method :url :user'))
```

### Format Function

```javascript
// Full control with function
app.use(morgan((tokens, req, res) => {
  return [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens['response-time'](req, res), 'ms',
    '-',
    tokens.res(req, res, 'content-length'), 'bytes'
  ].join(' ')
}))
```

## Options

```javascript
app.use(morgan('dev', {
  immediate: false,       // Log at response (default) or request
  skip: null,            // Function to skip logging
  stream: process.stdout // Output stream
}))
```

### immediate

```javascript
// Log at request time (before response)
app.use(morgan('dev', { immediate: true }))
// Note: Response info won't be available

// Log at response time (default)
app.use(morgan('dev', { immediate: false }))
```

### skip

```javascript
// Skip logging for certain requests
app.use(morgan('dev', {
  skip: (req, res) => res.statusCode < 400
}))
// Only logs errors (4xx and 5xx)

// Skip health checks
app.use(morgan('dev', {
  skip: (req, res) => req.url === '/health'
}))

// Skip static files
app.use(morgan('dev', {
  skip: (req, res) => req.url.startsWith('/static')
}))
```

### stream

```javascript
const fs = require('fs')
const path = require('path')

// Log to file
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' }
)

app.use(morgan('combined', { stream: accessLogStream }))
```

## Common Patterns

### Development vs Production

```javascript
if (process.env.NODE_ENV === 'development') {
  // Colorful, readable format for development
  app.use(morgan('dev'))
} else {
  // Standard format for production logs
  const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'logs', 'access.log'),
    { flags: 'a' }
  )
  app.use(morgan('combined', { stream: accessLogStream }))
}
```

### Log Rotation

```javascript
const rfs = require('rotating-file-stream')

// Create rotating write stream
const accessLogStream = rfs.createStream('access.log', {
  interval: '1d',  // Rotate daily
  path: path.join(__dirname, 'logs'),
  maxFiles: 14     // Keep 14 days
})

app.use(morgan('combined', { stream: accessLogStream }))
```

### JSON Logging

```javascript
morgan.token('body', (req) => JSON.stringify(req.body))

app.use(morgan((tokens, req, res) => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: parseInt(tokens.status(req, res)),
    responseTime: parseFloat(tokens['response-time'](req, res)),
    contentLength: tokens.res(req, res, 'content-length'),
    userAgent: tokens['user-agent'](req, res),
    ip: tokens['remote-addr'](req, res)
  })
}))
```

### With Request ID

```javascript
const { v4: uuidv4 } = require('uuid')

// Add request ID
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4()
  res.setHeader('X-Request-ID', req.id)
  next()
})

// Include in logs
morgan.token('request-id', (req) => req.id)
app.use(morgan(':request-id :method :url :status :response-time ms'))
```

### Dual Logging

```javascript
// Log to both console and file
app.use(morgan('dev'))  // Console (development)

if (process.env.NODE_ENV === 'production') {
  const accessLogStream = fs.createWriteStream('./access.log', { flags: 'a' })
  app.use(morgan('combined', { stream: accessLogStream }))
}
```

### Error-Only Logging

```javascript
// Only log errors
app.use(morgan('combined', {
  skip: (req, res) => res.statusCode < 400,
  stream: fs.createWriteStream('./error.log', { flags: 'a' })
}))

// Log everything to console
app.use(morgan('dev'))
```

### With Winston

```javascript
const winston = require('winston')

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: 'access.log' })
  ]
})

const stream = {
  write: (message) => logger.info(message.trim())
}

app.use(morgan('combined', { stream }))
```

## Security Considerations

```javascript
// Don't log sensitive data
morgan.token('body', (req) => {
  const body = { ...req.body }
  // Remove sensitive fields
  delete body.password
  delete body.creditCard
  delete body.ssn
  return JSON.stringify(body)
})

// Don't log in development if sensitive
app.use(morgan('dev', {
  skip: (req) => req.url.includes('/auth')
}))
```

## Related

- [helmet](../helmet/) - Security headers
- [compression](../compression/) - Response compression

---

*Morgan is essential for monitoring and debugging Express applications.*
