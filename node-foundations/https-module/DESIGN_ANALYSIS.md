# HTTPS Module Design Analysis

This document analyzes the design decisions, security architecture, and TLS implementation of Node.js's `https` module.

---

## Architectural Overview

### Module Relationship

```
┌─────────────────────────────────────────────────────────────────┐
│                        https module                              │
│  (High-level HTTPS API)                                         │
├─────────────────────────────────────────────────────────────────┤
│                         tls module                               │
│  (TLS/SSL implementation, wraps OpenSSL)                        │
├─────────────────────────────────────────────────────────────────┤
│                        http module                               │
│  (HTTP protocol handling)                                       │
├─────────────────────────────────────────────────────────────────┤
│                        net module                                │
│  (TCP socket handling)                                          │
├─────────────────────────────────────────────────────────────────┤
│                        OpenSSL                                   │
│  (Native cryptographic library)                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Class Inheritance

```
events.EventEmitter
        │
        └── net.Server
                │
                └── tls.Server
                        │
                        └── https.Server
```

The `https.Server` inherits all capabilities from the chain above, adding:
- Certificate management
- Secure context handling
- TLS-specific events

---

## TLS Handshake Process

Understanding the TLS handshake is crucial for debugging connection issues:

```
Client                                          Server
   │                                               │
   │───── ClientHello ────────────────────────────►│
   │      (supported versions, ciphers, random)    │
   │                                               │
   │◄──── ServerHello ─────────────────────────────│
   │      (chosen version, cipher, random)         │
   │                                               │
   │◄──── Certificate ─────────────────────────────│
   │      (server's X.509 certificate)             │
   │                                               │
   │◄──── ServerKeyExchange ───────────────────────│
   │      (key exchange parameters)                │
   │                                               │
   │◄──── CertificateRequest (optional) ───────────│
   │      (for mutual TLS)                         │
   │                                               │
   │◄──── ServerHelloDone ─────────────────────────│
   │                                               │
   │───── Certificate (if requested) ─────────────►│
   │                                               │
   │───── ClientKeyExchange ──────────────────────►│
   │      (encrypted pre-master secret)            │
   │                                               │
   │───── ChangeCipherSpec ───────────────────────►│
   │───── Finished ───────────────────────────────►│
   │                                               │
   │◄──── ChangeCipherSpec ────────────────────────│
   │◄──── Finished ────────────────────────────────│
   │                                               │
   │◄════ Encrypted Application Data ═════════════►│
   │                                               │
```

### TLS 1.3 (Simplified)

TLS 1.3 reduces round-trips:

```
Client                                          Server
   │                                               │
   │───── ClientHello + KeyShare ─────────────────►│
   │                                               │
   │◄──── ServerHello + KeyShare ──────────────────│
   │◄──── EncryptedExtensions ─────────────────────│
   │◄──── Certificate ─────────────────────────────│
   │◄──── CertificateVerify ───────────────────────│
   │◄──── Finished ────────────────────────────────│
   │                                               │
   │───── Finished ───────────────────────────────►│
   │                                               │
   │◄════ Encrypted Application Data ═════════════►│
```

---

## Security Design Decisions

### Certificate Validation

Node.js validates certificates against the system's CA store by default:

```javascript
// Default behavior: validates against system CAs
https.get('https://example.com', (res) => {
  // Connection established only if certificate is valid
})

// Certificate validation checks:
// 1. Certificate is not expired
// 2. Certificate is signed by trusted CA
// 3. Certificate hostname matches request hostname
// 4. Certificate is not revoked (if OCSP configured)
```

### Why Certificate Pinning?

```javascript
// Certificate pinning prevents MITM even if CA is compromised
const https = require('https')
const crypto = require('crypto')

const expectedFingerprint = 'AA:BB:CC:DD:...'

const options = {
  hostname: 'api.example.com',
  port: 443,
  checkServerIdentity: (host, cert) => {
    const fingerprint = cert.fingerprint256

    if (fingerprint !== expectedFingerprint) {
      throw new Error('Certificate fingerprint mismatch')
    }

    // Also check hostname
    const err = tls.checkServerIdentity(host, cert)
    if (err) throw err
  }
}

https.request(options, (res) => {
  // Proceed only if fingerprint matches
})
```

### Cipher Suite Selection

The order and selection of cipher suites impacts security:

```javascript
const https = require('https')

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),

  // Modern, secure cipher suites
  ciphers: [
    // TLS 1.3 ciphers (automatic in Node.js 12+)
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256',

    // TLS 1.2 ciphers
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256'
  ].join(':'),

  // Server decides cipher order
  honorCipherOrder: true,

  // Minimum TLS version
  minVersion: 'TLSv1.2'
}
```

**Cipher Suite Anatomy:**
```
ECDHE-RSA-AES256-GCM-SHA384
  │     │    │    │    │
  │     │    │    │    └── Hash algorithm (SHA-384)
  │     │    │    └─────── Mode (GCM = authenticated encryption)
  │     │    └──────────── Encryption (AES-256)
  │     └───────────────── Authentication (RSA certificate)
  └─────────────────────── Key Exchange (Elliptic Curve Diffie-Hellman Ephemeral)
