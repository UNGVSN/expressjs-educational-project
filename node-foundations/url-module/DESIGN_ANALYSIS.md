# URL Module Design Analysis

## Two APIs

### Legacy vs WHATWG

| Aspect | Legacy (`url.parse`) | WHATWG (`new URL`) |
|--------|---------------------|-------------------|
| Status | Deprecated | Recommended |
| Standard | Node.js specific | Web standard |
| Query parsing | Built-in | Separate (URLSearchParams) |
| Mutable | No | Yes |
| Browser compatible | No | Yes |

### Why WHATWG?

1. **Web compatibility**: Same API as browsers
2. **Better security**: Stricter parsing rules
3. **Modern interface**: Mutable, class-based
4. **URLSearchParams**: Proper query handling

## URL Anatomy

```
https://user:pass@example.com:8080/path/to/file?query=value#hash
│       │    │    │           │    │            │           │
protocol│    │    hostname    port pathname     search      hash
        username password
        └────────┬────────┘
                host (hostname:port)
```

## Key Design Decisions

### Base URL Requirement

```javascript
// Relative URLs need a base
new URL('/path')  // TypeError!
new URL('/path', 'https://example.com')  // OK

// Absolute URLs work alone
new URL('https://example.com/path')  // OK
```

### Immutable Search String

```javascript
const url = new URL('https://example.com?a=1')

// Modifying searchParams updates the URL
url.searchParams.set('b', '2')
url.href  // 'https://example.com?a=1&b=2'

// But search string is regenerated
url.search  // '?a=1&b=2'
```

## Security Considerations

```javascript
// URL parsing can expose vulnerabilities
const userUrl = new URL(userInput)

// Validate protocol
if (!['http:', 'https:'].includes(userUrl.protocol)) {
  throw new Error('Invalid protocol')
}

// Validate hostname
const allowedHosts = ['api.example.com']
if (!allowedHosts.includes(userUrl.hostname)) {
  throw new Error('Invalid host')
}
```

## Key Takeaways

1. **Use WHATWG URL** over legacy `url.parse()`
2. **URLSearchParams** for query string manipulation
3. **Validate user URLs** before using
4. **Relative URLs** require a base

---

*The WHATWG URL API provides a standardized, secure way to handle URLs.*
