# HTTPS Module

The `https` module provides HTTPS (HTTP over TLS/SSL) support in Node.js. It mirrors the `http` module API but adds encryption for secure communication.

## Overview

HTTPS encrypts HTTP traffic using TLS (Transport Layer Security), protecting data from eavesdropping and tampering. The `https` module extends `http` with certificate management and secure connections.

## Express Connection

```javascript
// Express with HTTPS
const https = require('https')
const fs = require('fs')
const express = require('express')

const app = express()

const options = {
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem')
}

// Create HTTPS server with Express
https.createServer(options, app).listen(443)

// Or serve both HTTP and HTTPS
const http = require('http')
http.createServer(app).listen(80)
https.createServer(options, app).listen(443)
```

## Core Components

### https.createServer()

Creates an HTTPS server with TLS options:

```javascript
const https = require('https')
const fs = require('fs')

const options = {
  // Required: Private key
  key: fs.readFileSync('server-key.pem'),

  // Required: Certificate
  cert: fs.readFileSync('server-cert.pem'),

  // Optional: CA certificate chain
  ca: fs.readFileSync('ca-cert.pem'),

  // Optional: Require client certificates
  requestCert: true,
  rejectUnauthorized: true
}

const server = https.createServer(options, (req, res) => {
  res.writeHead(200)
  res.end('Secure Hello World')
})

server.listen(443, () => {
  console.log('HTTPS server running on port 443')
})
```

### TLS Options

| Option | Type | Description |
|--------|------|-------------|
| `key` | string/Buffer | Private key in PEM format |
| `cert` | string/Buffer | Certificate in PEM format |
| `ca` | string/Buffer/Array | CA certificates |
| `passphrase` | string | Passphrase for encrypted key |
| `requestCert` | boolean | Request client certificate |
| `rejectUnauthorized` | boolean | Reject unauthorized clients |
| `secureProtocol` | string | SSL/TLS protocol to use |
| `ciphers` | string | Cipher suites to use |

### Certificate Information

```javascript
const server = https.createServer(options, (req, res) => {
  // Access TLS socket info
  const socket = req.socket

  // Check if connection is encrypted
  console.log('Encrypted:', socket.encrypted)

  // Get protocol version
  console.log('Protocol:', socket.getProtocol())

  // Get cipher info
  console.log('Cipher:', socket.getCipher())

  // Client certificate (if requestCert: true)
  const clientCert = socket.getPeerCertificate()
  if (clientCert.subject) {
    console.log('Client CN:', clientCert.subject.CN)
  }

  res.end('Secure')
})
```

## Generating Certificates

### Self-Signed Certificate (Development)

```bash
# Generate private key
openssl genrsa -out private-key.pem 2048

# Generate self-signed certificate
openssl req -new -x509 -key private-key.pem -out certificate.pem -days 365

# One-liner
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
```

### Using mkcert (Development)

```bash
# Install mkcert
brew install mkcert  # macOS
# or
choco install mkcert # Windows

# Install local CA
mkcert -install

# Generate certificate for localhost
mkcert localhost 127.0.0.1 ::1
```

### Let's Encrypt (Production)

```bash
# Using certbot
sudo certbot certonly --standalone -d yourdomain.com

# Certificates stored at:
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
```

## Basic Patterns

### Simple HTTPS Server

```javascript
const https = require('https')
const fs = require('fs')

const options = {
  key: fs.readFileSync('./ssl/key.pem'),
  cert: fs.readFileSync('./ssl/cert.pem')
}

const server = https.createServer(options, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end('<h1>Secure Hello World</h1>')
})

server.listen(443, () => {
  console.log('HTTPS Server running on https://localhost:443')
})
```

### HTTP to HTTPS Redirect

```javascript
const http = require('http')
const https = require('https')
const fs = require('fs')

// HTTPS server
const httpsOptions = {
  key: fs.readFileSync('./ssl/key.pem'),
  cert: fs.readFileSync('./ssl/cert.pem')
}

const app = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Secure content')
}

https.createServer(httpsOptions, app).listen(443)

// HTTP redirect server
http.createServer((req, res) => {
  const host = req.headers.host.replace(/:\d+$/, '')
  res.writeHead(301, {
    'Location': `https://${host}${req.url}`
  })
  res.end()
}).listen(80)
```

### Express with HTTP/HTTPS

```javascript
const express = require('express')
const http = require('http')
const https = require('https')
const fs = require('fs')

const app = express()

// Middleware to enforce HTTPS
app.use((req, res, next) => {
  if (!req.secure && req.get('X-Forwarded-Proto') !== 'https') {
    return res.redirect(`https://${req.get('Host')}${req.url}`)
  }
  next()
})

