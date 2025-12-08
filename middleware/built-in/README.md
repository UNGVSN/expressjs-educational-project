# Built-in Middleware

Express comes with several built-in middleware functions. These are the most commonly used and are available directly on the `express` object.

## Overview

```javascript
const express = require('express')

// Built-in middleware
express.json()          // Parse JSON bodies
express.urlencoded()    // Parse URL-encoded bodies
express.static()        // Serve static files
express.raw()           // Parse raw bodies
express.text()          // Parse text bodies
```

## Available Middleware

| Middleware | Description | Documentation |
|------------|-------------|---------------|
| `express.json()` | Parse JSON request bodies | [express-json](./express-json/) |
| `express.urlencoded()` | Parse URL-encoded (form) bodies | [express-urlencoded](./express-urlencoded/) |
| `express.static()` | Serve static files | [express-static](./express-static/) |
| `express.raw()` | Parse raw binary bodies | [express-raw](./express-raw/) |
| `express.text()` | Parse text bodies | [express-text](./express-text/) |

## Quick Setup

```javascript
const express = require('express')
const app = express()

// Parse JSON bodies (application/json)
app.use(express.json())

// Parse URL-encoded bodies (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }))

// Serve static files from 'public' directory
app.use(express.static('public'))
```

## Body Parser Middleware

### express.json()

```javascript
// Parse JSON request bodies
app.use(express.json({
  limit: '100kb',           // Max body size
  strict: true,             // Only accept arrays and objects
  type: 'application/json'  // Content-Type to parse
}))

app.post('/api/users', (req, res) => {
  console.log(req.body)  // { name: 'John', email: 'john@example.com' }
  res.json({ received: true })
})
```

### express.urlencoded()

```javascript
// Parse form data
app.use(express.urlencoded({
  extended: true,  // Use qs library for rich objects
  limit: '100kb'   // Max body size
}))

app.post('/login', (req, res) => {
  console.log(req.body)  // { username: 'john', password: '...' }
  res.redirect('/dashboard')
})
```

### express.raw()

```javascript
// Parse raw binary data
app.use('/webhook', express.raw({
  type: 'application/octet-stream',
  limit: '1mb'
}))

app.post('/webhook', (req, res) => {
  console.log(req.body)  // Buffer
  res.send('OK')
})
```

### express.text()

```javascript
// Parse plain text
app.use('/text', express.text({
  type: 'text/plain',
  limit: '100kb'
}))

app.post('/text', (req, res) => {
  console.log(req.body)  // String
  res.send('Received')
})
```

## Static Files Middleware

### express.static()

```javascript
// Serve files from 'public' directory
app.use(express.static('public'))
// GET /style.css -> public/style.css

// Serve with URL prefix
app.use('/static', express.static('public'))
// GET /static/style.css -> public/style.css

// Multiple directories
app.use(express.static('public'))
app.use(express.static('uploads'))
// Searches in order: public, then uploads

// With options
app.use(express.static('public', {
  maxAge: '1d',              // Cache for 1 day
  index: 'index.html',       // Default file
  dotfiles: 'ignore',        // Ignore dotfiles
  etag: true,                // Enable ETags
  lastModified: true         // Send Last-Modified header
}))
```

## Recommended Setup Order

```javascript
const express = require('express')
const path = require('path')

const app = express()

// 1. Static files (before body parsers for efficiency)
app.use(express.static(path.join(__dirname, 'public')))

// 2. Body parsers
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 3. Routes
app.use('/api', apiRoutes)

// 4. Error handlers
app.use(errorHandler)
```

## Common Configurations

### API Server

```javascript
// JSON API - only need JSON parser
app.use(express.json({
  limit: '1mb',
  strict: true
}))
```

### Web Application

```javascript
// Web app - forms and static files
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())  // For AJAX
```

### File Upload Server

```javascript
// For raw file uploads
app.use('/upload', express.raw({
  type: '*/*',
  limit: '50mb'
}))
```

### Webhook Receiver

```javascript
// Webhooks often need raw body for signature verification
app.use('/webhook', express.raw({ type: 'application/json' }))

app.post('/webhook', (req, res) => {
  // req.body is Buffer, not parsed JSON
  const signature = req.headers['x-signature']
  const isValid = verifySignature(req.body, signature)

  if (isValid) {
    const data = JSON.parse(req.body.toString())
    // Process webhook...
  }

  res.send('OK')
})
```

## Learning Path

1. [express-json](./express-json/) - Most common for APIs
2. [express-urlencoded](./express-urlencoded/) - For form handling
3. [express-static](./express-static/) - For serving files
4. [express-raw](./express-raw/) - For binary data
5. [express-text](./express-text/) - For plain text

---

*Built-in middleware provides essential functionality for Express applications.*
