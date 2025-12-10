# Step 01: HTTP Server Foundation

## Overview

Before we can build Express, we need to deeply understand what Express is built on: Node.js's `http` module. In this step, we'll create a solid foundation that handles HTTP requests and responses at the lowest level.

## Learning Objectives

By the end of this step, you will:
1. Understand how Node.js handles HTTP connections
2. Know the structure of HTTP requests and responses
3. Be able to parse URLs, query strings, and headers
4. Handle different HTTP methods
5. Send various response types (text, JSON, HTML)
6. Understand the request/response lifecycle

## The Big Picture

When a browser sends a request to your server:

```
Browser                          Server
   │                               │
   │  GET /users?page=1 HTTP/1.1  │
   │  Host: localhost:3000         │
   │  Accept: application/json     │
   │ ─────────────────────────────►│
   │                               │
   │                               │ 1. TCP connection established
   │                               │ 2. HTTP request parsed
   │                               │ 3. Your code runs
   │                               │ 4. Response sent
   │                               │
   │  HTTP/1.1 200 OK              │
   │  Content-Type: application/json
   │  {"users": [...]}             │
   │ ◄─────────────────────────────│
   │                               │
```

## Files in This Step

```
01-http-server-foundation/
├── lib/
│   ├── index.js          # Main server creation
│   ├── request.js        # Request parsing utilities
│   ├── response.js       # Response helper utilities
│   └── utils.js          # Shared utilities
├── test/
│   ├── server.test.js    # Server tests
│   ├── request.test.js   # Request parsing tests
│   └── response.test.js  # Response helper tests
└── examples/
    ├── 01-basic-server.js
    ├── 02-handling-methods.js
    ├── 03-parsing-urls.js
    ├── 04-query-strings.js
    ├── 05-request-headers.js
    ├── 06-response-types.js
    └── 07-streaming-response.js
```

## Core Concepts

### 1. The HTTP Module

Node.js provides the `http` module for creating servers:

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  // req = IncomingMessage (readable stream)
  // res = ServerResponse (writable stream)
});

server.listen(3000);
```

### 2. The Request Object (IncomingMessage)

The `req` object contains all information about the incoming request:

| Property | Type | Description |
|----------|------|-------------|
| `req.method` | string | HTTP method (GET, POST, etc.) |
| `req.url` | string | Request URL path with query string |
| `req.headers` | object | HTTP headers (lowercase keys) |
| `req.httpVersion` | string | HTTP version (1.0, 1.1, 2.0) |
| `req.socket` | net.Socket | Underlying TCP socket |

### 3. The Response Object (ServerResponse)

The `res` object is used to send data back:

| Method | Description |
|--------|-------------|
| `res.writeHead(statusCode, headers)` | Write status and headers |
| `res.setHeader(name, value)` | Set a single header |
| `res.write(chunk)` | Write body data |
| `res.end([data])` | End response |

### 4. Request Lifecycle

```
1. Connection     ─► TCP socket opened
2. Request        ─► HTTP headers received, req object created
3. Body (optional)─► Request body streamed via data/end events
4. Processing     ─► Your handler code runs
5. Response       ─► Headers sent, then body
6. End            ─► Response complete, connection may stay open (keep-alive)
```

## Implementation Guide

### Part 1: Basic Server

First, let's create the simplest possible server:

```javascript
// lib/index.js - Part 1
const http = require('http');

function createServer(handler) {
  return http.createServer(handler);
}

module.exports = { createServer };
```

### Part 2: URL Parsing

We need to parse the URL to get the path and query parameters:

```javascript
// lib/request.js - URL Parsing
const { URL } = require('url');

