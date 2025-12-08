# Helmet

Helmet helps secure Express apps by setting various HTTP security headers. It's a collection of smaller middleware functions.

## Installation

```bash
npm install helmet
```

## Basic Usage

```javascript
const express = require('express')
const helmet = require('helmet')

const app = express()

// Use all default protections
app.use(helmet())
```

## Default Headers

Helmet sets these headers by default:

| Header | Purpose |
|--------|---------|
| Content-Security-Policy | Prevents XSS attacks |
| Cross-Origin-Embedder-Policy | Controls embedding |
| Cross-Origin-Opener-Policy | Controls window relationships |
| Cross-Origin-Resource-Policy | Controls resource loading |
| Origin-Agent-Cluster | Requests process isolation |
| Referrer-Policy | Controls Referer header |
| Strict-Transport-Security | Enforces HTTPS |
| X-Content-Type-Options | Prevents MIME sniffing |
| X-DNS-Prefetch-Control | Controls DNS prefetching |
| X-Download-Options | IE download options |
| X-Frame-Options | Prevents clickjacking |
| X-Permitted-Cross-Domain-Policies | Adobe policies |
| X-Powered-By | Removed (hides Express) |
| X-XSS-Protection | Disabled (legacy) |

## Configuration

### Disable Specific Headers

```javascript
app.use(
  helmet({
    contentSecurityPolicy: false,  // Disable CSP
    crossOriginEmbedderPolicy: false
  })
)
```

### Content Security Policy

```javascript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.example.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'images.example.com'],
        fontSrc: ["'self'", 'fonts.gstatic.com'],
        connectSrc: ["'self'", 'api.example.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    }
  })
)
```

### HSTS (Strict Transport Security)

```javascript
app.use(
  helmet({
    strictTransportSecurity: {
      maxAge: 31536000,        // 1 year in seconds
      includeSubDomains: true,
      preload: true
    }
  })
)
```

### Frameguard (X-Frame-Options)

```javascript
app.use(
  helmet({
    frameguard: { action: 'deny' }  // Prevent all framing
    // frameguard: { action: 'sameorigin' }  // Allow same origin
  })
)
```

### Referrer Policy

```javascript
app.use(
  helmet({
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    // Options: no-referrer, no-referrer-when-downgrade, origin,
    // origin-when-cross-origin, same-origin, strict-origin,
    // strict-origin-when-cross-origin, unsafe-url
  })
)
```

### Cross-Origin Policies

```javascript
app.use(
  helmet({
    crossOriginEmbedderPolicy: { policy: 'require-corp' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' }
  })
)
```

## Individual Middleware

Use helmet middleware functions individually:

```javascript
const helmet = require('helmet')

// Only use specific middleware
app.use(helmet.contentSecurityPolicy())
app.use(helmet.dnsPrefetchControl())
app.use(helmet.frameguard())
app.use(helmet.hidePoweredBy())
app.use(helmet.hsts())
app.use(helmet.ieNoOpen())
app.use(helmet.noSniff())
app.use(helmet.originAgentCluster())
app.use(helmet.permittedCrossDomainPolicies())
app.use(helmet.referrerPolicy())
app.use(helmet.xssFilter())
```

## Common Configurations

### API Server

```javascript
app.use(
  helmet({
    contentSecurityPolicy: false,  // APIs don't serve HTML
    crossOriginResourcePolicy: { policy: 'cross-origin' }  // Allow API access
  })
)
```

### Web Application

```javascript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    }
  })
)
```

### With CDN Assets

```javascript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'cdnjs.cloudflare.com',
          'cdn.jsdelivr.net'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'cdnjs.cloudflare.com',
          'fonts.googleapis.com'
        ],
        fontSrc: [
          "'self'",
          'fonts.gstatic.com'
        ],
        imgSrc: [
          "'self'",
          'data:',
          'images.example.com'
        ]
      }
    }
  })
)
```

### Development Mode

```javascript
if (process.env.NODE_ENV === 'development') {
  app.use(
    helmet({
      contentSecurityPolicy: false  // Easier development
    })
  )
} else {
  app.use(helmet())  // Full protection in production
}
```

## CSP Nonce for Inline Scripts

```javascript
const crypto = require('crypto')

app.use((req, res, next) => {
  // Generate nonce for this request
  res.locals.nonce = crypto.randomBytes(16).toString('base64')
  next()
})

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`]
      }
    }
  })
)

// In template
// <script nonce="<%= nonce %>">...</script>
```

## Report-Only Mode

Test CSP without enforcing:

```javascript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        reportUri: '/csp-report'
      },
      reportOnly: true  // Don't block, just report
    }
  })
)

// Collect reports
app.post('/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
  console.log('CSP Violation:', req.body)
  res.status(204).end()
})
```

## Troubleshooting

### Inline Scripts Not Working

```javascript
// Allow inline scripts (less secure)
contentSecurityPolicy: {
  directives: {
    scriptSrc: ["'self'", "'unsafe-inline'"]
  }
}

// Better: Use nonces or hashes
```

### Fonts Not Loading

```javascript
contentSecurityPolicy: {
  directives: {
    fontSrc: ["'self'", 'fonts.gstatic.com']
  }
}
```

### Images Not Loading

```javascript
contentSecurityPolicy: {
  directives: {
    imgSrc: ["'self'", 'data:', 'https://images.example.com']
  }
}
```

## Related

- [cors](../cors/) - Cross-origin requests
- [rate-limiter](../rate-limiter/) - Rate limiting

---

*Helmet is essential for securing Express applications in production.*
