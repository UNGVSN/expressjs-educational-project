# Official Express Middleware - Design Analysis

Internal implementation analysis of official Express middleware packages.

## method-override

### Core Implementation

```javascript
// Simplified internal implementation
function methodOverride(getter, options) {
  const opts = options || {}
  const methods = opts.methods || ['POST']

  // Convert getter to function
  let get = getter

  if (typeof getter === 'string') {
    get = createQueryGetter(getter)  // Query string getter
  }

  return function methodOverrideMiddleware(req, res, next) {
    // Only process allowed methods
    if (methods.indexOf(req.method) === -1) {
      return next()
    }

    // Store original method
    req.originalMethod = req.originalMethod || req.method

    // Get override value
    const val = get(req, res)

    // Validate and set method
    if (val && supports(val)) {
      req.method = val.toUpperCase()
    }

    next()
  }
}

// Query string getter
function createQueryGetter(name) {
  return function(req) {
    return req.query[name]
  }
}

// Header getter
function createHeaderGetter(name) {
  const header = name.toLowerCase()
  return function(req) {
    return req.headers[header]
  }
}

// Supported HTTP methods
function supports(method) {
  return method &&
    typeof method === 'string' &&
    /^[A-Z]+$/i.test(method)
}
```

### Design Decisions

1. **Original Method Preservation**
   - Stores `req.originalMethod` before modification
   - Allows downstream middleware to detect overrides

2. **Method Validation**
   - Only alphanumeric methods allowed
   - Prevents injection attacks

3. **Getter Abstraction**
   - Supports string (creates getter) or function
   - Allows custom override sources

## serve-favicon

### Core Implementation

```javascript
function favicon(path, options) {
  const opts = options || {}
  const maxAge = opts.maxAge == null ? 86400000 : Math.min(Math.max(0, opts.maxAge), 31536000000)

  let icon  // Cached icon buffer
  let etag  // Cached ETag

  return function faviconMiddleware(req, res, next) {
    // Only respond to favicon requests
    if (req.path !== '/favicon.ico') {
      return next()
    }

    // Only GET/HEAD
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = req.method === 'OPTIONS' ? 200 : 405
      res.setHeader('Allow', 'GET, HEAD, OPTIONS')
      res.setHeader('Content-Length', '0')
      res.end()
      return
    }

    // Serve cached icon
    if (icon) {
      return send(req, res, icon, etag, maxAge)
    }

    // Read and cache icon
    fs.readFile(path, (err, buf) => {
      if (err) return next(err)

      icon = buf
      etag = generateETag(buf)

      send(req, res, icon, etag, maxAge)
    })
  }
}

function send(req, res, icon, etag, maxAge) {
  res.setHeader('Content-Type', 'image/x-icon')
  res.setHeader('Content-Length', icon.length)
  res.setHeader('Cache-Control', `public, max-age=${Math.floor(maxAge / 1000)}`)
  res.setHeader('ETag', etag)

  // Conditional GET
  if (isFresh(req, res)) {
    res.statusCode = 304
    res.end()
    return
  }

  res.statusCode = 200

  // HEAD request
  if (req.method === 'HEAD') {
    res.end()
    return
  }

  res.end(icon)
}
```

### Design Decisions

1. **In-Memory Caching**
   - Icon loaded once, cached forever
   - No file system access on subsequent requests

2. **ETag Support**
   - Enables browser caching with conditional requests
   - 304 Not Modified responses save bandwidth

3. **Early Short-Circuit**
   - Responds before logging middleware typically runs
   - Reduces unnecessary log noise for favicon requests

## response-time

### Core Implementation

```javascript
function responseTime(options) {
  const opts = options || {}
  const digits = opts.digits !== undefined ? opts.digits : 3
  const header = opts.header || 'X-Response-Time'
  const suffix = opts.suffix !== undefined ? opts.suffix : true

  return function responseTimeMiddleware(req, res, next) {
    const startTime = process.hrtime()

    // Hook into response finish
    onHeaders(res, () => {
      if (res.getHeader(header)) return  // Already set

      const diff = process.hrtime(startTime)
      const time = diff[0] * 1e3 + diff[1] * 1e-6  // Convert to ms

      const val = time.toFixed(digits) + (suffix ? 'ms' : '')
      res.setHeader(header, val)

      // Call custom function if provided
      if (typeof options === 'function') {
        options(req, res, time)
      }
    })

    next()
  }
}

// on-headers module (simplified)
function onHeaders(res, listener) {
  const writeHead = res.writeHead

  res.writeHead = function patchedWriteHead() {
    listener()
    return writeHead.apply(this, arguments)
  }
}
```

