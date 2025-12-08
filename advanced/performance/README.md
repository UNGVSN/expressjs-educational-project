# Performance

Performance optimization techniques for Express applications.

## Overview

Performance optimization ensures fast response times and efficient resource usage.

## Response Compression

```bash
npm install compression
```

```javascript
const compression = require('compression')

app.use(compression({
  level: 6,              // Compression level (0-9)
  threshold: 1024,       // Only compress > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  }
}))
```

## Static File Caching

```javascript
// Long cache for static assets
app.use('/static', express.static('public', {
  maxAge: '1y',
  immutable: true
}))

// Short cache for dynamic content
app.use(express.static('public', {
  maxAge: '1h'
}))

// ETags for cache validation
app.use(express.static('public', {
  etag: true,
  lastModified: true
}))
```

## Response Caching

```javascript
// In-memory cache
const NodeCache = require('node-cache')
const cache = new NodeCache({ stdTTL: 300 })  // 5 minutes

function cacheMiddleware(duration) {
  return (req, res, next) => {
    const key = req.originalUrl

    const cached = cache.get(key)
    if (cached) {
      return res.json(cached)
    }

    const originalJson = res.json.bind(res)
    res.json = (data) => {
      cache.set(key, data, duration)
      originalJson(data)
    }

    next()
  }
}

app.get('/api/posts', cacheMiddleware(60), getPosts)
```

## Redis Caching

```javascript
const redis = require('redis')
const client = redis.createClient()

async function redisCache(key, ttl, fetchFn) {
  const cached = await client.get(key)
  if (cached) {
    return JSON.parse(cached)
  }

  const data = await fetchFn()
  await client.setEx(key, ttl, JSON.stringify(data))
  return data
}

app.get('/api/users/:id', async (req, res) => {
  const user = await redisCache(
    `user:${req.params.id}`,
    3600,
    () => User.findById(req.params.id)
  )
  res.json(user)
})
```

## Database Optimization

```javascript
// Use indexes
userSchema.index({ email: 1 })
userSchema.index({ createdAt: -1 })

// Select only needed fields
const users = await User.find().select('name email')

// Pagination
const users = await User.find()
  .skip((page - 1) * limit)
  .limit(limit)

// Use lean() for read-only queries
const users = await User.find().lean()

// Batch operations
await User.insertMany(users)
await User.bulkWrite([...])

// Connection pooling
mongoose.connect(uri, { maxPoolSize: 10 })
```

## Clustering

```javascript
const cluster = require('cluster')
const os = require('os')

const numCPUs = os.cpus().length

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`)

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`)
    cluster.fork()  // Replace dead worker
  })
} else {
  const express = require('express')
  const app = express()

  app.get('/', (req, res) => {
    res.send(`Worker ${process.pid}`)
  })

  app.listen(3000)
  console.log(`Worker ${process.pid} started`)
}
```

## PM2 for Production

```bash
npm install pm2 -g
```

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'app',
    script: './app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

```bash
pm2 start ecosystem.config.js
pm2 reload app  # Zero-downtime restart
pm2 monit       # Monitor
```

## Async Operations

```javascript
// Use async/await properly
app.get('/data', async (req, res, next) => {
  try {
    // Parallel requests
    const [users, posts] = await Promise.all([
      User.find(),
      Post.find()
    ])
    res.json({ users, posts })
  } catch (err) {
    next(err)
  }
})

// Stream large responses
app.get('/export', (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  const cursor = User.find().cursor()
  res.write('[')
  let first = true
  cursor.on('data', (doc) => {
    if (!first) res.write(',')
    first = false
    res.write(JSON.stringify(doc))
  })
  cursor.on('end', () => {
    res.write(']')
    res.end()
  })
})
```

## Payload Size Limits

```javascript
// Limit JSON body size
app.use(express.json({ limit: '10kb' }))

// Limit URL-encoded body
app.use(express.urlencoded({ limit: '10kb', extended: true }))

// Limit file uploads
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }  // 5MB
})
```

## Monitoring

```javascript
// Response time header
const responseTime = require('response-time')
app.use(responseTime())

// Request logging with timing
const morgan = require('morgan')
app.use(morgan(':method :url :status :response-time ms'))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  })
})
```

## Performance Checklist

- [ ] Enable gzip compression
- [ ] Set cache headers for static files
- [ ] Implement response caching
- [ ] Optimize database queries
- [ ] Use connection pooling
- [ ] Implement pagination
- [ ] Use clustering or PM2
- [ ] Stream large responses
- [ ] Limit request payload sizes
- [ ] Monitor response times

## Benchmarking

```bash
# Apache Bench
ab -n 1000 -c 100 http://localhost:3000/

# wrk
wrk -t12 -c400 -d30s http://localhost:3000/

# autocannon
npx autocannon -c 100 -d 10 http://localhost:3000/
```

## Related

- [production](../production/) - Production deployment
- [debugging](../debugging/) - Performance debugging

---

*Performance optimization is essential for scalable Express applications.*
