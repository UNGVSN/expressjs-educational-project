# Node.js Foundations Summary

This document provides a quick reference for all Node.js core modules covered in this section.

---

## Module Overview

| Module | Purpose | Express Usage |
|--------|---------|---------------|
| [http](./http-module/) | HTTP server/client | Core server creation |
| [https](./https-module/) | Secure HTTP | TLS/SSL support |
| [events](./events-module/) | EventEmitter pattern | Async patterns, app events |
| [stream](./stream-module/) | Streaming data | Request/response bodies |
| [path](./path-module/) | Path utilities | Route matching, static files |
| [fs](./fs-module/) | File system | Static serving, uploads |
| [url](./url-module/) | URL parsing | Route and query parsing |
| [querystring](./querystring-module/) | Query strings | Request parameters |
| [buffer](./buffer-module/) | Binary data | Raw body handling |

---

## Key Concepts by Module

### HTTP Module
- `http.createServer()` creates servers
- `req` is `IncomingMessage` (Readable stream)
- `res` is `ServerResponse` (Writable stream)
- Express wraps http.Server internally

### HTTPS Module
- Same API as http with TLS options
- Requires certificate and key files
- SNI for multiple domains
- mTLS for client authentication

### Events Module
- `EventEmitter` is the base class
- `on()` for persistent, `once()` for one-time
- `error` event is special (throws if unhandled)
- Events are synchronous

### Stream Module
- Readable, Writable, Duplex, Transform
- `pipe()` connects streams with backpressure
- `highWaterMark` controls buffer size
- Use streams for large data

### Path Module
- `join()` concatenates paths
- `resolve()` creates absolute paths
- `parse()` extracts components
- Always use path for cross-platform

### FS Module
- Use promises API (`fs.promises`)
- Avoid sync in request handlers
- Streams for large files
- Handle errors by code (ENOENT, etc.)

### URL Module
- Use WHATWG `new URL()` API
- `URLSearchParams` for query strings
- Relative URLs need base
- Validate user URLs

### Querystring Module
- Legacy, prefer URLSearchParams
- Values are always strings
- Express uses `qs` package

### Buffer Module
- `alloc()` vs `allocUnsafe()`
- `slice()` shares memory
- Use encodings for conversion
- `timingSafeEqual()` for security

---

## Express Integration Points

### Server Creation
```javascript
// Express internally does:
const app = express()
const server = http.createServer(app)
server.listen(3000)

// Simplified:
app.listen(3000)
```

### Request/Response
```javascript
// req extends http.IncomingMessage
// res extends http.ServerResponse
app.get('/', (req, res) => {
  // Stream methods available
  req.on('data', chunk => {})
  res.write('chunk')
})
```

### Static Files
```javascript
const path = require('path')
const express = require('express')

// Uses fs and path internally
app.use(express.static(path.join(__dirname, 'public')))
```

### Body Parsing
```javascript
// express.json() uses streams internally
app.use(express.json())

// Raw buffer access
app.use(express.raw())
```

---

## Common Patterns

### Async/Await
```javascript
// Modern pattern for all modules
const fs = require('fs').promises
const { pipeline } = require('stream/promises')
const { once } = require('events')

app.get('/file', async (req, res) => {
  const data = await fs.readFile('file.txt')
  res.send(data)
})
```

### Error Handling
```javascript
// Events
emitter.on('error', handleError)

// Streams
pipeline(source, dest, handleError)

// FS
try {
  await fs.readFile(path)
} catch (err) {
  if (err.code === 'ENOENT') {
    // File not found
  }
}
```

### Security
```javascript
// Path traversal prevention
const safePath = path.resolve(baseDir, userInput)
if (!safePath.startsWith(baseDir)) throw new Error()

// Timing-safe comparison
crypto.timingSafeEqual(buf1, buf2)

// Buffer initialization
Buffer.alloc(size)  // Not allocUnsafe for sensitive data
```

---

## Learning Path Recommendation

1. **HTTP Module** - Foundation of everything
2. **Events Module** - Understand async patterns
3. **Stream Module** - Efficient data handling
4. **Path Module** - File path safety
5. **FS Module** - File operations
6. **Buffer Module** - Binary data
7. **URL Module** - URL handling
8. **HTTPS Module** - Security layer
9. **Querystring Module** - Legacy understanding

---

## Quick Reference Card

```javascript
// HTTP Server
const server = http.createServer((req, res) => {
  res.end('Hello')
}).listen(3000)

// Event Handling
emitter.on('event', handler)
emitter.once('event', oneTimeHandler)
emitter.emit('event', data)

// Streams
readable.pipe(transform).pipe(writable)
await pipeline(source, ...transforms, dest)

// Paths
path.join(__dirname, 'public')
path.resolve(base, relative)

// Files
await fs.readFile(path, 'utf8')
await fs.writeFile(path, data)
fs.createReadStream(path).pipe(res)

// URLs
const url = new URL(input, base)
url.searchParams.get('key')

// Buffers
Buffer.from(data)
buf.toString('base64')
```

---

## Next Steps

After mastering Node.js foundations, proceed to:
1. [Core Concepts](../core-concepts/) - Express-specific patterns
2. [Middleware](../middleware/) - Request processing
3. [Routing](../routing/) - URL handling

---

*These foundations enable deep understanding of Express.js internals.*
