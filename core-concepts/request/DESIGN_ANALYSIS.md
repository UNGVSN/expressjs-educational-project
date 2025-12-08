# Request Design Analysis

## Prototype Extension

Express extends `http.IncomingMessage.prototype`:

```javascript
// req inherits from http.IncomingMessage
// Express adds methods to the prototype

const req = Object.create(http.IncomingMessage.prototype)

// Added by Express
req.get = function(field) { /* ... */ }
req.accepts = function(type) { /* ... */ }
req.is = function(type) { /* ... */ }
```

## Property Sources

| Property | Source | Requires |
|----------|--------|----------|
| `req.params` | Route matching | Route with params |
| `req.query` | URL parsing | Query parser |
| `req.body` | Body parsing | Body parser middleware |
| `req.cookies` | Cookie header | cookie-parser middleware |
| `req.path` | URL parsing | Built-in |
| `req.ip` | Socket/proxy | trust proxy for proxy |

## Query String Parsing

```javascript
// Default: extended parser (qs library)
// Supports nested objects: ?a[b]=1

app.set('query parser', 'extended')  // default
app.set('query parser', 'simple')    // querystring module
app.set('query parser', false)       // disable
app.set('query parser', customParser)
```

## Body Availability

Body is NOT available without middleware:

```javascript
// Without middleware
app.post('/', (req, res) => {
  req.body  // undefined!
})

// With middleware
app.use(express.json())
app.post('/', (req, res) => {
  req.body  // { ... }
})
```

### Why Not Built-in?

1. **Flexibility**: Choose parser for your needs
2. **Performance**: Don't parse if not needed
3. **Security**: Limit body size per route
4. **Separation**: Body parsing is a concern

## Trust Proxy Impact

```javascript
// Without trust proxy
req.ip        // Socket address
req.hostname  // Host header
req.protocol  // 'http' always

// With trust proxy
req.ip        // X-Forwarded-For
req.hostname  // X-Forwarded-Host
req.protocol  // X-Forwarded-Proto
```

## Key Takeaways

1. **req extends IncomingMessage** with Express methods
2. **req.body needs middleware** - never available by default
3. **Query params are strings** - always convert types
4. **Trust proxy changes** req.ip, hostname, protocol, secure
5. **Content negotiation** via accepts(), is()

---

*Understanding req helps you access request data correctly.*