app.get('/', (req, res) => {
  res.send('Secure Express!')
})

// Load certificates
const httpsOptions = {
  key: fs.readFileSync('./ssl/key.pem'),
  cert: fs.readFileSync('./ssl/cert.pem')
}

// Start both servers
http.createServer(app).listen(80)
https.createServer(httpsOptions, app).listen(443)
```

## HTTPS Client

### Making HTTPS Requests

```javascript
const https = require('https')

// Simple GET request
https.get('https://api.github.com/users/nodejs', {
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = ''

  res.on('data', chunk => data += chunk)

  res.on('end', () => {
    console.log(JSON.parse(data))
  })
}).on('error', (err) => {
  console.error('Error:', err.message)
})

// POST request
const options = {
  hostname: 'api.example.com',
  port: 443,
  path: '/data',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}

const req = https.request(options, (res) => {
  let data = ''
  res.on('data', chunk => data += chunk)
  res.on('end', () => console.log(data))
})

req.on('error', (err) => console.error(err))
req.write(JSON.stringify({ key: 'value' }))
req.end()
```

### Custom Certificate Validation

```javascript
const https = require('https')

const options = {
  hostname: 'api.example.com',
  port: 443,
  path: '/',
  method: 'GET',

  // Custom CA (for internal/self-signed certs)
  ca: fs.readFileSync('custom-ca.pem'),

  // Or disable verification (NEVER in production!)
  // rejectUnauthorized: false,

  // Check server identity
  checkServerIdentity: (hostname, cert) => {
    // Custom hostname verification
    if (cert.subject.CN !== hostname) {
      throw new Error('Certificate CN mismatch')
    }
  }
}

https.request(options, (res) => {
  // Handle response
}).end()
```

## TLS Configuration

### Secure Defaults (Node.js 12+)

```javascript
const https = require('https')
const tls = require('tls')

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),

  // Minimum TLS version (Node.js 12+)
  minVersion: 'TLSv1.2',

  // Modern cipher suites
  ciphers: [
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384'
  ].join(':'),

  // Honor server cipher order
  honorCipherOrder: true,

  // Enable OCSP stapling
  // (requires additional setup)
}

https.createServer(options, app).listen(443)
```

### Security Headers (Express)

```javascript
const helmet = require('helmet')
const app = express()

// Helmet sets security headers
app.use(helmet())

// HSTS - Force HTTPS for future requests
app.use(helmet.hsts({
  maxAge: 31536000, // 1 year
  includeSubDomains: true,
  preload: true
}))

// Manual HSTS
app.use((req, res, next) => {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  )
  next()
})
```

## Certificate Management

### Loading Certificates Dynamically

```javascript
const https = require('https')
const fs = require('fs')

let serverOptions = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}

const server = https.createServer(serverOptions, app)

// Reload certificates (e.g., after Let's Encrypt renewal)
function reloadCertificates() {
  try {
    serverOptions.key = fs.readFileSync('key.pem')
    serverOptions.cert = fs.readFileSync('cert.pem')

    // Update server context
    server.setSecureContext(serverOptions)

    console.log('Certificates reloaded')
  } catch (err) {
    console.error('Failed to reload certificates:', err)
  }
}

// Reload on SIGHUP
process.on('SIGHUP', reloadCertificates)

// Or watch for file changes
fs.watch('./ssl', (eventType, filename) => {
  if (filename.endsWith('.pem')) {
    reloadCertificates()
  }
})
```

### SNI (Server Name Indication)

Serve multiple domains with different certificates:

```javascript
const https = require('https')
const tls = require('tls')

// Load certificates for each domain
const certs = {
  'domain1.com': {
    key: fs.readFileSync('domain1-key.pem'),
    cert: fs.readFileSync('domain1-cert.pem')
  },
  'domain2.com': {
    key: fs.readFileSync('domain2-key.pem'),
    cert: fs.readFileSync('domain2-cert.pem')
  }
}

// Default certificate
const defaultCert = certs['domain1.com']

const options = {
  ...defaultCert,

  SNICallback: (servername, callback) => {
    const ctx = certs[servername]
      ? tls.createSecureContext(certs[servername])
      : tls.createSecureContext(defaultCert)

    callback(null, ctx)
  }
}

https.createServer(options, app).listen(443)
```

## Mutual TLS (mTLS)

Client certificate authentication:

```javascript
const https = require('https')
const fs = require('fs')

const options = {
  key: fs.readFileSync('server-key.pem'),
  cert: fs.readFileSync('server-cert.pem'),
  ca: fs.readFileSync('client-ca.pem'),

  // Require client certificate
  requestCert: true,
  rejectUnauthorized: true
}

