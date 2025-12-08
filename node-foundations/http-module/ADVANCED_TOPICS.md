# HTTP Module - Advanced Topics

Advanced features of the Node.js HTTP module including WebSocket upgrades, AbortController, and HTTP status codes.

## HTTP Status Codes Reference

### Status Code Constants

```javascript
const http = require('http')

// Access all status codes
console.log(http.STATUS_CODES)
// {
//   '100': 'Continue',
//   '101': 'Switching Protocols',
//   '200': 'OK',
//   '201': 'Created',
//   '204': 'No Content',
//   '301': 'Moved Permanently',
//   '302': 'Found',
//   '304': 'Not Modified',
//   '400': 'Bad Request',
//   '401': 'Unauthorized',
//   '403': 'Forbidden',
//   '404': 'Not Found',
//   '500': 'Internal Server Error',
//   ...
// }

// Get status message
const statusMessage = http.STATUS_CODES[404]  // 'Not Found'
```

### Status Code Categories

| Range | Category | Description |
|-------|----------|-------------|
| 1xx | Informational | Request received, continuing process |
| 2xx | Success | Request successfully received/accepted |
| 3xx | Redirection | Further action needed |
| 4xx | Client Error | Request contains bad syntax |
| 5xx | Server Error | Server failed to fulfill request |

### Complete Status Code Usage

```javascript
const http = require('http')

const server = http.createServer((req, res) => {
  // 1xx Informational
  // 100 Continue - Used with Expect header
  // 101 Switching Protocols - WebSocket upgrade

  // 2xx Success
  res.statusCode = 200  // OK
  res.statusCode = 201  // Created
  res.statusCode = 202  // Accepted (async processing)
  res.statusCode = 204  // No Content

  // 3xx Redirection
  res.statusCode = 301  // Moved Permanently
  res.statusCode = 302  // Found (temporary redirect)
  res.statusCode = 304  // Not Modified (caching)
  res.statusCode = 307  // Temporary Redirect (preserve method)
  res.statusCode = 308  // Permanent Redirect (preserve method)

  // 4xx Client Error
  res.statusCode = 400  // Bad Request
  res.statusCode = 401  // Unauthorized
  res.statusCode = 403  // Forbidden
  res.statusCode = 404  // Not Found
  res.statusCode = 405  // Method Not Allowed
  res.statusCode = 408  // Request Timeout
  res.statusCode = 409  // Conflict
  res.statusCode = 413  // Payload Too Large
  res.statusCode = 422  // Unprocessable Entity
  res.statusCode = 429  // Too Many Requests

  // 5xx Server Error
  res.statusCode = 500  // Internal Server Error
  res.statusCode = 501  // Not Implemented
  res.statusCode = 502  // Bad Gateway
  res.statusCode = 503  // Service Unavailable
  res.statusCode = 504  // Gateway Timeout
})
```

## Connection Upgrade Handling

### WebSocket Upgrade

