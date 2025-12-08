# Health Checks & Graceful Shutdown

Production-essential patterns for application health monitoring and safe shutdown.

## Overview

Health checks and graceful shutdown are critical for:
- **Container orchestration** (Kubernetes, Docker Swarm)
- **Load balancer integration** (removing unhealthy instances)
- **Zero-downtime deployments**
- **Resource cleanup** (database connections, file handles)
- **Monitoring and alerting**

## Health Check Types

### Liveness Probe

"Is the application running?"

```javascript
// Basic liveness - just responds if process is alive
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' })
})
```

### Readiness Probe

"Is the application ready to serve traffic?"

```javascript
let isReady = false

// Set ready after initialization
const initialize = async () => {
  await connectToDatabase()
  await warmUpCache()
  isReady = true
}

app.get('/health/ready', (req, res) => {
  if (isReady) {
    res.status(200).json({ status: 'ready' })
  } else {
    res.status(503).json({ status: 'not ready' })
  }
})
```

### Startup Probe

"Has the application finished starting?"

```javascript
let startupComplete = false

app.get('/health/startup', (req, res) => {
  if (startupComplete) {
    res.status(200).json({ status: 'started' })
  } else {
    res.status(503).json({ status: 'starting' })
  }
})
```

## Comprehensive Health Check Implementation

```javascript
const express = require('express')
const app = express()

// Health state
const health = {
  status: 'starting',
  startTime: Date.now(),
  checks: {}
}

// ===========================================
// Health Check Functions
// ===========================================

const checkDatabase = async () => {
  try {
    // Example: MongoDB ping
    // await mongoose.connection.db.admin().ping()

    // Example: PostgreSQL query
    // await pool.query('SELECT 1')

    return { status: 'healthy', latency: 5 }
  } catch (err) {
    return { status: 'unhealthy', error: err.message }
  }
}

const checkRedis = async () => {
  try {
    // await redisClient.ping()
    return { status: 'healthy', latency: 2 }
  } catch (err) {
    return { status: 'unhealthy', error: err.message }
  }
}

const checkExternalAPI = async () => {
  try {
    const start = Date.now()
    // await fetch('https://api.example.com/health')
    return { status: 'healthy', latency: Date.now() - start }
  } catch (err) {
    return { status: 'unhealthy', error: err.message }
  }
}

const checkDiskSpace = () => {
  // Simple check - in production use `disk-space` package
  return { status: 'healthy', freePercent: 75 }
}

const checkMemory = () => {
  const used = process.memoryUsage()
  const heapUsedPercent = (used.heapUsed / used.heapTotal) * 100

  return {
    status: heapUsedPercent < 90 ? 'healthy' : 'degraded',
    heapUsed: Math.round(used.heapUsed / 1024 / 1024),
    heapTotal: Math.round(used.heapTotal / 1024 / 1024),
    rss: Math.round(used.rss / 1024 / 1024),
    heapUsedPercent: Math.round(heapUsedPercent)
  }
}

// ===========================================
// Health Endpoints
// ===========================================

// Simple liveness (for Kubernetes livenessProbe)
app.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  })
})

// Readiness check (for Kubernetes readinessProbe)
app.get('/health/ready', async (req, res) => {
  if (health.status !== 'ready') {
    return res.status(503).json({
      status: health.status,
      message: 'Application not ready'
    })
  }

  // Quick database check
  const dbCheck = await checkDatabase()

  if (dbCheck.status !== 'healthy') {
    return res.status(503).json({
      status: 'not ready',
      reason: 'database unavailable'
    })
  }

  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString()
  })
})

// Detailed health check (for monitoring dashboards)
app.get('/health', async (req, res) => {
  const [dbCheck, redisCheck, memoryCheck] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    Promise.resolve(checkMemory())
  ])

  const checks = {
    database: dbCheck,
    redis: redisCheck,
    memory: memoryCheck,
    disk: checkDiskSpace()
  }

  const allHealthy = Object.values(checks).every(c => c.status === 'healthy')
  const anyUnhealthy = Object.values(checks).some(c => c.status === 'unhealthy')

  const overallStatus = anyUnhealthy ? 'unhealthy' : (allHealthy ? 'healthy' : 'degraded')

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.round((Date.now() - health.startTime) / 1000),
    version: process.env.npm_package_version || '1.0.0',
    checks
  }

  const statusCode = overallStatus === 'healthy' ? 200 : 503
  res.status(statusCode).json(response)
})

// Metrics endpoint (for Prometheus)
app.get('/metrics', (req, res) => {
  const mem = process.memoryUsage()
  const uptime = process.uptime()

  const metrics = `
