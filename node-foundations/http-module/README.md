# HTTP Module

The `http` module is the foundation of Node.js web servers and the core module that Express.js builds upon. Understanding this module is essential for understanding how Express works internally.

## Overview

The `http` module provides functionality to create HTTP servers and make HTTP requests. Every Express application ultimately creates an `http.Server` instance.

## Express Connection

```javascript
// What Express does internally
const http = require('http')
const express = require('express')
const app = express()

// app.listen() creates an http.Server
const server = http.createServer(app)
server.listen(3000)

// Simplified Express syntax (same result)
app.listen(3000)
```

## Core Components

### http.createServer()

Creates an HTTP server that listens for requests:

```javascript
const http = require('http')

const server = http.createServer((req, res) => {
  // req: http.IncomingMessage
  // res: http.ServerResponse
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Hello World')
})

server.listen(3000, () => {
  console.log('Server running on port 3000')
})
```

### http.IncomingMessage (req)

Represents the incoming HTTP request:

| Property | Type | Description |
|----------|------|-------------|
| `req.method` | string | HTTP method (GET, POST, etc.) |
| `req.url` | string | Request URL path |
| `req.headers` | object | HTTP headers |
| `req.httpVersion` | string | HTTP version |
| `req.socket` | net.Socket | Underlying socket |

```javascript
const server = http.createServer((req, res) => {
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  console.log('Headers:', req.headers)
  console.log('HTTP Version:', req.httpVersion)

  res.end('OK')
})
```

### http.ServerResponse (res)

Represents the outgoing HTTP response:

| Method | Description |
|--------|-------------|
| `res.writeHead(statusCode, headers)` | Write status and headers |
| `res.setHeader(name, value)` | Set individual header |
| `res.getHeader(name)` | Get header value |
| `res.write(chunk)` | Write response body chunk |
| `res.end([data])` | End response (optionally with data) |

```javascript
const server = http.createServer((req, res) => {
  // Set status and headers
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'X-Custom-Header': 'value'
  })

  // Or set individually
  res.setHeader('Content-Type', 'application/json')
  res.statusCode = 200

  // Write body
  res.write('{"hello":')
  res.write('"world"}')
  res.end()

  // Or end with data
  res.end(JSON.stringify({ hello: 'world' }))
})
```

## Basic Patterns

### Simple Web Server

```javascript
const http = require('http')

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end('<h1>Hello World</h1>')
})

server.listen(3000, '127.0.0.1', () => {
  console.log('Server running at http://127.0.0.1:3000/')
})
```

### Basic Routing

```javascript
const http = require('http')
const url = require('url')

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true)
  const path = parsedUrl.pathname
  const method = req.method

  // Route: GET /
  if (method === 'GET' && path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Home Page')
    return
  }

  // Route: GET /about
  if (method === 'GET' && path === '/about') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('About Page')
    return
  }

  // Route: GET /api/users
  if (method === 'GET' && path === '/api/users') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify([{ id: 1, name: 'John' }]))
    return
  }

  // 404 Not Found
  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not Found')
})

server.listen(3000)
```

### Handling POST Data

```javascript
const http = require('http')

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/users') {
    let body = ''

    // Collect data chunks
    req.on('data', chunk => {
      body += chunk.toString()
    })

    // Process complete body
    req.on('end', () => {
      try {
        const user = JSON.parse(body)
        res.writeHead(201, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ created: user }))
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })

    return
  }

  res.writeHead(404)
  res.end('Not Found')
})

server.listen(3000)
```

### Serving Static Files

```javascript
const http = require('http')
const fs = require('fs')
const path = require('path')

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
}

const server = http.createServer((req, res) => {
  // Construct file path
  let filePath = path.join(__dirname, 'public', req.url)

  // Default to index.html
  if (req.url === '/') {
    filePath = path.join(__dirname, 'public', 'index.html')
  }

  // Get file extension
  const ext = path.extname(filePath)
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  // Read and serve file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404)
        res.end('File Not Found')
      } else {
        res.writeHead(500)
        res.end('Server Error')
      }
      return
    }

    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
  })
})

server.listen(3000)
```

## Server Events

`http.Server` extends `EventEmitter` and emits several events:

```javascript
const server = http.createServer()

// Request received
server.on('request', (req, res) => {
  res.end('Hello')
})

// Client connection established
server.on('connection', (socket) => {
  console.log('New connection from', socket.remoteAddress)
})

// Server error
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('Port already in use')
  }
})

// Server started listening
server.on('listening', () => {
  console.log('Server is listening')
})

// Server closed
server.on('close', () => {
  console.log('Server closed')
})

server.listen(3000)
```

