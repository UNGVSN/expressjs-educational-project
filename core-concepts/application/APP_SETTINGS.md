# Express Application Settings - Complete Reference

All configurable settings for Express applications.

## Settings Table

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `case sensitive routing` | Boolean | `false` | Enable case sensitivity for routes |
| `env` | String | `NODE_ENV` or `'development'` | Environment mode |
| `etag` | Varied | `'weak'` | ETag response header configuration |
| `json escape` | Boolean | `false` | Enable escaping JSON responses |
| `json replacer` | Function | `undefined` | JSON.stringify replacer |
| `json spaces` | Number | `undefined` | JSON indentation spaces |
| `jsonp callback name` | String | `'callback'` | JSONP callback function name |
| `query parser` | Varied | `'extended'` | Query string parser |
| `strict routing` | Boolean | `false` | Enable strict routing |
| `subdomain offset` | Number | `2` | Number of dot-separated parts to remove for subdomains |
| `trust proxy` | Varied | `false` | Trust reverse proxy headers |
| `views` | String/Array | `'./views'` | View template directory |
| `view cache` | Boolean | `true` in production | Enable view template caching |
| `view engine` | String | `undefined` | Default template engine |
| `x-powered-by` | Boolean | `true` | Send X-Powered-By header |

## Detailed Settings

### case sensitive routing

Controls whether `/Foo` and `/foo` are different routes.

```javascript
// Default: case insensitive
app.get('/users', handler)  // Matches /users, /Users, /USERS

// Enable case sensitivity
app.set('case sensitive routing', true)
app.get('/users', handler)  // Only matches /users
app.get('/Users', handler)  // Different route
```

### env

Application environment mode.

```javascript
// Automatically set from NODE_ENV
console.log(app.get('env'))  // 'development' or 'production'

// Manually override
app.set('env', 'staging')

// Environment-specific behavior
if (app.get('env') === 'production') {
  app.enable('view cache')
  app.enable('trust proxy')
}
```

### etag

Configure ETag header generation for caching.

```javascript
// Options:
// 'weak'   - Weak ETags (default)
// 'strong' - Strong ETags
// false    - Disable ETags
// Function - Custom ETag generator

// Disable ETags
app.set('etag', false)

// Strong ETags
app.set('etag', 'strong')

// Custom ETag function
app.set('etag', (body, encoding) => {
  // Return string for ETag header
  return generateCustomETag(body)
})
```

**When to use:**
- `'weak'` (default): Best for most cases, allows byte-range caching
- `'strong'`: When exact byte-for-byte match required
- `false`: For dynamic content that shouldn't be cached
- Function: Custom hashing algorithm

### json escape

Escape `<`, `>`, and `&` characters in JSON responses.

```javascript
// Default: disabled
app.set('json escape', false)
// Output: {"html":"<script>alert('xss')</script>"}

// Enable escaping (prevents JSON injection in HTML)
app.set('json escape', true)
// Output: {"html":"\\u003cscript\\u003ealert('xss')\\u003c/script\\u003e"}
```

**Use case:** When embedding JSON in HTML `<script>` tags.

### json replacer

Custom replacer function for `JSON.stringify()`.

```javascript
// Remove sensitive fields from all JSON responses
app.set('json replacer', (key, value) => {
  // Remove password fields
  if (key === 'password') return undefined
  if (key === 'ssn') return undefined
  return value
})

app.get('/user', (req, res) => {
  res.json({
    name: 'John',
    password: 'secret123'  // Will be removed
  })
})
// Output: {"name":"John"}
```

### json spaces

Pretty-print JSON responses with indentation.

```javascript
// Default: minified (no spaces)
app.get('/data', (req, res) => res.json({ a: 1, b: 2 }))
// Output: {"a":1,"b":2}

// Enable pretty printing
app.set('json spaces', 2)
// Output:
// {
//   "a": 1,
//   "b": 2
// }

// Development pattern
if (app.get('env') === 'development') {
  app.set('json spaces', 2)
}
```

### jsonp callback name

Customize JSONP callback parameter name.

```javascript
// Default: 'callback'
// /api/data?callback=myFunction

// Custom callback name
app.set('jsonp callback name', 'jsonp')
// /api/data?jsonp=myFunction

app.get('/api/data', (req, res) => {
  res.jsonp({ data: 'value' })
})
// Output: myFunction({"data":"value"})
```

### query parser

Configure query string parsing.

```javascript
// Options:
// 'extended' - qs library (default, supports nested objects)
// 'simple'   - querystring module (flat objects only)
// false      - Disable parsing (req.query = {})
// Function   - Custom parser

// Extended (default)
app.set('query parser', 'extended')
// /search?filter[status]=active&filter[type]=user
// req.query = { filter: { status: 'active', type: 'user' } }

// Simple
app.set('query parser', 'simple')
// /search?filter[status]=active
// req.query = { 'filter[status]': 'active' }

// Disabled
app.set('query parser', false)
// req.query = {}

// Custom parser
app.set('query parser', (str) => {
  return customParse(str)
})
```

### strict routing

Treat `/foo` and `/foo/` as different routes.

