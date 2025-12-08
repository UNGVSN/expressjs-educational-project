# Health Checks & Graceful Shutdown - Design Analysis

## Health Check Architecture

### Three-Probe Model (Kubernetes)

```
┌─────────────────────────────────────────────────────────────┐
│                     Kubernetes Pod                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Startup    │  │  Liveness   │  │  Readiness  │        │
│  │   Probe     │  │   Probe     │  │   Probe     │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │
│         ▼                ▼                ▼                │
│  ┌─────────────────────────────────────────────────┐      │
│  │              Express Application                 │      │
│  │  /health/startup  /health/live  /health/ready   │      │
│  └─────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Probe Timing Sequence

```
Time →
│
│ Pod Created
▼
├──────────────────────────────────────────────────────────────
│ [Startup Probe Active]
│ • Checks /health/startup
│ • App initializing (DB connections, cache warmup)
│ • Liveness/Readiness disabled until startup succeeds
│
├── Startup Success ───────────────────────────────────────────
│
│ [Liveness Probe Active]        [Readiness Probe Active]
│ • Periodic /health/live        • Periodic /health/ready
│ • If fails → restart pod       • If fails → remove from LB
│
├── Normal Operation ──────────────────────────────────────────
│
│ Liveness: OK ✓                 Readiness: OK ✓
│ Pod serves traffic normally
│
├── Degraded State ────────────────────────────────────────────
│
│ Liveness: OK ✓                 Readiness: FAIL ✗
│ Pod alive but DB down → removed from load balancer
│ No traffic routed, but pod not restarted
│
├── Fatal State ───────────────────────────────────────────────
│
│ Liveness: FAIL ✗
│ Pod restarted by Kubernetes
│
└──────────────────────────────────────────────────────────────
```

## Graceful Shutdown Flow

### Signal Handling Sequence

```
┌─────────────────────────────────────────────────────────────┐
│                    SIGTERM Received                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Set isShuttingDown = true                                │
│    • Readiness probe starts returning 503                   │
│    • Load balancer removes pod from rotation                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Stop accepting new connections                           │
│    • server.close() called                                  │
│    • New TCP connections rejected                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Wait for in-flight requests                              │
│    • Existing requests complete                             │
│    • Keep-alive connections drain                           │
│    • Timeout: force close after N seconds                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Close external resources                                 │
│    • Database connections                                   │
│    • Redis connections                                      │
│    • Message queue consumers                                │
│    • File handles                                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Exit process                                             │
│    • process.exit(0) on success                             │
│    • process.exit(1) on timeout/error                       │
└─────────────────────────────────────────────────────────────┘
```

### Connection Draining

```javascript
// How connection draining works internally

class ConnectionDrainer {
  constructor(server) {
    this.server = server
    this.connections = new Map()
    this.requestsInFlight = new Map()

    // Track TCP connections
    server.on('connection', (socket) => {
      const id = this.generateId(socket)
      this.connections.set(id, {
        socket,
        requests: 0,
        idle: true
      })

      socket.on('close', () => {
        this.connections.delete(id)
      })
    })

    // Track HTTP requests
    server.on('request', (req, res) => {
      const connId = this.getConnectionId(req.socket)
      const conn = this.connections.get(connId)

      if (conn) {
        conn.requests++
        conn.idle = false
      }

      res.on('finish', () => {
        if (conn) {
          conn.requests--
          conn.idle = conn.requests === 0
        }
      })
    })
  }

  async drain(timeout) {
    const deadline = Date.now() + timeout

    while (this.connections.size > 0) {
      // Check for timeout
      if (Date.now() > deadline) {
        this.forceClose()
        return
      }

      // Close idle connections
      for (const [id, conn] of this.connections) {
        if (conn.idle) {
          conn.socket.end()
          this.connections.delete(id)
        }
      }

      // Wait before next check
      await this.sleep(100)
    }
  }

  forceClose() {
    for (const [id, conn] of this.connections) {
      conn.socket.destroy()
    }
    this.connections.clear()
  }
}
```

## Health Check Design Patterns

### Circuit Breaker Pattern

```javascript
class HealthChecker {
  constructor() {
    this.checks = new Map()
    this.states = new Map() // 'closed', 'open', 'half-open'
    this.failures = new Map()
    this.threshold = 3
    this.resetTimeout = 30000
  }

  registerCheck(name, checkFn) {
    this.checks.set(name, checkFn)
    this.states.set(name, 'closed')
    this.failures.set(name, 0)
  }

  async runCheck(name) {
    const state = this.states.get(name)

    // If circuit is open, return cached failure
    if (state === 'open') {
      return { status: 'unhealthy', reason: 'circuit open' }
    }

    try {
      const checkFn = this.checks.get(name)
      const result = await checkFn()

      // Reset on success
      this.failures.set(name, 0)
      this.states.set(name, 'closed')

      return { status: 'healthy', ...result }
    } catch (err) {
      const failures = this.failures.get(name) + 1
      this.failures.set(name, failures)

      // Open circuit after threshold
      if (failures >= this.threshold) {
        this.states.set(name, 'open')

        // Schedule half-open check
        setTimeout(() => {
          this.states.set(name, 'half-open')
        }, this.resetTimeout)
      }

      return { status: 'unhealthy', error: err.message }
    }
  }