### Design Decisions

1. **High-Resolution Timing**
   - Uses `process.hrtime()` for nanosecond precision
   - Accurate even for sub-millisecond requests

2. **Header Interception**
   - Uses `on-headers` to set header just before sending
   - Captures full middleware chain time

3. **Function Mode**
   - Custom function receives timing data
   - Enables metrics collection without header

## connect-timeout

### Core Implementation

```javascript
function timeout(time, options) {
  const opts = options || {}
  const delay = typeof time === 'string' ? ms(time) : time
  const respond = opts.respond !== false

  return function timeoutMiddleware(req, res, next) {
    req.timedout = false

    const id = setTimeout(() => {
      req.timedout = true
      req.emit('timeout', delay)

      if (respond) {
        // Create timeout error
        const err = new Error('Response timeout')
        err.status = 503
        err.code = 'ETIMEDOUT'
        err.timeout = delay

        next(err)
      }
    }, delay)

    // Clear timeout when response finishes
    onFinished(res, () => {
      clearTimeout(id)
    })

    // Allow clearing timeout manually
    req.clearTimeout = () => {
      clearTimeout(id)
    }

    next()
  }
}
```

### Design Decisions

1. **Response Binding**
   - Timeout cleared automatically when response finishes
   - Prevents memory leaks from dangling timeouts

2. **Configurable Response**
   - `respond: false` allows custom timeout handling
   - Emits 'timeout' event for custom logic

3. **Timeout Flag**
   - `req.timedout` allows middleware to check state
   - Prevents sending response after timeout

## vhost

### Core Implementation

```javascript
function vhost(hostname, handle) {
  // Convert string to RegExp
  const regexp = hostregexp(hostname)

  return function vhostMiddleware(req, res, next) {
    const host = req.headers.host
    if (!host) return next()

    // Parse hostname (remove port)
    const hostname = hostnameof(req)
    if (!hostname) return next()

    // Match against pattern
    const match = regexp.exec(hostname)
    if (!match) return next()

    // Store match info
    req.vhost = match

    // Call handler
    if (typeof handle === 'function') {
      handle(req, res, next)
    } else {
      // Handle is an app
      handle.handle(req, res, next)
    }
  }
}

// Convert hostname pattern to regexp
function hostregexp(pattern) {
  // 'api.example.com' -> /^api\.example\.com$/i
  // '*.example.com' -> /^([^.]+)\.example\.com$/i

  const source = pattern
    .replace(/\./g, '\\.')           // Escape dots
    .replace(/\*/g, '([^.]+)')       // Wildcards capture
    + '$'

  return new RegExp('^' + source, 'i')
}

// Extract hostname without port
function hostnameof(req) {
  const host = req.headers.host
  if (!host) return

  const offset = host[0] === '['
    ? host.indexOf(']') + 1
    : 0
  const index = host.indexOf(':', offset)

  return index !== -1
    ? host.substring(0, index)
    : host
}
```

### Design Decisions

1. **Pattern Compilation**
   - Hostname patterns compiled to RegExp once
   - Efficient matching on each request

2. **Wildcard Capture**
   - `*` captures subdomain value
   - Available via `req.vhost[n]`

3. **Port Handling**
   - Automatically strips port from Host header
   - Works with non-standard ports

## errorhandler

### Core Implementation

```javascript
function errorhandler(options) {
  const opts = options || {}
  const log = opts.log !== undefined
    ? opts.log
    : process.env.NODE_ENV !== 'test'

  return function errorhandlerMiddleware(err, req, res, next) {
    // Cannot handle if headers sent
    if (res.headersSent) {
      return next(err)
    }

    // Log error
    if (log) {
      logError(err, req, typeof log === 'function' ? log : undefined)
    }

    // Determine format
    const accept = accepts(req)
    const type = accept.type(['html', 'json'])

    res.statusCode = err.status || err.statusCode || 500

    if (type === 'json') {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        error: {
          message: err.message,
          stack: err.stack
        }
      }))
    } else {
      res.setHeader('Content-Type', 'text/html')
      res.end(renderHtmlError(err, req))
    }
  }
}

function renderHtmlError(err, req) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error</title>
      <style>
        body { font-family: monospace; padding: 20px; }
        h1 { color: #e74c3c; }
        pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(err.message)}</h1>
      <h2>Stack</h2>
      <pre>${escapeHtml(err.stack)}</pre>
      <h2>Request</h2>
      <pre>${escapeHtml(req.method)} ${escapeHtml(req.url)}</pre>
    </body>
    </html>
  `
}
```

### Design Decisions

1. **Content Negotiation**
   - Responds with HTML or JSON based on Accept header
   - Developer-friendly in browser, API-friendly for tools

2. **Stack Trace Display**
   - Full stack trace in development
   - Should NEVER be used in production

3. **XSS Prevention**
   - HTML-escapes all output
   - Prevents XSS even with malicious error messages

## Session Middleware Comparison

### cookie-session

```javascript
// Data stored in cookie
// Cookie: session=eyJ1c2VyIjoiam9obiIsInZpZXdzIjo1fQ==.abc123