const server = https.createServer(options, (req, res) => {
  const cert = req.socket.getPeerCertificate()

  if (req.client.authorized) {
    res.writeHead(200)
    res.end(`Hello ${cert.subject.CN}`)
  } else {
    res.writeHead(401)
    res.end('Unauthorized')
  }
})

server.listen(443)
```

### mTLS Client

```javascript
const https = require('https')
const fs = require('fs')

const options = {
  hostname: 'api.example.com',
  port: 443,
  path: '/',
  method: 'GET',

  // Client certificate
  key: fs.readFileSync('client-key.pem'),
  cert: fs.readFileSync('client-cert.pem'),

  // Server CA
  ca: fs.readFileSync('server-ca.pem')
}

https.request(options, (res) => {
  // Handle response
}).end()
```

## Performance Considerations

### Session Resumption

```javascript
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),

  // Enable session tickets
  ticketKeys: crypto.randomBytes(48),

  // Session timeout
  sessionTimeout: 300 // 5 minutes
}

https.createServer(options, app).listen(443)
```

### Connection Keep-Alive

```javascript
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
})

// Use agent for all requests
https.get('https://api.example.com', { agent }, (res) => {
  // Handle response
})
```

## Debugging TLS Issues

### Logging TLS Events

```javascript
const server = https.createServer(options, app)

server.on('tlsClientError', (err, socket) => {
  console.error('TLS Client Error:', err.message)
})

server.on('secureConnection', (socket) => {
  console.log('Secure connection established')
  console.log('Protocol:', socket.getProtocol())
  console.log('Cipher:', socket.getCipher())
})
```

### Testing with OpenSSL

```bash
# Test connection
openssl s_client -connect localhost:443

# Check certificate
openssl s_client -connect localhost:443 -servername localhost

# Test specific protocol
openssl s_client -connect localhost:443 -tls1_2

# Check certificate details
openssl x509 -in certificate.pem -text -noout
```

## Common Patterns

### Let's Encrypt Auto-Renewal

```javascript
const { exec } = require('child_process')

// Check certificate expiry
function checkCertExpiry() {
  const certPath = '/etc/letsencrypt/live/domain.com/cert.pem'
  const cert = fs.readFileSync(certPath)

  // Parse certificate to check expiry
  // (simplified - use a proper library in production)
  exec(`openssl x509 -enddate -noout -in ${certPath}`, (err, stdout) => {
    const expiryDate = new Date(stdout.replace('notAfter=', '').trim())
    const daysUntilExpiry = (expiryDate - new Date()) / (1000 * 60 * 60 * 24)

    if (daysUntilExpiry < 30) {
      renewCertificate()
    }
  })
}

function renewCertificate() {
  exec('certbot renew --quiet', (err) => {
    if (!err) {
      // Reload certificates
      server.setSecureContext({
        key: fs.readFileSync('/etc/letsencrypt/live/domain.com/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/domain.com/fullchain.pem')
      })
    }
  })
}

// Check daily
setInterval(checkCertExpiry, 24 * 60 * 60 * 1000)
```

### Proxy with TLS Termination

```javascript
// Frontend: HTTPS termination
const https = require('https')
const httpProxy = require('http-proxy')

const proxy = httpProxy.createProxyServer({
  target: 'http://localhost:3000' // Backend HTTP
})

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}

https.createServer(options, (req, res) => {
  proxy.web(req, res)
}).listen(443)

// Backend receives plain HTTP
// TLS is handled by frontend proxy
```

## Express.js Integration

```javascript
const express = require('express')
const https = require('https')
const fs = require('fs')

const app = express()

// Trust proxy (for correct req.protocol behind load balancer)
app.set('trust proxy', 1)

// Force HTTPS middleware
app.use((req, res, next) => {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    next()
  } else {
    res.redirect(`https://${req.hostname}${req.url}`)
  }
})

// Routes
app.get('/', (req, res) => {
  res.json({
    secure: req.secure,
    protocol: req.protocol
  })
})

// Start HTTPS server
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}

https.createServer(options, app).listen(443, () => {
  console.log('HTTPS server running on port 443')
})
```

## Related Modules

- [http](../http-module/) - Base HTTP functionality
- [tls](https://nodejs.org/api/tls.html) - Low-level TLS/SSL
- [crypto](https://nodejs.org/api/crypto.html) - Cryptographic functions

## Next Steps

After understanding the https module:
1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md) for deeper insights
2. Test your knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Move to [events-module](../events-module/) for async patterns

---

*HTTPS is essential for production applications. Never serve sensitive data over plain HTTP.*
