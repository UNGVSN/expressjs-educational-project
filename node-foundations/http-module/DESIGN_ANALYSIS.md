# HTTP Module Design Analysis

This document analyzes the design decisions, architecture, and internal workings of Node.js's `http` module and how these patterns influence Express.js.

---

## Architectural Overview

### Event-Driven Architecture

The http module is built on Node.js's event-driven, non-blocking I/O model:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Event Loop                                │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Timers  │───►│ Pending  │───►│   Poll   │───►│  Check   │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       ▲                              │                  │       │
│       └──────────────────────────────┴──────────────────┘       │
│                                                                  │
│  HTTP Server operates primarily in the Poll phase                │
│  - Accepts new connections                                       │
│  - Receives data on existing connections                         │
│  - Processes request/response cycles                             │
└─────────────────────────────────────────────────────────────────┘
```

### Class Hierarchy

```
EventEmitter
    │
    ├── net.Server
    │       │
    │       └── http.Server
    │               │
    │               └── https.Server
    │
    ├── stream.Readable
    │       │
    │       └── http.IncomingMessage (req)
    │
    └── stream.Writable
            │
            └── http.ServerResponse (res)
```

This inheritance chain reveals key design decisions:

1. **Servers are EventEmitters** - Enables the `server.on('event')` pattern
2. **Requests are Readable Streams** - Request bodies arrive as data chunks
3. **Responses are Writable Streams** - Response bodies are sent as chunks

---

## Core Design Patterns

### 1. The Request Handler Pattern

The fundamental pattern of passing `(req, res)` to a callback:

```javascript
// The callback signature
function requestHandler(req, res) {
  // req: IncomingMessage - readable stream with request data
  // res: ServerResponse - writable stream for response
}

// This pattern enables:
// 1. Separation of concerns
// 2. Middleware chaining (Express builds on this)
// 3. Testability (mock req/res objects)
```

**Why this design?**

- **Simplicity**: One function handles everything about a request
- **Flexibility**: The handler decides how to process/respond
- **Composability**: Handlers can be combined (middleware)

### 2. Stream-Based Request Bodies

Request bodies are not immediately available—they arrive as stream events:

```javascript
const server = http.createServer((req, res) => {
  // BAD: req.body doesn't exist in raw http
  console.log(req.body) // undefined

  // GOOD: Collect chunks from stream
  const chunks = []
  req.on('data', chunk => chunks.push(chunk))
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString()
    // Now we have the complete body
  })
})
```

**Why streams instead of buffered body?**

| Approach | Memory | Speed | Large Files |
|----------|--------|-------|-------------|
| Buffered | High (entire body in memory) | Wait for complete body | Can crash server |
| Streaming | Low (chunk at a time) | Start processing immediately | Handles any size |

**Express solution**: `express.json()` middleware abstracts this:

```javascript
// Express handles the streaming internally
app.use(express.json())
app.post('/', (req, res) => {
  console.log(req.body) // Already parsed!
})
```

### 3. Response Header Mechanics

Headers must be set before body is sent:

```javascript
// Headers can only be set BEFORE res.write() or res.end()
res.setHeader('Content-Type', 'application/json')
res.statusCode = 200

// Once body starts, headers are "flushed"
res.write('data') // Headers sent here

// This will throw error:
res.setHeader('X-Too-Late', 'value') // Error: Headers already sent
```

**State Machine for Response**:

```
┌─────────────┐    setHeader()     ┌─────────────┐
│   Initial   │───────────────────►│   Headers   │
│   State     │    writeHead()     │   Queued    │
└─────────────┘                    └──────┬──────┘
                                          │
                                   write() or end()
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │   Headers   │
                                   │    Sent     │
                                   └──────┬──────┘
                                          │
                                        end()
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │  Response   │
                                   │  Complete   │
                                   └─────────────┘
