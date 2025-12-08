# URL Module

The `url` module provides utilities for URL resolution and parsing. Express uses URL parsing internally for routing and query parameters.

## Overview

Node.js provides two URL APIs:
- **WHATWG URL API** (recommended): `new URL()`
- **Legacy API** (deprecated): `url.parse()`

## Express Connection

```javascript
const express = require('express')
const app = express()

// Express parses URLs automatically
app.get('/users/:id', (req, res) => {
  // req.url: '/users/123?active=true'
  // req.path: '/users/123'
  // req.query: { active: 'true' }
  // req.params: { id: '123' }
})

// Manual URL parsing
const { URL } = require('url')
const parsed = new URL(req.url, `http://${req.headers.host}`)
```

## WHATWG URL API (Recommended)

### Parsing URLs

```javascript
const { URL } = require('url')

const url = new URL('https://user:pass@example.com:8080/path?query=value#hash')

console.log({
  href: url.href,           // Full URL
  protocol: url.protocol,   // 'https:'
  username: url.username,   // 'user'
  password: url.password,   // 'pass'
  host: url.host,           // 'example.com:8080'
  hostname: url.hostname,   // 'example.com'
  port: url.port,           // '8080'
  pathname: url.pathname,   // '/path'
  search: url.search,       // '?query=value'
  hash: url.hash            // '#hash'
})
```

### URLSearchParams

```javascript
const { URL, URLSearchParams } = require('url')

// From URL
const url = new URL('https://example.com?name=john&age=30')
const params = url.searchParams

params.get('name')       // 'john'
params.get('age')        // '30'
params.has('name')       // true
params.getAll('name')    // ['john']

// Create new params
const newParams = new URLSearchParams()
newParams.append('key', 'value1')
newParams.append('key', 'value2')
newParams.toString()     // 'key=value1&key=value2'

// From object
const fromObj = new URLSearchParams({ name: 'john', age: 30 })
fromObj.toString()       // 'name=john&age=30'

// Iterate
for (const [key, value] of params) {
  console.log(key, value)
}
```

### Building URLs

```javascript
const { URL } = require('url')

// Build from parts
const url = new URL('https://example.com')
url.pathname = '/api/users'
url.searchParams.set('page', '1')
url.searchParams.set('limit', '10')

url.href  // 'https://example.com/api/users?page=1&limit=10'

// Resolve relative URLs
const base = new URL('https://example.com/docs/')
const relative = new URL('../api/users', base)
relative.href  // 'https://example.com/api/users'
```

## Legacy API (Deprecated)

```javascript
const url = require('url')

// Deprecated but still works
const parsed = url.parse('https://example.com/path?query=value', true)

console.log({
  protocol: parsed.protocol,  // 'https:'
  host: parsed.host,          // 'example.com'
  pathname: parsed.pathname,  // '/path'
  query: parsed.query         // { query: 'value' } (parsed object)
})

// Format back to string
url.format(parsed)
```

## Express.js Patterns

### Custom URL Parsing Middleware

```javascript
const { URL } = require('url')

app.use((req, res, next) => {
  const fullUrl = new URL(req.url, `${req.protocol}://${req.get('host')}`)

  req.fullUrl = fullUrl.href
  req.searchParams = fullUrl.searchParams

  next()
})

app.get('/search', (req, res) => {
  const query = req.searchParams.get('q')
  const page = parseInt(req.searchParams.get('page')) || 1
})
```

### Building API URLs

```javascript
function buildApiUrl(path, params = {}) {
  const url = new URL(path, process.env.API_BASE_URL)

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, value)
    }
  }

  return url.href
}

// Usage
buildApiUrl('/users', { page: 1, limit: 10 })
// 'https://api.example.com/users?page=1&limit=10'
```

### URL Validation

```javascript
function isValidUrl(string) {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}

function isValidHttpUrl(string) {
  try {
    const url = new URL(string)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
```

## Related Modules

- [querystring](../querystring-module/) - Lower-level query string parsing

## Next Steps

1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md)
2. Test knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Move to [querystring-module](../querystring-module/)

---

*The URL module standardizes URL handling across Node.js applications.*
