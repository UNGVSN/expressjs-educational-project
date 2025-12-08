# Express Behind Proxies

Complete guide to running Express.js behind reverse proxies, load balancers, and CDNs.

## Overview

In production, Express applications typically run behind:
- **Reverse proxies** (Nginx, HAProxy, Apache)
- **Load balancers** (AWS ALB/ELB, Google Cloud LB)
- **CDNs** (Cloudflare, AWS CloudFront)
- **Platform proxies** (Heroku, Vercel, Railway)

When behind a proxy, the client's original request information (IP, protocol, host) is forwarded via HTTP headers.

## The Problem

Without proper configuration:

```javascript
app.get('/info', (req, res) => {
  res.json({
    ip: req.ip,           // Returns proxy IP, not client IP
    protocol: req.protocol, // Returns 'http' even if client used HTTPS
    host: req.hostname    // May return wrong hostname
  })
})
```

## Trust Proxy Setting

Express uses the `trust proxy` setting to determine how to handle proxy headers.

### Configuration Options

```javascript
const express = require('express')
const app = express()

// Option 1: Boolean - trust all proxies (NOT recommended for production)
app.set('trust proxy', true)

// Option 2: Number - trust N hops from front-facing proxy
app.set('trust proxy', 1)  // Trust first proxy
app.set('trust proxy', 2)  // Trust first two proxies

// Option 3: String - trust specific subnets
app.set('trust proxy', 'loopback')  // 127.0.0.1/8, ::1/128
app.set('trust proxy', 'linklocal') // 169.254.0.0/16, fe80::/10
app.set('trust proxy', 'uniquelocal') // 10.0.0.0/8, 172.16.0.0/12, etc.

// Option 4: Array of addresses/subnets
app.set('trust proxy', ['loopback', '10.0.0.0/8', '172.16.0.0/12'])

// Option 5: Custom function
app.set('trust proxy', (ip) => {
  // Return true if IP should be trusted
  return ip === '127.0.0.1' || ip.startsWith('10.0.')
})

// Option 6: Comma-separated string
app.set('trust proxy', 'loopback, 10.0.0.0/8')
```

### Predefined Subnet Names

| Name | Addresses |
|------|-----------|
| `loopback` | 127.0.0.1/8, ::1/128 |
| `linklocal` | 169.254.0.0/16, fe80::/10 |
| `uniquelocal` | 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7 |

## X-Forwarded Headers

When `trust proxy` is enabled, Express reads these headers:

### X-Forwarded-For

Contains client IP and proxy chain:

```
X-Forwarded-For: client, proxy1, proxy2
```

```javascript
app.set('trust proxy', true)

app.get('/ip', (req, res) => {
  res.json({
    ip: req.ip,           // Client IP (leftmost trusted)
    ips: req.ips,         // Array: [client, proxy1, proxy2]
    remoteAddress: req.socket.remoteAddress  // Direct connection IP
  })
})
```

### X-Forwarded-Proto

Original protocol (http/https):

```
X-Forwarded-Proto: https
```

```javascript
app.get('/protocol', (req, res) => {
  res.json({
    protocol: req.protocol,  // 'https' from header
    secure: req.secure       // true if protocol is 'https'
  })
})
```

### X-Forwarded-Host

Original host header:

```
X-Forwarded-Host: example.com
```

```javascript
app.get('/host', (req, res) => {
  res.json({
    hostname: req.hostname,  // From X-Forwarded-Host if trusted
    host: req.get('host')    // Original Host header
  })
})
```

## Common Deployment Scenarios

### Nginx Reverse Proxy

**Nginx configuration:**

```nginx
upstream express_app {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    listen 443 ssl;
    server_name example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://express_app;

        # Forward headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Express configuration:**

```javascript
const app = express()

// Trust Nginx on localhost
app.set('trust proxy', 'loopback')

// Or trust specific IP
app.set('trust proxy', '127.0.0.1')
```

### AWS Application Load Balancer

**Express configuration:**

```javascript
const app = express()

// ALB adds one hop
app.set('trust proxy', 1)

// Or trust AWS VPC range
app.set('trust proxy', '10.0.0.0/8')
```

### Cloudflare

**Express configuration:**

```javascript
const app = express()

// Cloudflare IP ranges (keep updated)
const cloudflareIPs = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22'
]

app.set('trust proxy', cloudflareIPs)

// Use CF-Connecting-IP header for real client IP
app.use((req, res, next) => {
  req.clientIP = req.get('CF-Connecting-IP') || req.ip
  next()
})
```

### Heroku

```javascript
const app = express()

// Heroku has one proxy layer
app.set('trust proxy', 1)
```

### Docker with Traefik

```javascript
const app = express()

// Trust Docker network
app.set('trust proxy', '172.16.0.0/12')
```

### Multiple Proxy Layers

```
Client → CDN → Load Balancer → Nginx → Express
```

```javascript
// Trust 3 proxy hops
app.set('trust proxy', 3)

