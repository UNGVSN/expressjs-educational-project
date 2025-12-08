# Compression

Compression middleware for Express that compresses response bodies using gzip, deflate, or brotli.

## Installation

```bash
npm install compression
```

## Basic Usage

```javascript
const express = require('express')
const compression = require('compression')

const app = express()

// Enable compression for all responses
app.use(compression())
```

## How It Works

```
Request
   │
   ├─ Accept-Encoding: gzip, deflate, br
   │
   ▼
Server generates response
   │
   ▼
Compression middleware
   │
   ├─ Checks Accept-Encoding
   ├─ Compresses if beneficial
   ├─ Sets Content-Encoding header
   │
   ▼
Response (smaller size)
```

## Options

```javascript
app.use(compression({
  filter: shouldCompress,   // Function to decide if compressing
  level: 6,                 // Compression level (0-9)
  memLevel: 8,              // Memory usage (1-9)
  strategy: 0,              // Compression strategy
  threshold: 1024,          // Min size to compress (bytes)
  windowBits: 15,           // Window size (8-15)
  chunkSize: 16384          // Chunk size for streaming
}))
```

### level

```javascript
// Compression level: 0 (no compression) to 9 (maximum)
// Default: 6 (good balance of speed and compression)

// Fastest (less compression)
app.use(compression({ level: 1 }))

// Best compression (slower)
app.use(compression({ level: 9 }))

// Balanced (default)
app.use(compression({ level: 6 }))
```

### threshold

```javascript
// Only compress responses larger than threshold
app.use(compression({
  threshold: 1024  // Default: 1KB
}))

// Compress everything
app.use(compression({
  threshold: 0
}))

// String format
app.use(compression({
  threshold: '1kb'
}))
```

### filter

```javascript
// Custom filter function
app.use(compression({
  filter: (req, res) => {
    // Don't compress server-sent events
    if (req.headers['accept'] === 'text/event-stream') {
      return false
    }

    // Use default filter
    return compression.filter(req, res)
  }
}))
```

## Default Filter Behavior

The default filter compresses when:
- Request has `Accept-Encoding` header
- Response has compressible `Content-Type`
- Response is larger than `threshold`

Compressible types include:
- text/*
- application/json
- application/javascript
- application/xml
- etc.

## Route-Specific Compression

```javascript
const compression = require('compression')

// Compress only API routes
app.use('/api', compression())

// No compression for other routes
app.get('/', (req, res) => {
  res.send('Not compressed')
})
```

## Disable for Specific Routes

```javascript
// Disable compression for specific route
app.use(compression({
  filter: (req, res) => {
    // Don't compress downloads
    if (req.url.startsWith('/download')) {
      return false
    }
    return compression.filter(req, res)
  }
}))

// Or skip at route level
app.get('/large-file', (req, res) => {
  res.set('Content-Encoding', 'identity')  // Prevent compression
  res.sendFile('/path/to/large/file')
})
```

## Common Patterns

### With Static Files

```javascript
// Compress static files
app.use(compression())
app.use(express.static('public'))

// Note: For production, consider pre-compressing static files
// and serving .gz files directly with nginx
```

### Development vs Production

```javascript
if (process.env.NODE_ENV === 'production') {
  app.use(compression({
    level: 6,      // Balanced
    threshold: 1024
  }))
} else {
  // Skip compression in development for faster response
  // or use lower level
  app.use(compression({
    level: 1,      // Fastest
    threshold: 0
  }))
}
```

### API Server

```javascript
app.use(compression({
  // Only compress JSON responses
  filter: (req, res) => {
    const contentType = res.getHeader('Content-Type')
    return contentType && contentType.includes('json')
  },
  level: 6
}))
```

### Large JSON Responses

```javascript
app.use(compression())

app.get('/api/large-data', (req, res) => {
  const largeData = generateLargeData()  // e.g., 1MB of data

  // Response will be compressed automatically
  // 1MB -> ~100KB with gzip
  res.json(largeData)
})
```

### Streaming Responses

```javascript
app.use(compression())

app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/plain')

  // Compression works with streams too
  const stream = fs.createReadStream('large-file.txt')
  stream.pipe(res)
})
```

## Performance Considerations

```javascript
// 1. Set appropriate threshold
app.use(compression({
  threshold: 1024  // Don't compress small responses
}))

// 2. Use appropriate level
app.use(compression({
  level: 6  // Good balance (default)
}))

// 3. Pre-compress static assets in production
// nginx can serve .gz files directly

// 4. Don't compress already-compressed content
app.use(compression({
  filter: (req, res) => {
    const contentType = res.getHeader('Content-Type') || ''

    // Don't compress images, videos, etc.
    if (contentType.match(/image|video|audio|zip|gz|br/)) {
      return false
    }

    return compression.filter(req, res)
  }
}))
```

## Compression Comparison

| Method | Support | Compression | Speed |
|--------|---------|-------------|-------|
| gzip | Universal | Good | Fast |
| deflate | Universal | Good | Fast |
| brotli | Modern | Better | Slower |

```javascript
// Brotli support (Node.js 11.7+)
// compression package uses zlib which supports brotli
// Browser sends: Accept-Encoding: gzip, deflate, br
// Server responds with best available
```

## Verify Compression

```bash
# Check response headers
curl -H "Accept-Encoding: gzip" -I http://localhost:3000/api/data

# Response should include:
# Content-Encoding: gzip
# Vary: Accept-Encoding

# Compare sizes
curl http://localhost:3000/api/data | wc -c          # Uncompressed
curl -H "Accept-Encoding: gzip" --compressed http://localhost:3000/api/data | wc -c  # Compressed
```

## Troubleshooting

```javascript
// Issue: Response not compressed
// Check: Accept-Encoding header from client
// Check: Response Content-Type is compressible
// Check: Response size > threshold

// Issue: Double compression
// Check: Don't compress already compressed content
filter: (req, res) => {
  if (res.getHeader('Content-Encoding')) {
    return false  // Already compressed
  }
  return compression.filter(req, res)
}

// Issue: Streaming issues
// Solution: Flush compressed data
app.get('/stream', (req, res) => {
  res.write(data)
  res.flush()  // Force flush compressed data
})
```

## Related

- [helmet](../helmet/) - Security headers
- [morgan](../morgan/) - HTTP logging

---

*Compression significantly reduces bandwidth and improves response times.*
