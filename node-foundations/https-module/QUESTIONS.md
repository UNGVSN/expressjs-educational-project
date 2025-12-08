# HTTPS Module Questions

Test your understanding of the Node.js `https` module with these questions covering TLS, certificates, and secure communication.

---

## Conceptual Questions

### Beginner

**Q1: What is the primary difference between HTTP and HTTPS?**

<details>
<summary>Answer</summary>

HTTPS adds a TLS (Transport Layer Security) encryption layer to HTTP:

| Aspect | HTTP | HTTPS |
|--------|------|-------|
| Encryption | None (plaintext) | TLS encrypted |
| Port | 80 | 443 |
| Certificate | Not required | Required |
| Data visibility | Anyone can read | Only endpoints can decrypt |

```javascript
// HTTP - plaintext
http.createServer((req, res) => res.end('Hello')).listen(80)

// HTTPS - encrypted
https.createServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}, (req, res) => res.end('Secure Hello')).listen(443)
```

HTTPS protects against:
- Eavesdropping (reading data)
- Tampering (modifying data)
- Impersonation (fake servers)
</details>

---

**Q2: What two files are required to create an HTTPS server?**

<details>
<summary>Answer</summary>

1. **Private Key** (`key.pem`) - Your secret key, never shared
2. **Certificate** (`cert.pem`) - Public certificate signed by CA (or self-signed)

```javascript
const options = {
  key: fs.readFileSync('private-key.pem'),   // Keep secret!
  cert: fs.readFileSync('certificate.pem')    // Shared with clients
}

https.createServer(options, app).listen(443)
```

**Optional but common:**
- `ca` - Certificate Authority chain (intermediate certificates)
- `passphrase` - If private key is encrypted

</details>

---

**Q3: What is a Certificate Authority (CA)?**

<details>
<summary>Answer</summary>

A Certificate Authority (CA) is a trusted third party that:
1. Verifies the identity of certificate requesters
2. Signs certificates to prove their validity
3. Is trusted by browsers/operating systems

**Trust Chain:**
```
Root CA (in browser/OS trust store)
    │
    └── Intermediate CA (signed by Root)
            │
            └── Your Certificate (signed by Intermediate)
```

**Types of Certificates:**
- **Self-signed**: You sign your own (not trusted by browsers)
- **Domain Validated (DV)**: CA verifies domain ownership
- **Organization Validated (OV)**: CA verifies organization
- **Extended Validation (EV)**: Strictest verification (green bar)

```javascript
// Self-signed (development only)
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365

// Let's Encrypt (free, trusted CA)
certbot certonly --standalone -d yourdomain.com
```
</details>

---

### Intermediate

**Q4: Explain what happens during a TLS handshake.**

<details>
<summary>Answer</summary>

The TLS handshake establishes a secure connection:

**Simplified TLS 1.2 Handshake:**

```
Client                                    Server
   │                                         │
   │──── 1. ClientHello ────────────────────►│
   │     (TLS version, cipher suites,        │
   │      random bytes)                      │
   │                                         │
   │◄─── 2. ServerHello ─────────────────────│
   │     (chosen cipher, random bytes)       │
   │                                         │
   │◄─── 3. Certificate ─────────────────────│
   │     (server's public certificate)       │
   │                                         │
   │◄─── 4. ServerHelloDone ─────────────────│
   │                                         │
   │──── 5. ClientKeyExchange ──────────────►│
   │     (encrypted pre-master secret)       │
   │                                         │
   │──── 6. ChangeCipherSpec ───────────────►│
   │──── 7. Finished ───────────────────────►│
   │                                         │
   │◄─── 8. ChangeCipherSpec ────────────────│
   │◄─── 9. Finished ────────────────────────│
   │                                         │
   │◄════ Encrypted Data ═══════════════════►│
```

**Key Steps:**
1. Client proposes encryption options
2. Server chooses cipher suite
3. Server proves identity with certificate
4. Client validates certificate against trusted CAs
5. Both sides derive session keys
6. Encrypted communication begins

TLS 1.3 reduces this to 1 round-trip.
</details>

---

**Q5: What is SNI (Server Name Indication) and why is it needed?**

<details>
<summary>Answer</summary>

**Problem**: Traditional TLS sends the certificate before knowing which hostname the client wants. With virtual hosting (multiple domains on one IP), the server doesn't know which certificate to send.

**Solution**: SNI includes the hostname in the ClientHello, before certificate selection.

