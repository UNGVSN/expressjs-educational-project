# express.json()

Parses incoming requests with JSON payloads. This middleware is built on the `body-parser` library.

## Overview

```javascript
const express = require('express')
const app = express()

// Parse JSON bodies
app.use(express.json())

app.post('/api/users', (req, res) => {
  console.log(req.body)  // Parsed JSON object
  res.json({ success: true })
})
```

## Options

```javascript
app.use(express.json({
  inflate: true,            // Handle compressed bodies
  limit: '100kb',           // Max body size
  reviver: null,            // JSON.parse reviver function
  strict: true,             // Only accept objects and arrays
  type: 'application/json', // Content-Type to parse
  verify: undefined         // Verification function
}))
```

### inflate

```javascript
// Handle deflate/gzip compressed bodies
app.use(express.json({ inflate: true }))  // Default: true

// Disable compression handling
app.use(express.json({ inflate: false }))
```

### limit

```javascript
// String format
app.use(express.json({ limit: '100kb' }))
app.use(express.json({ limit: '1mb' }))

// Number format (bytes)
app.use(express.json({ limit: 102400 }))  // 100KB

// Request exceeding limit returns 413 Payload Too Large
```

### reviver

```javascript
// Custom JSON parsing (like JSON.parse reviver)
app.use(express.json({
  reviver: (key, value) => {
    // Convert date strings to Date objects
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return new Date(value)
    }
    return value
  }
}))

// Now dates in JSON are automatically converted
// { "created": "2024-01-15T10:30:00Z" }
// becomes { created: Date object }
```

### strict

```javascript
// strict: true (default) - Only accept objects and arrays
app.use(express.json({ strict: true }))
// Accepts: {"name": "John"}, [1, 2, 3]
// Rejects: "hello", 123, true, null

// strict: false - Accept any JSON value
app.use(express.json({ strict: false }))
// Accepts: "hello", 123, true, null, {}, []
```

### type

```javascript
// Default: only 'application/json'
app.use(express.json())

// Custom Content-Type
app.use(express.json({
  type: 'application/vnd.api+json'
}))

// Multiple types
app.use(express.json({
  type: ['application/json', 'application/vnd.api+json']
}))

// Function for dynamic matching
app.use(express.json({
  type: (req) => {
    return req.headers['content-type']?.includes('json')
  }
}))
```

### verify

```javascript
// Verify raw body before parsing (e.g., for signature verification)
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    // buf is the raw body Buffer
    // Store it for later use
    req.rawBody = buf

    // Or verify signature
    const signature = req.headers['x-signature']
    if (!verifySignature(buf, signature)) {
      throw new Error('Invalid signature')
    }
  }
}))
```

## Error Handling

```javascript
app.use(express.json())

// JSON parse errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON' })
  }
  next(err)
})

// Body too large
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request too large' })
  }
  next(err)
})
```

## Common Patterns

### API Routes Only

```javascript
// Don't parse JSON for all routes
// Only for API routes
app.use('/api', express.json())

app.get('/', (req, res) => {
  // req.body is undefined here (no JSON parsing)
  res.send('Home')
})

app.post('/api/data', (req, res) => {
  // req.body is parsed
  res.json(req.body)
})
```

### Different Limits per Route

```javascript
// Small limit globally
app.use(express.json({ limit: '10kb' }))

// Larger limit for specific route
app.post('/api/upload',
  express.json({ limit: '10mb' }),
  (req, res) => {
    // Allows up to 10MB
    res.json({ received: true })
  }
)
```

### Webhook Signature Verification

```javascript
// Store raw body for signature verification
app.use('/webhook', express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString()
  }
}))

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-hub-signature']
  const isValid = crypto
    .createHmac('sha1', secret)
    .update(req.rawBody)
    .digest('hex') === signature.replace('sha1=', '')

  if (!isValid) {
    return res.status(401).send('Invalid signature')
  }

  // Process webhook with parsed body
  console.log(req.body)
  res.send('OK')
})
```

## When Body is Empty

```javascript
app.post('/api/action', (req, res) => {
  // If Content-Type is application/json but body is empty
  // or if Content-Type header is missing
  console.log(req.body)  // {} (empty object) or undefined

  // Always check
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Body required' })
  }

  res.json({ success: true })
})
```

## Performance Tips

```javascript
// 1. Set appropriate size limits
app.use(express.json({ limit: '100kb' }))  // Reasonable default

// 2. Only use where needed
app.use('/api', express.json())  // Not globally

// 3. Use strict mode to reject invalid JSON types
app.use(express.json({ strict: true }))
```

## Related

- [express-urlencoded](../express-urlencoded/) - Form data parsing
- [express-raw](../express-raw/) - Raw body parsing
- [express-text](../express-text/) - Text body parsing

---

*express.json() is essential for handling JSON API requests.*