## HTTP Client

The `http` module also provides HTTP client functionality:

```javascript
const http = require('http')

// Simple GET request
http.get('http://api.example.com/data', (res) => {
  let data = ''

  res.on('data', chunk => {
    data += chunk
  })

  res.on('end', () => {
    console.log(JSON.parse(data))
  })
}).on('error', (err) => {
  console.error('Error:', err.message)
})

// POST request with options
const options = {
  hostname: 'api.example.com',
  port: 80,
  path: '/users',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}

const req = http.request(options, (res) => {
  let data = ''
  res.on('data', chunk => data += chunk)
  res.on('end', () => console.log(data))
})

req.on('error', (err) => {
  console.error('Error:', err.message)
})

req.write(JSON.stringify({ name: 'John' }))
req.end()
```

## Common Patterns

### Request Timeout

```javascript
const server = http.createServer((req, res) => {
  // Set timeout (2 minutes default)
  req.setTimeout(30000, () => {
    res.writeHead(408)
    res.end('Request Timeout')
  })

  // Handle request...
})
```

### Keep-Alive Connections

```javascript
const server = http.createServer((req, res) => {
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Keep-Alive', 'timeout=5, max=100')
  res.end('Hello')
})

// Configure server-level keep-alive
server.keepAliveTimeout = 5000
server.headersTimeout = 60000
```

### Graceful Shutdown

```javascript
const server = http.createServer((req, res) => {
  res.end('Hello')
})

server.listen(3000)

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')

  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })

  // Force close after 30s
  setTimeout(() => {
    console.error('Forcing shutdown')
    process.exit(1)
  }, 30000)
})
```

## How Express Uses http

### Application Creation

```javascript
// Express source (simplified)
function createApplication() {
  const app = function(req, res, next) {
    app.handle(req, res, next)
  }

  // ...

  return app
}

// app is a function that can be passed to http.createServer
const app = createApplication()
http.createServer(app)
```

### app.listen()

```javascript
// Express source (simplified)
app.listen = function listen() {
  const server = http.createServer(this)
  return server.listen.apply(server, arguments)
}

// Usage
app.listen(3000)  // Creates http.Server, calls listen()
```

### Request Enhancement

Express enhances the native `req` and `res` objects:

```javascript
// Express adds methods to req
req.get = function(field) { /* ... */ }
req.accepts = function(type) { /* ... */ }
req.param = function(name) { /* ... */ }

// Express adds methods to res
res.send = function(body) { /* ... */ }
res.json = function(obj) { /* ... */ }
res.redirect = function(url) { /* ... */ }
```

## Performance Considerations

### Connection Handling

```javascript
// Configure max sockets per host
http.globalAgent.maxSockets = 50

// Or use custom agent
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
})
```

### Request Size Limits

```javascript
const server = http.createServer((req, res) => {
  let bodySize = 0
  const MAX_SIZE = 1024 * 1024 // 1MB

  req.on('data', chunk => {
    bodySize += chunk.length
    if (bodySize > MAX_SIZE) {
      res.writeHead(413)
      res.end('Request Entity Too Large')
      req.destroy()
    }
  })
})
```

## Comparison: Node.js vs Express

| Feature | Node.js http | Express |
|---------|-------------|---------|
| Server creation | `http.createServer()` | `express()` |
| Route handling | Manual URL parsing | `app.get()`, `app.post()` |
| Response helpers | `res.writeHead()`, `res.end()` | `res.send()`, `res.json()` |
| Middleware | Manual chaining | `app.use()` |
| Body parsing | Stream handling | `express.json()` |
| Error handling | try/catch | Error middleware |

## Best Practices

1. **Always handle errors** on requests and responses
2. **Set appropriate timeouts** for production
3. **Implement graceful shutdown** for zero-downtime deploys
4. **Use keep-alive** for connection reuse
5. **Limit request body size** to prevent DoS attacks
6. **Log requests** for debugging and monitoring

## Related Modules

- [https](../https-module/) - Secure HTTP
- [events](../events-module/) - EventEmitter (http.Server extends this)
- [stream](../stream-module/) - req/res are streams
- [url](../url-module/) - URL parsing

## Next Steps

After understanding the http module:
1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md) for deeper insights
2. Test your knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Move to [https-module](../https-module/) or [events-module](../events-module/)

---

*The http module is where it all begins. Master it to truly understand Express.*
