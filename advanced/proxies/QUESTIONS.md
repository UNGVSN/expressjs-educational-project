# Proxies - Self-Assessment Questions

## Conceptual Understanding

### Q1: Why is `trust proxy` Important?
**Question:** What problems occur if you don't configure `trust proxy` when running behind a reverse proxy?

<details>
<summary>Answer</summary>

Without `trust proxy`:
1. `req.ip` returns the proxy's IP, not the client's
2. `req.protocol` always returns 'http' even for HTTPS clients
3. `req.hostname` may return the internal hostname
4. Rate limiting by IP will limit all clients together
5. Geolocation/analytics will be wrong
6. Secure cookies may not work (require HTTPS detection)
</details>

### Q2: Trust Proxy Values
**Question:** What's the difference between `app.set('trust proxy', true)` and `app.set('trust proxy', 1)`?

<details>
<summary>Answer</summary>

- `true`: Trust ALL proxies unconditionally - dangerous because clients can spoof IPs
- `1`: Trust only one hop (the direct connection) - safe for single proxy setups

With `1`, if a client sends a fake X-Forwarded-For, the proxy adds the real IP, and Express takes the rightmost (real) one.
</details>

### Q3: X-Forwarded-For Parsing
**Question:** Given this header and `trust proxy = 2`:
```
X-Forwarded-For: 1.1.1.1, 2.2.2.2, 3.3.3.3
```
What will `req.ip` return?

<details>
<summary>Answer</summary>

`req.ip` will return `2.2.2.2`.

Express reads right-to-left:
- `3.3.3.3` → hop 0 (< 2) → trusted, continue
- `2.2.2.2` → hop 1 (< 2) → trusted, continue
- `1.1.1.1` → hop 2 (>= 2) → NOT trusted → this is the client IP

Wait, that's wrong! Let me recalculate:
- Hop 0: 3.3.3.3 (trusted)
- Hop 1: 2.2.2.2 (trusted)
- Hop 2: would be beyond trust

So `req.ip` = `1.1.1.1` (first untrusted)
</details>

### Q4: Security Risk
**Question:** Why is `app.set('trust proxy', true)` dangerous in production?

<details>
<summary>Answer</summary>

It allows IP spoofing. An attacker can send:
```
X-Forwarded-For: 127.0.0.1
```

And your app will think the request came from localhost, potentially:
- Bypassing rate limits
- Bypassing IP-based access controls
- Corrupting analytics/logs
- Bypassing geo-restrictions
</details>

## Practical Scenarios

### Q5: Nginx Configuration
**Question:** You're deploying Express behind Nginx on the same server. What trust proxy setting should you use?

<details>
<summary>Answer</summary>

```javascript
app.set('trust proxy', 'loopback')
// or
app.set('trust proxy', '127.0.0.1')
// or
app.set('trust proxy', 1)
```

All are acceptable. `'loopback'` is most readable and includes IPv6 localhost.
</details>

### Q6: Cloud Deployment
**Question:** Your app is on AWS: Client → CloudFront → ALB → Express. How many proxy hops?

<details>
<summary>Answer</summary>

2 hops: CloudFront and ALB.

```javascript
app.set('trust proxy', 2)
```

Or better, trust specific CIDR ranges for AWS services.
</details>

### Q7: Debugging
**Question:** How would you debug why `req.ip` is returning the wrong value?

<details>
<summary>Answer</summary>

Create a diagnostic endpoint:
```javascript
app.get('/debug', (req, res) => {
  res.json({
    ip: req.ip,
    ips: req.ips,
    socketRemoteAddress: req.socket.remoteAddress,
    xForwardedFor: req.get('X-Forwarded-For'),
    xRealIP: req.get('X-Real-IP'),
    trustProxy: req.app.get('trust proxy')
  })
})
```

Check:
1. Is X-Forwarded-For being sent?
2. Is trust proxy configured?
3. Is the proxy IP in the trusted range?
</details>

### Q8: Secure Cookies
**Question:** Your secure cookies aren't being set behind a proxy. Why?

<details>
<summary>Answer</summary>

Secure cookies require `req.secure === true`, which depends on `req.protocol === 'https'`.

Behind a proxy, `req.protocol` defaults to 'http' unless:
1. `trust proxy` is enabled
2. Proxy sends `X-Forwarded-Proto: https`

Fix:
```javascript
app.set('trust proxy', 1)

app.use(session({
  cookie: { secure: true },
  proxy: true  // For express-session
}))
```
</details>

## Code Challenges

### Q9: Custom Trust Function
**Question:** Write a trust proxy function that:
- Trusts localhost
- Trusts 10.x.x.x range
- Trusts specific IP 203.0.113.50

<details>
<summary>Answer</summary>

```javascript
app.set('trust proxy', (ip, hopIndex) => {
  // Localhost (IPv4 and IPv6)
  if (ip === '127.0.0.1' || ip === '::1') {
    return true
  }

  // 10.x.x.x range
  if (ip.startsWith('10.')) {
    return true
  }

  // Specific IP
  if (ip === '203.0.113.50') {
    return true
  }

  return false
})
```
</details>

### Q10: Rate Limiting Setup
**Question:** Configure rate limiting that correctly identifies clients behind a proxy:

<details>
<summary>Answer</summary>

```javascript
const rateLimit = require('express-rate-limit')

// MUST set trust proxy BEFORE rate limiter
app.set('trust proxy', 1)

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  // keyGenerator uses req.ip by default
  // which now returns correct client IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' }
})

app.use('/api', limiter)
```
</details>

## Architecture Questions

### Q11: Multiple Environments
**Question:** How would you configure trust proxy differently for development vs production?

<details>
<summary>Answer</summary>

```javascript
const isProduction = process.env.NODE_ENV === 'production'

if (isProduction) {
  // Production: trust specific proxies
  app.set('trust proxy', process.env.TRUSTED_PROXIES || 1)
} else {
  // Development: no proxy or trust all for testing
  app.set('trust proxy', false)
}
```
</details>

### Q12: Header Priority
**Question:** If both `X-Forwarded-For` and `X-Real-IP` are present, which does Express use?

<details>
<summary>Answer</summary>

Express uses `X-Forwarded-For` by default. `X-Real-IP` is not a standard Express property.

To use X-Real-IP:
```javascript
app.use((req, res, next) => {
  req.realIP = req.get('X-Real-IP') || req.ip
  next()
})
```

Some Nginx configurations use X-Real-IP, but X-Forwarded-For is more standard.
</details>
