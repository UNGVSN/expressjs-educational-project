# Request Object - Additional Properties Reference

Complete reference for all `req` properties not covered in the main README.

## Additional Properties

### req.app

Reference to the Express application:

```javascript
app.get('/info', (req, res) => {
  // Access app settings
  const env = req.app.get('env')
  const viewEngine = req.app.get('view engine')

  // Access app locals
  const siteName = req.app.locals.siteName

  // Call app methods
  req.app.render('email', { user }, (err, html) => {
    // Send email with rendered HTML
  })

  res.json({ env, viewEngine, siteName })
})
```

**Use cases:**
- Accessing app settings from route handlers
- Using app.locals in middleware
- Rendering views outside of res.render()

### req.baseUrl

The URL path on which a router instance was mounted:

```javascript
const usersRouter = express.Router()

usersRouter.get('/profile', (req, res) => {
  console.log(req.baseUrl)    // '/users'
  console.log(req.path)       // '/profile'
  console.log(req.originalUrl) // '/users/profile?tab=settings'
})

app.use('/users', usersRouter)

// Nested mounting
const adminRouter = express.Router()
const settingsRouter = express.Router()

settingsRouter.get('/', (req, res) => {
  console.log(req.baseUrl)  // '/admin/settings'
})

adminRouter.use('/settings', settingsRouter)
app.use('/admin', adminRouter)
```

**Use cases:**
- Building URLs relative to router mount point
- Creating self-referential links in views
- Logging and debugging

### req.originalUrl

The original request URL (preserved through redirects and rewrites):

```javascript
app.use('/api', (req, res, next) => {
  // For request to /api/users?page=2
  console.log(req.url)         // '/users?page=2'
  console.log(req.originalUrl) // '/api/users?page=2'
  console.log(req.baseUrl)     // '/api'
  console.log(req.path)        // '/users'
  next()
})
```

**Difference from req.url:**
- `req.url` may be modified by middleware (e.g., for URL rewriting)
- `req.originalUrl` always contains the original client request URL

### req.route

Information about the currently matched route:

```javascript
app.get('/users/:id', (req, res) => {
  console.log(req.route)
  // {
  //   path: '/users/:id',
  //   stack: [{ handle: [Function], ... }],
  //   methods: { get: true }
  // }

  console.log(req.route.path)     // '/users/:id'
  console.log(req.route.methods)  // { get: true }
})
```

**Use cases:**
- Debugging which route matched
- Logging route information
- Building generic middleware that needs route info

### req.subdomains

Array of subdomains in the domain name:

```javascript
// Requires: app.set('subdomain offset', 2)  // Default
// Host: api.v2.example.com

app.get('/', (req, res) => {
  console.log(req.subdomains)  // ['v2', 'api']
  console.log(req.hostname)    // 'api.v2.example.com'
})

// For different TLDs (e.g., .co.uk)
app.set('subdomain offset', 3)
// Host: api.example.co.uk
// req.subdomains = ['api']
```

**Subdomain ordering:**
Subdomains are returned in reverse order (right to left):
- Host: `a.b.c.example.com`
- subdomains: `['c', 'b', 'a']`

### req.method

HTTP request method:

```javascript
app.all('/resource', (req, res) => {
  switch (req.method) {
    case 'GET':
      return res.json(data)
    case 'POST':
      return res.json(createResource(req.body))
    case 'PUT':
      return res.json(updateResource(req.body))
    case 'DELETE':
      return res.json(deleteResource())
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
})

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})
```

### req.url

Request URL string (may be modified by middleware):

```javascript
// URL rewriting middleware
app.use((req, res, next) => {
  // Rewrite /old-path to /new-path
  if (req.url === '/old-path') {
    req.url = '/new-path'
  }
  next()
})

// After rewrite
app.get('/new-path', (req, res) => {
  console.log(req.url)         // '/new-path'
  console.log(req.originalUrl) // '/old-path' (preserved)
})
```

### req.headers

Raw headers object (from Node.js):

```javascript
app.get('/', (req, res) => {
  // All headers (lowercase keys)
  console.log(req.headers)
  // {
  //   'host': 'localhost:3000',
  //   'user-agent': 'Mozilla/5.0...',
  //   'accept': 'text/html',
  //   'authorization': 'Bearer token123',
  //   ...
  // }

  // Individual headers
  const auth = req.headers['authorization']
  const contentType = req.headers['content-type']

  // Or use req.get() (case-insensitive)
  const auth2 = req.get('Authorization')
})
```

### req.res

Reference to the response object (circular reference):

