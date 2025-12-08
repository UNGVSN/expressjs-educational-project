# HTTP Module Questions

Test your understanding of the Node.js `http` module with these questions ranging from beginner to advanced levels.

---

## Conceptual Questions

### Beginner

**Q1: What is the primary purpose of the `http` module?**

<details>
<summary>Answer</summary>

The `http` module provides functionality to:
1. Create HTTP servers that listen for and respond to requests
2. Make HTTP client requests to other servers

It's the foundation for all web applications in Node.js, including Express.js.

```javascript
const http = require('http')

// Server
const server = http.createServer((req, res) => {
  res.end('Hello')
})

// Client
http.get('http://example.com', (res) => {
  // Handle response
})
```
</details>

---

**Q2: What are the two main parameters passed to the request handler callback?**

<details>
<summary>Answer</summary>

1. **`req` (http.IncomingMessage)** - Represents the incoming HTTP request
   - Contains: method, url, headers, httpVersion
   - Is a Readable Stream (for request body)

2. **`res` (http.ServerResponse)** - Represents the outgoing HTTP response
   - Methods: writeHead(), setHeader(), write(), end()
   - Is a Writable Stream

```javascript
http.createServer((req, res) => {
  console.log(req.method)  // GET, POST, etc.
  console.log(req.url)     // /path?query=value
  res.end('Response body')
})
```
</details>

---

**Q3: What's the difference between `res.write()` and `res.end()`?**

<details>
<summary>Answer</summary>

| Method | Purpose | Can be called |
|--------|---------|---------------|
| `res.write(chunk)` | Send a chunk of the response body | Multiple times |
| `res.end([data])` | Signal that response is complete | Once |

```javascript
// Using write() for multiple chunks
res.write('Hello ')
res.write('World')
res.end() // Must call to complete response

// Using end() with data (shorthand)
res.end('Hello World') // Write and end in one call
```

**Important**: After calling `res.end()`, you cannot write more data.
</details>

---

### Intermediate

**Q4: Why does the request body need to be collected using events instead of being directly available?**

<details>
<summary>Answer</summary>

Request bodies are **streams**, not buffered data, because:

1. **Memory efficiency** - Large uploads don't overwhelm server memory
2. **Speed** - Can start processing before entire body arrives
3. **Backpressure** - System can slow down fast senders

```javascript
// Request body arrives in chunks
http.createServer((req, res) => {
  // WRONG: req.body doesn't exist
  console.log(req.body) // undefined

  // RIGHT: Collect chunks from stream
  const chunks = []
  req.on('data', chunk => chunks.push(chunk))
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString()
    console.log(body) // Now we have complete body
    res.end('Received')
  })
})
```

Express's `express.json()` middleware abstracts this complexity.
</details>

---

**Q5: What happens if you try to set headers after calling `res.write()` or `res.end()`?**

<details>
<summary>Answer</summary>

You'll get an error: **"Cannot set headers after they are sent to the client"**

HTTP requires headers to be sent before the body. Once body transmission begins, headers are already sent.

```javascript
http.createServer((req, res) => {
  res.write('Starting response')  // Headers sent here

  // ERROR: Cannot modify headers now
  res.setHeader('X-Custom', 'value')  // Throws Error

  res.end()
})
```

**Solution**: Always set headers before writing body:

```javascript
http.createServer((req, res) => {
  res.setHeader('X-Custom', 'value')  // Set headers first
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.write('Starting response')
  res.end()
})
```
</details>

---

**Q6: What class does `http.Server` extend, and why is this significant?**

<details>
<summary>Answer</summary>

`http.Server` extends `EventEmitter` (via `net.Server`).

This is significant because it enables the event-driven pattern:

```javascript
const server = http.createServer()

// These events are available because Server extends EventEmitter
server.on('request', (req, res) => {
  res.end('Hello')
})

server.on('connection', (socket) => {
  console.log('New TCP connection')
})

server.on('error', (err) => {
  console.error('Server error:', err)
})

server.on('listening', () => {
  console.log('Server started')
})

server.on('close', () => {
  console.log('Server stopped')
})

server.listen(3000)
```

This pattern allows decoupled, flexible event handling.
</details>

---

### Advanced

**Q7: Explain the relationship between Keep-Alive connections and the `connection` event.**

<details>
<summary>Answer</summary>

With Keep-Alive (HTTP/1.1 default), a single TCP connection can handle multiple requests:

```javascript
const server = http.createServer((req, res) => {
  // Called for EACH request
  console.log('Request received')
  res.end('OK')
})

server.on('connection', (socket) => {
  // Called once per TCP CONNECTION (not per request)
  console.log('New connection established')
})

server.listen(3000)
```

**Timeline with Keep-Alive:**
```
Client                           Server
   |                                |
   |---- TCP Connect -------------->| connection event fires
   |                                |
   |---- Request 1 ---------------->| request handler called
   |<--- Response 1 ----------------|
   |                                |
   |---- Request 2 ---------------->| request handler called (no new connection event)
   |<--- Response 2 ----------------|
   |                                |
   |    (keepAliveTimeout)          |
   |<--- Connection Close ----------| close event on socket
```

