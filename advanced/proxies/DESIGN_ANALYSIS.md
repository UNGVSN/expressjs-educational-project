# Proxies - Design Analysis

## How Express Handles Proxy Headers

### Internal Implementation

When `trust proxy` is set, Express modifies how several request properties work:

```javascript
// Simplified internal logic for req.ip
Object.defineProperty(req, 'ip', {
  get: function() {
    const trust = this.app.get('trust proxy fn')
    const socketAddr = this.socket.remoteAddress

    // If no trust, return socket address
    if (!trust(socketAddr, 0)) {
      return socketAddr
    }

    // Parse X-Forwarded-For
    const forwardedFor = this.get('X-Forwarded-For')
    if (!forwardedFor) {
      return socketAddr
    }

    // Split and find first untrusted IP
    const addrs = forwardedFor.split(',').map(s => s.trim())

    for (let i = addrs.length - 1; i >= 0; i--) {
      if (!trust(addrs[i], i)) {
        return addrs[i]
      }
    }

    return addrs[0]
  }
})
```

### Trust Proxy Function Compilation

Express compiles the trust proxy setting into a function:

```javascript
// Internal compilation
function compileTrust(val) {
  // Boolean
  if (typeof val === 'boolean') {
    return val ? () => true : () => false
  }

  // Number (hops)
  if (typeof val === 'number') {
    return (addr, i) => i < val
  }

  // String (subnet or predefined)
  if (typeof val === 'string') {
    const subnets = val.split(',').map(s => s.trim())
    return compileSubnets(subnets)
  }

  // Array
  if (Array.isArray(val)) {
    return compileSubnets(val)
  }

  // Function (pass through)
  if (typeof val === 'function') {
    return val
  }

  return () => false
}
```

### X-Forwarded-For Parsing

The header contains a chain of IPs:

```
X-Forwarded-For: 203.0.113.195, 70.41.3.18, 150.172.238.178
                 └─ client      └─ proxy1    └─ proxy2
```

Express reads right-to-left, trusting each IP until it finds an untrusted one:

```javascript
// With trust proxy = 2
// Starting from right:
// 150.172.238.178 → trusted (hop 0 < 2) → continue
// 70.41.3.18 → trusted (hop 1 < 2) → continue
// 203.0.113.195 → hop 2 >= 2 → this is req.ip
```

## Protocol Detection

### req.protocol Implementation

```javascript
Object.defineProperty(req, 'protocol', {
  get: function() {
    const trust = this.app.get('trust proxy fn')
    const proto = this.socket.encrypted ? 'https' : 'http'

    if (!trust(this.socket.remoteAddress, 0)) {
      return proto
    }

    // Check X-Forwarded-Proto
    const header = this.get('X-Forwarded-Proto') || proto
    const index = header.indexOf(',')

    return index !== -1
      ? header.substring(0, index).trim()
      : header.trim()
  }
})
```

### req.secure Implementation

```javascript
Object.defineProperty(req, 'secure', {
  get: function() {
    return this.protocol === 'https'
  }
})
```

## Hostname Resolution

### req.hostname Implementation

```javascript
Object.defineProperty(req, 'hostname', {
  get: function() {
    const trust = this.app.get('trust proxy fn')
    let host = this.get('Host')

    // Use X-Forwarded-Host if trusted
    if (trust(this.socket.remoteAddress, 0)) {
      host = this.get('X-Forwarded-Host') || host
    }

    if (!host) return undefined

    // Handle IPv6 and port
    const offset = host[0] === '[' ? host.indexOf(']') + 1 : 0
    const index = host.indexOf(':', offset)

    return index !== -1
      ? host.substring(0, index)
      : host
  }
})
```

## Security Architecture

### IP Spoofing Prevention

Without trust proxy validation:

```
Attacker sends:
X-Forwarded-For: 192.168.1.1

Server sees req.ip = 192.168.1.1 (spoofed!)
```

With proper configuration:

```
Attacker sends:
X-Forwarded-For: 192.168.1.1

Proxy adds:
X-Forwarded-For: 192.168.1.1, attacker-real-ip

Server with trust proxy = 1:
req.ip = attacker-real-ip (correct!)
```

### Header Injection Prevention

Proxies should sanitize headers:

```nginx
# Nginx - Remove existing forwarded headers from client
proxy_set_header X-Forwarded-For $remote_addr;
# NOT: proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
# The above appends, which can be exploited
```

## Performance Considerations

### Caching Trust Function

Express caches the compiled trust function:

```javascript
// Set once at startup
app.set('trust proxy', '10.0.0.0/8')

// Compiled function is cached
// No re-compilation per request
```

### IP Parsing Overhead

Parsing X-Forwarded-For has minimal overhead:

```javascript
// Benchmark: ~0.001ms per request
// Negligible compared to actual request handling
```

## Design Questions

1. **Why right-to-left parsing?**
   - Rightmost IPs are added by trusted proxies
   - Leftmost can be spoofed by clients
   - Reading right-to-left finds first untrusted source

2. **Why not auto-detect proxies?**
   - Security: explicit configuration prevents spoofing
   - Flexibility: different deployments need different settings
   - Performance: no runtime detection overhead

3. **Why support functions?**
   - Complex deployments with dynamic proxy IPs
   - Custom validation logic
   - Integration with external IP databases

## Common Patterns

### Multi-Tenant with Different Proxies

```javascript
app.set('trust proxy', (ip, i) => {
  // Trust based on request context
  const trustedRanges = getTrustedRangesForTenant(req)
  return isInRanges(ip, trustedRanges)
})
```

### Dynamic Proxy List

```javascript
let trustedProxies = new Set(['127.0.0.1'])

// Update periodically
setInterval(async () => {
  trustedProxies = await fetchCloudflareIPs()
}, 3600000)

app.set('trust proxy', (ip) => trustedProxies.has(ip))
```