# HELP nodejs_heap_size_used_bytes Node.js heap size used
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes ${mem.heapUsed}

# HELP nodejs_heap_size_total_bytes Node.js heap size total
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes ${mem.heapTotal}

# HELP nodejs_external_memory_bytes Node.js external memory
# TYPE nodejs_external_memory_bytes gauge
nodejs_external_memory_bytes ${mem.external}

# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds counter
process_uptime_seconds ${uptime}

# HELP nodejs_active_handles_total Number of active handles
# TYPE nodejs_active_handles_total gauge
nodejs_active_handles_total ${process._getActiveHandles().length}

# HELP nodejs_active_requests_total Number of active requests
# TYPE nodejs_active_requests_total gauge
nodejs_active_requests_total ${process._getActiveRequests().length}
`.trim()

  res.set('Content-Type', 'text/plain')
  res.send(metrics)
})
```

## Graceful Shutdown

### Basic Implementation

```javascript
const express = require('express')
const app = express()

let server
let isShuttingDown = false

// Track active connections
const connections = new Set()

app.use((req, res, next) => {
  // Reject new requests during shutdown
  if (isShuttingDown) {
    res.set('Connection', 'close')
    return res.status(503).json({
      error: 'Server is shutting down'
    })
  }
  next()
})

// Start server
server = app.listen(3000, () => {
  console.log('Server started')
})

// Track connections
server.on('connection', (conn) => {
  connections.add(conn)
  conn.on('close', () => connections.delete(conn))
})

// Graceful shutdown function
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`)

  isShuttingDown = true

  // Stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed')

    try {
      // Close database connections
      // await mongoose.connection.close()
      // await pool.end()
      console.log('Database connections closed')

      // Close Redis
      // await redisClient.quit()
      console.log('Redis connection closed')

      // Close other resources
      // await messageQueue.close()

      console.log('Graceful shutdown complete')
      process.exit(0)
    } catch (err) {
      console.error('Error during shutdown:', err)
      process.exit(1)
    }
  })

  // Force close connections after timeout
  setTimeout(() => {
    console.log('Forcing remaining connections closed...')
    connections.forEach(conn => conn.destroy())
  }, 10000)

  // Force exit after longer timeout
  setTimeout(() => {
    console.error('Forced shutdown after timeout')
    process.exit(1)
  }, 30000)
}

// Signal handlers
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
```

### Production-Grade Implementation

```javascript
const express = require('express')
const http = require('http')

class GracefulServer {
  constructor(app) {
    this.app = app
    this.server = null
    this.connections = new Map()
    this.isShuttingDown = false
    this.shutdownTimeout = parseInt(process.env.SHUTDOWN_TIMEOUT) || 30000
    this.connectionTimeout = parseInt(process.env.CONNECTION_TIMEOUT) || 10000
  }