```javascript
const http = require('http')
const crypto = require('crypto')

const server = http.createServer((req, res) => {
  res.writeHead(200)
  res.end('HTTP Server')
})

// Handle upgrade event for WebSocket connections
server.on('upgrade', (req, socket, head) => {
  // Verify WebSocket upgrade request
  if (req.headers['upgrade'] !== 'websocket') {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
    return
  }

  // Get WebSocket key
  const key = req.headers['sec-websocket-key']
  if (!key) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
    return
  }

  // Generate accept key (WebSocket handshake)
  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
  const acceptKey = crypto
    .createHash('sha1')
    .update(key + GUID)
    .digest('base64')

  // Send upgrade response
  const response = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    '',
    ''
  ].join('\r\n')

  socket.write(response)

  // Handle WebSocket frames
  socket.on('data', (buffer) => {
    const message = decodeWebSocketFrame(buffer)
    console.log('Received:', message)

    // Echo back
    const frame = encodeWebSocketFrame('Echo: ' + message)
    socket.write(frame)
  })

  socket.on('close', () => {
    console.log('WebSocket connection closed')
  })

  socket.on('error', (err) => {
    console.error('WebSocket error:', err)
  })
})

// Simplified WebSocket frame decoder (text frames only)
function decodeWebSocketFrame(buffer) {
  const secondByte = buffer[1]
  const isMasked = (secondByte & 0x80) !== 0
  let payloadLength = secondByte & 0x7f

  let offset = 2

  if (payloadLength === 126) {
    payloadLength = buffer.readUInt16BE(2)
    offset = 4
  } else if (payloadLength === 127) {
    payloadLength = Number(buffer.readBigUInt64BE(2))
    offset = 10
  }

  let payload = Buffer.alloc(payloadLength)

  if (isMasked) {
    const mask = buffer.slice(offset, offset + 4)
    offset += 4

    for (let i = 0; i < payloadLength; i++) {
      payload[i] = buffer[offset + i] ^ mask[i % 4]
    }
  } else {
    payload = buffer.slice(offset, offset + payloadLength)
  }

  return payload.toString('utf8')
}

// Simplified WebSocket frame encoder
function encodeWebSocketFrame(message) {
  const payload = Buffer.from(message)
  const length = payload.length

  let frame

  if (length < 126) {
    frame = Buffer.alloc(2 + length)
    frame[0] = 0x81  // FIN + text frame
    frame[1] = length
    payload.copy(frame, 2)
  } else if (length < 65536) {
    frame = Buffer.alloc(4 + length)
    frame[0] = 0x81
    frame[1] = 126
    frame.writeUInt16BE(length, 2)
    payload.copy(frame, 4)
  } else {
    frame = Buffer.alloc(10 + length)
    frame[0] = 0x81
    frame[1] = 127
    frame.writeBigUInt64BE(BigInt(length), 2)
    payload.copy(frame, 10)
  }

  return frame
}

server.listen(3000)
```

### HTTP/2 Upgrade

```javascript
const http = require('http')
const http2 = require('http2')

// Create HTTP/1.1 server with HTTP/2 upgrade
const server = http.createServer((req, res) => {
  res.writeHead(200)
  res.end('HTTP/1.1 Response')
})

server.on('upgrade', (req, socket, head) => {
  if (req.headers['upgrade'] === 'h2c') {
    // HTTP/2 cleartext upgrade
    // Note: Most browsers require HTTPS for HTTP/2
    console.log('HTTP/2 upgrade requested')
  }
})

// For proper HTTP/2, use http2 module with HTTPS
const http2Server = http2.createSecureServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
})

http2Server.on('stream', (stream, headers) => {
  stream.respond({ ':status': 200 })
  stream.end('HTTP/2 Response')
})
```

### Custom Protocol Upgrade

```javascript
const http = require('http')

const server = http.createServer()

server.on('upgrade', (req, socket, head) => {
  const protocol = req.headers['upgrade']

  switch (protocol) {
    case 'websocket':
      handleWebSocket(req, socket, head)
      break

    case 'custom-protocol':
      handleCustomProtocol(req, socket, head)
      break

    default:
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
  }
})

function handleCustomProtocol(req, socket, head) {
  // Send upgrade response
  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: custom-protocol',
    'Connection: Upgrade',
    '',
    ''
  ].join('\r\n'))

  // Now socket communicates with custom protocol
  socket.on('data', (data) => {
    // Handle custom protocol data
    console.log('Custom protocol data:', data)
  })
}

server.listen(3000)
```

## AbortController Integration

### Basic Request Cancellation

```javascript
const http = require('http')

// Create AbortController
const controller = new AbortController()
const { signal } = controller

const options = {
  hostname: 'api.example.com',
  port: 80,
  path: '/data',
  method: 'GET',
  signal: signal  // Pass abort signal
}

const req = http.request(options, (res) => {
  let data = ''
  res.on('data', chunk => data += chunk)
  res.on('end', () => console.log('Response:', data))
})

req.on('error', (err) => {
  if (err.name === 'AbortError') {
    console.log('Request was aborted')
  } else {
    console.error('Request error:', err)
  }
})

req.end()

// Abort after 5 seconds
setTimeout(() => {
  controller.abort()
}, 5000)
```

### Timeout with AbortController

```javascript
const http = require('http')

function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController()
  const { signal } = controller

  // Set timeout to abort request
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeout)

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)

    const req = http.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers,
      signal: signal
    }, (res) => {
      clearTimeout(timeoutId)

      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        })
      })
    })

    req.on('error', (err) => {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        reject(new Error(`Request timeout after ${timeout}ms`))
      } else {
        reject(err)
      }
    })

    if (options.body) {
      req.write(options.body)
    }

    req.end()
  })
}

// Usage
async function main() {
  try {
    const response = await fetchWithTimeout(
      'http://api.example.com/data',
      { method: 'GET' },
      3000  // 3 second timeout
    )
    console.log(response)
  } catch (err) {
    console.error('Failed:', err.message)
  }
}
```

