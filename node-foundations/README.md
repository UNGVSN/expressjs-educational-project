# Node.js Foundations

Understanding the Node.js core modules that Express.js builds upon. This section provides the essential foundation for understanding how Express works internally.

## Overview

Express.js is fundamentally a thin layer built on top of Node.js core modules. Understanding these underlying modules is crucial for:

- Debugging Express applications effectively
- Writing custom middleware
- Optimizing performance
- Understanding Express source code
- Building similar abstractions

## Why Start Here?

```
┌─────────────────────────────────────────────────────────────┐
│                    Express.js Application                    │
├─────────────────────────────────────────────────────────────┤
│                      Express.js Layer                        │
│  (Application, Router, Request, Response, Middleware)        │
├─────────────────────────────────────────────────────────────┤
│                    Node.js Core Modules                      │
│  http │ https │ events │ stream │ path │ fs │ url │ buffer  │
├─────────────────────────────────────────────────────────────┤
│                         V8 Engine                            │
└─────────────────────────────────────────────────────────────┘
```

Express doesn't reinvent HTTP handling—it enhances it. Every Express feature traces back to Node.js primitives.

## Modules Covered

| Module | Purpose | Express Usage |
|--------|---------|---------------|
| [http](./http-module/) | HTTP server and client | Core server creation |
| [https](./https-module/) | Secure HTTP | TLS/SSL support |
| [events](./events-module/) | Event-driven programming | Async patterns, app events |
| [stream](./stream-module/) | Streaming data | Request/response bodies |
| [path](./path-module/) | Path utilities | Route matching, static files |
| [fs](./fs-module/) | File system | Static file serving, uploads |
| [url](./url-module/) | URL parsing | Route and query parsing |
| [querystring](./querystring-module/) | Query strings | Request parameters |
| [buffer](./buffer-module/) | Binary data | Raw body handling |

## Learning Path

### 1. HTTP Module (Start Here)
The `http` module is THE foundation. Express's `app.listen()` creates an `http.Server`. Every request handler receives Node's `IncomingMessage` and `ServerResponse` objects.

```javascript
// Pure Node.js
const http = require('http')
const server = http.createServer((req, res) => {
  res.end('Hello')
})
server.listen(3000)

// Express (same underlying mechanism)
const express = require('express')
const app = express()
app.get('/', (req, res) => res.send('Hello'))
app.listen(3000)  // Creates http.Server internally
```

### 2. Events Module
Node.js is event-driven. The `EventEmitter` class underlies servers, streams, and Express's app object itself.

```javascript
// http.Server extends EventEmitter
server.on('request', (req, res) => { })
server.on('error', (err) => { })
server.on('listening', () => { })
```

### 3. Stream Module
Request bodies and responses are streams. Understanding streams is essential for:
- Parsing request bodies
- Streaming file downloads
- Handling large uploads efficiently

```javascript
// req is a readable stream
req.on('data', chunk => { })
req.on('end', () => { })

// res is a writable stream
res.write('chunk')
res.end()
```

### 4. Path Module
Route matching and static file serving rely on path manipulation:

```javascript
const path = require('path')
app.use(express.static(path.join(__dirname, 'public')))
```

### 5. File System Module
Static file serving, file uploads, and view rendering use the fs module:

```javascript
// What express.static does internally
fs.readFile(filePath, (err, data) => {
  res.end(data)
})
```

### 6. URL Module
URL parsing is fundamental to routing:

```javascript
const { URL } = require('url')
const url = new URL(req.url, `http://${req.headers.host}`)
console.log(url.pathname)  // Route path
console.log(url.searchParams)  // Query params
```

### 7. Query String Module
Request query parameters parsing:

```javascript
const querystring = require('querystring')
const params = querystring.parse('name=john&age=30')
// { name: 'john', age: '30' }
```

### 8. Buffer Module
Binary data handling for raw request bodies:

```javascript
const chunks = []
req.on('data', chunk => chunks.push(chunk))
req.on('end', () => {
  const body = Buffer.concat(chunks)
})
```

## Express Enhancements Over Node.js

| Feature | Node.js (Manual) | Express (Enhanced) |
|---------|-----------------|-------------------|
| Routing | Parse URL, switch/case | `app.get('/path', handler)` |
| Middleware | Manual function chaining | `app.use(middleware)` |
| Body parsing | Stream handling, concatenation | `express.json()` |
| Static files | fs.readFile, MIME types | `express.static()` |
| Response helpers | Manual header/body | `res.json()`, `res.send()` |
| Error handling | try/catch everywhere | Error middleware |

## Code Comparison

### Creating a Server

**Node.js:**
```javascript
const http = require('http')

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Hello World')
  } else if (req.method === 'GET' && req.url === '/users') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify([{ id: 1, name: 'John' }]))
  } else {
    res.writeHead(404)
    res.end('Not Found')
  }
})

server.listen(3000, () => {
  console.log('Server running on port 3000')
})
```

**Express:**
```javascript
const express = require('express')
const app = express()

app.get('/', (req, res) => {
  res.send('Hello World')
})

app.get('/users', (req, res) => {
  res.json([{ id: 1, name: 'John' }])
})

app.listen(3000, () => {
  console.log('Server running on port 3000')
})
```

### Parsing JSON Body

**Node.js:**
```javascript
const http = require('http')

http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ received: data }))
      } catch (e) {
        res.writeHead(400)
        res.end('Invalid JSON')
      }
    })
  }
}).listen(3000)
```

**Express:**
```javascript
const express = require('express')
const app = express()

app.use(express.json())

app.post('/', (req, res) => {
  res.json({ received: req.body })
})

app.listen(3000)
```

## Key Concepts to Master

### 1. Request-Response Cycle
```
Client                    Node.js/Express
  │                            │
  │──── HTTP Request ─────────►│
  │                            │
  │                     ┌──────┴───────┐
  │                     │ Parse Headers │
  │                     │ Create req/res│
  │                     │ Route Match   │
  │                     │ Run Handlers  │
  │                     │ Send Response │
  │                     └──────┬───────┘
  │                            │
  │◄─── HTTP Response ─────────│
  │                            │
```

### 2. Streams and Data Flow
```
Request Body (Readable Stream)
       │
       ▼
   ┌───────┐
   │ chunk │──► Buffer ──► Concatenate ──► Parse
   │ chunk │
   │ chunk │
   └───────┘
```

### 3. Event Loop Integration
```
┌─────────────────────────────────────────┐
│              Event Loop                  │
│                                          │
│  timers ──► I/O callbacks ──► idle      │
│     │                           │        │
│     └──────────────────────────►│        │
│                                 ▼        │
│           poll ◄─── check ◄── close     │
└─────────────────────────────────────────┘
```

## Next Steps

1. **Start with [HTTP Module](./http-module/)** - Understand the foundation
2. **Study [Events Module](./events-module/)** - Master async patterns
3. **Learn [Stream Module](./stream-module/)** - Handle data efficiently
4. **Complete remaining modules** in order

After completing Node.js Foundations, proceed to [Core Concepts](../core-concepts/) to learn Express-specific abstractions.

## Resources

- [Node.js Official Documentation](https://nodejs.org/docs)
- [Node.js API Reference](https://nodejs.org/api/)
- [Node.js Guides](https://nodejs.org/en/docs/guides/)

---

**Foundation first** | **Understand before abstracting** | **Node.js powers Express**
