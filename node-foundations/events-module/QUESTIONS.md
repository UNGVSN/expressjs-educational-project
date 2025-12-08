# Events Module Questions

Test your understanding of the Node.js `events` module and the EventEmitter class with these questions.

---

## Conceptual Questions

### Beginner

**Q1: What is an EventEmitter and why is it important in Node.js?**

<details>
<summary>Answer</summary>

An **EventEmitter** is a class that implements the observer (pub/sub) pattern, allowing objects to:
1. **Emit** named events
2. **Listen** for events with callback functions

**Importance:**
- Foundation of Node.js's event-driven architecture
- Used by nearly all core modules (http, stream, fs, etc.)
- Enables loose coupling between components
- Powers asynchronous patterns in Node.js

```javascript
const EventEmitter = require('events')
const emitter = new EventEmitter()

// Subscribe (listen)
emitter.on('message', (data) => {
  console.log('Received:', data)
})

// Publish (emit)
emitter.emit('message', 'Hello World')
```

**Examples in Node.js:**
- `http.Server` emits 'request', 'error', 'listening' events
- `stream.Readable` emits 'data', 'end', 'error' events
- `process` emits 'exit', 'uncaughtException' events
</details>

---

**Q2: What is the difference between `on()` and `once()`?**

<details>
<summary>Answer</summary>

| Method | Behavior |
|--------|----------|
| `on()` | Listener persists, called every time event emits |
| `once()` | Listener auto-removes after first call |

```javascript
const EventEmitter = require('events')
const emitter = new EventEmitter()

// on() - called every time
emitter.on('data', (value) => {
  console.log('on:', value)
})

// once() - called only first time
emitter.once('data', (value) => {
  console.log('once:', value)
})

emitter.emit('data', 1)
emitter.emit('data', 2)
emitter.emit('data', 3)

// Output:
// on: 1
// once: 1
// on: 2
// on: 3
```

**Use `once()` for:**
- Connection established events
- Initialization completed events
- One-time setup tasks
</details>

---

**Q3: What happens if you emit an 'error' event without a listener?**

<details>
<summary>Answer</summary>

The process **crashes** with an unhandled error.

```javascript
const EventEmitter = require('events')
const emitter = new EventEmitter()

// Without error listener - CRASHES!
emitter.emit('error', new Error('Something went wrong'))
// Error: Something went wrong
// Process exits with code 1

// With error listener - handled gracefully
emitter.on('error', (err) => {
  console.log('Handled:', err.message)
})
emitter.emit('error', new Error('Something went wrong'))
// Output: Handled: Something went wrong
```

**Why this design?**
- Forces developers to handle errors explicitly
- Prevents silent failures
- Consistent with Node.js's "crash early" philosophy

**Best practice:** Always add an error listener to EventEmitters:
```javascript
emitter.on('error', (err) => {
  console.error('Error:', err)
  // Handle or report error
})
```
</details>

---

### Intermediate

**Q4: Are event handlers called synchronously or asynchronously? Why does this matter?**

<details>
<summary>Answer</summary>

Event handlers are called **synchronously**, in the order they were registered.

```javascript
const EventEmitter = require('events')
const emitter = new EventEmitter()

emitter.on('event', () => console.log('1'))
emitter.on('event', () => console.log('2'))

console.log('before')
emitter.emit('event')
console.log('after')

// Output:
// before
// 1
// 2
// after
```

**Why it matters:**

1. **Execution order is predictable**
2. **Blocking handlers block everything**
```javascript
emitter.on('event', () => {
  // This blocks other handlers and subsequent code!
  while(true) {}
})
```

3. **Errors can be caught**
```javascript
try {
  emitter.emit('event')  // If handler throws, catch works
} catch (err) {
  console.error('Handler error:', err)
}
```

**For async behavior, explicitly defer:**
```javascript
emitter.on('event', () => {
  setImmediate(() => {
    // Async processing
  })
})
```
</details>

---

**Q5: How do you remove a specific listener from an EventEmitter?**

<details>
<summary>Answer</summary>

Use `off()` or `removeListener()` with the **same function reference**:

```javascript
const EventEmitter = require('events')
const emitter = new EventEmitter()

// Named function (can be removed)
function handler(data) {
  console.log('Received:', data)
}

emitter.on('data', handler)
emitter.emit('data', 'first')  // Works

// Remove listener
emitter.off('data', handler)
// or: emitter.removeListener('data', handler)

emitter.emit('data', 'second')  // Handler not called
```

