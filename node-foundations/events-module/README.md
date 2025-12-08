# Events Module

The `events` module provides the `EventEmitter` class, which is the foundation of Node.js's event-driven architecture. Understanding events is crucial because nearly everything in Node.js—servers, streams, and Express itself—is built on EventEmitter.

## Overview

The EventEmitter pattern allows objects to emit named events that cause listener functions to be called. This enables loose coupling between components and is fundamental to Node.js's asynchronous programming model.

## Express Connection

```javascript
// Express Application extends EventEmitter
const express = require('express')
const app = express()

// app emits events
app.on('mount', (parent) => {
  console.log('App mounted on parent')
})

// http.Server (from app.listen) is an EventEmitter
const server = app.listen(3000)

server.on('listening', () => {
  console.log('Server started')
})

server.on('error', (err) => {
  console.error('Server error:', err)
})

server.on('close', () => {
  console.log('Server closed')
})
```

## Core Concepts

### Creating an EventEmitter

```javascript
const EventEmitter = require('events')

// Create instance
const emitter = new EventEmitter()

// Add listener
emitter.on('event', () => {
  console.log('Event fired!')
})

// Emit event
emitter.emit('event')  // Output: Event fired!
```

### Class-Based EventEmitter

```javascript
const EventEmitter = require('events')

class MyServer extends EventEmitter {
  constructor() {
    super()
    this.connections = []
  }

  addConnection(conn) {
    this.connections.push(conn)
    this.emit('connection', conn)
  }

  removeConnection(conn) {
    const index = this.connections.indexOf(conn)
    if (index !== -1) {
      this.connections.splice(index, 1)
      this.emit('disconnect', conn)
    }
  }
}

const server = new MyServer()

server.on('connection', (conn) => {
  console.log('New connection:', conn.id)
})

server.on('disconnect', (conn) => {
  console.log('Disconnected:', conn.id)
})

server.addConnection({ id: 1 })
server.removeConnection({ id: 1 })
```

## EventEmitter Methods

### Adding Listeners

```javascript
const EventEmitter = require('events')
const emitter = new EventEmitter()

// on() - Add persistent listener
emitter.on('data', (chunk) => {
  console.log('Received:', chunk)
})

// once() - Add one-time listener
emitter.once('connect', () => {
  console.log('Connected (only fires once)')
})

// addListener() - Alias for on()
emitter.addListener('data', callback)

// prependListener() - Add to beginning of listener array
emitter.prependListener('data', callback)

// prependOnceListener() - Add one-time listener to beginning
emitter.prependOnceListener('data', callback)
```

### Removing Listeners

```javascript
function handler(data) {
  console.log(data)
}

// Add listener
emitter.on('data', handler)

// Remove specific listener
emitter.off('data', handler)
// or
emitter.removeListener('data', handler)

// Remove all listeners for event
emitter.removeAllListeners('data')

// Remove all listeners for all events
emitter.removeAllListeners()
```

### Emitting Events

```javascript
const emitter = new EventEmitter()

// Basic emit
emitter.emit('event')

// Emit with arguments
emitter.emit('data', 'Hello', 'World')

// Listener receives arguments
emitter.on('data', (arg1, arg2) => {
  console.log(arg1, arg2)  // Hello World
})

// emit() returns boolean indicating if listeners exist
const hasListeners = emitter.emit('event')
```

### Inspecting Listeners

```javascript
const emitter = new EventEmitter()

emitter.on('data', () => {})
emitter.on('data', () => {})
emitter.on('error', () => {})

// Count listeners for event
emitter.listenerCount('data')  // 2

// Get array of listener functions
emitter.listeners('data')  // [Function, Function]

// Get array of event names with listeners
emitter.eventNames()  // ['data', 'error']

// Get raw listeners (includes once() wrappers)
emitter.rawListeners('data')
```

## Event Patterns

### Error Events

Error events are special—if no listener exists, Node.js throws the error:

```javascript
const emitter = new EventEmitter()

// WITHOUT error listener - crashes process
emitter.emit('error', new Error('Something went wrong'))
// Error: Something went wrong (unhandled)

// WITH error listener - handled gracefully
emitter.on('error', (err) => {
  console.error('Handled:', err.message)
})
emitter.emit('error', new Error('Something went wrong'))
// Output: Handled: Something went wrong
```

### Async Event Handlers

```javascript
const emitter = new EventEmitter()

// Handlers are called synchronously
emitter.on('sync', () => {
  console.log('1')
})
emitter.on('sync', () => {
  console.log('2')
})
console.log('before')
emitter.emit('sync')
console.log('after')
// Output: before, 1, 2, after

// For async handling, use setImmediate or process.nextTick
emitter.on('async', () => {
  setImmediate(() => {
    console.log('Async handler')
  })
})
```

### Passing Context (this)