### Aborting Multiple Requests

```javascript
const http = require('http')

async function fetchMultiple(urls, timeout = 10000) {
  const controller = new AbortController()
  const { signal } = controller

  // Abort all requests after timeout
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeout)

  const requests = urls.map(url => {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url)

      const req = http.request({
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: parsedUrl.pathname,
        signal: signal
      }, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => resolve({ url, data }))
      })

      req.on('error', (err) => {
        reject({ url, error: err })
      })

      req.end()
    })
  })

  try {
    const results = await Promise.all(requests)
    clearTimeout(timeoutId)
    return results
  } catch (err) {
    clearTimeout(timeoutId)
    controller.abort()  // Abort remaining requests
    throw err
  }
}

// Race pattern - return first successful response
async function fetchRace(urls, timeout = 5000) {
  const controller = new AbortController()
  const { signal } = controller

  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeout)

  const requests = urls.map(url => {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url)

      const req = http.request({
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname,
        signal: signal
      }, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          controller.abort()  // Abort other requests
          resolve({ url, data })
        })
      })

      req.on('error', reject)
      req.end()
    })
  })

  try {
    const result = await Promise.race(requests)
    clearTimeout(timeoutId)
    return result
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}
```

### Server-Side Abort Handling

```javascript
const http = require('http')

const server = http.createServer((req, res) => {
  // Check if request was aborted
  req.on('aborted', () => {
    console.log('Request aborted by client')
    // Clean up any resources
  })

  // For long-running operations
  const controller = new AbortController()

  // Abort internal operations if client disconnects
  req.on('close', () => {
    if (!res.writableFinished) {
      controller.abort()
    }
  })

  // Use signal in async operations
  performLongOperation(controller.signal)
    .then(result => {
      if (!req.aborted && !res.headersSent) {
        res.writeHead(200)
        res.end(JSON.stringify(result))
      }
    })
    .catch(err => {
      if (err.name !== 'AbortError') {
        console.error('Operation error:', err)
      }
    })
})

async function performLongOperation(signal) {
  // Check signal before expensive operations
  if (signal.aborted) {
    throw new Error('Operation aborted')
  }

  // Periodically check during long operations
  for (let i = 0; i < 100; i++) {
    if (signal.aborted) {
      throw new DOMException('Operation aborted', 'AbortError')
    }
    await doWork(i)
  }

  return { success: true }
}

server.listen(3000)
```

## HTTP Agent Configuration

### Custom Agent

```javascript
const http = require('http')

// Create custom agent
const agent = new http.Agent({
  keepAlive: true,           // Keep connections alive
  keepAliveMsecs: 1000,      // Initial delay for keep-alive packets
  maxSockets: 50,            // Max sockets per host
  maxTotalSockets: 100,      // Max total sockets
  maxFreeSockets: 10,        // Max free sockets to keep
  timeout: 60000,            // Socket timeout
  scheduling: 'fifo'         // 'fifo' or 'lifo'
})

// Use agent
const options = {
  hostname: 'api.example.com',
  port: 80,
  path: '/data',
  agent: agent
}

http.get(options, (res) => {
  // Handle response
})

// Monitor agent status
console.log('Sockets:', agent.sockets)
console.log('Free sockets:', agent.freeSockets)
console.log('Requests:', agent.requests)

// Destroy agent when done
agent.destroy()
```

### Global Agent Configuration

```javascript
const http = require('http')

// Configure global agent
http.globalAgent.maxSockets = 50
http.globalAgent.maxFreeSockets = 10
http.globalAgent.keepAlive = true

// Or disable global agent (one socket per request)
const options = {
  hostname: 'api.example.com',
  agent: false  // Create new socket for each request
}
```

## Server Configuration

### Advanced Server Settings

