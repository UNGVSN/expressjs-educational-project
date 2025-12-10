# Step 02: Request/Response Enhancement

## Overview

In Step 01, we created a basic HTTP server with utility functions. But that's not how Express works - in Express, you call methods directly on `req` and `res` objects like `req.get()`, `res.json()`, `res.send()`.

This step teaches you how Express extends the native Node.js request and response objects to add these convenient methods.

## Learning Objectives

By the end of this step, you will:
1. Understand how JavaScript prototype extension works
2. Know how Express adds methods to req/res objects
3. Implement Express-like request methods (req.get, req.is, req.accepts)
4. Implement Express-like response methods (res.json, res.send, res.status)
5. Understand method chaining patterns
6. Learn about content negotiation

## The Big Picture

Express doesn't create new request/response classes. Instead, it extends the prototypes of Node's `IncomingMessage` and `ServerResponse`:

```
Node.js                          Express Enhancement
┌─────────────────────┐          ┌─────────────────────┐
│  IncomingMessage    │          │  + req.get()        │
│  (req object)       │    ──►   │  + req.is()         │
│                     │          │  + req.accepts()    │
│  - url              │          │  + req.query        │
│  - method           │          │  + req.params       │
│  - headers          │          │  + req.body         │
└─────────────────────┘          └─────────────────────┘

┌─────────────────────┐          ┌─────────────────────┐
│  ServerResponse     │          │  + res.json()       │
│  (res object)       │    ──►   │  + res.send()       │
│                     │          │  + res.status()     │
│  - writeHead()      │          │  + res.set()        │
│  - write()          │          │  + res.redirect()   │
│  - end()            │          │  + res.type()       │
└─────────────────────┘          └─────────────────────┘
```

## Files in This Step

```
02-request-response-enhancement/
├── lib/
│   ├── index.js          # Main module, creates enhanced server
│   ├── request.js        # Request prototype extensions
│   ├── response.js       # Response prototype extensions
│   └── utils.js          # Shared utilities
├── test/
│   ├── request.test.js   # Request enhancement tests
│   ├── response.test.js  # Response enhancement tests
│   └── integration.test.js
└── examples/
    ├── 01-enhanced-request.js
    ├── 02-enhanced-response.js
    ├── 03-method-chaining.js
    └── 04-content-negotiation.js
```

## Core Concepts

### 1. Prototype Extension

JavaScript allows adding methods to object prototypes:

```javascript
const http = require('http');

// Add a method to ALL response objects
http.ServerResponse.prototype.json = function(data) {
  this.setHeader('Content-Type', 'application/json');
  this.end(JSON.stringify(data));
};

// Now every res object has .json()
http.createServer((req, res) => {
  res.json({ message: 'Hello!' }); // Works!
});
```

### 2. Express Request Extensions

Express adds many properties and methods to `req`:

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `req.query` | object | Parsed query string |
| `req.params` | object | Route parameters |
| `req.body` | any | Parsed request body |
| `req.path` | string | URL path without query |
| `req.hostname` | string | Host name |
| `req.ip` | string | Client IP |
| `req.get(header)` | function | Get request header |
| `req.is(type)` | function | Check content-type |
| `req.accepts(types)` | function | Check Accept header |

### 3. Express Response Extensions

Express adds many methods to `res`:

| Method | Description |
|--------|-------------|
| `res.status(code)` | Set status code (chainable) |
| `res.set(header, value)` | Set response header |
| `res.get(header)` | Get response header |
| `res.type(type)` | Set Content-Type |
| `res.json(data)` | Send JSON response |
| `res.send(body)` | Send response (auto content-type) |
| `res.redirect([status,] url)` | Redirect response |
| `res.end()` | End response |

### 4. Method Chaining

Express methods return `this` to enable chaining:

```javascript
res
  .status(201)
  .set('X-Custom', 'value')
  .json({ created: true });
```

## Implementation Guide

### Part 1: Request Extensions

```javascript
// lib/request.js
const http = require('http');
const { URL } = require('url');

const req = http.IncomingMessage.prototype;

/**
 * Get a request header (case-insensitive)
 */
req.get = function(name) {
  const lc = name.toLowerCase();

  // Special cases
  if (lc === 'referer' || lc === 'referrer') {
    return this.headers.referrer || this.headers.referer;
  }

  return this.headers[lc];
};

// Alias
req.header = req.get;

/**
 * Check if content-type matches
 */
req.is = function(type) {
  const contentType = this.get('content-type') || '';

  // Handle shorthand like 'json'
  if (!type.includes('/')) {
    type = `application/${type}`;
  }

  return contentType.includes(type);
};

/**
 * Check what content types are accepted
 */
req.accepts = function(...types) {
  const accept = this.get('accept') || '*/*';

  for (const type of types) {
    if (accept.includes(type) || accept.includes('*/*')) {
      return type;
    }
  }

  return false;
};
```

### Part 2: Response Extensions

