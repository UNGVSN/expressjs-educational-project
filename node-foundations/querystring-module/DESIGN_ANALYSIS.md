# Querystring Module Design Analysis

## Legacy Status

The `querystring` module is considered legacy. Use `URLSearchParams` for new code:

```javascript
// Legacy
const qs = require('querystring')
qs.parse('a=1&b=2')  // { a: '1', b: '2' }

// Modern (recommended)
const params = new URLSearchParams('a=1&b=2')
Object.fromEntries(params)  // { a: '1', b: '2' }
```

## Key Differences

| Feature | querystring | URLSearchParams |
|---------|-------------|-----------------|
| API style | Functions | Class-based |
| Iteration | Manual | Built-in iterator |
| Arrays | `['a', 'b']` | Repeated keys |
| Standard | Node-only | Web standard |

## Why Express Still Uses It

Express's query parser uses `qs` package (not `querystring`) which supports:
- Nested objects: `?a[b]=1`
- Arrays: `?a[]=1&a[]=2`
- Complex structures

```javascript
// Express with qs
// ?filter[status]=active&filter[type]=user
req.query.filter  // { status: 'active', type: 'user' }
```

## Security

Query values are always strings:

```javascript
qs.parse('admin=true')
// { admin: 'true' } - STRING, not boolean!

// Always validate and convert types
const isAdmin = parsed.admin === 'true'
const count = parseInt(parsed.count, 10)
```

## Key Takeaways

1. **Use URLSearchParams** for new code
2. **Express uses qs** package for extended features
3. **Values are strings** - always convert types
4. **Understand for debugging** Express internals

---

*The querystring module is legacy but understanding it helps with Express development.*
