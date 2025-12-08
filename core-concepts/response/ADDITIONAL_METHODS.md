# Response Object - Additional Methods Reference

Complete reference for all `res` methods and properties not fully covered in the main README.

## Additional Properties

### res.app

Reference to the Express application:

```javascript
app.get('/', (req, res) => {
  // Access app settings
  const env = res.app.get('env')

  // Access app locals
  const siteName = res.app.locals.siteName

  // Render using app
  res.app.render('email', { data }, (err, html) => {
    sendEmail(html)
  })

  res.json({ env })
})
```

### res.req

Reference to the request object (circular):

```javascript
app.get('/', (req, res) => {
  console.log(res.req === req)  // true

  // Useful in response-focused middleware
  res.json({
    requestedUrl: res.req.originalUrl
  })
})
```

## Additional Methods

### res.links()

Set the `Link` header for pagination or related resources:

```javascript
// Set Link header
res.links({
  next: 'https://api.example.com/users?page=2',
  prev: 'https://api.example.com/users?page=0',
  first: 'https://api.example.com/users?page=0',
  last: 'https://api.example.com/users?page=10'
})

// Results in header:
// Link: <https://api.example.com/users?page=2>; rel="next",
//       <https://api.example.com/users?page=0>; rel="prev",
//       <https://api.example.com/users?page=0>; rel="first",
//       <https://api.example.com/users?page=10>; rel="last"

// Complete pagination example
app.get('/api/users', async (req, res) => {
  const page = parseInt(req.query.page) || 0
  const limit = 20
  const total = await User.countDocuments()
  const totalPages = Math.ceil(total / limit)

  const users = await User.find()
    .skip(page * limit)
    .limit(limit)

  const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}`

  const links = {}
  if (page > 0) {
    links.prev = `${baseUrl}?page=${page - 1}`
    links.first = `${baseUrl}?page=0`
  }
  if (page < totalPages - 1) {
    links.next = `${baseUrl}?page=${page + 1}`
    links.last = `${baseUrl}?page=${totalPages - 1}`
  }

  res.links(links)
  res.json({ users, page, totalPages })
})
```

### res.vary()

Add a field to the Vary response header:

```javascript
// Add single field
res.vary('Accept')

// Add multiple fields
res.vary('Accept-Encoding')
res.vary('Accept-Language')

// Or with res.set
res.set('Vary', 'Accept, Accept-Encoding')

// Use case: Content negotiation caching
app.get('/data', (req, res) => {
  // Tell caches that response varies by Accept header
  res.vary('Accept')

  if (req.accepts('json')) {
    res.json(data)
  } else {
    res.send(data.toString())
  }
})
```

**Why use Vary:**
- Tells proxies/CDNs to cache different versions based on request headers
- Important for content negotiation (Accept, Accept-Language)
- Important for compression (Accept-Encoding)

### res.location()

Set the `Location` header without redirecting:

```javascript
// Set Location header only
res.location('/new-resource')
res.status(201).json({ id: newId })

// vs res.redirect which sets Location AND sends response
res.redirect('/new-resource')  // Sets Location + sends 302

// Use case: 201 Created with Location
app.post('/api/users', async (req, res) => {
  const user = await User.create(req.body)

  res.location(`/api/users/${user.id}`)
  res.status(201).json(user)

  // Response:
  // HTTP/1.1 201 Created
  // Location: /api/users/123
  // Content-Type: application/json
  // {"id": "123", "name": "John"}
})
```

### res.jsonp()

Send JSONP response:

```javascript
// Default callback parameter name: 'callback'
// /api/data?callback=processData

app.get('/api/data', (req, res) => {
  res.jsonp({ data: 'value' })
})

// Output: processData({"data":"value"})

// Change callback parameter name
app.set('jsonp callback name', 'cb')
// Now use /api/data?cb=processData

// Security: JSONP callbacks are validated against XSS
// Invalid characters are escaped
```

### res.attachment()

Set `Content-Disposition` header for downloads:

```javascript
// Suggests download with generic name
res.attachment()
res.send(fileContent)

// Suggests download with specific filename
res.attachment('report.pdf')
res.send(pdfContent)

// Equivalent to:
res.set('Content-Disposition', 'attachment; filename="report.pdf"')

// Compared to res.download which also sends the file:
res.download('/path/to/file.pdf', 'report.pdf')
// Sets Content-Disposition AND streams the file
```

### res.sendFile() - Complete Options

```javascript
const path = require('path')

