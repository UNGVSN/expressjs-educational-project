# HTTPS Module - Advanced Topics

Advanced TLS/SSL features including OCSP stapling, certificate pinning, and TLS 1.3 configuration.

## OCSP Stapling

Online Certificate Status Protocol (OCSP) stapling improves TLS handshake performance and privacy by having the server provide certificate revocation status.

### How OCSP Stapling Works

```
Traditional OCSP:
Client -> Server (TLS handshake)
Client -> OCSP Responder (status check) <- Privacy concern
Client continues or aborts

OCSP Stapling:
Server periodically -> OCSP Responder (gets stapled response)
Client -> Server (TLS handshake + stapled OCSP response)
Client verifies locally
```

### Implementing OCSP Stapling

```javascript
const https = require('https')
const tls = require('tls')
const fs = require('fs')
const crypto = require('crypto')

// Certificate options
const options = {
  key: fs.readFileSync('server-key.pem'),
  cert: fs.readFileSync('server-cert.pem'),
  ca: fs.readFileSync('ca-cert.pem')
}

const server = https.createServer(options)

// Handle OCSP requests
server.on('OCSPRequest', (certificate, issuer, callback) => {
  // Build OCSP request
  const ocspRequest = buildOCSPRequest(certificate, issuer)

  // Fetch OCSP response from CA's OCSP responder
  fetchOCSPResponse(ocspRequest, certificate)
    .then(ocspResponse => {
      callback(null, ocspResponse)
    })
    .catch(err => {
      console.error('OCSP error:', err)
      callback(err)
    })
})

async function fetchOCSPResponse(request, certificate) {
  // Extract OCSP responder URL from certificate
  const ocspUrl = getOCSPUrl(certificate)

  if (!ocspUrl) {
    throw new Error('No OCSP responder URL in certificate')
  }

  // Make OCSP request
  const response = await fetch(ocspUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/ocsp-request'
    },
    body: request
  })

  return Buffer.from(await response.arrayBuffer())
}

function getOCSPUrl(certificate) {
  // Parse certificate to extract OCSP URL
  // This is simplified - use a proper ASN.1 parser
  const certInfo = tls.parseCertString(certificate)
  // Extract from Authority Information Access extension
  return certInfo.ocspUrl
}

function buildOCSPRequest(certificate, issuer) {
  // Build OCSP request structure
  // This is simplified - use a library like 'ocsp' in production
  const certId = crypto.createHash('sha1')
    .update(certificate)
    .digest()

  return Buffer.concat([
    // OCSP request header
    Buffer.from([0x30, 0x82]),
    // Certificate ID
    certId
  ])
}

server.listen(443)
```

### Using the 'ocsp' Package

```javascript
const https = require('https')
const ocsp = require('ocsp')
const fs = require('fs')

const cert = fs.readFileSync('server-cert.pem')
const key = fs.readFileSync('server-key.pem')
const ca = fs.readFileSync('ca-cert.pem')

// Create OCSP cache
const cache = new ocsp.Cache()

const server = https.createServer({
  cert,
  key,
  ca
})

server.on('OCSPRequest', (certificate, issuer, callback) => {
  ocsp.getOCSPURI(certificate, (err, uri) => {
    if (err) return callback(err)

    // Check cache first
    const cached = cache.get(certificate)
    if (cached) {
      return callback(null, cached)
    }

    // Request from OCSP responder
    const req = ocsp.request.generate(certificate, issuer)

    ocsp.request.send(uri, req.data, (err, response) => {
      if (err) return callback(err)

      // Cache response
      cache.set(certificate, response)

      callback(null, response)
    })
  })
})

server.listen(443)
```

### OCSP Must-Staple

```javascript
// Certificate with OCSP Must-Staple extension
// Clients MUST receive valid OCSP response or reject connection

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert-with-must-staple.pem'),

  // Ensure we always have OCSP response
  // If stapling fails, connection may be rejected by clients
}

server.on('OCSPRequest', async (cert, issuer, callback) => {
  try {
    const response = await getOCSPResponse(cert, issuer)
    callback(null, response)
  } catch (err) {
    // With Must-Staple, this is critical
    console.error('CRITICAL: OCSP stapling failed:', err)
    callback(err)
  }
})
```

## Certificate Pinning

Certificate pinning ensures your application only accepts specific certificates, preventing man-in-the-middle attacks.

### Public Key Pinning (Client-Side)