// Or be explicit about each layer
app.set('trust proxy', [
  '104.16.0.0/13',    // Cloudflare
  '10.0.0.0/8',       // AWS ALB
  '172.17.0.0/16'     // Docker
])
```

## Security Considerations

### Never Trust All Proxies Blindly

```javascript
// DANGEROUS in production
app.set('trust proxy', true)
```

This allows any client to spoof their IP by setting X-Forwarded-For.

### Validate Proxy Headers

```javascript
// Custom validation middleware
const validateProxyHeaders = (req, res, next) => {
  const forwardedFor = req.get('X-Forwarded-For')

  if (forwardedFor) {
    // Check for suspicious patterns
    const ips = forwardedFor.split(',').map(ip => ip.trim())

    for (const ip of ips) {
      // Reject if contains invalid characters
      if (!/^[\d.:a-fA-F]+$/.test(ip)) {
        return res.status(400).json({ error: 'Invalid X-Forwarded-For' })
      }
    }
  }

  next()
}

app.use(validateProxyHeaders)
```

### Rate Limiting with Correct IP

```javascript
const rateLimit = require('express-rate-limit')

// Ensure trust proxy is set BEFORE rate limiter
app.set('trust proxy', 1)

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  // Use correct IP for rate limiting
  keyGenerator: (req) => req.ip,
  // Skip trusted IPs
  skip: (req) => req.ip === '127.0.0.1'
})

app.use(limiter)
```

### Secure Cookie Configuration

```javascript
app.set('trust proxy', 1)

app.use(session({
  secret: 'secret',
  cookie: {
    secure: true,      // Requires HTTPS
    sameSite: 'strict',
    httpOnly: true
  },
  // Trust proxy for secure cookies
  proxy: true
}))
```

## Debugging Proxy Issues

### Diagnostic Endpoint

```javascript
app.get('/debug/proxy', (req, res) => {
  res.json({
    // Request properties
    ip: req.ip,
    ips: req.ips,
    protocol: req.protocol,
    secure: req.secure,
    hostname: req.hostname,

    // Raw headers
    headers: {
      'x-forwarded-for': req.get('X-Forwarded-For'),
      'x-forwarded-proto': req.get('X-Forwarded-Proto'),
      'x-forwarded-host': req.get('X-Forwarded-Host'),
      'x-real-ip': req.get('X-Real-IP'),
      'host': req.get('Host')
    },

    // Socket info
    socket: {
      remoteAddress: req.socket.remoteAddress,
      remotePort: req.socket.remotePort
    },

    // App settings
    trustProxy: req.app.get('trust proxy')
  })
})
```

### Common Issues

**Issue: req.ip returns proxy IP**
```javascript
// Solution: Enable trust proxy
app.set('trust proxy', 1)
```

**Issue: req.protocol always 'http'**
```javascript
// Solution: Configure proxy to send X-Forwarded-Proto
// Nginx: proxy_set_header X-Forwarded-Proto $scheme;
```

**Issue: Secure cookies not working**
```javascript
// Solution: Trust proxy AND set cookie secure
app.set('trust proxy', 1)
app.use(session({
  cookie: { secure: true },
  proxy: true
}))
```

**Issue: Wrong hostname in redirects**
```javascript
// Solution: Use X-Forwarded-Host
// Nginx: proxy_set_header X-Forwarded-Host $host;
```

## Complete Production Setup

```javascript
const express = require('express')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const app = express()

// ===========================================
// Proxy Configuration (MUST be first)
// ===========================================

// Determine environment
const isProduction = process.env.NODE_ENV === 'production'

if (isProduction) {
  // Trust specific proxy configuration
  const trustedProxies = process.env.TRUSTED_PROXIES
    ? process.env.TRUSTED_PROXIES.split(',')
    : ['loopback']

  app.set('trust proxy', trustedProxies)
}

// ===========================================
// Security Middleware
// ===========================================

app.use(helmet())

// Rate limiting (uses req.ip which needs trust proxy)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
}))

// ===========================================
// Request Logging with Real IP
// ===========================================

app.use((req, res, next) => {
  const clientIP = req.ip
  const method = req.method
  const url = req.originalUrl
  const protocol = req.protocol

  console.log(`[${new Date().toISOString()}] ${clientIP} ${method} ${protocol}://${req.hostname}${url}`)

  next()
})

// ===========================================
// Routes
// ===========================================

app.get('/', (req, res) => {
  res.json({
    message: 'Hello',
    clientIP: req.ip,
    secure: req.secure
  })
})

// HTTPS redirect (handled by proxy, but fallback)
app.use((req, res, next) => {
  if (isProduction && !req.secure) {
    return res.redirect(301, `https://${req.hostname}${req.originalUrl}`)
  }
  next()
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Trust proxy: ${app.get('trust proxy')}`)
})
```

## Environment Variables

```bash
# .env
NODE_ENV=production
PORT=3000

# Proxy configuration
TRUSTED_PROXIES=loopback,10.0.0.0/8

# Or for specific providers
# TRUSTED_PROXIES=173.245.48.0/20,103.21.244.0/22  # Cloudflare
```

## Quick Reference

| Scenario | trust proxy Setting |
|----------|---------------------|
| No proxy (direct) | `false` (default) |
| Single proxy (Nginx local) | `'loopback'` or `1` |
| Cloud load balancer | `1` or specific CIDR |
| Cloudflare | Cloudflare IP ranges |
| Multiple layers | Number of hops or array |
| Custom validation | Function |

## Related Topics

- [Security Best Practices](../security/README.md)
- [Production Deployment](../production/README.md)
- [Rate Limiting](../../middleware/third-party/rate-limiter/README.md)