res.sendFile(path.join(__dirname, 'files', 'document.pdf'), {
  // Maximum age for Cache-Control header
  maxAge: 86400000,  // 1 day in milliseconds
  // Or as string
  maxAge: '1d',

  // Root directory for relative paths
  root: path.join(__dirname, 'public'),

  // Last-Modified header based on file stats
  lastModified: true,  // Default

  // ETag header
  etag: true,  // Default

  // Serve dotfiles
  dotfiles: 'ignore',  // 'allow', 'deny', 'ignore'

  // Set additional headers
  headers: {
    'X-Custom-Header': 'value'
  },

  // Accept byte ranges
  acceptRanges: true,  // Default

  // Cache-Control header
  cacheControl: true,  // Default

  // Immutable directive in Cache-Control
  immutable: false  // Default
}, (err) => {
  if (err) {
    if (err.code === 'ENOENT') {
      res.status(404).send('File not found')
    } else {
      next(err)
    }
  }
})
```

### res.cookie() - Complete Options

```javascript
res.cookie('name', 'value', {
  // Expiration
  maxAge: 900000,          // Milliseconds from now
  expires: new Date(...),  // Specific date

  // Security
  httpOnly: true,    // No JavaScript access (XSS protection)
  secure: true,      // HTTPS only
  signed: true,      // Sign with secret (requires cookie-parser)

  // SameSite (CSRF protection)
  sameSite: 'strict',  // 'strict', 'lax', 'none'

  // Scope
  domain: '.example.com',  // Include subdomains
  path: '/api',            // Only for /api routes

  // Priority (Chrome only)
  priority: 'high',  // 'low', 'medium', 'high'

  // Partitioned (CHIPS - Chrome)
  partitioned: true,  // For third-party contexts

  // Encoding
  encode: encodeURIComponent  // Custom encoder
})

// Remove specific cookie
res.clearCookie('name', {
  // MUST match original options for path and domain
  path: '/api',
  domain: '.example.com'
})
```

### res.format() - Extended Usage

```javascript
res.format({
  // MIME type keys
  'text/plain': () => {
    res.send('Plain text')
  },

  'text/html': () => {
    res.send('<h1>HTML</h1>')
  },

  'application/json': () => {
    res.json({ format: 'json' })
  },

  // Extension shortcuts
  html: () => {
    res.send('<h1>HTML via shortcut</h1>')
  },

  json: () => {
    res.json({ format: 'json shortcut' })
  },

  // Default handler (when no match)
  default: () => {
    res.status(406).send('Not Acceptable')
  }
})

// Order matters - first match wins
// More specific types should come first
```

## Complete Response Chain Pattern

```javascript
// All chainable methods return res
res
  .status(201)
  .set('X-Custom', 'value')
  .cookie('session', 'token', { httpOnly: true })
  .json({ created: true })

// Methods that end the response (not chainable after):
// - res.send()
// - res.json()
// - res.jsonp()
// - res.sendFile()
// - res.download()
// - res.redirect()
// - res.render() (without callback)
// - res.end()
// - res.sendStatus()
```

## Methods Summary Table

| Method | Description | Ends Response |
|--------|-------------|---------------|
| `res.append(field, value)` | Append to header | No |
| `res.attachment([filename])` | Set Content-Disposition | No |
| `res.clearCookie(name, [options])` | Clear cookie | No |
| `res.cookie(name, value, [options])` | Set cookie | No |
| `res.download(path, [filename], [options], [callback])` | Prompt file download | Yes |
| `res.end([data], [encoding])` | End response | Yes |
| `res.format(object)` | Content negotiation | Yes |
| `res.get(field)` | Get header value | No |
| `res.json([body])` | Send JSON | Yes |
| `res.jsonp([body])` | Send JSONP | Yes |
| `res.links(links)` | Set Link header | No |
| `res.location(path)` | Set Location header | No |
| `res.redirect([status], path)` | Redirect | Yes |
| `res.render(view, [locals], [callback])` | Render view | Yes* |
| `res.send([body])` | Send response | Yes |
| `res.sendFile(path, [options], [callback])` | Send file | Yes |
| `res.sendStatus(statusCode)` | Send status | Yes |
| `res.set(field, [value])` | Set header | No |
| `res.status(code)` | Set status code | No |
| `res.type(type)` | Set Content-Type | No |
| `res.vary(field)` | Set Vary header | No |

*`res.render()` with callback doesn't send response

## Properties Summary

| Property | Type | Description |
|----------|------|-------------|
| `res.app` | Application | Express app reference |
| `res.headersSent` | Boolean | Whether headers sent |
| `res.locals` | Object | Template variables |
| `res.req` | Request | Request object |
| `res.statusCode` | Number | HTTP status code |
| `res.statusMessage` | String | HTTP status message |