```javascript
// lib/response.js
const http = require('http');

const res = http.ServerResponse.prototype;

/**
 * Set status code (chainable)
 */
res.status = function(code) {
  this.statusCode = code;
  return this; // Enable chaining
};

/**
 * Set a response header (chainable)
 */
res.set = function(field, val) {
  if (typeof field === 'object') {
    // res.set({ 'Content-Type': 'text/html', 'X-Custom': 'value' })
    for (const key in field) {
      this.setHeader(key, field[key]);
    }
  } else {
    this.setHeader(field, val);
  }
  return this;
};

// Alias
res.header = res.set;

/**
 * Get a response header
 */
res.get = function(field) {
  return this.getHeader(field);
};

/**
 * Set Content-Type header
 */
res.type = function(type) {
  // Map shorthand to full MIME types
  const mimeTypes = {
    'html': 'text/html; charset=utf-8',
    'json': 'application/json; charset=utf-8',
    'text': 'text/plain; charset=utf-8',
    'xml': 'application/xml',
    'css': 'text/css; charset=utf-8',
    'js': 'application/javascript; charset=utf-8'
  };

  const contentType = mimeTypes[type] || type;
  return this.set('Content-Type', contentType);
};

/**
 * Send JSON response
 */
res.json = function(data) {
  const body = JSON.stringify(data);

  if (!this.get('Content-Type')) {
    this.type('json');
  }

  this.set('Content-Length', Buffer.byteLength(body));
  this.end(body);

  return this;
};

/**
 * Smart send - detects content type
 */
res.send = function(body) {
  // Handle different body types
  if (typeof body === 'object') {
    return this.json(body);
  }

  if (typeof body === 'string') {
    // Check if it looks like HTML
    if (body.startsWith('<')) {
      if (!this.get('Content-Type')) {
        this.type('html');
      }
    } else {
      if (!this.get('Content-Type')) {
        this.type('text');
      }
    }
  }

  if (typeof body === 'number') {
    // Treat numbers as status codes for backwards compatibility
    this.status(body);
    body = http.STATUS_CODES[body] || String(body);
    this.type('text');
  }

  this.set('Content-Length', Buffer.byteLength(String(body)));
  this.end(body);

  return this;
};

/**
 * Redirect to URL
 */
res.redirect = function(statusOrUrl, url) {
  let status = 302;

  if (typeof statusOrUrl === 'number') {
    status = statusOrUrl;
  } else {
    url = statusOrUrl;
  }

  this.status(status);
  this.set('Location', url);
  this.end();

  return this;
};
```

### Part 3: Server with Enhanced Objects

```javascript
// lib/index.js
const http = require('http');

// Apply enhancements
require('./request');
require('./response');

function createServer(handler) {
  return http.createServer((req, res) => {
    // Parse URL info once
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Attach parsed properties
    req.path = url.pathname;
    req.query = Object.fromEntries(url.searchParams);
    req.hostname = url.hostname;

    // Record timing
    req._startTime = Date.now();

    // Call handler
    handler(req, res);
  });
}

module.exports = { createServer };
```

## Step-by-Step Examples

### Example 1: Enhanced Request

```javascript
const { createServer } = require('./lib');

const server = createServer((req, res) => {
  // Use req.get() instead of req.headers['...']
  const userAgent = req.get('user-agent');
  const contentType = req.get('content-type');

  // Use req.is() to check content type
  if (req.is('json')) {
    console.log('JSON request received');
  }

  // Use req.accepts() for content negotiation
  if (req.accepts('json')) {
    res.json({ userAgent, contentType });
  } else {
    res.send('Hello!');
  }
});
```

### Example 2: Enhanced Response

```javascript
const { createServer } = require('./lib');

const server = createServer((req, res) => {
  // Chain methods
  res
    .status(200)
    .set('X-Powered-By', 'Our Express')
    .json({ message: 'Hello!' });
});
```

### Example 3: Content Negotiation

```javascript
const { createServer } = require('./lib');

const server = createServer((req, res) => {
  const data = { name: 'John', age: 30 };

  // Respond based on what client accepts
  if (req.accepts('json')) {
    res.json(data);
  } else if (req.accepts('html')) {
    res.type('html').send(`<h1>${data.name}</h1>`);
  } else {
    res.type('text').send(`Name: ${data.name}`);
  }
});
```

## How Express Actually Does This

Express uses a slightly different approach:

1. Creates new prototype objects that inherit from Node's
2. Assigns these to `req.__proto__` and `res.__proto__`
3. This allows per-application customization

```javascript
// Simplified Express approach
const request = Object.create(http.IncomingMessage.prototype);
const response = Object.create(http.ServerResponse.prototype);

// Add methods to these objects
request.get = function() { /* ... */ };
response.json = function() { /* ... */ };

// In the server handler
http.createServer((req, res) => {
  Object.setPrototypeOf(req, request);
  Object.setPrototypeOf(res, response);
  // Now req and res have the extended methods
});
```

## Comparison: Before and After

### Before (Raw Node.js)
```javascript
// Get header
const type = req.headers['content-type'];

// Send JSON
res.writeHead(200, { 'Content-Type': 'application/json' });
res.end(JSON.stringify({ data: 'value' }));

// Redirect
res.writeHead(302, { 'Location': '/new-url' });
res.end();
```

### After (Enhanced)
```javascript
// Get header
const type = req.get('content-type');

// Send JSON
res.json({ data: 'value' });

// Redirect
res.redirect('/new-url');
```

## Exercises

1. **Basic**: Add a `req.protocol` property that returns 'http' or 'https'
2. **Intermediate**: Implement `res.sendStatus(code)` that sends just a status
3. **Advanced**: Implement `res.format()` for content negotiation

## Testing Your Implementation

```bash
# Run tests
npm test

# Test manually
curl -H "Accept: application/json" http://localhost:3000
curl -H "Content-Type: application/json" -d '{}' http://localhost:3000
```

## Key Takeaways

1. **Prototype extension** is how Express adds methods to req/res
2. **Method chaining** makes code more readable
3. **Content negotiation** lets servers respond appropriately
4. **Abstraction** hides low-level details
5. **Consistency** across all requests/responses

## Next Step

In [Step 03: Basic Routing](../03-basic-routing/), we'll implement path matching and route handlers - the core of Express's routing system.
