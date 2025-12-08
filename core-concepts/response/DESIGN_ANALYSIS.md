# Response Design Analysis

## Prototype Extension

Like req, res extends Node's `http.ServerResponse`:

```javascript
const res = Object.create(http.ServerResponse.prototype)

// Express adds
res.send = function() { /* ... */ }
res.json = function() { /* ... */ }
res.render = function() { /* ... */ }
```

## send() Intelligence

`res.send()` auto-detects content type:

```javascript
res.send('string')   // → text/html
res.send({})         // → application/json (calls res.json)
res.send([])         // → application/json
res.send(Buffer)     // → application/octet-stream
```

### Internal Flow

```javascript
res.send = function(body) {
  // 1. Detect type
  if (typeof body === 'object') {
    return this.json(body)
  }

  // 2. Set Content-Type if not set
  if (!this.get('Content-Type')) {
    this.type('html')
  }

  // 3. Set Content-Length
  this.set('Content-Length', Buffer.byteLength(body))

  // 4. Handle HEAD requests
  if (this.req.method === 'HEAD') {
    this.end()
  } else {
    this.end(body)
  }
}
```

## Method Chaining

Methods return `this` for chaining:

```javascript
res
  .status(201)
  .set('X-Custom', 'value')
  .cookie('session', 'abc')
  .json({ created: true })
```

## Headers Sent Guard

Many methods check `res.headersSent`:

```javascript
res.json = function(body) {
  if (this.headersSent) {
    console.warn('Headers already sent')
    return this
  }
  // ... send response
}
```

## res.locals vs app.locals

| Property | Scope | Use Case |
|----------|-------|----------|
| `app.locals` | Application | Site-wide data |
| `res.locals` | Request | Request-specific data |

```javascript
// Set once at startup
app.locals.siteName = 'My Site'

// Set per request
app.use((req, res, next) => {
  res.locals.user = req.user
  next()
})
```

## Key Takeaways

1. **res extends ServerResponse** with convenience methods
2. **res.send() is smart** - auto-detects content type
3. **Methods are chainable** - return this
4. **headersSent guards** prevent double sends
5. **res.locals** for request-scoped view data

---

*Understanding res helps you send responses correctly.*