```

### 4. Keep-Alive Connections

HTTP/1.1 defaults to persistent connections:

```javascript
// Single TCP connection handles multiple requests
// Connection: keep-alive (default in HTTP/1.1)

const server = http.createServer((req, res) => {
  // Each request on same connection triggers this
  res.end('Response')
})

// Configure timeouts
server.keepAliveTimeout = 5000  // Close idle connections after 5s
server.headersTimeout = 60000   // Max time to receive headers
```

**Connection Lifecycle**:

```
Client                                    Server
   │                                         │
   │──── TCP Connect ───────────────────────►│
   │                                         │
   │──── Request 1 ─────────────────────────►│
   │◄─── Response 1 ─────────────────────────│
   │                                         │
   │──── Request 2 (same connection) ───────►│
   │◄─── Response 2 ─────────────────────────│
   │                                         │
   │        (keepAliveTimeout expires)       │
   │                                         │
   │◄─── Connection Close ───────────────────│
   │                                         │
```

---

## Express.js Integration Points

### How Express Wraps http.createServer()

```javascript
// Simplified Express source
function createApplication() {
  // app is a function that can be passed to http.createServer
  const app = function(req, res, next) {
    app.handle(req, res, next)
  }

  // Mixin EventEmitter
  Object.setPrototypeOf(app, EventEmitter.prototype)

  // Add methods
  app.use = function() { /* ... */ }
  app.get = function() { /* ... */ }
  // ...

  return app
}

// Usage
const app = createApplication()

// These are equivalent:
http.createServer(app).listen(3000)
app.listen(3000) // Calls http.createServer internally
```

### Request Enhancement

Express extends `IncomingMessage` prototype:

```javascript
// Express adds to req object
const req = Object.create(http.IncomingMessage.prototype)

// Added by Express:
req.get = function(header) {
  return this.headers[header.toLowerCase()]
}

req.accepts = function(type) {
  // Content negotiation logic
}

req.is = function(type) {
  // Check Content-Type
}

// req.body, req.params, req.query added by middleware/routing
```

### Response Enhancement

Express extends `ServerResponse` prototype:

```javascript
// Express adds to res object
const res = Object.create(http.ServerResponse.prototype)

// res.send() - the magic method
res.send = function(body) {
  // Detect body type
  if (typeof body === 'object') {
    return this.json(body)
  }

  // Set Content-Type if not set
  if (!this.get('Content-Type')) {
    this.type('html')
  }

  // Set Content-Length
  this.set('Content-Length', Buffer.byteLength(body))

  // Send
  this.end(body)
}

// res.json() - JSON helper
res.json = function(obj) {
  const body = JSON.stringify(obj)
  this.set('Content-Type', 'application/json')
  return this.send(body)
}
```

---

## Performance Considerations

### Connection Pooling (Client Side)

```javascript
// Default: 5 sockets per host
http.globalAgent.maxSockets // 5

// For high-throughput applications:
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000
})

http.get({ hostname: 'api.example.com', agent }, (res) => {
  // Uses pooled connection
})
```

### Backpressure Handling

When writing faster than the client can receive:

```javascript
const server = http.createServer((req, res) => {
  const bigData = generateLargeData()

  // BAD: May overwhelm client
  res.end(bigData)

  // GOOD: Respect backpressure
  const readable = createReadableStream(bigData)
  readable.pipe(res)

  // Or manually handle:
  function sendChunk() {
    const chunk = getNextChunk()
    if (!chunk) {
      res.end()
      return
    }

    const canContinue = res.write(chunk)
    if (!canContinue) {
      // Wait for drain event
      res.once('drain', sendChunk)
    } else {
      sendChunk()
    }
  }
  sendChunk()
})
```

### Memory Management

```javascript
// Limit request body size
const MAX_BODY = 1024 * 1024 // 1MB

const server = http.createServer((req, res) => {
  let size = 0

  req.on('data', chunk => {
    size += chunk.length
    if (size > MAX_BODY) {
      res.writeHead(413) // Payload Too Large
      res.end()
      req.destroy()
    }
  })
})