```

---

## Performance Optimization

### Session Resumption

TLS handshakes are expensive. Session resumption reduces overhead:

```javascript
// Session Tickets (stateless)
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),

  // 48 bytes of random data for ticket encryption
  ticketKeys: crypto.randomBytes(48),

  // Session ticket lifetime
  sessionTimeout: 300 // 5 minutes
}

// With session tickets:
// 1. First connection: Full handshake (~100ms)
// 2. Subsequent: Abbreviated handshake (~30ms)
```

**Session Resumption Flow:**

```
First Connection (Full Handshake):
Client ──────► Server
       ClientHello
       ◄─────── ServerHello
                Certificate
                ServerHelloDone
       ClientKeyExchange
       ChangeCipherSpec
       Finished ──────►
       ◄────── ChangeCipherSpec
               Finished
               NewSessionTicket  ← Server sends ticket
       ◄══════ Application Data ══════►

Resumed Connection:
Client ──────► Server
       ClientHello + SessionTicket
       ◄─────── ServerHello
                ChangeCipherSpec
                Finished
       ChangeCipherSpec
       Finished ──────►
       ◄══════ Application Data ══════►  ← Fewer round-trips
```

### OCSP Stapling

Certificate revocation checking without extra round-trips:

```javascript
const https = require('https')
const ocsp = require('ocsp')

// Without stapling: Client must check OCSP server
// With stapling: Server includes OCSP response

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}

const server = https.createServer(options, app)

// OCSP stapling requires manual implementation in Node.js
// or use a library like 'ocsp'
```

### Connection Pooling

```javascript
// Create persistent agent for connection reuse
const httpsAgent = new https.Agent({
  keepAlive: true,      // Reuse connections
  maxSockets: 100,      // Max parallel connections per host
  maxFreeSockets: 10,   // Max idle connections to keep
  timeout: 60000,       // Socket timeout

  // Session caching (enabled by default)
  maxCachedSessions: 100
})

// All requests use pooled connections
https.get({ hostname: 'api.example.com', agent: httpsAgent }, (res) => {
  // Uses existing connection if available
})
```

---

## SNI (Server Name Indication)

SNI allows one IP to serve multiple HTTPS domains:

### How SNI Works

```
Client                                          Server
   │                                               │
   │───── ClientHello ────────────────────────────►│
   │      extensions: {                            │
   │        server_name: "example.com"             │
   │      }                                        │
   │                                               │
   │      Server selects certificate based on SNI  │
   │                                               │
   │◄──── Certificate (for example.com) ───────────│
```

### Implementation

```javascript
const https = require('https')
const tls = require('tls')

// Certificates for each domain
const domains = {
  'shop.example.com': {
    key: fs.readFileSync('shop-key.pem'),
    cert: fs.readFileSync('shop-cert.pem')
  },
  'api.example.com': {
    key: fs.readFileSync('api-key.pem'),
    cert: fs.readFileSync('api-cert.pem')
  }
}

// Default certificate
const defaultCert = domains['shop.example.com']

const options = {
  ...defaultCert,

  SNICallback: (servername, callback) => {
    const domainCert = domains[servername]

    if (domainCert) {
      const ctx = tls.createSecureContext(domainCert)
      callback(null, ctx)
    } else {
      // Use default or reject
      callback(null, tls.createSecureContext(defaultCert))
    }
  }
}