```javascript
const https = require('https')
const crypto = require('crypto')

// Expected certificate fingerprints (SHA-256)
const PINNED_CERTS = new Set([
  'sha256//YLh1dUR9y6Kja30RrAn7JKnbQG/uEtLMkBgFF2Fuihg=',
  'sha256//sRHdihwgkaib1P1gxX8HFszlD+7/gTfNvuAybgLPNis=',
  // Backup pin
  'sha256//backup-pin-base64'
])

function checkServerIdentity(hostname, cert) {
  // Calculate certificate fingerprint
  const fingerprint = calculateFingerprint(cert)

  if (!PINNED_CERTS.has(fingerprint)) {
    const err = new Error('Certificate pin validation failed')
    err.code = 'CERT_PIN_FAILED'
    throw err
  }

  // Also perform standard hostname verification
  const { checkServerIdentity } = require('tls')
  return checkServerIdentity(hostname, cert)
}

function calculateFingerprint(cert) {
  // Extract public key from certificate
  const pubKey = cert.pubkey

  // SHA-256 hash of public key
  const hash = crypto.createHash('sha256')
    .update(pubKey)
    .digest('base64')

  return `sha256//${hash}`
}

// Use in requests
const options = {
  hostname: 'api.example.com',
  port: 443,
  path: '/data',
  method: 'GET',
  checkServerIdentity: checkServerIdentity
}

https.request(options, (res) => {
  console.log('Certificate verified with pinning')
}).end()
```

### Certificate Fingerprint Pinning

```javascript
const https = require('https')
const crypto = require('crypto')

// Pin entire certificate (less flexible but simpler)
const PINNED_CERT_FINGERPRINT =
  'A1:B2:C3:D4:E5:F6:...'  // SHA-256 fingerprint

const options = {
  hostname: 'api.example.com',
  port: 443,
  path: '/',

  checkServerIdentity: (hostname, cert) => {
    // Calculate SHA-256 fingerprint
    const fingerprint = crypto
      .createHash('sha256')
      .update(cert.raw)
      .digest('hex')
      .toUpperCase()
      .match(/.{2}/g)
      .join(':')

    if (fingerprint !== PINNED_CERT_FINGERPRINT) {
      throw new Error(`Certificate fingerprint mismatch.
        Expected: ${PINNED_CERT_FINGERPRINT}
        Got: ${fingerprint}`)
    }
  }
}

https.get(options, (res) => {
  // Handle response
})
```

### Dynamic Pin Management

```javascript
const https = require('https')
const fs = require('fs')
const crypto = require('crypto')

class CertificatePinManager {
  constructor() {
    this.pins = new Map()
    this.loadPins()
  }

  loadPins() {
    // Load from secure storage
    const pinsFile = fs.readFileSync('cert-pins.json', 'utf8')
    const pins = JSON.parse(pinsFile)

    for (const [host, hostPins] of Object.entries(pins)) {
      this.pins.set(host, {
        fingerprints: new Set(hostPins.fingerprints),
        expiresAt: new Date(hostPins.expiresAt),
        reportOnly: hostPins.reportOnly || false
      })
    }
  }

  verify(hostname, cert) {
    const hostPins = this.pins.get(hostname)

    if (!hostPins) {
      // No pins for this host - allow (or reject, depending on policy)
      return
    }

    // Check expiry
    if (new Date() > hostPins.expiresAt) {
      console.warn(`Pins expired for ${hostname}`)
      return
    }

    const fingerprint = this.calculateFingerprint(cert)

    if (!hostPins.fingerprints.has(fingerprint)) {
      const error = new Error(`Pin validation failed for ${hostname}`)

      if (hostPins.reportOnly) {
        // Report but don't fail
        this.reportPinFailure(hostname, fingerprint)
        return
      }

      throw error
    }
  }

  calculateFingerprint(cert) {
    return crypto
      .createHash('sha256')
      .update(cert.pubkey)
      .digest('base64')
  }

  reportPinFailure(hostname, fingerprint) {
    // Send to reporting endpoint
    console.warn(`Pin failure for ${hostname}: ${fingerprint}`)
  }
}

const pinManager = new CertificatePinManager()

const options = {
  hostname: 'api.example.com',
  checkServerIdentity: (hostname, cert) => {
    pinManager.verify(hostname, cert)
  }
}
```

### Server-Side Certificate Pinning (mTLS)

```javascript
const https = require('https')
const fs = require('fs')
const crypto = require('crypto')

// Pinned client certificate fingerprints
const ALLOWED_CLIENT_CERTS = new Set([
  'fingerprint1',
  'fingerprint2'
])