**Common mistake - anonymous functions:**
```javascript
// BAD: Can't remove anonymous function
emitter.on('data', (data) => console.log(data))
emitter.off('data', (data) => console.log(data))  // Different reference!

// GOOD: Store reference
const handler = (data) => console.log(data)
emitter.on('data', handler)
emitter.off('data', handler)  // Same reference
```

**Remove all listeners:**
```javascript
// Remove all listeners for specific event
emitter.removeAllListeners('data')

// Remove all listeners for all events
emitter.removeAllListeners()
```
</details>

---

**Q6: What is the purpose of `emitter.setMaxListeners()` and why does the warning exist?**

<details>
<summary>Answer</summary>

**Purpose:** Sets maximum listeners per event before warning. Default is 10.

**Warning exists to detect memory leaks:**

```javascript
const EventEmitter = require('events')
const emitter = new EventEmitter()

// Adding 11+ listeners triggers warning
for (let i = 0; i < 11; i++) {
  emitter.on('data', () => {})
}
// Warning: MaxListenersExceededWarning
// Possible memory leak detected
```

**Why it matters:**

Common bug pattern:
```javascript
function handleRequest(req, res) {
  // BUG: New listener added per request, never removed!
  globalEmitter.on('broadcast', (msg) => {
    res.write(msg)
  })
}
// After 10 requests, warning appears
// Listeners keep accumulating = memory leak
```

**Proper fix:**
```javascript
function handleRequest(req, res) {
  const handler = (msg) => res.write(msg)
  globalEmitter.on('broadcast', handler)

  res.on('close', () => {
    globalEmitter.off('broadcast', handler)  // Clean up!
  })
}
```

**Adjusting the limit:**
```javascript
// Increase for valid use cases
emitter.setMaxListeners(50)

// Disable warning (use carefully)
emitter.setMaxListeners(Infinity)

// Set default for all emitters
require('events').defaultMaxListeners = 20
```
</details>

---

### Advanced

**Q7: How would you implement a simple EventEmitter from scratch?**

<details>
<summary>Answer</summary>

```javascript
class SimpleEventEmitter {
  constructor() {
    this._events = {}
  }

  on(event, listener) {
    if (!this._events[event]) {
      this._events[event] = []
    }
    this._events[event].push(listener)
    return this  // Chainable
  }

  off(event, listener) {
    if (!this._events[event]) return this

    this._events[event] = this._events[event].filter(
      l => l !== listener && l.listener !== listener
    )
    return this
  }

  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper)
      listener.apply(this, args)
    }
    wrapper.listener = listener  // For removal by original ref
    this.on(event, wrapper)
    return this
  }

  emit(event, ...args) {
    if (!this._events[event]) return false

    // Copy array to handle removal during iteration
    const listeners = [...this._events[event]]
    for (const listener of listeners) {
      listener.apply(this, args)
    }
    return true
  }

  listenerCount(event) {
    return this._events[event]?.length ?? 0
  }
}

// Usage
const emitter = new SimpleEventEmitter()

emitter.on('greet', (name) => console.log(`Hello, ${name}!`))
emitter.once('greet', (name) => console.log(`First time greeting ${name}`))

emitter.emit('greet', 'World')
emitter.emit('greet', 'Again')

// Output:
// Hello, World!
// First time greeting World
// Hello, Again!
```
</details>

---

**Q8: How do you convert event-based APIs to Promises?**

<details>
<summary>Answer</summary>

**Using `events.once()` (Node.js 12+):**
```javascript
const { once } = require('events')
const EventEmitter = require('events')

const emitter = new EventEmitter()

async function waitForData() {
  const [data] = await once(emitter, 'data')
  console.log('Received:', data)
  return data
}

// With timeout using AbortController
async function waitWithTimeout(ms) {
  const ac = new AbortController()
  const timeout = setTimeout(() => ac.abort(), ms)

  try {
    const [data] = await once(emitter, 'data', { signal: ac.signal })
    clearTimeout(timeout)
    return data
  } catch (err) {
    clearTimeout(timeout)
    if (err.code === 'ABORT_ERR') {
      throw new Error('Timeout waiting for data')
    }
    throw err
  }
}
```

