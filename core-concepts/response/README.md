# Response Object

The `res` object represents the HTTP response that an Express app sends when it receives an HTTP request.

## Overview

Express enhances Node's `http.ServerResponse` with convenient methods for sending data, setting headers, and managing response lifecycle.

```javascript
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Hello' })
})
```

## Properties

### res.locals

Variables scoped to the request, available in templates:

```javascript
app.use((req, res, next) => {
  res.locals.user = req.user
  res.locals.authenticated = !!req.user
  next()
})

// Available in templates
res.render('dashboard')  // Can use user, authenticated
```

### res.headersSent

Boolean indicating if headers have been sent:

```javascript
app.get('/', (req, res) => {
  console.log(res.headersSent)  // false
  res.send('Hello')
  console.log(res.headersSent)  // true

  // Can't send again!
  res.send('World')  // Error
})
```

## Core Methods

### res.send()

Send response body (auto content-type):

```javascript
res.send('Text')               // Content-Type: text/html
res.send({ json: true })       // Content-Type: application/json
res.send(Buffer.from('data'))  // Content-Type: application/octet-stream
res.send([1, 2, 3])            // Content-Type: application/json
```

### res.json()

Send JSON response:

```javascript
res.json({ user: 'John' })
res.json(null)
res.json([1, 2, 3])

// Sets Content-Type: application/json
// Stringifies with app.get('json spaces') formatting
```

### res.status()

Set HTTP status (chainable):

```javascript
res.status(404).send('Not Found')
res.status(201).json({ created: true })
res.status(500).end()
```

### res.sendStatus()

Set status and send status text:

```javascript
res.sendStatus(200)  // 'OK'
res.sendStatus(201)  // 'Created'
res.sendStatus(404)  // 'Not Found'
res.sendStatus(500)  // 'Internal Server Error'
```

### res.sendFile()

Send file with automatic Content-Type:

```javascript
const path = require('path')

res.sendFile(path.join(__dirname, 'file.pdf'))

// With options
res.sendFile('/path/to/file', {
  maxAge: '1d',
  root: __dirname,
  dotfiles: 'deny',
  headers: {
    'x-custom': 'value'
  }
}, (err) => {
  if (err) next(err)
})
```

### res.download()

Prompt file download:

```javascript
res.download('/path/to/file.pdf')
res.download('/path/to/file.pdf', 'custom-name.pdf')
res.download('/path/to/file.pdf', (err) => {
  if (err) next(err)
})
```

### res.redirect()

Redirect to URL:

```javascript
res.redirect('/login')                    // 302 Found (default)
res.redirect(301, '/new-url')             // 301 Moved Permanently
res.redirect('back')                      // Referer or /
res.redirect('http://example.com')        // External URL
res.redirect('../other')                  // Relative path
```

### res.render()

Render view template:

```javascript
// Uses app.set('view engine')
res.render('index')

// With data
res.render('user', { name: 'John' })

// With callback (doesn't send)
res.render('email', { data }, (err, html) => {
  sendEmail(html)
})
```

## Header Methods

### res.set() / res.header()

Set response header:

```javascript
res.set('Content-Type', 'text/plain')
res.set({
  'Content-Type': 'text/plain',
  'X-Custom': 'value'
})
```

### res.get()

Get response header:

```javascript
res.set('Content-Type', 'text/html')
res.get('Content-Type')  // 'text/html'
```

### res.type()

Set Content-Type by extension:

```javascript
res.type('html')        // text/html
res.type('json')        // application/json
res.type('png')         // image/png
res.type('application/json')  // application/json
```

### res.append()

Append to header (creates array):

```javascript
res.append('Set-Cookie', 'a=1')
res.append('Set-Cookie', 'b=2')
// Set-Cookie: a=1
// Set-Cookie: b=2
```

## Cookie Methods

### res.cookie()

Set cookie:

```javascript
res.cookie('name', 'value')

// With options
res.cookie('session', 'token', {
  maxAge: 900000,         // Milliseconds
  httpOnly: true,         // No JavaScript access
  secure: true,           // HTTPS only
  sameSite: 'strict',     // CSRF protection
  domain: '.example.com', // Domain scope
  path: '/api'            // Path scope
})

// Signed cookie (requires cookie-parser with secret)
res.cookie('signed', 'value', { signed: true })
```

### res.clearCookie()

Remove cookie:

```javascript
res.clearCookie('name')
res.clearCookie('name', { path: '/api' })  // Must match original options
```

## Content Negotiation

### res.format()

Respond based on Accept header:

```javascript
res.format({
  'text/plain': () => {
    res.send('Hello')
  },
  'text/html': () => {
    res.send('<h1>Hello</h1>')
  },
  'application/json': () => {
    res.json({ message: 'Hello' })
  },
  default: () => {
    res.status(406).send('Not Acceptable')
  }
})
```

## Streaming

### res.write() / res.end()

Stream response (from Node.js):

```javascript
res.write('chunk 1')
res.write('chunk 2')
res.end('final chunk')

// Or end without data
res.write('data')
res.end()
```

### Piping

```javascript
const fs = require('fs')

app.get('/video', (req, res) => {
  res.type('video/mp4')
  fs.createReadStream('video.mp4').pipe(res)
})
```

## Common Patterns

### Error Responses

```javascript
function sendError(res, status, message) {
  res.status(status).json({
    error: {
      status,
      message
    }
  })
}

app.get('/user/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id)
  if (!user) {
    return sendError(res, 404, 'User not found')
  }
  res.json(user)
})
```

### Conditional Response

```javascript
app.get('/data', (req, res) => {
  if (req.accepts('json')) {
    return res.json(data)
  }
  if (req.accepts('html')) {
    return res.render('data', data)
  }
  res.status(406).send('Not Acceptable')
})
```

### Caching Headers

```javascript
app.get('/static', (req, res) => {
  res.set({
    'Cache-Control': 'public, max-age=31536000',
    'ETag': calculateETag(data)
  })
  res.send(data)
})
```

## Related

- [request](../request/) - Request data
- [application](../application/) - App configuration

## Next Steps

1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md)
2. Test knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Move to [router](../router/)

---

*The res object is your interface for sending responses.*
