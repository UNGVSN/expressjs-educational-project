# Health Checks & Graceful Shutdown - Self-Assessment Questions

## Conceptual Questions

### Q1: Liveness vs Readiness
**Question:** What's the difference between a liveness probe and a readiness probe? When would each fail?

<details>
<summary>Answer</summary>

**Liveness Probe:**
- Answers: "Is the application alive?"
- Failure response: Restart the container
- Should fail for: Deadlocks, infinite loops, process hangs
- Should NOT check: Database, external services

**Readiness Probe:**
- Answers: "Can this instance serve traffic?"
- Failure response: Remove from load balancer
- Should fail for: Database down, cache warming, maintenance mode
- Does NOT cause restart

Example scenario:
- Database goes down
- Liveness: Still passes (app is running)
- Readiness: Fails (can't serve requests)
- Result: Pod stays alive but gets no traffic
</details>

### Q2: Graceful Shutdown Order
**Question:** In what order should you close resources during graceful shutdown?

<details>
<summary>Answer</summary>

1. **Stop accepting new connections** - `server.close()`
2. **Stop receiving new work** - Mark as shutting down, fail health checks
3. **Wait for in-flight requests** - Let active requests complete
4. **Close application resources** - Message queues, job processors
5. **Close data stores** - Redis, database connections
6. **Exit process** - `process.exit(0)`

The principle: Close in reverse order of dependency. Requests depend on DB, so drain requests before closing DB.
</details>

### Q3: SIGTERM vs SIGKILL
**Question:** Why must we handle SIGTERM and not SIGKILL?

<details>
<summary>Answer</summary>

- **SIGTERM** can be caught and handled - allows graceful shutdown
- **SIGKILL** cannot be caught - immediate termination, no cleanup

Kubernetes sends SIGTERM first, waits `terminationGracePeriodSeconds` (default 30s), then sends SIGKILL.

If your shutdown takes longer than the grace period, you'll get SIGKILL anyway. Always set appropriate timeouts.
</details>

### Q4: Health Check Content
**Question:** Should a liveness probe check database connectivity?

<details>
<summary>Answer</summary>

**No.** Liveness probes should be minimal and fast.

If liveness checks database:
- Database goes down
- All pods fail liveness
- Kubernetes restarts all pods
- Pods can't start (DB still down)
- Cascading failure

Instead:
- Liveness: Just check process is alive
- Readiness: Check database connectivity
- Result: Pods stay alive, removed from LB, recover when DB returns
</details>

## Practical Scenarios

### Q5: Kubernetes Configuration
**Question:** Your app takes 60 seconds to start (loading ML model). Configure appropriate probes.

<details>
<summary>Answer</summary>

```yaml
startupProbe:
  httpGet:
    path: /health/startup
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 12  # 12 * 5 = 60 seconds max

livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  periodSeconds: 10
  failureThreshold: 3
  # No initialDelaySeconds - startup probe handles this

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  periodSeconds: 5
  failureThreshold: 3
```

Key: Use startup probe to handle slow starts, not large liveness initialDelaySeconds.
</details>

### Q6: Connection Draining
**Question:** During shutdown, a long-running request is still processing. How should you handle it?

<details>
<summary>Answer</summary>

```javascript
const shutdown = async () => {
  // 1. Stop accepting new requests
  server.close()

  // 2. Wait for active requests (with timeout)
  const timeout = 30000
  const start = Date.now()

  while (activeRequests > 0) {
    if (Date.now() - start > timeout) {
      console.log('Timeout waiting for requests')
      break
    }
    await sleep(100)
  }

  // 3. Force close remaining
  connections.forEach(c => c.destroy())

  // 4. Close resources and exit
  await closeResources()
  process.exit(0)
}
```

Always have a timeout - you can't wait forever.
</details>

### Q7: Zero-Downtime Deployment
**Question:** How do you ensure zero-downtime during deployments?

<details>
<summary>Answer</summary>

1. **Multiple replicas** - At least 2 pods
2. **Rolling update strategy** - Only update some pods at a time
3. **Readiness probes** - New pods must be ready before receiving traffic
4. **preStop hook** - Delay to allow LB updates
5. **Graceful shutdown** - Complete in-flight requests

```yaml
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - lifecycle:
            preStop:
              exec:
                command: ["sleep", "5"]
```
</details>

### Q8: Health Endpoint Security
**Question:** Should health check endpoints require authentication?

<details>
<summary>Answer</summary>

**Short answer:** Usually no for `/health/live` and `/health/ready`, maybe for detailed `/health`.

**Reasoning:**
- Kubernetes probes can't easily add auth headers
- Basic health checks reveal minimal info
- Detailed health checks might expose sensitive info

**Best practice:**
```javascript
// Public - for orchestrators
app.get('/health/live', (req, res) => res.send('OK'))
app.get('/health/ready', (req, res) => res.send('OK'))

// Protected - for monitoring dashboards
app.get('/health/detailed', authenticate, (req, res) => {
  res.json(detailedHealthInfo)
})
```

Or use network policies to restrict access to health endpoints.
</details>

## Code Challenges

### Q9: Implement Health Checker
**Question:** Write a health check function that checks multiple dependencies with timeout:

<details>
<summary>Answer</summary>

```javascript
const checkWithTimeout = (checkFn, timeoutMs) => {
  return Promise.race([
    checkFn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )
  ])
}

const checkHealth = async () => {
  const checks = {
    database: () => db.ping(),
    redis: () => redis.ping(),
    api: () => fetch('https://api.example.com/health')
  }

  const results = {}

  await Promise.all(
    Object.entries(checks).map(async ([name, checkFn]) => {
      try {
        await checkWithTimeout(checkFn, 5000)
        results[name] = { status: 'healthy' }
      } catch (err) {
        results[name] = { status: 'unhealthy', error: err.message }
      }
    })
  )

  const allHealthy = Object.values(results)
    .every(r => r.status === 'healthy')

  return {
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks: results
  }
}
```
</details>

### Q10: Graceful Shutdown Handler
**Question:** Implement a shutdown handler that:
- Handles SIGTERM and SIGINT
- Prevents multiple concurrent shutdowns
- Has a timeout
- Closes server, DB, and Redis in correct order

<details>
<summary>Answer</summary>

```javascript
class ShutdownHandler {
  constructor({ server, db, redis, timeout = 30000 }) {
    this.server = server
    this.db = db
    this.redis = redis
    this.timeout = timeout
    this.isShuttingDown = false
  }

  setup() {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'))
    process.on('SIGINT', () => this.shutdown('SIGINT'))
  }

  async shutdown(signal) {
    if (this.isShuttingDown) {
      console.log('Shutdown already in progress')
      return
    }

    this.isShuttingDown = true
    console.log(`${signal}: Starting graceful shutdown`)

    // Set timeout
    const forceExit = setTimeout(() => {
      console.error('Shutdown timeout - forcing exit')
      process.exit(1)
    }, this.timeout)

    try {
      // 1. Stop accepting connections
      await new Promise(resolve => this.server.close(resolve))
      console.log('Server closed')

      // 2. Close Redis (sessions, cache)
      await this.redis.quit()
      console.log('Redis closed')

      // 3. Close database (last, as other operations may need it)
      await this.db.close()
      console.log('Database closed')

      clearTimeout(forceExit)
      console.log('Graceful shutdown complete')
      process.exit(0)
    } catch (err) {
      console.error('Shutdown error:', err)
      process.exit(1)
    }
  }
}

// Usage
const shutdownHandler = new ShutdownHandler({
  server,
  db: mongoose.connection,
  redis: redisClient,
  timeout: 30000
})
shutdownHandler.setup()
```
</details>

## Architecture Questions

### Q11: Microservices Health
**Question:** In a microservices architecture, should Service A's health check include checking Service B?

<details>
<summary>Answer</summary>

**Generally no** for liveness, **maybe** for readiness.

**Problems with checking dependencies:**
- Cascading health failures
- Circular dependencies
- Slower health checks
- False positives

**Better approach:**
- Each service checks only its own health
- Use circuit breakers for inter-service communication
- Monitor dependency health separately
- Readiness can check "can I reach critical dependencies"

```javascript
// Service A readiness
app.get('/health/ready', async (req, res) => {
  // Check own database
  const dbOk = await checkDatabase()

  // Circuit breaker state for Service B (not actual call)
  const serviceBCircuitOk = circuitBreaker.state !== 'open'

  if (dbOk && serviceBCircuitOk) {
    res.json({ status: 'ready' })
  } else {
    res.status(503).json({ status: 'not ready' })
  }
})
```
</details>

### Q12: Stateful Connections
**Question:** How do you handle WebSocket connections during graceful shutdown?

<details>
<summary>Answer</summary>

```javascript
const shutdown = async () => {
  isShuttingDown = true

  // 1. Stop accepting new WS connections
  wss.close()

  // 2. Notify connected clients
  wss.clients.forEach(client => {
    client.send(JSON.stringify({
      type: 'server_shutdown',
      message: 'Server restarting, please reconnect'
    }))
  })

  // 3. Give clients time to handle message
  await sleep(2000)

  // 4. Close all connections
  wss.clients.forEach(client => {
    client.close(1001, 'Server shutdown')
  })

  // 5. Continue with normal shutdown...
}
```

Key points:
- Notify clients before disconnecting
- Clients should implement reconnection logic
- Give time for notification delivery
</details>