**Manual promisification:**
```javascript
function waitForEvent(emitter, event) {
  return new Promise((resolve, reject) => {
    const onEvent = (data) => {
      cleanup()
      resolve(data)
    }

    const onError = (err) => {
      cleanup()
      reject(err)
    }

    const cleanup = () => {
      emitter.off(event, onEvent)
      emitter.off('error', onError)
    }

    emitter.once(event, onEvent)
    emitter.once('error', onError)
  })
}

// Usage
const data = await waitForEvent(emitter, 'data')
```

**Async iteration with `events.on()` (Node.js 12+):**
```javascript
const { on } = require('events')

async function processAllData(emitter) {
  for await (const [data] of on(emitter, 'data')) {
    console.log('Processing:', data)
    if (data === 'stop') break
  }
}
```
</details>

---

**Q9: Explain how `prependListener()` differs from `on()` and when you would use it.**

<details>
<summary>Answer</summary>

**Difference:**
- `on()` adds listener to **end** of listener array
- `prependListener()` adds to **beginning** of listener array

```javascript
const EventEmitter = require('events')
const emitter = new EventEmitter()

emitter.on('event', () => console.log('1'))
emitter.on('event', () => console.log('2'))
emitter.prependListener('event', () => console.log('0'))

emitter.emit('event')
// Output:
// 0
// 1
// 2
```

**Use cases for `prependListener()`:**

1. **Validation/interception:**
```javascript
// Add validation before other handlers
emitter.prependListener('data', (data) => {
  if (!isValid(data)) {
    throw new Error('Invalid data')
  }
})
```

2. **Logging/monitoring:**
```javascript
// Log before any processing
emitter.prependListener('request', (req) => {
  console.log('Request received:', req.url)
})
```

3. **Middleware-like behavior:**
```javascript
// Modify data before other handlers see it
emitter.prependListener('data', function(data) {
  data.timestamp = Date.now()
})
```

**Also available:**
- `prependOnceListener()` - prepend + once behavior
</details>

---

## Code Analysis Questions

**Q10: What's wrong with this code?**

```javascript
const EventEmitter = require('events')

class DataProcessor extends EventEmitter {
  process(data) {
    this.emit('start')

    setTimeout(() => {
      const result = transform(data)
      this.emit('complete', result)
    }, 1000)

    return this.result
  }
}

const processor = new DataProcessor()
processor.on('complete', (result) => {
  processor.result = result
})

const output = processor.process(input)
console.log(output)  // ???
```

<details>
<summary>Answer</summary>

**Problems:**

1. **`output` is `undefined`** - `process()` returns before async work completes
2. **Race condition** - `this.result` accessed before it's set
3. **Using object property for async result** - Anti-pattern

**What happens:**
```javascript
const output = processor.process(input)
// Returns immediately with undefined (this.result not set yet)
console.log(output)  // undefined

// 1 second later...
// 'complete' event fires
// processor.result gets set (but too late)
```

**Fixed versions:**

**Option 1: Event-based (proper pattern):**
```javascript
class DataProcessor extends EventEmitter {
  process(data) {
    this.emit('start')

    setTimeout(() => {
      const result = transform(data)
      this.emit('complete', result)
    }, 1000)

    // Don't return result - it's event-based
  }
}

const processor = new DataProcessor()
processor.on('complete', (result) => {
  console.log('Result:', result)  // Correct!
})
processor.process(input)
```

**Option 2: Promise-based:**
```javascript
class DataProcessor extends EventEmitter {
  async process(data) {
    this.emit('start')

    return new Promise((resolve) => {
      setTimeout(() => {
        const result = transform(data)
        this.emit('complete', result)
        resolve(result)
      }, 1000)
    })
  }
}

const processor = new DataProcessor()
const output = await processor.process(input)
console.log(output)  // Correct!
```
</details>

---

**Q11: Identify the memory leak in this Express middleware:**

```javascript
const EventEmitter = require('events')
const messageHub = new EventEmitter()

app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')

  messageHub.on('message', (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  })

  // Response stays open for SSE
})
```

<details>
<summary>Answer</summary>

**Memory Leak:** A new listener is added to `messageHub` for every request, but listeners are never removed.

**Problem analysis:**
```javascript
// After 100 requests:
messageHub.listenerCount('message')  // 100 listeners!
// After 1000 requests: 1000 listeners
// Listeners accumulate forever
```