```javascript
const emitter = new EventEmitter()

// Regular function - this is the emitter
emitter.on('event', function() {
  console.log(this === emitter)  // true
})

// Arrow function - this is lexical
emitter.on('event', () => {
  console.log(this === emitter)  // false
})

// Bind context explicitly
const obj = { name: 'MyObject' }
emitter.on('event', function() {
  console.log(this.name)
}.bind(obj))
```

### Maximum Listeners

```javascript
const emitter = new EventEmitter()

// Default maximum is 10 listeners per event
emitter.setMaxListeners(20)

// Get current maximum
emitter.getMaxListeners()  // 20

// Set to Infinity (no warning)
emitter.setMaxListeners(Infinity)

// Set default for all emitters
EventEmitter.defaultMaxListeners = 15
```

## Real-World Patterns

### Request/Response Pattern

```javascript
const EventEmitter = require('events')

class RequestHandler extends EventEmitter {
  handleRequest(req) {
    this.emit('request:start', req)

    // Simulate async processing
    setTimeout(() => {
      if (req.valid) {
        this.emit('request:success', { data: 'Response data' })
      } else {
        this.emit('request:error', new Error('Invalid request'))
      }
      this.emit('request:end', req)
    }, 100)
  }
}

const handler = new RequestHandler()

handler.on('request:start', (req) => {
  console.log('Processing request:', req.id)
})

handler.on('request:success', (res) => {
  console.log('Success:', res.data)
})

handler.on('request:error', (err) => {
  console.error('Error:', err.message)
})

handler.on('request:end', () => {
  console.log('Request complete')
})

handler.handleRequest({ id: 1, valid: true })
```

### Pub/Sub Pattern

```javascript
const EventEmitter = require('events')

class MessageBus extends EventEmitter {
  publish(channel, message) {
    this.emit(channel, message)
    this.emit('message', { channel, message })
  }

  subscribe(channel, handler) {
    this.on(channel, handler)
    return () => this.off(channel, handler)  // Return unsubscribe function
  }
}

const bus = new MessageBus()

// Subscribe to specific channel
const unsubscribe = bus.subscribe('users', (msg) => {
  console.log('Users channel:', msg)
})

// Subscribe to all messages
bus.on('message', ({ channel, message }) => {
  console.log(`[${channel}]`, message)
})

// Publish
bus.publish('users', { action: 'created', id: 1 })

// Unsubscribe
unsubscribe()
```

### State Machine Pattern

```javascript
const EventEmitter = require('events')

class Connection extends EventEmitter {
  constructor() {
    super()
    this.state = 'disconnected'
  }

  connect() {
    if (this.state !== 'disconnected') return

    this.state = 'connecting'
    this.emit('connecting')

    // Simulate connection
    setTimeout(() => {
      this.state = 'connected'
      this.emit('connected')
    }, 1000)
  }

  disconnect() {
    if (this.state !== 'connected') return

    this.state = 'disconnecting'
    this.emit('disconnecting')

    setTimeout(() => {
      this.state = 'disconnected'
      this.emit('disconnected')
    }, 500)
  }
}

const conn = new Connection()

conn.on('connecting', () => console.log('Connecting...'))
conn.on('connected', () => console.log('Connected!'))
conn.on('disconnecting', () => console.log('Disconnecting...'))
conn.on('disconnected', () => console.log('Disconnected'))

conn.connect()
```

### Event Delegation

```javascript
const EventEmitter = require('events')

class Application extends EventEmitter {
  constructor() {
    super()
    this.modules = new Map()
  }

  registerModule(name, module) {
    this.modules.set(name, module)

    // Forward module events with namespace
    module.on('*', (event, ...args) => {
      this.emit(`${name}:${event}`, ...args)
    })
  }
}

class Module extends EventEmitter {
  emit(event, ...args) {
    // Emit wildcard for delegation
    super.emit('*', event, ...args)
    return super.emit(event, ...args)
  }
}

const app = new Application()
const userModule = new Module()

app.registerModule('users', userModule)

app.on('users:created', (user) => {
  console.log('User created:', user)
})

userModule.emit('created', { id: 1, name: 'John' })
```

## Express.js Event Usage

### Application Events

```javascript
const express = require('express')
const app = express()

// Mount event - fired when sub-app is mounted
const admin = express()
admin.on('mount', (parent) => {
  console.log('Admin mounted')
  console.log('Parent app:', parent.get('env'))
})

app.use('/admin', admin)
```

### Server Events

```javascript
const app = express()

const server = app.listen(3000)

// Listening event
server.on('listening', () => {
  const addr = server.address()
  console.log(`Server running on port ${addr.port}`)
})

// Error event
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('Port already in use')
  } else if (err.code === 'EACCES') {
    console.log('Permission denied')
  }
})

// Connection event
server.on('connection', (socket) => {
  console.log('New connection from', socket.remoteAddress)
})

// Close event
server.on('close', () => {
  console.log('Server closed')
})
```