```javascript
const https = require('https')
const tls = require('tls')

const certificates = {
  'shop.example.com': {
    key: fs.readFileSync('shop-key.pem'),
    cert: fs.readFileSync('shop-cert.pem')
  },
  'api.example.com': {
    key: fs.readFileSync('api-key.pem'),
    cert: fs.readFileSync('api-cert.pem')
  }
}

const options = {
  SNICallback: (servername, callback) => {
    const ctx = certificates[servername]
      ? tls.createSecureContext(certificates[servername])
      : null

    callback(null, ctx)
  }
}

https.createServer(options, app).listen(443)
```

**Without SNI**: Would need separate IP for each domain.
**With SNI**: One IP serves multiple HTTPS domains.
</details>

---

**Q6: What is the difference between `requestCert` and `rejectUnauthorized`?**

<details>
<summary>Answer</summary>

These options control client certificate (mutual TLS) behavior:

| Option | Effect |
|--------|--------|
| `requestCert: false` | Don't ask for client certificate |
| `requestCert: true` | Ask for client certificate |
| `rejectUnauthorized: true` | Reject invalid/missing client certificates |
| `rejectUnauthorized: false` | Accept connection even without valid cert |

```javascript
// No client certificate required (normal HTTPS)
{
  requestCert: false,
  rejectUnauthorized: true  // (for server's own validation)
}

// Request but don't require client certificate
{
  requestCert: true,
  rejectUnauthorized: false
}
// Server can check: req.client.authorized

// Require valid client certificate (mTLS)
{
  requestCert: true,
  rejectUnauthorized: true,
  ca: fs.readFileSync('client-ca.pem')
}
```

**Use cases:**
- `requestCert: false` - Public websites
- `requestCert: true, rejectUnauthorized: false` - Optional client auth
- `requestCert: true, rejectUnauthorized: true` - API authentication
</details>

---

### Advanced

**Q7: How does session resumption improve HTTPS performance?**

<details>
<summary>Answer</summary>

TLS handshakes are expensive (~100ms). Session resumption reuses previous session parameters.

**Session Tickets (Stateless):**
```javascript
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),

  // Enable session tickets
  ticketKeys: crypto.randomBytes(48),

  // How long tickets are valid
  sessionTimeout: 300  // 5 minutes
}
```

**Flow:**
```
First Connection (Full Handshake):
Client ←→ Server: Full TLS handshake (~100ms)
Server → Client: Session Ticket (encrypted state)

Second Connection (Abbreviated):
Client → Server: ClientHello + Previous Ticket
Server → Client: Decrypt ticket, resume session (~30ms)
```

**Benefits:**
- 0-RTT in TLS 1.3 (send data in first message)
- Reduced CPU (no key exchange)
- Lower latency

**Security Note**: Session tickets should rotate regularly.
</details>

---

**Q8: Explain certificate pinning and when you would use it.**

<details>
<summary>Answer</summary>

**Certificate Pinning** hardcodes the expected certificate (or public key) in the client, bypassing CA validation.

**Why?**
- Protects against compromised CAs
- Prevents MITM even with valid (attacker-obtained) certificates

```javascript
const https = require('https')
const tls = require('tls')

// Pin to specific certificate fingerprint
const PINNED_FINGERPRINT = '2B:45:A9:...'

const options = {
  hostname: 'api.bank.com',
  port: 443,

  checkServerIdentity: (host, cert) => {
    // Standard hostname check
    const err = tls.checkServerIdentity(host, cert)
    if (err) return err

    // Certificate pinning
    if (cert.fingerprint256 !== PINNED_FINGERPRINT) {
      return new Error('Certificate fingerprint mismatch!')
    }
  }
}

https.request(options, (res) => {
  // Only proceeds if fingerprint matches
}).end()
```

**Use cases:**
- Banking apps
- High-security APIs
- Mobile apps

**Downsides:**
- Certificate rotation requires app updates
- Backup pins needed for rotation
- Can cause outages if mismanaged
</details>

---

**Q9: What security headers should accompany HTTPS?**

<details>
<summary>Answer</summary>

HTTPS alone isn't enough. Security headers enhance protection:

```javascript
const helmet = require('helmet')
const app = express()

app.use(helmet())  // Sets many headers automatically

// Or manually:
app.use((req, res, next) => {
  // Force HTTPS for 1 year
  res.setHeader('Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload')

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY')

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff')

  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Content Security Policy
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self'")

  next()
})
```

**Key Headers:**

| Header | Purpose |
|--------|---------|
| `Strict-Transport-Security` | Force HTTPS (HSTS) |
| `X-Frame-Options` | Prevent clickjacking |
| `X-Content-Type-Options` | Prevent MIME sniffing |
| `Content-Security-Policy` | Control resource loading |
| `Referrer-Policy` | Control referrer leakage |
</details>

---