**Fixed version:**
```javascript
app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')

  // Named function for removal
  const handler = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  messageHub.on('message', handler)

  // Clean up when connection closes
  req.on('close', () => {
    messageHub.off('message', handler)
    console.log('Cleaned up listener')
  })

  // Also handle client disconnect
  res.on('close', () => {
    messageHub.off('message', handler)
  })
})
```

**Alternative using once() for finite streams:**
```javascript
// If expecting single message
messageHub.once('message', (data) => {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
  res.end()
})
```
</details>

---

**Q12: What will this code output and why?**

```javascript
const EventEmitter = require('events')
const emitter = new EventEmitter()

emitter.on('test', function() {
  console.log('a:', this === emitter)
})

emitter.on('test', () => {
  console.log('b:', this === emitter)
})

emitter.emit('test')
```

<details>
<summary>Answer</summary>

**Output:**
```
a: true
b: false
```

**Explanation:**

1. **Regular function:** `this` is set to the emitter
```javascript
emitter.on('test', function() {
  console.log(this === emitter)  // true
})
```

2. **Arrow function:** `this` is lexically bound (outer scope)
```javascript
emitter.on('test', () => {
  console.log(this === emitter)  // false - 'this' is from outer scope
})
// In module scope, 'this' is {} (empty object)
// In strict mode, 'this' might be undefined
```

**When to use each:**

**Regular function** - when you need access to emitter:
```javascript
emitter.on('data', function(data) {
  this.emit('processed', transform(data))  // Works!
})
```

**Arrow function** - when you need outer scope:
```javascript
class Handler {
  constructor(emitter) {
    this.count = 0
    emitter.on('data', () => {
      this.count++  // 'this' is Handler instance
    })
  }
}
```
</details>

---

## Practical Implementation Questions

**Q13: Implement a rate limiter using EventEmitter that only allows 5 events per second.**

<details>
<summary>Answer</summary>

```javascript
const EventEmitter = require('events')

class RateLimitedEmitter extends EventEmitter {
  constructor(maxPerSecond = 5) {
    super()
    this.maxPerSecond = maxPerSecond
    this.queue = []
    this.count = 0
    this.resetInterval = null
  }

  emit(event, ...args) {
    if (event === 'error') {
      // Always emit errors immediately
      return super.emit(event, ...args)
    }

    if (this.count < this.maxPerSecond) {
      this.count++
      this.startResetTimer()
      return super.emit(event, ...args)
    } else {
      // Queue for later
      this.queue.push({ event, args })
      return true
    }
  }

  startResetTimer() {
    if (this.resetInterval) return

    this.resetInterval = setInterval(() => {
      this.count = 0

      // Process queued events
      while (this.queue.length > 0 && this.count < this.maxPerSecond) {
        const { event, args } = this.queue.shift()
        this.count++
        super.emit(event, ...args)
      }

      // Stop timer if nothing queued
      if (this.queue.length === 0) {
        clearInterval(this.resetInterval)
        this.resetInterval = null
      }
    }, 1000)
  }
}

// Usage
const emitter = new RateLimitedEmitter(5)

emitter.on('data', (num) => {
  console.log(`Received ${num} at ${Date.now()}`)
})

// Emit 20 events rapidly
for (let i = 1; i <= 20; i++) {
  emitter.emit('data', i)
}
// First 5 emit immediately
// Next 15 are queued and emitted 5 per second
```
</details>

---

**Q14: Create an EventEmitter that supports wildcard event listeners.**

<details>
<summary>Answer</summary>