https.createServer(options, (req, res) => {
  // Route based on req.headers.host
}).listen(443)
```

---

## Mutual TLS (mTLS) Architecture

mTLS provides bidirectional authentication:

```
┌─────────────┐                           ┌─────────────┐
│   Client    │                           │   Server    │
│             │                           │             │
│ ┌─────────┐ │    1. ServerHello +       │ ┌─────────┐ │
│ │ Client  │ │       Certificate         │ │ Server  │ │
│ │   Key   │ │◄──────────────────────────│ │   Key   │ │
│ └─────────┘ │                           │ └─────────┘ │
│ ┌─────────┐ │                           │ ┌─────────┐ │
│ │ Client  │ │    2. CertificateRequest  │ │ Server  │ │
│ │  Cert   │ │◄──────────────────────────│ │  Cert   │ │
│ └─────────┘ │                           │ └─────────┘ │
│             │    3. Client Certificate  │             │
│             │──────────────────────────►│ ┌─────────┐ │
│             │                           │ │   CA    │ │
│             │    Server validates       │ │  Cert   │ │
│             │    against CA             │ └─────────┘ │
└─────────────┘                           └─────────────┘
```

### Server Configuration

```javascript
const https = require('https')

const options = {
  key: fs.readFileSync('server-key.pem'),
  cert: fs.readFileSync('server-cert.pem'),

  // CA that signed client certificates
  ca: fs.readFileSync('client-ca.pem'),

  // Require client certificate
  requestCert: true,

  // Reject if certificate invalid
  rejectUnauthorized: true
}

const server = https.createServer(options, (req, res) => {
  // Access client certificate
  const cert = req.socket.getPeerCertificate()

  if (req.client.authorized) {
    // Client authenticated
    const clientId = cert.subject.CN
    res.end(`Hello, ${clientId}`)
  } else {
    // Shouldn't reach here if rejectUnauthorized: true
    res.writeHead(401)
    res.end('Unauthorized')
  }
})
```

### Client Configuration

```javascript
const https = require('https')

const options = {
  hostname: 'api.example.com',
  port: 443,
  path: '/',

  // Client certificate
  key: fs.readFileSync('client-key.pem'),
  cert: fs.readFileSync('client-cert.pem'),

  // Server CA (to validate server certificate)
  ca: fs.readFileSync('server-ca.pem')
}

https.request(options, (res) => {
  // Mutual authentication established
}).end()
```

---

## Security Considerations

### Protocol Downgrade Prevention

```javascript
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),

  // Prevent downgrade attacks
  minVersion: 'TLSv1.2',  // No TLS 1.0/1.1

  // Disable legacy protocols explicitly
  secureOptions:
    crypto.constants.SSL_OP_NO_SSLv2 |
    crypto.constants.SSL_OP_NO_SSLv3 |
    crypto.constants.SSL_OP_NO_TLSv1 |
    crypto.constants.SSL_OP_NO_TLSv1_1
}
```

### Certificate Chain Validation

```javascript
// Complete certificate chain
const options = {
  key: fs.readFileSync('server-key.pem'),

  // Full chain: server cert + intermediate CAs
  cert: [
    fs.readFileSync('server-cert.pem'),
    fs.readFileSync('intermediate-ca.pem')
  ],

  // Root CA (optional, usually in system store)
  ca: fs.readFileSync('root-ca.pem')
}
```

**Chain Structure:**
```
┌─────────────────┐
│    Root CA      │ ← Trust anchor (in system store)
│  (self-signed)  │
└────────┬────────┘
         │ signs
         ▼
┌─────────────────┐
│ Intermediate CA │ ← Included in cert chain
└────────┬────────┘
         │ signs
         ▼
┌─────────────────┐
│ Server Cert     │ ← Your server certificate
└─────────────────┘
```

### Private Key Protection

```javascript
const https = require('https')
const crypto = require('crypto')

// Encrypted private key
const encryptedKey = fs.readFileSync('encrypted-key.pem')

const options = {
  // Provide passphrase for encrypted key
  key: encryptedKey,
  passphrase: process.env.KEY_PASSPHRASE,  // From environment

  cert: fs.readFileSync('cert.pem')
}

// Or use hardware security module (HSM)
// const engine = crypto.createSign('RSA-SHA256')
// engine.setEngine('pkcs11', crypto.constants.ENGINE_METHOD_ALL)
```

---

## Error Handling Patterns

### TLS-Specific Errors

```javascript
const server = https.createServer(options, app)