Configure with `server.keepAliveTimeout = 5000` (milliseconds).
</details>

---

**Q8: How would you implement request body size limiting using the raw http module?**

<details>
<summary>Answer</summary>

```javascript
const http = require('http')
const MAX_SIZE = 1024 * 1024 // 1MB

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let bodySize = 0

    req.on('data', (chunk) => {
      bodySize += chunk.length

      if (bodySize > MAX_SIZE) {
        // Stop accepting more data
        req.destroy()

        // Respond with 413 Payload Too Large
        res.writeHead(413, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          error: 'Request body too large',
          maxSize: MAX_SIZE
        }))
      }
    })

    req.on('end', () => {
      if (bodySize <= MAX_SIZE) {
        res.writeHead(200)
        res.end('OK')
      }
    })
  }
})

// Express equivalent:
// app.use(express.json({ limit: '1mb' }))
```
</details>

---

**Q9: What is "backpressure" in the context of HTTP responses, and how do you handle it?**

<details>
<summary>Answer</summary>

**Backpressure** occurs when you're writing data faster than the client can receive it. The internal buffer fills up, and `res.write()` returns `false`.

```javascript
const http = require('http')

http.createServer((req, res) => {
  const largeData = generateLargeData() // Array of chunks

  function writeNext(index) {
    if (index >= largeData.length) {
      res.end()
      return
    }

    const chunk = largeData[index]
    const canContinue = res.write(chunk)

    if (canContinue) {
      // Buffer has space, continue immediately
      writeNext(index + 1)
    } else {
      // Buffer full, wait for drain
      res.once('drain', () => {
        writeNext(index + 1)
      })
    }
  }

  writeNext(0)
}).listen(3000)

// Better: Use pipe() which handles backpressure automatically
http.createServer((req, res) => {
  const readStream = fs.createReadStream('large-file.txt')
  readStream.pipe(res) // Automatic backpressure handling
}).listen(3000)
```
</details>

---

## Code Analysis Questions

**Q10: What's wrong with this code?**

```javascript
const http = require('http')

http.createServer((req, res) => {
  if (req.url === '/api/users') {
    const users = getUsers() // Async function
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(users))
  }
}).listen(3000)
```

<details>
<summary>Answer</summary>

`getUsers()` is async but not being awaited. This will send `undefined` or a Promise object.

**Fixed version:**

```javascript
const http = require('http')

http.createServer(async (req, res) => {
  if (req.url === '/api/users') {
    try {
      const users = await getUsers()  // Await the async function
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(users))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal Server Error' }))
    }
  }
}).listen(3000)
```

**Note**: Always wrap async handlers in try/catch - uncaught errors won't be handled automatically.
</details>

---

**Q11: Identify the memory leak in this code:**

```javascript
const http = require('http')

const requestLog = []

http.createServer((req, res) => {
  requestLog.push({
    method: req.method,
    url: req.url,
    timestamp: new Date(),
    headers: req.headers
  })

  res.end('OK')
}).listen(3000)
```

<details>
<summary>Answer</summary>

The `requestLog` array grows indefinitely with every request, eventually consuming all memory.

**Solutions:**

```javascript
// Solution 1: Limit array size
const MAX_LOG_SIZE = 1000

http.createServer((req, res) => {
  requestLog.push({ method: req.method, url: req.url, timestamp: new Date() })

  // Remove oldest entries
  if (requestLog.length > MAX_LOG_SIZE) {
    requestLog.shift()
  }

  res.end('OK')
}).listen(3000)

// Solution 2: Use external storage (database, file, logging service)

// Solution 3: Periodic cleanup
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000)
  const recentLogs = requestLog.filter(log => log.timestamp > oneHourAgo)
  requestLog.length = 0
  requestLog.push(...recentLogs)
}, 60000)
```
</details>

---

**Q12: What will this code output, and why?**

```javascript
const http = require('http')

const server = http.createServer((req, res) => {
  console.log('Request handler')
  res.end('Hello')
})

server.on('request', (req, res) => {
  console.log('Request event')
})

server.listen(3000, () => {
  console.log('Listening')
})
```

When a request comes in, what order do the console.logs appear?

<details>
<summary>Answer</summary>

**Output:**
```
Listening
Request event
Request handler
```

**Explanation:**

1. `Listening` - Printed when server starts
2. `Request event` - The 'request' event listener fires first
3. `Request handler` - The callback passed to `createServer()` is actually added as a 'request' event listener, but it's added AFTER our custom listener

The callback in `createServer(callback)` is equivalent to:
```javascript
const server = http.createServer()
server.on('request', callback)
```

Event listeners are called in the order they were added.
</details>

---

## Practical Implementation Questions

**Q13: Implement a simple HTTP server that:**
- Serves "Hello World" on GET /
- Returns JSON { "status": "ok" } on GET /health
- Returns 404 for all other routes
- Has proper Content-Type headers

<details>
<summary>Answer</summary>