```javascript
const EventEmitter = require('events')

class WildcardEmitter extends EventEmitter {
  emit(event, ...args) {
    // Call exact match listeners
    const hasExact = super.emit(event, ...args)

    // Call wildcard listeners
    const wildcardEvent = '*'
    const hasWildcard = super.emit(wildcardEvent, event, ...args)

    // Call namespace wildcards (e.g., 'user:*')
    const parts = event.split(':')
    let hasNamespace = false
    if (parts.length > 1) {
      const namespace = parts[0] + ':*'
      hasNamespace = super.emit(namespace, event, ...args)
    }

    return hasExact || hasWildcard || hasNamespace
  }
}

// Usage
const emitter = new WildcardEmitter()

// Listen to all events
emitter.on('*', (eventName, ...args) => {
  console.log(`[*] Event '${eventName}':`, args)
})

// Listen to namespace
emitter.on('user:*', (eventName, ...args) => {
  console.log(`[user:*] Event '${eventName}':`, args)
})

// Specific listener
emitter.on('user:created', (user) => {
  console.log('[user:created] User:', user)
})

emitter.emit('user:created', { id: 1, name: 'John' })
// Output:
// [user:created] User: { id: 1, name: 'John' }
// [*] Event 'user:created': [{ id: 1, name: 'John' }]
// [user:*] Event 'user:created': [{ id: 1, name: 'John' }]

emitter.emit('order:placed', { orderId: 123 })
// Output:
// [*] Event 'order:placed': [{ orderId: 123 }]
```
</details>

---

**Q15: Implement graceful shutdown using EventEmitter.**

<details>
<summary>Answer</summary>

```javascript
const EventEmitter = require('events')

class GracefulShutdown extends EventEmitter {
  constructor(options = {}) {
    super()
    this.timeout = options.timeout || 30000
    this.isShuttingDown = false
    this.resources = new Set()

    // Listen for shutdown signals
    process.on('SIGTERM', () => this.shutdown('SIGTERM'))
    process.on('SIGINT', () => this.shutdown('SIGINT'))
  }

  register(name, cleanupFn) {
    this.resources.add({ name, cleanup: cleanupFn })
    return () => this.unregister(name)
  }

  unregister(name) {
    for (const resource of this.resources) {
      if (resource.name === name) {
        this.resources.delete(resource)
        break
      }
    }
  }

  async shutdown(signal) {
    if (this.isShuttingDown) return
    this.isShuttingDown = true

    console.log(`\nReceived ${signal}, starting graceful shutdown...`)
    this.emit('shutdown:start', signal)

    // Set force-shutdown timeout
    const forceShutdown = setTimeout(() => {
      console.error('Shutdown timeout, forcing exit')
      this.emit('shutdown:timeout')
      process.exit(1)
    }, this.timeout)

    try {
      // Cleanup all resources
      const cleanups = Array.from(this.resources).map(async (resource) => {
        try {
          console.log(`Cleaning up: ${resource.name}`)
          await resource.cleanup()
          console.log(`Cleaned up: ${resource.name}`)
          this.emit('resource:cleaned', resource.name)
        } catch (err) {
          console.error(`Error cleaning ${resource.name}:`, err)
          this.emit('resource:error', resource.name, err)
        }
      })

      await Promise.all(cleanups)

      clearTimeout(forceShutdown)
      console.log('Graceful shutdown complete')
      this.emit('shutdown:complete')
      process.exit(0)
    } catch (err) {
      clearTimeout(forceShutdown)
      console.error('Shutdown error:', err)
      this.emit('shutdown:error', err)
      process.exit(1)
    }
  }
}

// Usage
const shutdown = new GracefulShutdown({ timeout: 10000 })

// Register resources
shutdown.register('database', async () => {
  await db.close()
})

shutdown.register('server', async () => {
  return new Promise((resolve) => {
    server.close(resolve)
  })
})

shutdown.register('cache', async () => {
  await redis.quit()
})

// Listen for events
shutdown.on('shutdown:start', (signal) => {
  console.log('Shutdown initiated by', signal)
})

shutdown.on('shutdown:complete', () => {
  console.log('All resources cleaned up')
})
```
</details>

---

## Self-Assessment Checklist

Use this checklist to assess your understanding:

- [ ] I can create and use an EventEmitter
- [ ] I understand the difference between `on()` and `once()`
- [ ] I know how to properly remove event listeners
- [ ] I understand why 'error' events are special
- [ ] I know that events are emitted synchronously
- [ ] I can identify memory leaks from improper listener management
- [ ] I understand the maximum listeners warning
- [ ] I can convert event-based APIs to Promises
- [ ] I understand the `this` context in event handlers
- [ ] I can extend EventEmitter for custom classes

---

## Next Steps

After mastering these concepts:
1. Move to [Stream Module](../stream-module/) - streams extend EventEmitter
2. Study [HTTP Module](../http-module/) - servers use events
3. Explore Express middleware patterns

---

*The EventEmitter is foundational to Node.js. Mastering it unlocks understanding of the entire ecosystem.*