// Express equivalent:
app.use(express.json({ limit: '1mb' }))
```

---

## Error Handling Patterns

### Server-Level Errors

```javascript
const server = http.createServer((req, res) => {
  // Request handling
})

// Connection error (client disconnected unexpectedly)
server.on('clientError', (err, socket) => {
  if (err.code === 'ECONNRESET') {
    // Client closed connection
    return
  }
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
})

// Server error (port in use, etc.)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('Port already in use')
    process.exit(1)
  }
})
```

### Request-Level Errors

```javascript
const server = http.createServer((req, res) => {
  // Request aborted by client
  req.on('aborted', () => {
    console.log('Client aborted request')
    // Clean up any resources
  })

  // Request error
  req.on('error', (err) => {
    console.error('Request error:', err)
    res.writeHead(500)
    res.end('Internal Error')
  })

  // Response error
  res.on('error', (err) => {
    console.error('Response error:', err)
  })
})
```

### Express Error Middleware

Express abstracts error handling into middleware:

```javascript
// Express error handling (built on http error events)
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})
```

---

## Security Implications

### Header Injection Prevention

```javascript
// Node.js validates headers to prevent injection
res.setHeader('X-Custom', 'value\r\nX-Injected: attack')
// Throws: Invalid character in header content

// Always validate user input in headers
const userAgent = req.headers['user-agent']
// Don't trust this value blindly
```

### Request Smuggling

```javascript
// Configure strict parsing
const server = http.createServer({
  insecureHTTPParser: false, // Default, keeps strict parsing
  maxHeaderSize: 16384       // Limit header size (16KB default)
}, (req, res) => {
  // Handle request
})
```

### Timeout Protection

```javascript
const server = http.createServer((req, res) => {
  // Set request timeout
  req.setTimeout(30000, () => {
    res.writeHead(408)
    res.end('Request Timeout')
  })

  // Set response timeout
  res.setTimeout(60000, () => {
    res.destroy()
  })
})

// Server-level timeouts
server.timeout = 120000        // Overall timeout
server.keepAliveTimeout = 5000 // Idle connection timeout
server.headersTimeout = 60000  // Time to receive complete headers
```

---

## Comparison with Other Approaches

### Raw http vs Express vs Fastify

```javascript
// Raw http - maximum control, verbose
http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/users') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(users))
  }
}).listen(3000)

// Express - balanced abstraction
const app = express()
app.get('/users', (req, res) => res.json(users))
app.listen(3000)

// Fastify - performance-focused
const fastify = require('fastify')()
fastify.get('/users', async () => users)
fastify.listen({ port: 3000 })
```

| Feature | Raw http | Express | Fastify |
|---------|----------|---------|---------|
| Routing | Manual | Built-in | Built-in |
| Body parsing | Manual | Middleware | Built-in |
| Validation | Manual | Middleware | Built-in (JSON Schema) |
| Performance | Baseline | ~Same | ~2x faster |
| Learning curve | Steep | Moderate | Moderate |
| Ecosystem | N/A | Massive | Growing |

---

## Key Takeaways

1. **http module is event-driven** - Understanding EventEmitter is crucial
2. **Requests/Responses are streams** - Body data flows in chunks
3. **Headers before body** - Response state machine matters
4. **Express enhances, doesn't replace** - Core http patterns still apply
5. **Error handling is essential** - Multiple error types to handle
6. **Performance requires understanding** - Connection pooling, backpressure, timeouts

---

## Further Reading

- [Node.js http module source](https://github.com/nodejs/node/blob/main/lib/http.js)
- [HTTP/1.1 Specification (RFC 7230-7235)](https://tools.ietf.org/html/rfc7230)
- [Express.js source code](https://github.com/expressjs/express)

---

*Understanding the http module's design helps you debug issues, write performant code, and extend Express effectively.*
