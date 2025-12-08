# Advanced Topics Summary

Quick reference for advanced Express.js concepts.

---

## Template Engines

```javascript
// Setup
app.set('view engine', 'pug')
app.set('views', './views')

// Render
res.render('index', { title: 'Home', user: req.user })

// Globals
app.locals.siteName = 'My App'
res.locals.user = req.user
```

## Database Integration

```javascript
// MongoDB + Mongoose
mongoose.connect(process.env.MONGODB_URI)
const user = await User.findById(id)

// PostgreSQL + Sequelize
const sequelize = new Sequelize(process.env.DATABASE_URL)
const user = await User.findByPk(id)

// Redis
await client.set('key', 'value', { EX: 3600 })
const value = await client.get('key')
```

## Security

```javascript
app.use(helmet())                    // Security headers
app.use(rateLimit({ max: 100 }))     // Rate limiting
app.use(express.json({ limit: '10kb' })) // Body limit
// + Input validation
// + Parameterized queries
// + Password hashing (bcrypt)
// + HTTPS
```

## Performance

```javascript
app.use(compression())               // Gzip
app.use(express.static('public', { maxAge: '1y' })) // Caching

// Clustering
if (cluster.isPrimary) {
  for (let i = 0; i < numCPUs; i++) cluster.fork()
} else {
  app.listen(3000)
}
```

## Debugging

```bash
DEBUG=express:* node app.js          # Debug output
node --inspect app.js                # Chrome DevTools
```

```javascript
const debug = require('debug')('app:db')
debug('Connecting...')
```

## Error Handling

```javascript
// Custom error classes
class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
  }
}

// Async wrapper
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

// Centralized handler
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    error: err.message
  })
})
```

## Production

```javascript
// Environment
require('dotenv').config()

// Security
app.use(helmet())
app.set('trust proxy', 1)

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    mongoose.connection.close()
    process.exit(0)
  })
})

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }))
```

---

## Quick Checklist

### Security
- [ ] Helmet middleware
- [ ] Rate limiting
- [ ] Input validation
- [ ] Parameterized queries
- [ ] Password hashing
- [ ] HTTPS

### Performance
- [ ] Compression
- [ ] Static file caching
- [ ] Response caching
- [ ] Database optimization
- [ ] Clustering

### Production
- [ ] Environment variables
- [ ] Logging
- [ ] Process manager (PM2)
- [ ] Health checks
- [ ] Graceful shutdown
- [ ] Reverse proxy
- [ ] SSL certificates
- [ ] Monitoring

---

*These advanced topics are essential for production-ready Express applications.*