  start(port) {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(this.app)

      // Track all connections
      this.server.on('connection', (conn) => {
        const key = `${conn.remoteAddress}:${conn.remotePort}`
        this.connections.set(key, conn)

        conn.on('close', () => {
          this.connections.delete(key)
        })
      })

      this.server.listen(port, () => {
        console.log(`Server listening on port ${port}`)
        this.setupSignalHandlers()
        resolve(this.server)
      })

      this.server.on('error', reject)
    })
  }

  setupSignalHandlers() {
    // Handle termination signals
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2']

    signals.forEach(signal => {
      process.on(signal, () => this.shutdown(signal))
    })

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err)
      this.shutdown('uncaughtException')
    })

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection:', reason)
      // Don't shutdown, but log for monitoring
    })
  }

  async shutdown(signal) {
    if (this.isShuttingDown) {
      console.log('Shutdown already in progress')
      return
    }

    this.isShuttingDown = true
    console.log(`\n[${new Date().toISOString()}] ${signal} received`)
    console.log('Starting graceful shutdown...')

    // Create shutdown promise with timeout
    const shutdownPromise = this.performShutdown()
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Shutdown timeout')), this.shutdownTimeout)
    })

    try {
      await Promise.race([shutdownPromise, timeoutPromise])
      console.log('Graceful shutdown complete')
      process.exit(0)
    } catch (err) {
      console.error('Shutdown error:', err.message)
      this.forceShutdown()
    }
  }

  async performShutdown() {
    // Step 1: Stop accepting new connections
    console.log('Step 1: Stopping new connections...')
    await this.closeServer()

    // Step 2: Wait for existing requests to complete
    console.log('Step 2: Waiting for active requests...')
    await this.waitForConnections()

    // Step 3: Close external resources
    console.log('Step 3: Closing external resources...')
    await this.closeResources()
  }

  closeServer() {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve()
        return
      }

      this.server.close(() => {
        console.log('  HTTP server closed')
        resolve()
      })
    })
  }

  async waitForConnections() {
    // Give connections time to complete
    const checkInterval = 1000
    const maxWait = this.connectionTimeout
    let waited = 0

    while (this.connections.size > 0 && waited < maxWait) {
      console.log(`  Waiting for ${this.connections.size} connections...`)
      await new Promise(r => setTimeout(r, checkInterval))
      waited += checkInterval
    }

    // Force close remaining connections
    if (this.connections.size > 0) {
      console.log(`  Force closing ${this.connections.size} connections`)
      this.connections.forEach(conn => {
        conn.destroy()
      })
    }
  }

  async closeResources() {
    const closeOperations = []

    // Database connections
    // closeOperations.push(
    //   mongoose.connection.close()
    //     .then(() => console.log('  MongoDB closed'))
    //     .catch(err => console.error('  MongoDB close error:', err))
    // )

    // Redis
    // closeOperations.push(
    //   redisClient.quit()
    //     .then(() => console.log('  Redis closed'))
    //     .catch(err => console.error('  Redis close error:', err))
    // )

    // Message queues, etc.

    await Promise.allSettled(closeOperations)
  }

  forceShutdown() {
    console.error('Forcing immediate shutdown')
    process.exit(1)
  }
}

// Usage
const app = express()

// Middleware to reject requests during shutdown
app.use((req, res, next) => {
  if (app.locals.isShuttingDown) {
    res.set('Connection', 'close')
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Server is shutting down'
    })
  }
  next()
})

// Health check that reflects shutdown state
app.get('/health', (req, res) => {
  if (app.locals.isShuttingDown) {
    return res.status(503).json({ status: 'shutting down' })
  }
  res.json({ status: 'healthy' })
})

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello' })
})

// Start server
const gracefulServer = new GracefulServer(app)
gracefulServer.start(3000)
```

## Kubernetes Configuration

### Deployment with Health Checks

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: express-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: express-app
  template:
    metadata:
      labels:
        app: express-app
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: express-app
          image: myapp:latest
          ports:
            - containerPort: 3000

          # Startup probe - initial startup check
          startupProbe:
            httpGet:
              path: /health/startup
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 30  # 30 * 5s = 150s max startup time

          # Liveness probe - is the app alive?
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 0
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          # Readiness probe - can it serve traffic?
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 0
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3

          # Lifecycle hooks
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5"]

          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
```

