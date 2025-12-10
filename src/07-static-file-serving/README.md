# Step 07: Static File Serving

Learn how Express.js serves static files like CSS, JavaScript, images, and HTML.

## What You'll Learn

1. **express.static() middleware** - Built-in static file server
2. **MIME type handling** - Content-Type based on file extension
3. **Security considerations** - Path traversal prevention
4. **Caching headers** - ETag, Last-Modified, Cache-Control
5. **Virtual path prefixes** - Mounting static at custom paths
6. **Multiple static directories** - Fallback chains

## Core Concepts

### Basic Static Middleware

```javascript
const express = require('express');
const app = express();

// Serve files from 'public' directory
app.use(express.static('public'));

// Files are now accessible:
// public/style.css    -> GET /style.css
// public/app.js       -> GET /app.js
// public/img/logo.png -> GET /img/logo.png
```

### Virtual Path Prefix

```javascript
// Mount at /static prefix
app.use('/static', express.static('public'));

// Files now at:
// public/style.css    -> GET /static/style.css
// public/app.js       -> GET /static/app.js
```

### Multiple Directories

```javascript
// Express tries directories in order
app.use(express.static('public'));
app.use(express.static('uploads'));
app.use(express.static('assets'));

// First match wins
```

## Static Middleware Options

```javascript
app.use(express.static('public', {
  // Index files to serve for directories
  index: ['index.html', 'index.htm'],

  // Enable/disable directory indexes
  dotfiles: 'ignore',    // 'allow', 'deny', 'ignore'

  // File extension fallbacks
  extensions: ['html', 'htm'],

  // Enable ETag generation
  etag: true,

  // Enable Last-Modified header
  lastModified: true,

  // Max-age for Cache-Control (ms)
  maxAge: '1d',  // or 86400000

  // Redirect /dir to /dir/
  redirect: true,

  // Custom function for setting headers
  setHeaders: (res, path, stat) => {
    res.set('X-Custom-Header', 'value');
  }
}));
```

## Implementation

### File Structure

```
lib/
├── index.js          # Main application with static support
├── static.js         # Static middleware implementation
├── mime.js           # MIME type mapping
└── send.js           # File sending utilities
```

### MIME Types

Common MIME types handled:

| Extension | MIME Type |
|-----------|-----------|
| .html     | text/html |
| .css      | text/css |
| .js       | text/javascript |
| .json     | application/json |
| .png      | image/png |
| .jpg      | image/jpeg |
| .gif      | image/gif |
| .svg      | image/svg+xml |
| .ico      | image/x-icon |
| .pdf      | application/pdf |
| .woff2    | font/woff2 |

### Security: Path Traversal Prevention

```javascript
// DANGEROUS - never do this:
const filePath = path.join(root, req.url);

// SAFE - validate path is within root:
const filePath = path.resolve(root, req.path);
if (!filePath.startsWith(path.resolve(root))) {
  return res.status(403).send('Forbidden');
}
```

## Caching Headers

### ETag (Entity Tag)

```javascript
// Generate ETag from file stats
const etag = `"${stat.mtime.getTime().toString(16)}-${stat.size.toString(16)}"`;
res.setHeader('ETag', etag);

// Check If-None-Match
if (req.headers['if-none-match'] === etag) {
  return res.status(304).end(); // Not Modified
}
```

### Last-Modified

```javascript
res.setHeader('Last-Modified', stat.mtime.toUTCString());

// Check If-Modified-Since
const ifModifiedSince = req.headers['if-modified-since'];
if (ifModifiedSince && new Date(ifModifiedSince) >= stat.mtime) {
  return res.status(304).end(); // Not Modified
}
```

### Cache-Control

```javascript
// Set cache duration
res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day

// Different strategies by file type
if (path.endsWith('.html')) {
  res.setHeader('Cache-Control', 'no-cache'); // Always revalidate
} else if (path.match(/\.(js|css)$/)) {
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year (versioned)
}
```

## SPA (Single Page Application) Support

```javascript
// Serve static files
app.use(express.static('dist'));

// SPA fallback - serve index.html for client-side routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
```

## Best Practices

### 1. Use a CDN for Production

```javascript
if (process.env.NODE_ENV === 'production') {
  // Static files served by CDN
  app.locals.staticUrl = 'https://cdn.example.com';
} else {
  app.use('/static', express.static('public'));
  app.locals.staticUrl = '/static';
}
```

### 2. Version Static Assets

```javascript
// Include hash in filename for cache busting
// style.abc123.css instead of style.css?v=123
app.use('/assets', express.static('dist/assets', {
  maxAge: '1y',         // Long cache
  immutable: true       // Never revalidate
}));
```

### 3. Compress Static Files

```javascript
const compression = require('compression');

// Compress responses
app.use(compression());

// Serve pre-compressed files if available
// style.css.gz served for Accept-Encoding: gzip
```

### 4. Security Headers

```javascript
app.use(express.static('public', {
  setHeaders: (res, path) => {
    // Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // For downloads
    if (path.endsWith('.pdf')) {
      res.setHeader('Content-Disposition', 'attachment');
    }
  }
}));
```

## Running Examples

```bash
# Basic static file serving
npm run example:basic

# Static options (caching, etc.)
npm run example:options

# Multiple static roots
npm run example:multiple

# SPA fallback example
npm run example:spa
```

## Running Tests

```bash
npm test
```

## Key Takeaways

1. **express.static()** creates middleware to serve files from a directory
2. **MIME types** are determined by file extension
3. **Path traversal attacks** must be prevented by validating paths
4. **Caching headers** (ETag, Last-Modified, Cache-Control) improve performance
5. **Multiple directories** can be chained for fallback behavior
6. **Virtual prefixes** mount static files at custom URL paths
7. **SPA fallback** serves index.html for client-side routing

## Next Step

[Step 08: Template Engine Integration](../08-template-engines/README.md) - Learn how Express integrates with template engines for server-side rendering.