## Code Analysis Questions

**Q10: What's wrong with this HTTPS server configuration?**

```javascript
const https = require('https')
const fs = require('fs')

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
  rejectUnauthorized: false
}

https.createServer(options, (req, res) => {
  res.end('Secure!')
}).listen(443)
```

<details>
<summary>Answer</summary>

**Issue**: `rejectUnauthorized: false` on a server has no effect and suggests misunderstanding.

For servers:
- `rejectUnauthorized` only matters when `requestCert: true` (mTLS)
- Without `requestCert`, it does nothing

For clients:
- `rejectUnauthorized: false` disables certificate validation (DANGEROUS!)

**Corrected for normal HTTPS server:**
```javascript
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
  // No rejectUnauthorized needed for basic HTTPS
}
```

**Corrected for mTLS server:**
```javascript
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
  ca: fs.readFileSync('client-ca.pem'),
  requestCert: true,
  rejectUnauthorized: true  // Require valid client cert
}
```
</details>

---

**Q11: Identify the security issue in this code:**

```javascript
const https = require('https')

// API client for internal service
function callInternalAPI(data) {
  const options = {
    hostname: 'internal-api.company.local',
    port: 443,
    path: '/data',
    method: 'POST',
    rejectUnauthorized: false  // Self-signed cert
  }

  const req = https.request(options, (res) => {
    // Handle response
  })

  req.write(JSON.stringify(data))
  req.end()
}
```

<details>
<summary>Answer</summary>

**Security Issue**: `rejectUnauthorized: false` disables ALL certificate validation, making the connection vulnerable to man-in-the-middle attacks.

**Problems:**
1. Anyone can intercept traffic with any certificate
2. No verification the server is who it claims to be
3. Encrypted but not authenticated

**Correct approach for self-signed internal certificates:**

```javascript
const https = require('https')
const fs = require('fs')

function callInternalAPI(data) {
  const options = {
    hostname: 'internal-api.company.local',
    port: 443,
    path: '/data',
    method: 'POST',

    // Trust only your internal CA
    ca: fs.readFileSync('internal-ca.pem'),

    // Keep validation enabled!
    rejectUnauthorized: true
  }

  const req = https.request(options, (res) => {
    // Handle response
  })

  req.write(JSON.stringify(data))
  req.end()
}
```

**Alternative**: Add internal CA to system trust store.
</details>

---

**Q12: What will happen when this server starts?**

```javascript
const https = require('https')
const fs = require('fs')

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('wrong-domain-cert.pem')  // Cert for different domain
}

https.createServer(options, (req, res) => {
  res.end('Hello')
}).listen(443)
```

<details>
<summary>Answer</summary>

**Server starts successfully**, but clients will fail to connect (unless they disable verification).

**Error clients will see:**
```
Error: Hostname/IP does not match certificate's altnames
```
or
```
ERR_TLS_CERT_ALTNAME_INVALID
```

The certificate's Common Name (CN) or Subject Alternative Names (SAN) must match the hostname clients use to connect.

**Certificate verification checks:**
1. ✓ Certificate not expired
2. ✓ Certificate signed by trusted CA
3. ✗ **Certificate hostname matches request hostname** ← Fails here
4. ✓ Certificate not revoked

**Solutions:**
1. Use certificate for correct domain
2. Add domain to certificate's SAN
3. Use wildcard certificate (`*.example.com`)

```bash
# Check certificate's names
openssl x509 -in cert.pem -text -noout | grep -A1 "Subject Alternative Name"
```
</details>

---

## Practical Implementation Questions

**Q13: Implement an HTTPS server that redirects HTTP to HTTPS.**

<details>
<summary>Answer</summary>

```javascript
const http = require('http')
const https = require('https')
const fs = require('fs')

// HTTPS options
const httpsOptions = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}

// Application handler
function app(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Secure content')
}

// HTTPS server
https.createServer(httpsOptions, app).listen(443, () => {
  console.log('HTTPS server on port 443')
})

// HTTP redirect server
http.createServer((req, res) => {
  // Remove port from host if present
  const host = req.headers.host.replace(/:\d+$/, '')

  // Permanent redirect to HTTPS
  res.writeHead(301, {
    'Location': `https://${host}${req.url}`
  })
  res.end()
}).listen(80, () => {
  console.log('HTTP redirect server on port 80')
})
```

**Express version:**
```javascript
const express = require('express')
const app = express()

// HTTPS redirect middleware
app.use((req, res, next) => {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    next()
  } else {
    res.redirect(301, `https://${req.hostname}${req.url}`)
  }
})

// ... routes ...