function parseUrl(req) {
  // req.url is like "/users?page=1"
  // We need full URL for the URL constructor
  const fullUrl = `http://${req.headers.host}${req.url}`;
  const parsed = new URL(fullUrl);

  return {
    path: parsed.pathname,           // "/users"
    query: Object.fromEntries(parsed.searchParams), // { page: "1" }
    search: parsed.search,           // "?page=1"
    href: req.url                    // "/users?page=1"
  };
}
```

### Part 3: Query String Parsing

Deep dive into query string parsing:

```javascript
// lib/request.js - Query Parsing
function parseQueryString(queryString) {
  if (!queryString || queryString === '?') {
    return {};
  }

  // Remove leading ?
  const qs = queryString.startsWith('?') ? queryString.slice(1) : queryString;

  const params = {};

  for (const pair of qs.split('&')) {
    if (!pair) continue;

    const [key, value] = pair.split('=').map(decodeURIComponent);

    // Handle array notation: items[]=1&items[]=2
    if (key.endsWith('[]')) {
      const arrayKey = key.slice(0, -2);
      if (!params[arrayKey]) {
        params[arrayKey] = [];
      }
      params[arrayKey].push(value);
    }
    // Handle duplicate keys as arrays
    else if (params[key] !== undefined) {
      if (!Array.isArray(params[key])) {
        params[key] = [params[key]];
      }
      params[key].push(value);
    }
    else {
      params[key] = value ?? '';
    }
  }

  return params;
}
```

### Part 4: Response Helpers

Create helper functions for common response patterns:

```javascript
// lib/response.js
function sendJson(res, data, statusCode = 200) {
  const json = JSON.stringify(data);

  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json)
  });

  res.end(json);
}

function sendHtml(res, html, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html)
  });

  res.end(html);
}

function sendText(res, text, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text)
  });

  res.end(text);
}

function redirect(res, url, statusCode = 302) {
  res.writeHead(statusCode, {
    'Location': url
  });

  res.end();
}
```

## Step-by-Step Examples

### Example 1: Basic Server

```javascript
// examples/01-basic-server.js
const { createServer } = require('../lib');

const server = createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello, World!');
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

### Example 2: Handling Different Methods

```javascript
// examples/02-handling-methods.js
const { createServer } = require('../lib');

const server = createServer((req, res) => {
  const { method, url } = req;

  // Simple routing based on method
  switch (method) {
    case 'GET':
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'GET request received', url }));
      break;

    case 'POST':
      // Collect body data
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Created', received: body }));
      });
      break;

    case 'PUT':
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'PUT request received' }));
      break;

    case 'DELETE':
      res.writeHead(204); // No Content
      res.end();
      break;

    default:
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
  }
});

server.listen(3000);
```

### Example 3: URL Parsing

```javascript
// examples/03-parsing-urls.js
const { createServer, parseUrl } = require('../lib');

const server = createServer((req, res) => {
  const urlInfo = parseUrl(req);

  console.log('Path:', urlInfo.path);
  console.log('Query:', urlInfo.query);
  console.log('Search:', urlInfo.search);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(urlInfo, null, 2));
});

server.listen(3000, () => {
  console.log('Try: http://localhost:3000/users?page=1&sort=name');
});
```

## What Express Does Differently

In Express, much of this is automated:

| Raw Node.js | Express |
|-------------|---------|
| `parseUrl(req).path` | `req.path` |
| `parseUrl(req).query` | `req.query` |
| `res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify(data))` | `res.json(data)` |
| Manual method checking | `app.get()`, `app.post()` |

## Exercises

1. **Basic**: Create a server that responds with different messages based on the URL path
2. **Intermediate**: Parse query parameters and use them to filter a hardcoded array of items
3. **Advanced**: Implement a simple request logger that shows method, URL, headers, and timing

## Testing Your Implementation

```bash
# Run the test suite
npm test

# Or test manually with curl
curl http://localhost:3000
curl -X POST http://localhost:3000/users -d '{"name":"John"}'
curl "http://localhost:3000/search?q=hello&page=1"
```

## Key Takeaways

1. **Node.js http is low-level** - It gives you raw access but requires manual handling
2. **Streams are fundamental** - Both req and res are streams
3. **Headers must be sent first** - Can't modify headers after body starts
4. **URL parsing is essential** - Every framework needs to parse URLs
5. **Response helpers save time** - Common patterns should be abstracted

## Next Step

In [Step 02: Request/Response Enhancement](../02-request-response-enhancement/), we'll add helper methods to the req and res objects, making them more Express-like.