const server = https.createServer({
  key: fs.readFileSync('server-key.pem'),
  cert: fs.readFileSync('server-cert.pem'),
  ca: fs.readFileSync('client-ca.pem'),
  requestCert: true,
  rejectUnauthorized: false  // We'll verify manually
}, (req, res) => {
  const clientCert = req.socket.getPeerCertificate()

  if (!clientCert || !clientCert.raw) {
    res.writeHead(401)
    res.end('Client certificate required')
    return
  }

  // Calculate fingerprint
  const fingerprint = crypto
    .createHash('sha256')
    .update(clientCert.raw)
    .digest('hex')

  if (!ALLOWED_CLIENT_CERTS.has(fingerprint)) {
    res.writeHead(403)
    res.end('Certificate not authorized')
    return
  }

  res.writeHead(200)
  res.end(`Hello ${clientCert.subject.CN}`)
})

server.listen(443)
```

## TLS 1.3 Configuration

### Enabling TLS 1.3

```javascript
const https = require('https')
const tls = require('tls')
const fs = require('fs')

const server = https.createServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),

  // TLS version configuration
  minVersion: 'TLSv1.2',  // Minimum version
  maxVersion: 'TLSv1.3',  // Maximum version (default in Node.js 12+)

  // TLS 1.3 cipher suites (these are separate from TLS 1.2 ciphers)
  cipherSuites: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ].join(':'),

  // TLS 1.2 and below cipher suites
  ciphers: [
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305'
  ].join(':')
})

server.on('secureConnection', (socket) => {
  console.log('Protocol:', socket.getProtocol())  // 'TLSv1.3'
  console.log('Cipher:', socket.getCipher())
})

server.listen(443)
```

### TLS 1.3 Session Resumption

```javascript
const https = require('https')
const crypto = require('crypto')

const server = https.createServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),

  // Session tickets for TLS 1.3 (0-RTT resumption)
  ticketKeys: crypto.randomBytes(48),

  // Session timeout
  sessionTimeout: 3600,  // 1 hour

  // Maximum early data size (0-RTT)
  // Be careful with 0-RTT - replay attacks possible
  maxEarlyData: 16384
})

// Handle early data (0-RTT)
server.on('newSession', (sessionId, sessionData, callback) => {
  // Store session for resumption
  sessionStore.set(sessionId.toString('hex'), sessionData)
  callback()
})

server.on('resumeSession', (sessionId, callback) => {
  // Retrieve session for resumption
  const sessionData = sessionStore.get(sessionId.toString('hex'))
  callback(null, sessionData)
})

server.listen(443)
```

### TLS 1.3-Only Server

```javascript
const https = require('https')

const server = https.createServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),

  // TLS 1.3 only
  minVersion: 'TLSv1.3',
  maxVersion: 'TLSv1.3',

  // TLS 1.3 cipher suites only
  cipherSuites: 'TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256'
})

// Clients using TLS 1.2 or below will be rejected
server.on('tlsClientError', (err, socket) => {
  console.log('TLS error:', err.message)
  // "unsupported protocol" for TLS 1.2 clients
})

server.listen(443)
```

## Perfect Forward Secrecy (PFS)

### Configuring ECDHE

```javascript
const https = require('https')
const crypto = require('crypto')

const server = https.createServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),

  // ECDHE curves for key exchange
  ecdhCurve: 'X25519:prime256v1:secp384r1',

  // Only use cipher suites with forward secrecy
  ciphers: [
    // TLS 1.2 ECDHE ciphers
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256'
  ].join(':'),

  // Server chooses cipher based on preference order
  honorCipherOrder: true
})

server.on('secureConnection', (socket) => {
  const cipher = socket.getCipher()
  console.log('Cipher:', cipher.name)
  console.log('Using PFS:', cipher.name.includes('ECDHE'))
})

server.listen(443)
```

### DH Parameters for DHE

```bash
# Generate DH parameters (do this once, takes a while)
openssl dhparam -out dhparam.pem 4096
```

```javascript
const https = require('https')

const server = https.createServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),

  // DH parameters for DHE key exchange
  dhparam: fs.readFileSync('dhparam.pem')
})

server.listen(443)
```

## Certificate Transparency

### SCT Verification

```javascript
const https = require('https')
const tls = require('tls')

// Verify Signed Certificate Timestamps
function verifySCT(cert, scts) {
  // SCTs prove certificate was logged to CT logs
  // This helps detect misissued certificates

  for (const sct of scts) {
    // Verify SCT signature
    // Check log is trusted
    // Verify timestamp is valid
    console.log('SCT Log ID:', sct.logId.toString('hex'))
    console.log('SCT Timestamp:', new Date(sct.timestamp))
  }
}

