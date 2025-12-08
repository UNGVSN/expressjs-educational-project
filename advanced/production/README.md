# Production

Best practices for deploying Express applications to production.

## Overview

Production deployment requires careful consideration of security, performance, monitoring, and reliability.

## Environment Configuration

```javascript
// config/index.js
const config = {
  development: {
    port: 3000,
    db: 'mongodb://localhost/myapp_dev',
    logLevel: 'debug'
  },
  test: {
    port: 3001,
    db: 'mongodb://localhost/myapp_test',
    logLevel: 'error'
  },
  production: {
    port: process.env.PORT || 3000,
    db: process.env.MONGODB_URI,
    logLevel: 'info'
  }
}

module.exports = config[process.env.NODE_ENV || 'development']
```

## Environment Variables

```bash
# .env.example (commit this)
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost/myapp
SESSION_SECRET=your-secret-here
JWT_SECRET=your-jwt-secret

# .env (do NOT commit)
# Copy .env.example and fill in real values
```

```javascript
// Load env vars early
require('dotenv').config()

// Validate required env vars
const required = ['MONGODB_URI', 'SESSION_SECRET', 'JWT_SECRET']
required.forEach(name => {
  if (!process.env[name]) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
})
```

## Production Security

```javascript
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

// Security headers
app.use(helmet())

// Trust proxy (if behind nginx/load balancer)
app.set('trust proxy', 1)

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}))

// Disable X-Powered-By
app.disable('x-powered-by')

// HTTPS redirect (if not handled by proxy)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.hostname}${req.url}`)
    }
    next()
  })
}
```

## Logging

```javascript
const winston = require('winston')

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
})

// Console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}

// Request logging
const morgan = require('morgan')
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}))
```

## Process Manager (PM2)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: './src/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production'
    }
  }]
}
```

```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Useful commands
pm2 list              # List processes
pm2 logs              # View logs
pm2 monit             # Monitor
pm2 reload api        # Zero-downtime restart
pm2 startup           # Configure startup script
pm2 save              # Save current processes
```

## Health Checks

```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' })
})

app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    await mongoose.connection.db.admin().ping()

    // Check Redis connection
    await redisClient.ping()

    res.json({ status: 'ready' })
  } catch (err) {
    res.status(503).json({
      status: 'not ready',
      error: err.message
    })
  }
})
```

## Graceful Shutdown

```javascript
const server = app.listen(PORT)

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down gracefully`)

  server.close(async () => {
    console.log('HTTP server closed')

    // Close database connections
    await mongoose.connection.close()
    console.log('Database connection closed')

    process.exit(0)
  })

  // Force close after 30s
  setTimeout(() => {
    console.error('Forcing shutdown')
    process.exit(1)
  }, 30000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
```

## Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/myapp
upstream app {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Gzip
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;

    # Static files
    location /static {
        alias /var/www/myapp/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy to Node.js
    location / {
        proxy_pass http://app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies first (for caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "src/app.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/myapp
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine

volumes:
  mongo_data:
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Security middleware enabled (Helmet)
- [ ] Rate limiting configured
- [ ] Logging set up
- [ ] Process manager (PM2) configured
- [ ] Health check endpoints
- [ ] Graceful shutdown handling
- [ ] Reverse proxy (Nginx) configured
- [ ] SSL/TLS certificates
- [ ] Database backups
- [ ] Monitoring and alerting
- [ ] Error tracking (Sentry, etc.)

## Monitoring

```bash
# PM2 built-in monitoring
pm2 monit

# Or PM2 Plus (cloud dashboard)
pm2 link <secret_key> <public_key>

# Application Performance Monitoring (APM)
# - New Relic
# - Datadog
# - Elastic APM
```

## Related

- [security](../security/) - Security practices
- [performance](../performance/) - Performance optimization
- [error-handling](../error-handling/) - Error handling

---

*Production deployment requires attention to security, performance, and reliability.*