http.createServer(app).listen(80)
https.createServer(httpsOptions, app).listen(443)
```
</details>

---

**Q14: Implement certificate reload without server restart.**

<details>
<summary>Answer</summary>

```javascript
const https = require('https')
const fs = require('fs')

let tlsOptions = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}

const server = https.createServer(tlsOptions, (req, res) => {
  res.end('Hello')
})

// Function to reload certificates
function reloadCertificates() {
  try {
    const newKey = fs.readFileSync('key.pem')
    const newCert = fs.readFileSync('cert.pem')

    // Update server's secure context
    server.setSecureContext({
      key: newKey,
      cert: newCert
    })

    console.log('Certificates reloaded at', new Date().toISOString())
  } catch (err) {
    console.error('Failed to reload certificates:', err.message)
  }
}

// Reload on SIGHUP signal
process.on('SIGHUP', reloadCertificates)

// Or watch for file changes
fs.watch('.', (eventType, filename) => {
  if (filename === 'cert.pem' || filename === 'key.pem') {
    // Debounce to avoid multiple reloads
    setTimeout(reloadCertificates, 1000)
  }
})

server.listen(443, () => {
  console.log('HTTPS server running')
  console.log('Send SIGHUP to reload certificates: kill -HUP', process.pid)
})
```
</details>

---

**Q15: Implement mutual TLS (mTLS) authentication.**

<details>
<summary>Answer</summary>

**Server:**
```javascript
const https = require('https')
const fs = require('fs')

const options = {
  // Server certificate
  key: fs.readFileSync('server-key.pem'),
  cert: fs.readFileSync('server-cert.pem'),

  // CA that signed client certificates
  ca: fs.readFileSync('client-ca.pem'),

  // Require client certificate
  requestCert: true,
  rejectUnauthorized: true
}

const server = https.createServer(options, (req, res) => {
  const cert = req.socket.getPeerCertificate()

  if (req.client.authorized) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      message: 'Authenticated',
      client: cert.subject.CN,
      issuer: cert.issuer.CN
    }))
  } else {
    // Won't reach here if rejectUnauthorized: true
    res.writeHead(401)
    res.end('Unauthorized')
  }
})

server.on('tlsClientError', (err, socket) => {
  console.error('Client TLS error:', err.message)
})

server.listen(443, () => {
  console.log('mTLS server running on port 443')
})
```

**Client:**
```javascript
const https = require('https')
const fs = require('fs')

const options = {
  hostname: 'localhost',
  port: 443,
  path: '/',
  method: 'GET',

  // Client certificate
  key: fs.readFileSync('client-key.pem'),
  cert: fs.readFileSync('client-cert.pem'),

  // Server's CA
  ca: fs.readFileSync('server-ca.pem')
}

const req = https.request(options, (res) => {
  let data = ''
  res.on('data', chunk => data += chunk)
  res.on('end', () => {
    console.log('Response:', data)
  })
})

req.on('error', (err) => {
  console.error('Error:', err.message)
})

req.end()
```

**Generate certificates for testing:**
```bash
# Generate CA
openssl genrsa -out ca-key.pem 2048
openssl req -new -x509 -key ca-key.pem -out ca-cert.pem -days 365

# Generate server certificate
openssl genrsa -out server-key.pem 2048
openssl req -new -key server-key.pem -out server.csr
openssl x509 -req -in server.csr -CA ca-cert.pem -CAkey ca-key.pem -out server-cert.pem

# Generate client certificate
openssl genrsa -out client-key.pem 2048
openssl req -new -key client-key.pem -out client.csr
openssl x509 -req -in client.csr -CA ca-cert.pem -CAkey ca-key.pem -out client-cert.pem
```
</details>

---

## Self-Assessment Checklist

Use this checklist to assess your understanding:

- [ ] I can create an HTTPS server with certificate and key
- [ ] I understand the TLS handshake process
- [ ] I can generate self-signed certificates for development
- [ ] I know how to use Let's Encrypt for production certificates
- [ ] I can implement HTTP to HTTPS redirect
- [ ] I understand SNI and can serve multiple domains
- [ ] I can configure mutual TLS (mTLS) for client authentication
- [ ] I know which TLS versions and ciphers to use
- [ ] I understand session resumption and its benefits
- [ ] I can reload certificates without restarting the server
- [ ] I know which security headers to use with HTTPS
- [ ] I can debug TLS connection issues

---

## Next Steps

After mastering these concepts:
1. Move to [Events Module](../events-module/) for async patterns
2. Study [Stream Module](../stream-module/) for data handling
3. Review Express security with [helmet](https://helmetjs.github.io/)

---

*HTTPS is non-negotiable for production. Master these concepts to build secure applications.*