function cookieSession(options) {
  return function(req, res, next) {
    // Decode session from cookie
    const cookie = req.cookies[options.name]
    req.session = decode(cookie, options.keys)

    // Hook to save on response
    onHeaders(res, () => {
      const data = encode(req.session, options.keys)
      res.cookie(options.name, data, options)
    })

    next()
  }
}
```

### express-session

```javascript
// Data stored in server-side store
// Cookie: connect.sid=s%3Aabc123.signature

function session(options) {
  const store = options.store || new MemoryStore()

  return function(req, res, next) {
    // Get session ID from cookie
    const sid = req.cookies[options.name]

    // Load session from store
    store.get(sid, (err, session) => {
      if (err) return next(err)

      req.session = session || createSession()
      req.sessionID = sid || generateId()

      // Save on response
      onHeaders(res, () => {
        store.set(req.sessionID, req.session)
        res.cookie(options.name, req.sessionID, options.cookie)
      })

      next()
    })
  }
}
```

### Trade-offs

| Aspect | cookie-session | express-session |
|--------|----------------|-----------------|
| Storage | Cookie (4KB limit) | Server store (unlimited) |
| Scalability | Stateless, perfect | Requires shared store |
| Security | Client-visible (encrypted) | Server-only |
| Complexity | Simple | Requires store setup |
| Performance | No DB lookup | DB lookup per request |

## Performance Optimizations

### 1. Early Return Patterns

```javascript
// serve-favicon: Early exit for non-favicon
if (req.path !== '/favicon.ico') return next()

// vhost: Early exit for missing host
if (!host) return next()

// method-override: Early exit for wrong method
if (methods.indexOf(req.method) === -1) return next()
```

### 2. Caching Strategies

```javascript
// serve-favicon: Memory cache
let icon = null
fs.readFile(path, (err, buf) => {
  icon = buf  // Cache forever
})

// vhost: Compiled RegExp cache
const regexp = hostregexp(pattern)  // Compile once
```

### 3. Lazy Computation

```javascript
// response-time: Only compute if header not set
onHeaders(res, () => {
  if (res.getHeader(header)) return
  // ... compute timing
})
```

## Security Considerations

### 1. Method Override Security

```javascript
// Validate method names
function supports(method) {
  return /^[A-Z]+$/i.test(method)  // Only letters
}

// Whitelist allowed source methods
methods: ['POST']  // Only override POST
```

### 2. Session Security

```javascript
// Signed cookies prevent tampering
keys: [secret1, secret2]

// HttpOnly prevents XSS theft
httpOnly: true

// Secure ensures HTTPS transmission
secure: process.env.NODE_ENV === 'production'

// SameSite prevents CSRF
sameSite: 'strict'
```

### 3. Error Handler Security

```javascript
// Never use in production - exposes stack traces
if (process.env.NODE_ENV === 'development') {
  app.use(errorhandler())
}
```

## Middleware Composition Patterns

### 1. Factory Pattern

```javascript
// All official middleware use factory pattern
const middleware = require('middleware-name')
app.use(middleware(options))

// Allows configuration at creation time
// Returns configured middleware function
```

### 2. Hook Pattern

```javascript
// response-time hooks into response lifecycle
onHeaders(res, () => { /* set header */ })

// Allows middleware to execute at specific points
```

### 3. Store Pattern

```javascript
// express-session abstracts storage
app.use(session({
  store: new RedisStore({ ... })
}))

// Same interface, different backends
```

## Related Topics

- [Middleware Fundamentals](../middleware-fundamentals/DESIGN_ANALYSIS.md)
- [Built-in Middleware Design](../built-in/DESIGN_ANALYSIS.md)
- [Express Application Internals](../../core-concepts/application/DESIGN_ANALYSIS.md)