// TLS client error (bad certificate, handshake failure)
server.on('tlsClientError', (err, tlsSocket) => {
  console.error('TLS Client Error:', err.message)
  console.error('Client IP:', tlsSocket.remoteAddress)

  // Common errors:
  // - UNABLE_TO_VERIFY_LEAF_SIGNATURE: Self-signed cert
  // - CERT_HAS_EXPIRED: Certificate expired
  // - DEPTH_ZERO_SELF_SIGNED_CERT: Self-signed, no CA
  // - ERR_TLS_CERT_ALTNAME_INVALID: Hostname mismatch
})

// Successful secure connection
server.on('secureConnection', (tlsSocket) => {
  console.log('Secure connection from:', tlsSocket.remoteAddress)
  console.log('Protocol:', tlsSocket.getProtocol())
  console.log('Cipher:', tlsSocket.getCipher().name)
})

// Client certificate error
server.on('clientError', (err, socket) => {
  if (err.code === 'ECONNRESET') {
    console.log('Client disconnected unexpectedly')
  }
})
```

### Client-Side Error Handling

```javascript
const https = require('https')

const req = https.request(options, (res) => {
  // Success
})

req.on('error', (err) => {
  switch (err.code) {
    case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
      console.error('Server certificate not trusted')
      break
    case 'CERT_HAS_EXPIRED':
      console.error('Server certificate has expired')
      break
    case 'ERR_TLS_CERT_ALTNAME_INVALID':
      console.error('Hostname does not match certificate')
      break
    case 'ECONNREFUSED':
      console.error('Connection refused')
      break
    case 'ETIMEDOUT':
      console.error('Connection timed out')
      break
    default:
      console.error('TLS Error:', err.message)
  }
})

req.end()
```

---

## Comparison: HTTPS vs HTTP

| Aspect | HTTP | HTTPS |
|--------|------|-------|
| Port | 80 | 443 |
| Encryption | None | TLS |
| Certificate | Not required | Required |
| Performance | Faster (no handshake) | Slower (TLS overhead) |
| CPU Usage | Lower | Higher (encryption) |
| Caching | CDN/Proxy friendly | Requires termination |
| SEO | Lower ranking | Higher ranking |
| Required for | Static content | Auth, payments, PII |

**Performance Impact:**
- TLS handshake: ~100-200ms additional latency (first connection)
- Session resumption: ~30-50ms (subsequent connections)
- Encryption overhead: ~1-5% CPU increase
- HTTP/2 (requires HTTPS): Often faster than HTTP/1.1

---

## Express.js HTTPS Patterns

### Complete Production Setup

```javascript
const express = require('express')
const https = require('https')
const http = require('http')
const fs = require('fs')
const helmet = require('helmet')

const app = express()

// Security headers
app.use(helmet())

// HSTS
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true
}))

// Trust proxy (for load balancers)
app.set('trust proxy', 1)

// HTTPS redirect middleware
app.use((req, res, next) => {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    next()
  } else {
    res.redirect(301, `https://${req.hostname}${req.url}`)
  }
})

// Application routes
app.get('/', (req, res) => {
  res.json({
    secure: req.secure,
    protocol: req.protocol,
    ip: req.ip
  })
})

// Load certificates
const httpsOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/domain.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/domain.com/fullchain.pem'),
  minVersion: 'TLSv1.2'
}

// Start servers
http.createServer(app).listen(80)
https.createServer(httpsOptions, app).listen(443, () => {
  console.log('HTTPS server running on port 443')
})
```

---

## Key Takeaways

1. **HTTPS wraps HTTP with TLS** - Same API, added encryption
2. **Certificates are essential** - No encryption without valid certificates
3. **TLS handshake has overhead** - Use session resumption
4. **SNI enables virtual hosting** - Multiple domains on one IP
5. **mTLS adds client authentication** - For API security
6. **Keep certificates updated** - Expiry causes outages
7. **Use modern TLS versions** - TLS 1.2 minimum, prefer 1.3
8. **Proper error handling** - TLS errors are common in production

---

## Further Reading

- [TLS 1.3 Specification (RFC 8446)](https://tools.ietf.org/html/rfc8446)
- [Node.js TLS Documentation](https://nodejs.org/api/tls.html)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

*HTTPS security depends on proper configuration. Default settings are secure, but production requires attention to certificates, protocols, and cipher suites.*