const options = {
  hostname: 'api.example.com',
  port: 443,

  checkServerIdentity: (hostname, cert) => {
    // Get SCTs from certificate or TLS extension
    const scts = cert.extensions?.['ct_precert_scts'] || []

    if (scts.length < 2) {
      throw new Error('Insufficient SCTs for Certificate Transparency')
    }

    verifySCT(cert, scts)
  }
}

https.get(options, (res) => {
  console.log('CT verification passed')
})
```

## Security Best Practices

### Production TLS Configuration

```javascript
const https = require('https')

const secureOptions = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('fullchain.pem'),

  // TLS versions
  minVersion: 'TLSv1.2',  // No TLS 1.0/1.1

  // Secure cipher suites
  ciphers: [
    // TLS 1.3 ciphers handled separately
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    // Exclude weak ciphers
    '!aNULL',
    '!eNULL',
    '!EXPORT',
    '!DES',
    '!RC4',
    '!3DES',
    '!MD5',
    '!PSK'
  ].join(':'),

  // Server cipher preference
  honorCipherOrder: true,

  // ECDH curves
  ecdhCurve: 'X25519:prime256v1:secp384r1',

  // Disable session resumption tokens for privacy (optional)
  // ticketKeys: null,

  // Session timeout
  sessionTimeout: 300
}

const server = https.createServer(secureOptions, app)

// Verify configuration
server.on('secureConnection', (socket) => {
  const protocol = socket.getProtocol()
  const cipher = socket.getCipher()

  // Log for auditing
  console.log(`TLS: ${protocol} ${cipher.name}`)

  // Reject if using weak cipher (belt and suspenders)
  if (cipher.name.includes('RC4') || cipher.name.includes('DES')) {
    socket.destroy()
  }
})

server.listen(443)
```

### Express Integration with Advanced TLS

```javascript
const express = require('express')
const https = require('https')
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

// Expect-CT header for Certificate Transparency
app.use((req, res, next) => {
  res.setHeader('Expect-CT', 'max-age=86400, enforce')
  next()
})

// TLS configuration
const tlsOptions = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
  minVersion: 'TLSv1.2',
  ciphers: 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384',
  honorCipherOrder: true
}

https.createServer(tlsOptions, app).listen(443)
```

## Monitoring and Debugging

### TLS Event Logging

```javascript
const server = https.createServer(options)

server.on('tlsClientError', (err, socket) => {
  console.error('TLS client error:', {
    error: err.message,
    code: err.code,
    remoteAddress: socket.remoteAddress
  })
})

server.on('secureConnection', (socket) => {
  console.log('Secure connection:', {
    protocol: socket.getProtocol(),
    cipher: socket.getCipher(),
    servername: socket.servername,
    authorized: socket.authorized
  })
})

// Client certificate info (if mTLS)
server.on('secureConnection', (socket) => {
  if (socket.getPeerCertificate()) {
    const cert = socket.getPeerCertificate()
    console.log('Client cert:', {
      subject: cert.subject,
      issuer: cert.issuer,
      valid_from: cert.valid_from,
      valid_to: cert.valid_to
    })
  }
})
```

### Certificate Expiry Monitoring

```javascript
const https = require('https')
const tls = require('tls')

function checkCertificateExpiry(hostname, port = 443) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(port, hostname, {
      servername: hostname
    }, () => {
      const cert = socket.getPeerCertificate()
      socket.end()

      const expiryDate = new Date(cert.valid_to)
      const daysUntilExpiry = Math.floor(
        (expiryDate - new Date()) / (1000 * 60 * 60 * 24)
      )

      resolve({
        hostname,
        subject: cert.subject.CN,
        issuer: cert.issuer.CN,
        validFrom: cert.valid_from,
        validTo: cert.valid_to,
        daysUntilExpiry,
        isExpired: daysUntilExpiry < 0,
        isExpiringSoon: daysUntilExpiry < 30
      })
    })

    socket.on('error', reject)
  })
}

// Monitor multiple domains
async function monitorCertificates(domains) {
  for (const domain of domains) {
    try {
      const status = await checkCertificateExpiry(domain)

      if (status.isExpired) {
        console.error(`ALERT: Certificate expired for ${domain}`)
      } else if (status.isExpiringSoon) {
        console.warn(`WARNING: Certificate expiring soon for ${domain}`)
      }

      console.log(status)
    } catch (err) {
      console.error(`Error checking ${domain}:`, err.message)
    }
  }
}

monitorCertificates(['api.example.com', 'www.example.com'])
```

## Related Topics

- [HTTP Module Advanced](../http-module/ADVANCED_TOPICS.md)
- [Security Best Practices](../../advanced/security/README.md)
- [Production Deployment](../../advanced/production/README.md)