```javascript
const http = require('http')

const server = http.createServer((req, res) => {
  const { method, url } = req

  // GET /
  if (method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Hello World')
    return
  }

  // GET /health
  if (method === 'GET' && url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok' }))
    return
  }

  // 404 for everything else
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not Found' }))
})

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
```
</details>

---

**Q14: Implement a POST endpoint that:**
- Accepts JSON body
- Validates that "name" field exists
- Returns the data back with an added "id" field
- Handles JSON parse errors

<details>
<summary>Answer</summary>

```javascript
const http = require('http')

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/users') {
    const chunks = []

    req.on('data', chunk => chunks.push(chunk))

    req.on('end', () => {
      const body = Buffer.concat(chunks).toString()

      // Parse JSON
      let data
      try {
        data = JSON.parse(body)
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
        return
      }

      // Validate required field
      if (!data.name) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Name is required' }))
        return
      }

      // Add ID and return
      const user = {
        id: Date.now(),
        ...data
      }

      res.writeHead(201, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(user))
    })

    req.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal Server Error' }))
    })

    return
  }

  res.writeHead(404)
  res.end('Not Found')
})

server.listen(3000)
```
</details>

---

**Q15: Implement graceful shutdown for an HTTP server that:**
- Stops accepting new connections on SIGTERM
- Waits for existing requests to complete
- Force closes after 30 seconds

<details>
<summary>Answer</summary>

```javascript
const http = require('http')

const server = http.createServer((req, res) => {
  // Simulate slow request
  setTimeout(() => {
    res.end('Hello World')
  }, 5000)
})

server.listen(3000, () => {
  console.log('Server running on port 3000')
})

// Track active connections
const connections = new Set()

server.on('connection', (socket) => {
  connections.add(socket)
  socket.on('close', () => connections.delete(socket))
})

// Graceful shutdown
function shutdown() {
  console.log('Shutting down gracefully...')

  // Stop accepting new connections
  server.close(() => {
    console.log('All connections closed. Exiting.')
    process.exit(0)
  })

  // Set force-close timeout
  const forceCloseTimeout = setTimeout(() => {
    console.error('Forcing shutdown after timeout')
    connections.forEach(socket => socket.destroy())
    process.exit(1)
  }, 30000)

  // Don't keep process alive just for timeout
  forceCloseTimeout.unref()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```
</details>

---

## Express Connection Questions

**Q16: How does `app.listen(3000)` relate to the http module?**

<details>
<summary>Answer</summary>

`app.listen()` is a convenience method that creates an `http.Server` internally:

```javascript
// Express source (simplified)
app.listen = function listen() {
  const server = http.createServer(this)
  return server.listen.apply(server, arguments)
}

// So these are equivalent:
app.listen(3000)

// Is the same as:
http.createServer(app).listen(3000)
```

The Express `app` is a function with signature `(req, res, next)` that can be passed directly to `http.createServer()`.
</details>

---

**Q17: How does Express's `res.send()` build on the http module's `res.end()`?**

<details>
<summary>Answer</summary>

`res.send()` is a wrapper around `res.end()` that adds convenience:

```javascript
// Simplified Express res.send()
res.send = function(body) {
  // 1. Detect content type
  if (typeof body === 'object') {
    // Convert to JSON
    body = JSON.stringify(body)
    if (!this.get('Content-Type')) {
      this.set('Content-Type', 'application/json')
    }
  } else if (typeof body === 'string') {
    if (!this.get('Content-Type')) {
      this.set('Content-Type', 'text/html')
    }
  }

  // 2. Set Content-Length
  this.set('Content-Length', Buffer.byteLength(body))

  // 3. Handle HEAD requests (send headers only)
  if (this.req.method === 'HEAD') {
    this.end()
  } else {
    this.end(body)  // Calls http's res.end()
  }

  return this
}
```

**Native http:**
```javascript
res.writeHead(200, {
  'Content-Type': 'application/json',
  'Content-Length': Buffer.byteLength(JSON.stringify(data))
})
res.end(JSON.stringify(data))
```

**Express:**
```javascript
res.send(data)  // Handles all of the above
```
</details>

---

## Self-Assessment Checklist

Use this checklist to assess your understanding:

- [ ] I can create a basic HTTP server with `http.createServer()`
- [ ] I understand the `req` (IncomingMessage) and `res` (ServerResponse) objects
- [ ] I can handle POST request bodies using stream events
- [ ] I understand why headers must be set before the response body
- [ ] I know the difference between `res.write()` and `res.end()`
- [ ] I can explain how Express builds on the http module
- [ ] I can implement basic routing without Express
- [ ] I understand Keep-Alive connections and timeouts
- [ ] I can handle server and request errors properly
- [ ] I can implement graceful shutdown
- [ ] I understand backpressure and how to handle it
- [ ] I can explain the event-driven nature of http.Server

---

## Next Steps

After mastering these concepts:
1. Move to [HTTPS Module](../https-module/) for secure connections
2. Study [Events Module](../events-module/) to deepen EventEmitter understanding
3. Learn [Stream Module](../stream-module/) for efficient data handling

---

*Understanding the http module thoroughly prepares you for advanced Express.js development.*
