# Step 10: Body Parsers

Learn how Express.js parses request bodies with built-in middleware.

## What You'll Learn

1. **Request body basics** - How HTTP bodies work
2. **express.json()** - Parsing JSON payloads
3. **express.urlencoded()** - Parsing form data
4. **express.raw()** - Binary data handling
5. **express.text()** - Plain text bodies
6. **Content-Type handling** - Type checking and validation

## Core Concepts

### The Request Body Problem

HTTP request bodies are streams - data comes in chunks:

```javascript
// Without body parser, body is a stream
app.post('/data', (req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    // Now parse manually
    const data = JSON.parse(body);
    res.json({ received: data });
  });
});
```

Body parsers handle this automatically:

```javascript
// With body parser
app.use(express.json());

app.post('/data', (req, res) => {
  // req.body is already parsed!
  res.json({ received: req.body });
});
```

### How Body Parsing Works

```
Request arrives
      ↓
Check Content-Type header
      ↓
Read body stream into buffer
      ↓
Parse buffer based on type
      ↓
Attach result to req.body
      ↓
Call next()
```

### express.json()

Parses `application/json` content:

```javascript
// Basic usage
app.use(express.json());

// With options
app.use(express.json({
  limit: '100kb',         // Max body size
  strict: true,           // Only objects and arrays
  type: 'application/json' // Content type to match
}));

// Usage
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  res.json({ created: { name, email } });
});
```

### express.urlencoded()

Parses `application/x-www-form-urlencoded` (HTML forms):

```javascript
// Basic usage
app.use(express.urlencoded({ extended: true }));

// Options
app.use(express.urlencoded({
  extended: true,    // Use qs library (nested objects)
  limit: '100kb',    // Max body size
  parameterLimit: 1000 // Max number of parameters
}));

// Usage (form submission)
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Authenticate...
});
```

### extended: true vs false

```javascript
// extended: false (querystring library)
// Only supports flat key=value pairs
// user[name]=John → { 'user[name]': 'John' }

// extended: true (qs library)
// Supports nested objects and arrays
// user[name]=John → { user: { name: 'John' } }
```

### express.raw()

Returns body as a Buffer:

```javascript
app.use(express.raw({
  type: 'application/octet-stream',
  limit: '5mb'
}));

app.post('/upload', (req, res) => {
  // req.body is a Buffer
  const buffer = req.body;
  console.log('Received', buffer.length, 'bytes');
});
```

### express.text()

Returns body as a string:

```javascript
app.use(express.text({
  type: 'text/plain',
  limit: '100kb'
}));

app.post('/webhook', (req, res) => {
  // req.body is a string
  console.log('Received:', req.body);
});
```

## Content-Type Matching

Body parsers check the Content-Type header:

```javascript
// Match specific types
app.use(express.json({ type: 'application/json' }));
app.use(express.json({ type: '*/json' })); // Any subtype of json
app.use(express.json({ type: ['application/json', 'text/json'] }));

// Custom type function
app.use(express.json({
  type: (req) => {
    return req.headers['content-type']?.includes('json');
  }
}));
```

## Size Limits

Protect against large payloads:

```javascript
// Different limits for different content
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ limit: '100kb', extended: true }));
app.use(express.raw({ type: 'image/*', limit: '10mb' }));
```

Size limit formats:
- Number: bytes (e.g., `102400`)
- String: human-readable (e.g., `'100kb'`, `'1mb'`, `'10gb'`)

## Error Handling

Body parsers emit errors:

```javascript
app.use(express.json());

app.post('/data', (req, res) => {
  res.json(req.body);
});

// Handle parsing errors
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON'
    });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Payload too large'
    });
  }
  next(err);
});
```

## Common Patterns

### API Server

```javascript
// JSON only API
app.use(express.json());

app.post('/api/*', (req, res, next) => {
  // Verify content type for all API routes
  if (!req.is('application/json')) {
    return res.status(415).json({
      error: 'Content-Type must be application/json'
    });
  }
  next();
});
```

### Mixed Content

```javascript
// Support multiple content types
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: 'text/*' }));

app.post('/flexible', (req, res) => {
  // Works with JSON, form data, or text
  res.json({
    received: req.body,
    contentType: req.headers['content-type']
  });
});
```

### Webhook Handler

```javascript
// Raw body for signature verification
app.use('/webhook', express.raw({ type: '*/*' }));

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-signature'];
  const rawBody = req.body; // Buffer

  // Verify signature with raw bytes
  if (verifySignature(rawBody, signature)) {
    const data = JSON.parse(rawBody.toString());
    // Process webhook...
  }
});
```

## Running Examples

```bash
# JSON parser example
npm run example:json

# Form data parser
npm run example:urlencoded

# Raw binary data
npm run example:raw

# Plain text
npm run example:text
```

## Running Tests

```bash
npm test
```

## Key Takeaways

1. **Body parsers read streams** and attach parsed data to `req.body`
2. **express.json()** parses JSON with Content-Type `application/json`
3. **express.urlencoded()** parses form data
4. **extended: true** enables nested object parsing
5. **Always set size limits** to prevent abuse
6. **Handle parsing errors** appropriately
7. **Content-Type matching** controls which requests are parsed

## Next Step

[Step 11: Cookie & Session Support](../11-cookies-sessions/README.md) - Learn about cookies and sessions.