```javascript
app.get('/', (req, res) => {
  console.log(req.res === res)  // true
})

// Useful in middleware that only receives req
const extractRequest = (req) => {
  // Can access res via req.res
  req.res.locals.extractedData = processRequest(req)
}
```

### req.socket

Reference to the underlying TCP socket:

```javascript
app.get('/', (req, res) => {
  console.log(req.socket.remoteAddress)  // Client IP (direct)
  console.log(req.socket.remotePort)     // Client port
  console.log(req.socket.localAddress)   // Server IP
  console.log(req.socket.localPort)      // Server port
})
```

### req.signedCookies

Signed cookies (requires cookie-parser with secret):

```javascript
const cookieParser = require('cookie-parser')
app.use(cookieParser('my-secret'))

app.get('/set', (req, res) => {
  res.cookie('user', 'john', { signed: true })
  res.send('Cookie set')
})

app.get('/get', (req, res) => {
  // Regular cookies
  console.log(req.cookies)  // {}

  // Signed cookies (verified)
  console.log(req.signedCookies)  // { user: 'john' }

  // Tampered signed cookies return false
  // req.signedCookies.user === false if tampered
})
```

## Additional Methods

### req.acceptsCharsets()

Check acceptable character sets:

```javascript
// Accept-Charset: utf-8, iso-8859-1;q=0.5
req.acceptsCharsets('utf-8')                    // 'utf-8'
req.acceptsCharsets('iso-8859-1')               // 'iso-8859-1'
req.acceptsCharsets('utf-8', 'iso-8859-1')      // 'utf-8' (best match)
req.acceptsCharsets(['utf-8', 'iso-8859-1'])    // 'utf-8'
```

### req.acceptsEncodings()

Check acceptable encodings:

```javascript
// Accept-Encoding: gzip, deflate, br
req.acceptsEncodings('gzip')         // 'gzip'
req.acceptsEncodings('br')           // 'br' (Brotli)
req.acceptsEncodings('identity')     // 'identity' (no encoding)
req.acceptsEncodings(['gzip', 'br']) // Best match
```

### req.acceptsLanguages()

Check acceptable languages:

```javascript
// Accept-Language: en-US,en;q=0.9,es;q=0.8
req.acceptsLanguages('en')               // 'en'
req.acceptsLanguages('es')               // 'es'
req.acceptsLanguages('en', 'es')         // 'en' (best match)
req.acceptsLanguages(['en', 'es', 'fr']) // 'en'

// Internationalization middleware
app.use((req, res, next) => {
  const lang = req.acceptsLanguages('en', 'es', 'fr') || 'en'
  req.locale = lang
  next()
})
```

## Properties Summary Table

| Property | Type | Description |
|----------|------|-------------|
| `req.app` | Application | Express app reference |
| `req.baseUrl` | String | Router mount path |
| `req.body` | Object | Parsed request body |
| `req.cookies` | Object | Parsed cookies |
| `req.fresh` | Boolean | Cache is fresh |
| `req.headers` | Object | Request headers |
| `req.hostname` | String | Host name |
| `req.ip` | String | Client IP |
| `req.ips` | Array | Proxy IP chain |
| `req.method` | String | HTTP method |
| `req.originalUrl` | String | Original request URL |
| `req.params` | Object | Route parameters |
| `req.path` | String | URL path |
| `req.protocol` | String | 'http' or 'https' |
| `req.query` | Object | Query string params |
| `req.res` | Response | Response object |
| `req.route` | Object | Matched route |
| `req.secure` | Boolean | Is HTTPS |
| `req.signedCookies` | Object | Signed cookies |
| `req.socket` | Socket | TCP socket |
| `req.stale` | Boolean | Cache is stale |
| `req.subdomains` | Array | Subdomains |
| `req.url` | String | Request URL (mutable) |
| `req.xhr` | Boolean | Is AJAX request |

## Methods Summary Table

| Method | Returns | Description |
|--------|---------|-------------|
| `req.accepts(types)` | String/Boolean | Check Accept header |
| `req.acceptsCharsets(charsets)` | String/Boolean | Check Accept-Charset |
| `req.acceptsEncodings(encodings)` | String/Boolean | Check Accept-Encoding |
| `req.acceptsLanguages(langs)` | String/Boolean | Check Accept-Language |
| `req.get(field)` | String | Get header value |
| `req.header(field)` | String | Alias for req.get() |
| `req.is(type)` | String/Boolean | Check Content-Type |
| `req.range(size, options)` | Array | Parse Range header |
