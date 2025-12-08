# express.static()

Serves static files such as HTML, CSS, JavaScript, images, and other assets. This is one of the most commonly used built-in middleware functions.

## Overview

```javascript
const express = require('express')
const path = require('path')
const app = express()

// Serve files from 'public' directory
app.use(express.static('public'))

// Now accessible:
// public/style.css     -> http://localhost:3000/style.css
// public/app.js        -> http://localhost:3000/app.js
// public/images/logo.png -> http://localhost:3000/images/logo.png
```

## Basic Usage

### Single Directory

```javascript
// Serve from 'public' folder
app.use(express.static('public'))
```

### With URL Prefix

```javascript
// Serve from 'public' with /static prefix
app.use('/static', express.static('public'))

// Access: http://localhost:3000/static/style.css
```

### Absolute Path (Recommended)

```javascript
const path = require('path')

// Use absolute path to avoid issues with working directory
app.use(express.static(path.join(__dirname, 'public')))
```

### Multiple Directories

```javascript
// Searches in order - first match wins
app.use(express.static('public'))
app.use(express.static('files'))
app.use(express.static('uploads'))

// If public/image.png exists, it's served
// If not, checks files/image.png
// Then uploads/image.png
```

## Options

```javascript
app.use(express.static('public', {
  dotfiles: 'ignore',       // How to handle dotfiles
  etag: true,               // Enable/disable ETags
  extensions: false,        // File extension fallbacks
  fallthrough: true,        // Pass to next middleware if file not found
  immutable: false,         // Add immutable directive to Cache-Control
  index: 'index.html',      // Default file for directories
  lastModified: true,       // Set Last-Modified header
  maxAge: 0,                // Cache-Control max-age in ms
  redirect: true,           // Redirect to trailing / for directories
  setHeaders: undefined     // Function to set custom headers
}))
```

### dotfiles

```javascript
// How to handle dotfiles (files starting with .)
app.use(express.static('public', {
  dotfiles: 'ignore'  // Default: Pretend they don't exist (404)
  // dotfiles: 'allow'   // Serve them normally
  // dotfiles: 'deny'    // Return 403 Forbidden
}))
```

### etag

```javascript
// ETags for cache validation
app.use(express.static('public', {
  etag: true   // Default: Generate ETag headers
  // etag: false  // Disable ETags
}))
```

### extensions

```javascript
// Try file extensions if not found
app.use(express.static('public', {
  extensions: ['html', 'htm']
}))

// GET /about will try:
// 1. public/about
// 2. public/about.html
// 3. public/about.htm
```

### fallthrough

```javascript
// What happens when file not found
app.use(express.static('public', {
  fallthrough: true  // Default: Call next() - continue to other middleware
  // fallthrough: false  // Send 404 response immediately
}))

// With fallthrough: true
app.use(express.static('public'))
app.get('*', (req, res) => {
  res.send('Handled by route')  // Runs if file not found
})
```

### immutable

```javascript
// For files that never change (versioned assets)
app.use('/assets', express.static('dist', {
  immutable: true,
  maxAge: '1y'
}))

// Adds Cache-Control: public, max-age=31536000, immutable
// Browsers won't revalidate even on refresh
```

### index

```javascript
// Default file for directory requests
app.use(express.static('public', {
  index: 'index.html'  // Default
  // index: 'default.html'
  // index: false  // Disable directory index
  // index: ['index.html', 'index.htm']  // Try multiple
}))

// GET /about/ serves public/about/index.html
```

### maxAge

```javascript
// Cache-Control max-age
app.use(express.static('public', {
  maxAge: 0  // Default: no caching
}))

// String format
app.use(express.static('public', {
  maxAge: '1d'   // 1 day
  // maxAge: '7d'   // 1 week
  // maxAge: '1y'   // 1 year
}))

// Milliseconds
app.use(express.static('public', {
  maxAge: 86400000  // 1 day in ms
}))
```

### redirect

```javascript
// Redirect /dir to /dir/ for directories
app.use(express.static('public', {
  redirect: true  // Default: Redirect to trailing slash
  // redirect: false  // Don't redirect
}))
```

### setHeaders

```javascript
// Custom headers per file
app.use(express.static('public', {
  setHeaders: (res, path, stat) => {
    // Set CORS header
    res.set('Access-Control-Allow-Origin', '*')

    // Different cache for different file types
    if (path.endsWith('.html')) {
      res.set('Cache-Control', 'no-cache')
    } else if (path.match(/\.(js|css)$/)) {
      res.set('Cache-Control', 'public, max-age=31536000')
    }
  }
}))
```

## Common Patterns

### Development vs Production Caching

```javascript
const staticOptions = {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: process.env.NODE_ENV === 'production'
}

app.use(express.static('public', staticOptions))
```

### Versioned Assets

```javascript
// Serve versioned assets with long cache
// Files: dist/app.a1b2c3.js, dist/style.x4y5z6.css
app.use('/assets', express.static('dist', {
  maxAge: '1y',
  immutable: true
}))

// Non-versioned files with short cache
app.use(express.static('public', {
  maxAge: '1h'
}))
```

### Single Page Application (SPA)

```javascript
const path = require('path')

// Serve static files
app.use(express.static(path.join(__dirname, 'build')))

// API routes
app.use('/api', apiRouter)

// All other routes serve index.html (for client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'))
})
```

### Secure File Serving

```javascript
const path = require('path')

// Prevent directory traversal
app.use('/files', express.static(path.join(__dirname, 'uploads'), {
  dotfiles: 'deny',     // No hidden files
  index: false          // No directory listing
}))

// Custom security headers
app.use(express.static('public', {
  setHeaders: (res, filepath) => {
    res.set('X-Content-Type-Options', 'nosniff')

    // Force download for certain files
    if (filepath.match(/\.(pdf|doc|docx)$/)) {
      res.set('Content-Disposition', 'attachment')
    }
  }
}))
```

### Multiple Asset Types

```javascript
// CSS and JS with long cache
app.use('/css', express.static('assets/css', { maxAge: '1y' }))
app.use('/js', express.static('assets/js', { maxAge: '1y' }))

// Images with medium cache
app.use('/images', express.static('assets/images', { maxAge: '7d' }))

// User uploads with short cache
app.use('/uploads', express.static('uploads', { maxAge: '1h' }))
```

## Directory Structure Example

```
project/
├── app.js
├── public/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── images/
│       └── logo.png
└── uploads/
    └── user-files/
```

```javascript
const path = require('path')

// Main public files
app.use(express.static(path.join(__dirname, 'public')))

// User uploads with different settings
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  dotfiles: 'deny'
}))
```

## Performance Tips

1. **Use absolute paths** - Avoids issues with `process.cwd()`
2. **Set appropriate cache headers** - Long cache for versioned assets
3. **Use a CDN in production** - Offload static file serving
4. **Enable compression** - Use `compression` middleware before static
5. **Order matters** - Place static middleware early for efficiency

```javascript
const compression = require('compression')

// Compress before static (in production)
app.use(compression())
app.use(express.static('public'))
```

## Related

- [express-json](../express-json/) - JSON body parsing
- [express-urlencoded](../express-urlencoded/) - Form body parsing
- [compression](../../third-party/compression/) - Response compression

---

*express.static() is essential for serving client-side assets in Express applications.*
