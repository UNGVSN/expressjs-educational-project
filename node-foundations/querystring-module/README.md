# Querystring Module

The `querystring` module provides utilities for parsing and formatting URL query strings. While `URLSearchParams` is now preferred, understanding querystring helps with Express request parsing.

## Overview

Express uses query string parsing internally for `req.query`. The querystring module provides lower-level parsing/stringifying.

## Express Connection

```javascript
const express = require('express')
const app = express()

// Express parses query strings automatically
app.get('/search', (req, res) => {
  console.log(req.query)  // { q: 'hello', page: '1' }
})
```

## Core Methods

### querystring.parse()

```javascript
const querystring = require('querystring')

// Parse query string to object
querystring.parse('name=john&age=30')
// { name: 'john', age: '30' }

// Handle arrays
querystring.parse('color=red&color=blue')
// { color: ['red', 'blue'] }

// Custom delimiter/separator
querystring.parse('name:john;age:30', ';', ':')
// { name: 'john', age: '30' }
```

### querystring.stringify()

```javascript
const querystring = require('querystring')

// Object to query string
querystring.stringify({ name: 'john', age: 30 })
// 'name=john&age=30'

// Handle arrays
querystring.stringify({ colors: ['red', 'blue'] })
// 'colors=red&colors=blue'

// Handle special characters
querystring.stringify({ message: 'hello world' })
// 'message=hello%20world'
```

### Encoding/Decoding

```javascript
const querystring = require('querystring')

// URL encoding
querystring.escape('hello world')  // 'hello%20world'

// URL decoding
querystring.unescape('hello%20world')  // 'hello world'
```

## URLSearchParams vs querystring

```javascript
// URLSearchParams (recommended)
const params = new URLSearchParams('name=john&age=30')
params.get('name')  // 'john'
params.append('skill', 'js')
params.toString()   // 'name=john&age=30&skill=js'

// querystring (legacy)
const qs = require('querystring')
const obj = qs.parse('name=john&age=30')  // { name: 'john', age: '30' }
qs.stringify({ ...obj, skill: 'js' })     // 'name=john&age=30&skill=js'
```

## Express Patterns

### Custom Query Parser

```javascript
const express = require('express')
const qs = require('qs')  // Extended query string parser

const app = express()

// Use qs for nested object support
app.set('query parser', (str) => qs.parse(str))

// Now supports: ?filter[status]=active&filter[type]=user
app.get('/items', (req, res) => {
  console.log(req.query.filter)  // { status: 'active', type: 'user' }
})
```

### Building URLs with Query Strings

```javascript
const querystring = require('querystring')

function buildUrl(base, params) {
  const qs = querystring.stringify(params)
  return qs ? `${base}?${qs}` : base
}

buildUrl('/api/users', { page: 1, limit: 10 })
// '/api/users?page=1&limit=10'
```

## Security Note

```javascript
// Query values are always strings
const qs = require('querystring')
const parsed = qs.parse('count=5')

// BAD: Assumes number
const total = parsed.count + 1  // '51' (string concatenation!)

// GOOD: Convert explicitly
const total = parseInt(parsed.count, 10) + 1  // 6
```

## Related Modules

- [url](../url-module/) - Higher-level URL handling with URLSearchParams

## Next Steps

1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md)
2. Test knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Move to [buffer-module](../buffer-module/)

---

*While URLSearchParams is preferred, querystring knowledge helps understand Express internals.*