### Service Configuration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: express-app
spec:
  selector:
    app: express-app
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

## Docker Configuration

### Dockerfile with Health Check

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

# Use non-root user
USER node

EXPOSE 3000

# Use exec form for proper signal handling
CMD ["node", "app.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SHUTDOWN_TIMEOUT=30000
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    stop_grace_period: 30s
    deploy:
      restart_policy:
        condition: on-failure
        max_attempts: 3
```

## Load Balancer Integration

### AWS ALB Health Check

```javascript
// ALB health check endpoint
app.get('/health', (req, res) => {
  // ALB expects 200-399 for healthy
  // Returns 503 when unhealthy

  const isHealthy = checkApplicationHealth()

  if (isHealthy) {
    res.status(200).send('OK')
  } else {
    res.status(503).send('Service Unavailable')
  }
})
```

### Nginx Upstream Health Check

```nginx
upstream express_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;

    # Passive health checks
    # Marks server as failed after 3 failures in 30s
}

server {
    location /api {
        proxy_pass http://express_backend;
        proxy_next_upstream error timeout http_503;
    }
}
```

## Complete Example

```javascript
const express = require('express')
const http = require('http')

const app = express()
const server = http.createServer(app)

// Application state
const state = {
  isReady: false,
  isShuttingDown: false,
  startTime: Date.now(),
  connections: new Map()
}

// Track connections
server.on('connection', (conn) => {
  const key = `${conn.remoteAddress}:${conn.remotePort}`
  state.connections.set(key, conn)
  conn.on('close', () => state.connections.delete(key))
})

// Middleware
app.use(express.json())

// Shutdown-aware middleware
app.use((req, res, next) => {
  if (state.isShuttingDown) {
    res.set('Connection', 'close')
    return res.status(503).json({
      error: 'Service shutting down'
    })
  }
  next()
})

// Health endpoints
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' })
})

app.get('/health/ready', (req, res) => {
  if (!state.isReady || state.isShuttingDown) {
    return res.status(503).json({ status: 'not ready' })
  }
  res.json({ status: 'ready' })
})

app.get('/health', (req, res) => {
  res.json({
    status: state.isShuttingDown ? 'shutting_down' : (state.isReady ? 'healthy' : 'starting'),
    uptime: Math.round((Date.now() - state.startTime) / 1000),
    connections: state.connections.size,
    memory: process.memoryUsage()
  })
})

// Application routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello World' })
})

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`${signal} received`)

  if (state.isShuttingDown) return
  state.isShuttingDown = true

  // Stop accepting new connections
  server.close(async () => {
    console.log('Server closed')

    // Close resources here
    // await db.close()

    process.exit(0)
  })

  // Force close after timeout
  setTimeout(() => {
    console.error('Forced shutdown')
    state.connections.forEach(c => c.destroy())
    process.exit(1)
  }, 30000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Start server
const PORT = process.env.PORT || 3000

const initialize = async () => {
  // Connect to databases, warm caches, etc.
  // await db.connect()

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    state.isReady = true
  })
}

initialize().catch(err => {
  console.error('Failed to start:', err)
  process.exit(1)
})
```

## Best Practices

1. **Separate liveness and readiness** - Different purposes, different endpoints
2. **Keep liveness checks simple** - Just verify process is running
3. **Include dependency checks in readiness** - Database, cache, external APIs
4. **Set appropriate timeouts** - Give connections time to complete
5. **Handle signals properly** - SIGTERM for orchestrators, SIGINT for manual
6. **Close resources in order** - Stop accepting, drain connections, close dependencies
7. **Log shutdown progress** - Helps debugging failed shutdowns
8. **Test shutdown behavior** - Verify zero-downtime deployments work

## Related Topics

- [Production Deployment](../production/README.md)
- [Performance Best Practices](../performance/README.md)
- [Error Handling](../error-handling/README.md)
