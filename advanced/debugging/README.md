# Debugging

Debugging techniques and tools for Express applications.

## Overview

Effective debugging helps identify and fix issues quickly during development and production.

## Debug Module

Express uses the `debug` module internally.

```bash
# Enable all Express debugging
DEBUG=express:* node app.js

# Enable specific modules
DEBUG=express:router node app.js
DEBUG=express:application node app.js

# Multiple modules
DEBUG=express:router,express:application node app.js

# All modules except one
DEBUG=*,-express:static node app.js
```

## Custom Debug Output

```javascript
const debug = require('debug')

// Create debuggers for different areas
const dbDebug = debug('app:db')
const routeDebug = debug('app:routes')
const authDebug = debug('app:auth')

// Use in code
dbDebug('Connecting to database...')
routeDebug('Route matched: %s', req.path)
authDebug('User authenticated: %s', user.email)
```

```bash
# Enable your debug output
DEBUG=app:* node app.js
DEBUG=app:db,app:auth node app.js
```

## Node.js Inspector

```bash
# Start with inspector
node --inspect app.js

# Break on first line
node --inspect-brk app.js

# Connect via Chrome DevTools
# Open: chrome://inspect
```

### VS Code Debugging

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Express",
      "program": "${workspaceFolder}/app.js",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "app:*"
      }
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Process",
      "port": 9229
    }
  ]
}
```

## Request Logging

```javascript
const morgan = require('morgan')

// Development - colorized
app.use(morgan('dev'))

// Detailed logging
app.use(morgan(':method :url :status :response-time ms - :res[content-length]'))

// Custom format
morgan.token('body', (req) => JSON.stringify(req.body))
app.use(morgan(':method :url :status :body'))
```

## Error Logging

```javascript
// Simple error logger
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    user: req.user?.id
  })
  next(err)
})

// Winston logger
const winston = require('winston')

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}
```

## Stack Traces

```javascript
// Include stack traces in development
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
})

// Better stack traces with source-map-support
require('source-map-support').install()

// Long stack traces (async)
Error.stackTraceLimit = 50
```

## Debugging Async Code

```javascript
// Async wrapper for better stack traces
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// Use in routes
app.get('/data', asyncHandler(async (req, res) => {
  const data = await fetchData()  // Error here shows full stack
  res.json(data)
}))

// Node.js async hooks for tracking
const async_hooks = require('async_hooks')
const asyncHook = async_hooks.createHook({
  init(asyncId, type, triggerAsyncId) {
    console.log(`Async ${type} created: ${asyncId}`)
  }
})
asyncHook.enable()
```

## Memory Debugging

```javascript
// Memory usage endpoint
app.get('/debug/memory', (req, res) => {
  const usage = process.memoryUsage()
  res.json({
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
    external: Math.round(usage.external / 1024 / 1024) + ' MB',
    rss: Math.round(usage.rss / 1024 / 1024) + ' MB'
  })
})

// Heap snapshot
const v8 = require('v8')
app.get('/debug/heapdump', (req, res) => {
  const filename = `/tmp/heapdump-${Date.now()}.heapsnapshot`
  v8.writeHeapSnapshot(filename)
  res.json({ file: filename })
})
```

## Request Inspection

```javascript
// Log all request details
app.use((req, res, next) => {
  console.log({
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body,
    params: req.params,
    ip: req.ip,
    timestamp: new Date().toISOString()
  })
  next()
})
```

## Response Inspection

```javascript
// Log response
app.use((req, res, next) => {
  const originalJson = res.json.bind(res)

  res.json = (data) => {
    console.log('Response:', {
      url: req.url,
      status: res.statusCode,
      body: data
    })
    return originalJson(data)
  }

  next()
})
```

## Environment Info

```javascript
app.get('/debug/env', (req, res) => {
  res.json({
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    uptime: process.uptime(),
    cwd: process.cwd(),
    env: process.env.NODE_ENV
  })
})
```

## Debugging Tools

### ndb

```bash
npm install -g ndb
ndb node app.js
```

### node-clinic

```bash
npm install -g clinic
clinic doctor -- node app.js
clinic flame -- node app.js
clinic bubbleprof -- node app.js
```

### 0x

```bash
npm install -g 0x
0x app.js  # Generate flame graph
```

## Common Issues

### Hanging Requests

```javascript
// Add timeout middleware
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(408).send('Request Timeout')
  })
  next()
})
```

### Memory Leaks

```javascript
// Avoid global state accumulation
// Don't store request data globally
// Clean up event listeners
// Use weak references when appropriate
```

### Unhandled Rejections

```javascript
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  process.exit(1)
})
```

## Related

- [error-handling](../error-handling/) - Error handling patterns
- [performance](../performance/) - Performance debugging

---

*Effective debugging is essential for maintaining Express applications.*