```javascript
// Default: not strict
app.get('/users', handler)  // Matches /users AND /users/

// Enable strict routing
app.set('strict routing', true)
app.get('/users', handler)   // Only matches /users
app.get('/users/', handler)  // Only matches /users/
```

### subdomain offset

Configure subdomain extraction from hostname.

```javascript
// Default: 2 (assumes domain.tld)
// Host: api.example.com
// req.subdomains = ['api']

// For deeper TLDs (e.g., domain.co.uk)
app.set('subdomain offset', 3)
// Host: api.example.co.uk
// req.subdomains = ['api']

// Example usage
app.get('/', (req, res) => {
  const subdomain = req.subdomains[0]

  if (subdomain === 'api') {
    return res.json({ message: 'API endpoint' })
  }

  res.render('home')
})
```

### trust proxy

Configure trusted proxy behavior. See [Proxies Documentation](../../advanced/proxies/README.md) for details.

```javascript
// Options:
// false    - Don't trust (default)
// true     - Trust all (DANGEROUS in production)
// Number   - Trust N hops from front proxy
// String   - Trust specific subnets
// Array    - Trust multiple subnets
// Function - Custom trust logic

// Trust single proxy
app.set('trust proxy', 1)

// Trust specific subnets
app.set('trust proxy', 'loopback, 10.0.0.0/8')

// Trust with function
app.set('trust proxy', (ip) => {
  return ip === '127.0.0.1' || ip.startsWith('10.')
})
```

**Affected properties:**
- `req.ip` - Client IP from X-Forwarded-For
- `req.ips` - Array of IPs in proxy chain
- `req.hostname` - From X-Forwarded-Host
- `req.protocol` - From X-Forwarded-Proto
- `req.secure` - Based on protocol

### views

Directory for view templates.

```javascript
// Single directory
app.set('views', path.join(__dirname, 'views'))

// Multiple directories (searched in order)
app.set('views', [
  path.join(__dirname, 'views'),
  path.join(__dirname, 'shared-views')
])
```

### view cache

Cache compiled view templates.

```javascript
// Default: enabled in production, disabled in development
console.log(app.get('view cache'))  // true in production

// Force enable
app.enable('view cache')

// Force disable (for development)
app.disable('view cache')

// Explicit setting
app.set('view cache', process.env.NODE_ENV === 'production')
```

**Impact:**
- Enabled: Templates compiled once, faster rendering
- Disabled: Templates recompiled each request, allows live editing

### view engine

Default template engine extension.

```javascript
// Set default engine
app.set('view engine', 'pug')

// Now can omit extension
res.render('index')  // Renders views/index.pug

// Still can use other engines
res.render('email.ejs')  // Uses EJS for this specific render

// With multiple engines
app.engine('html', require('ejs').renderFile)
app.set('view engine', 'pug')

res.render('page')       // Uses Pug
res.render('email.html') // Uses EJS
```

### x-powered-by

Send `X-Powered-By: Express` header.

```javascript
// Default: enabled
// Response header: X-Powered-By: Express

// Disable (recommended for security)
app.disable('x-powered-by')

// Or use helmet
const helmet = require('helmet')
app.use(helmet())  // Disables x-powered-by among other things
```

**Security note:** Disabling hides that you're using Express, preventing targeted attacks.

## Internal Settings (Read-Only)

These are set internally and should not be modified:

| Setting | Description |
|---------|-------------|
| `trust proxy fn` | Compiled trust proxy function |
| `query parser fn` | Compiled query parser function |
| `etag fn` | Compiled ETag generator function |

## Environment-Based Configuration

```javascript
const express = require('express')
const app = express()

// Base settings
app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))

// Environment-specific settings
const env = app.get('env')

if (env === 'development') {
  app.set('json spaces', 2)
  app.disable('view cache')
  app.disable('etag')
}

if (env === 'production') {
  app.enable('trust proxy')
  app.enable('view cache')
  app.disable('x-powered-by')
  app.set('json escape', true)
}

if (env === 'test') {
  app.disable('x-powered-by')
  app.set('json spaces', 2)
}
```

## Settings Inheritance

Sub-applications inherit parent settings:

```javascript
const app = express()
const admin = express()

app.set('view engine', 'pug')
app.set('json spaces', 2)

app.use('/admin', admin)

// admin inherits settings from app
admin.get('view engine')  // 'pug'
admin.get('json spaces')  // 2

// But can override
admin.set('view engine', 'ejs')
admin.get('view engine')  // 'ejs'
```

## Quick Reference

### Security Settings
```javascript
app.disable('x-powered-by')
app.set('trust proxy', 1)  // If behind proxy
app.set('json escape', true)  // If embedding JSON in HTML
```

### Development Settings
```javascript
app.set('json spaces', 2)
app.disable('view cache')
app.disable('etag')
```

### Production Settings
```javascript
app.enable('trust proxy')
app.enable('view cache')
app.set('etag', 'weak')
```

### API Settings
```javascript
app.set('json spaces', 0)  // Minified responses
app.disable('x-powered-by')
app.set('etag', false)  // If responses are always fresh
```