### Request/Response Events

```javascript
const app = express()

app.get('/', (req, res) => {
  // Request events (from http.IncomingMessage)
  req.on('data', (chunk) => {
    console.log('Received chunk')
  })

  req.on('end', () => {
    console.log('Request body complete')
  })

  req.on('aborted', () => {
    console.log('Request aborted by client')
  })

  // Response events (from http.ServerResponse)
  res.on('finish', () => {
    console.log('Response sent')
  })

  res.on('close', () => {
    console.log('Connection closed')
  })

  res.send('Hello')
})
```

## Async/Await with Events

### Converting Events to Promises

```javascript
const EventEmitter = require('events')
const { once } = require('events')

const emitter = new EventEmitter()

// Using events.once() for promise-based waiting
async function waitForEvent() {
  // Wait for single event
  const [value] = await once(emitter, 'data')
  console.log('Received:', value)
}

// Start waiting
waitForEvent()

// Emit after delay
setTimeout(() => {
  emitter.emit('data', 'Hello')
}, 1000)
```

### Event Iterators (Node.js 12+)

```javascript
const { on } = require('events')
const EventEmitter = require('events')

const emitter = new EventEmitter()

// Async iteration over events
async function processEvents() {
  for await (const [event] of on(emitter, 'data')) {
    console.log('Received:', event)
    if (event === 'stop') break
  }
  console.log('Done processing')
}

processEvents()

// Emit events
emitter.emit('data', 'First')
emitter.emit('data', 'Second')
emitter.emit('data', 'stop')
```

### Error Handling with once()

```javascript
const { once } = require('events')

async function connectWithTimeout(emitter, timeout) {
  const ac = new AbortController()

  const timeoutId = setTimeout(() => {
    ac.abort()
  }, timeout)

  try {
    await once(emitter, 'connect', { signal: ac.signal })
    clearTimeout(timeoutId)
    console.log('Connected!')
  } catch (err) {
    if (err.code === 'ABORT_ERR') {
      throw new Error('Connection timeout')
    }
    throw err
  }
}
```

## Performance Considerations

### Memory Leaks

```javascript
const emitter = new EventEmitter()

// BAD: Adding listeners in loop without removal
function handleRequest(req, res) {
  emitter.on('data', (data) => {
    res.write(data)
  })
}
// Memory leak! Listeners accumulate with each request

// GOOD: Remove listeners when done
function handleRequest(req, res) {
  const handler = (data) => {
    res.write(data)
  }

  emitter.on('data', handler)

  res.on('finish', () => {
    emitter.off('data', handler)
  })
}

// Or use once() for single-use listeners
emitter.once('data', (data) => {
  res.write(data)
})
```

### Warning Detection

```javascript
const emitter = new EventEmitter()

// Node.js warns when listener count exceeds max
// (MaxListenersExceededWarning)

process.on('warning', (warning) => {
  if (warning.name === 'MaxListenersExceededWarning') {
    console.log('Potential memory leak detected')
    console.log(warning.emitter)
    console.log(warning.count)
  }
})
```

### Listener Order

```javascript
const emitter = new EventEmitter()

// Listeners are called in order added
emitter.on('event', () => console.log('First'))
emitter.on('event', () => console.log('Second'))
emitter.emit('event')
// Output: First, Second

// Use prependListener to add to front
emitter.prependListener('event', () => console.log('Zero'))
emitter.emit('event')
// Output: Zero, First, Second
```

## Common Patterns in Express

### Custom Events in Middleware

```javascript
const express = require('express')
const EventEmitter = require('events')

const app = express()
const events = new EventEmitter()

// Attach to app
app.events = events

// Emit events in middleware
app.use((req, res, next) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    app.events.emit('request:complete', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration
    })
  })

  next()
})

// Listen for custom events
app.events.on('request:complete', (data) => {
  console.log(`${data.method} ${data.url} - ${data.status} (${data.duration}ms)`)
})

app.get('/', (req, res) => {
  res.send('Hello')
})

app.listen(3000)
```

### Graceful Shutdown

```javascript
const express = require('express')
const app = express()

const server = app.listen(3000)

function gracefulShutdown() {
  console.log('Shutting down gracefully...')

  server.close(() => {
    console.log('HTTP server closed')

    // Close database connections, etc.
    // db.close()

    process.exit(0)
  })

  // Force close after timeout
  setTimeout(() => {
    console.error('Forcing shutdown')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
```

## Related Modules

- [http](../http-module/) - Uses EventEmitter for server events
- [stream](../stream-module/) - Streams extend EventEmitter
- [fs](../fs-module/) - File watchers are EventEmitters

## Next Steps

After understanding the events module:
1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md) for deeper insights
2. Test your knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Move to [stream-module](../stream-module/) for data handling

---

*The EventEmitter pattern is everywhere in Node.js. Master it to understand how Node.js and Express work internally.*
