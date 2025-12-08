# Request Object

The `req` object represents the HTTP request and has properties for the query string, parameters, body, HTTP headers, and more.

## Overview

Express enhances Node's `http.IncomingMessage` with additional properties and methods:

```javascript
app.get('/users/:id', (req, res) => {
  // Express additions
  req.params   // Route parameters
  req.query    // Query string
  req.body     // Request body (with middleware)

  // Original Node.js properties
  req.url      // Full URL
  req.method   // HTTP method
  req.headers  // Headers object
})
```

## Properties

### req.params

Route parameters from URL:

```javascript
// Route: /users/:id/posts/:postId
app.get('/users/:id/posts/:postId', (req, res) => {
  req.params.id      // '123'
  req.params.postId  // '456'
})
```

### req.query

Parsed query string:

```javascript
// URL: /search?q=hello&page=2&tags=js&tags=node
app.get('/search', (req, res) => {
  req.query.q       // 'hello'
  req.query.page    // '2' (string!)
  req.query.tags    // ['js', 'node']
})
```

### req.body

Request body (requires middleware):

```javascript
app.use(express.json())

app.post('/users', (req, res) => {
  req.body.name   // 'John'
  req.body.email  // 'john@example.com'
})
```

### req.path

URL pathname without query string:

```javascript
// URL: /users?sort=name
req.path  // '/users'
req.url   // '/users?sort=name' (full URL)
```

### req.hostname

Host from Host header (or X-Forwarded-Host with trust proxy):

```javascript
// Host: example.com:8080
req.hostname  // 'example.com' (no port)
```

### req.ip / req.ips

Client IP address:

```javascript
// Direct connection
req.ip  // '127.0.0.1'

// Behind proxy (with trust proxy enabled)
// X-Forwarded-For: client, proxy1, proxy2
req.ip   // 'client'
req.ips  // ['client', 'proxy1', 'proxy2']
```

### req.protocol / req.secure

Protocol information:

```javascript
req.protocol  // 'http' or 'https'
req.secure    // true if HTTPS

// Behind proxy with trust proxy
// Uses X-Forwarded-Proto header
```

### req.xhr

Was request made via XMLHttpRequest:

```javascript
req.xhr  // true if X-Requested-With: XMLHttpRequest
```

### req.cookies

Cookies (requires cookie-parser):

```javascript
const cookieParser = require('cookie-parser')
app.use(cookieParser())

app.get('/', (req, res) => {
  req.cookies.sessionId  // Cookie value
  req.signedCookies      // Signed cookies
})
```

### req.fresh / req.stale

Caching validation:

```javascript
// Based on If-Modified-Since and If-None-Match headers
req.fresh  // true if cache is valid
req.stale  // true if cache is stale

app.get('/resource', (req, res) => {
  if (req.fresh) {
    return res.sendStatus(304)  // Not Modified
  }
  // Send resource
})
```

## Methods

### req.get(field) / req.header(field)

Get header value:

```javascript
req.get('Content-Type')    // 'application/json'
req.get('content-type')    // 'application/json' (case-insensitive)
req.header('Authorization') // 'Bearer token...'
```

### req.accepts()

Content negotiation:

```javascript
req.accepts('html')                    // 'html' or false
req.accepts('json')                    // 'json' or false
req.accepts(['json', 'html'])          // Best match or false
req.accepts('application/json')        // 'application/json' or false

// Check Accept header
// Accept: text/html, application/json
app.get('/data', (req, res) => {
  if (req.accepts('json')) {
    res.json(data)
  } else if (req.accepts('html')) {
    res.render('data', data)
  } else {
    res.status(406).send('Not Acceptable')
  }
})
```

### req.is()

Check Content-Type:

```javascript
// Content-Type: application/json; charset=utf-8
req.is('json')              // 'json'
req.is('application/json')  // 'application/json'
req.is('html')              // false

app.post('/upload', (req, res) => {
  if (req.is('multipart/form-data')) {
    // Handle file upload
  }
})
```

### req.range()

Parse Range header:

```javascript
// Range: bytes=0-100,200-300
const ranges = req.range(1000)
// [{ start: 0, end: 100 }, { start: 200, end: 300 }]
```

## Common Patterns

### Validation

```javascript
app.post('/users', (req, res) => {
  const { name, email } = req.body

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid name' })
  }

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' })
  }

  // Process valid data
})
```

### Type Coercion

```javascript
app.get('/items', (req, res) => {
  // Query params are always strings!
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 10
  const active = req.query.active === 'true'

  // Now properly typed
})
```

### Content Negotiation

```javascript
app.get('/api/resource', (req, res) => {
  const data = { id: 1, name: 'Resource' }

  res.format({
    'text/html': () => {
      res.render('resource', data)
    },
    'application/json': () => {
      res.json(data)
    },
    'text/plain': () => {
      res.send(`ID: ${data.id}, Name: ${data.name}`)
    },
    default: () => {
      res.status(406).send('Not Acceptable')
    }
  })
})
```

## Related

- [response](../response/) - Sending responses
- [application](../application/) - App configuration

## Next Steps

1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md)
2. Test knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Move to [response](../response/)

---

*The req object gives you access to all request data.*
