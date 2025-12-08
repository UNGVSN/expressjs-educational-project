# Advanced Topics

Advanced Express.js concepts for building production-ready applications.

## Overview

This section covers advanced patterns, integrations, and best practices for Express.js development.

## Topics

| Topic | Description |
|-------|-------------|
| [template-engines](./template-engines/) | Server-side rendering with EJS, Pug, Handlebars |
| [database-integration](./database-integration/) | MongoDB, PostgreSQL, MySQL, Redis |
| [security](./security/) | Security best practices and common vulnerabilities |
| [performance](./performance/) | Optimization, caching, clustering |
| [debugging](./debugging/) | Debugging techniques and tools |
| [error-handling](./error-handling/) | Advanced error handling patterns |
| [production](./production/) | Production deployment considerations |

## Quick Reference

### Template Engines

```javascript
// Pug
app.set('view engine', 'pug')
app.set('views', './views')

app.get('/', (req, res) => {
  res.render('index', { title: 'Home', user: req.user })
})
```

### Database Integration

```javascript
// MongoDB with Mongoose
const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_URI)

// PostgreSQL with Sequelize
const { Sequelize } = require('sequelize')
const sequelize = new Sequelize(process.env.DATABASE_URL)
```

### Security

```javascript
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

app.use(helmet())
app.use(rateLimit({ windowMs: 60000, max: 100 }))
app.use(express.json({ limit: '10kb' }))
```

### Performance

```javascript
const compression = require('compression')
const cluster = require('cluster')

// Compression
app.use(compression())

// Caching headers
app.use(express.static('public', { maxAge: '1d' }))

// Clustering
if (cluster.isPrimary) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }
} else {
  app.listen(3000)
}
```

### Debugging

```bash
# Enable debug output
DEBUG=express:* node app.js

# Node.js inspector
node --inspect app.js
```

### Error Handling

```javascript
// Async error wrapper
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

// Centralized error handler
app.use((err, req, res, next) => {
  const status = err.status || 500
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal Server Error'
    : err.message

  res.status(status).json({ error: message })
})
```

### Production

```javascript
// Environment-based configuration
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(compression())
}

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    mongoose.connection.close()
    process.exit(0)
  })
})
```

## Learning Path

1. Start with [template-engines](./template-engines/) for server-side rendering
2. Learn [database-integration](./database-integration/) for data persistence
3. Master [security](./security/) best practices
4. Optimize with [performance](./performance/) techniques
5. Debug with [debugging](./debugging/) tools
6. Handle errors with [error-handling](./error-handling/)
7. Deploy with [production](./production/) considerations

---

*These advanced topics are essential for production-ready Express applications.*