```javascript
const http = require('http')

const server = http.createServer()

// Timeout settings
server.timeout = 120000              // Request timeout (2 min)
server.keepAliveTimeout = 5000       // Keep-alive timeout (5s)
server.headersTimeout = 60000        // Headers timeout (1 min)
server.requestTimeout = 300000       // Total request timeout (5 min)

// Connection limits
server.maxConnections = 1000
server.maxHeadersCount = 2000

// Check if server has connections
server.getConnections((err, count) => {
  console.log('Active connections:', count)
})

// Close server gracefully
server.close((err) => {
  console.log('Server closed')
})

// Force close all connections
server.closeAllConnections()

// Close idle connections (keep-alive)
server.closeIdleConnections()
```

### Request and Response Timeouts

```javascript
const http = require('http')

const server = http.createServer((req, res) => {
  // Request-specific timeout
  req.setTimeout(30000, () => {
    res.writeHead(408, { 'Content-Type': 'text/plain' })
    res.end('Request Timeout')
  })

  // Response-specific timeout
  res.setTimeout(60000, () => {
    // Connection will be destroyed
    console.log('Response timeout')
  })

  // Handle the request
  handleRequest(req, res)
})

server.listen(3000)
```

## HTTP Methods Reference

```javascript
const http = require('http')

// All standard HTTP methods
console.log(http.METHODS)
// [
//   'ACL', 'BIND', 'CHECKOUT', 'CONNECT', 'COPY', 'DELETE',
//   'GET', 'HEAD', 'LINK', 'LOCK', 'M-SEARCH', 'MERGE',
//   'MKACTIVITY', 'MKCALENDAR', 'MKCOL', 'MOVE', 'NOTIFY',
//   'OPTIONS', 'PATCH', 'POST', 'PROPFIND', 'PROPPATCH',
//   'PURGE', 'PUT', 'REBIND', 'REPORT', 'SEARCH', 'SOURCE',
//   'SUBSCRIBE', 'TRACE', 'UNBIND', 'UNLINK', 'UNLOCK',
//   'UNSUBSCRIBE'
// ]

// Common methods in Express
const commonMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']
```

## Trailer Headers

```javascript
const http = require('http')

const server = http.createServer((req, res) => {
  // Announce trailer headers
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Transfer-Encoding': 'chunked',
    'Trailer': 'Content-MD5, X-Checksum'
  })

  // Write chunked body
  res.write('Hello ')
  res.write('World')

  // Add trailer headers after body
  res.addTrailers({
    'Content-MD5': 'Q2hlY2sgSW50ZWdyaXR5',
    'X-Checksum': 'abc123'
  })

  res.end()
})

server.listen(3000)
```

## Information Responses (1xx)

```javascript
const http = require('http')

const server = http.createServer((req, res) => {
  // Check for Expect: 100-continue header
  // Node.js handles this automatically by default

  // To manually handle 100-continue
  // (disable automatic handling first)
})

// Disable automatic 100-continue
server.on('checkContinue', (req, res) => {
  // Check if we want to accept the body
  const contentLength = parseInt(req.headers['content-length'] || '0')

  if (contentLength > 1024 * 1024 * 10) {  // 10MB limit
    res.writeHead(413)  // Payload Too Large
    res.end('Request entity too large')
    return
  }

  // Accept - send 100 Continue
  res.writeContinue()

  // Now handle request normally
  let body = ''
  req.on('data', chunk => body += chunk)
  req.on('end', () => {
    res.writeHead(200)
    res.end('Received: ' + body)
  })
})

server.listen(3000)
```

## Express Integration with Advanced Features

```javascript
const express = require('express')
const http = require('http')

const app = express()
const server = http.createServer(app)

// Access server for advanced configuration
server.timeout = 120000
server.keepAliveTimeout = 5000

// Handle WebSocket upgrades alongside Express
server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws') {
    handleWebSocket(req, socket, head)
  } else {
    socket.destroy()
  }
})

// Express routes
app.get('/', (req, res) => {
  res.send('HTTP Response')
})

// Monitor connections
setInterval(() => {
  server.getConnections((err, count) => {
    if (!err) {
      console.log(`Active connections: ${count}`)
    }
  })
}, 60000)

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })

  // Close idle connections immediately
  server.closeIdleConnections()

  // Force close after timeout
  setTimeout(() => {
    server.closeAllConnections()
    process.exit(1)
  }, 30000)
})

server.listen(3000)
```

## Related Topics

- [HTTPS Module Advanced](../https-module/ADVANCED_TOPICS.md)
- [Stream Module](../stream-module/README.md)
- [Events Module](../events-module/README.md)