  async runAllChecks() {
    const results = {}

    for (const name of this.checks.keys()) {
      results[name] = await this.runCheck(name)
    }

    return results
  }
}
```

### Dependency Health Aggregation

```
┌─────────────────────────────────────────────────────────────┐
│                    Health Aggregator                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Database │  │  Redis   │  │   API    │  │  Queue   │   │
│  │  Check   │  │  Check   │  │  Check   │  │  Check   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │          │
│       ▼             ▼             ▼             ▼          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Aggregation Rules                       │   │
│  │  • All healthy → overall healthy                    │   │
│  │  • Any critical unhealthy → overall unhealthy       │   │
│  │  • Non-critical unhealthy → degraded                │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│                   Overall Status                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Signal Handling

### Unix Signals in Node.js

| Signal | Source | Default Action | Recommendation |
|--------|--------|----------------|----------------|
| SIGTERM | `kill`, Kubernetes | Terminate | Graceful shutdown |
| SIGINT | Ctrl+C | Terminate | Graceful shutdown |
| SIGKILL | `kill -9` | Force kill | Cannot handle |
| SIGHUP | Terminal close | Terminate | Reload config or ignore |
| SIGUSR1 | User defined | Nothing | Debugging (Node inspector) |
| SIGUSR2 | User defined | Nothing | Custom (nodemon uses this) |

### Signal Handling Best Practices

```javascript
// Proper signal handling setup

class SignalHandler {
  constructor() {
    this.isShuttingDown = false
    this.shutdownCallbacks = []
  }

  onShutdown(callback) {
    this.shutdownCallbacks.push(callback)
  }

  setup() {
    // Graceful shutdown signals
    process.on('SIGTERM', () => this.handleSignal('SIGTERM'))
    process.on('SIGINT', () => this.handleSignal('SIGINT'))

    // nodemon restart signal
    process.on('SIGUSR2', () => {
      this.handleSignal('SIGUSR2').then(() => {
        process.kill(process.pid, 'SIGUSR2')
      })
    })

    // Crash handlers (log but don't prevent crash)
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err)
      this.handleSignal('uncaughtException')
    })

    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Rejection:', reason)
      // Don't shutdown for unhandled rejections
      // Just log for monitoring
    })
  }

  async handleSignal(signal) {
    if (this.isShuttingDown) {
      console.log('Shutdown already in progress')
      return
    }

    this.isShuttingDown = true
    console.log(`[${signal}] Starting shutdown...`)

    // Run callbacks in reverse order (LIFO)
    for (const callback of this.shutdownCallbacks.reverse()) {
      try {
        await callback()
      } catch (err) {
        console.error('Shutdown callback error:', err)
      }
    }
  }
}
```

## Kubernetes Integration Details

### Termination Lifecycle

```
1. Pod receives SIGTERM
   └── terminationGracePeriodSeconds timer starts (default: 30s)

2. preStop hook executes (if defined)
   └── Allows time for load balancer to update

3. SIGTERM sent to container process
   └── Application begins graceful shutdown

4. Readiness probe fails
   └── Pod removed from Service endpoints

5. Grace period expires
   └── SIGKILL sent if process still running
```

### preStop Hook Purpose

```yaml
lifecycle:
  preStop:
    exec:
      command: ["/bin/sh", "-c", "sleep 5"]
```

Why sleep in preStop?
- Load balancers have propagation delay
- Endpoints update takes time
- Sleep ensures no new traffic arrives during shutdown
- Typical: 5-10 seconds

## Performance Considerations

### Health Check Overhead

```javascript
// Lightweight health check (< 1ms)
app.get('/health/live', (req, res) => {
  res.status(200).end()
})

// Heavy health check (avoid in probes)
app.get('/health/detailed', async (req, res) => {
  // Don't do this in liveness probe!
  const dbLatency = await measureDatabaseLatency()
  const redisLatency = await measureRedisLatency()
  // ...
})
```

### Caching Health Results

```javascript
class CachedHealthChecker {
  constructor(ttlMs = 5000) {
    this.cache = null
    this.cacheTime = 0
    this.ttlMs = ttlMs
    this.checkInProgress = null
  }

  async check() {
    const now = Date.now()

    // Return cached result if fresh
    if (this.cache && (now - this.cacheTime) < this.ttlMs) {
      return this.cache
    }

    // Coalesce concurrent checks
    if (this.checkInProgress) {
      return this.checkInProgress
    }

    this.checkInProgress = this.performCheck()

    try {
      this.cache = await this.checkInProgress
      this.cacheTime = now
      return this.cache
    } finally {
      this.checkInProgress = null
    }
  }

  async performCheck() {
    // Actual health check logic
  }
}
```

## Design Questions

1. **Why separate liveness and readiness?**
   - Liveness: "Should I restart?"
   - Readiness: "Should I route traffic?"
   - Different failure modes, different responses

2. **Why not check dependencies in liveness?**
   - If DB is down, restarting app won't help
   - Cascading restarts during DB outage
   - Liveness should only check app process health

3. **Why drain connections before closing resources?**
   - Requests may need DB/Redis to complete
   - Closing DB first → request failures
   - Drain first → clean request completion

4. **Why timeout on graceful shutdown?**
   - Hung requests would prevent shutdown forever
   - Kubernetes will SIGKILL after grace period anyway
   - Better to clean up what we can
