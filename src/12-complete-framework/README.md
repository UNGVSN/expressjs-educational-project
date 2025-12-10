# Step 12: Complete Mini-Express Framework

The culmination of our journey - a fully functional Express-like web framework built from scratch.

## What We've Built

This framework combines all the concepts from Steps 01-11:

1. **HTTP Server Foundation** - Node.js http module
2. **Request/Response Enhancement** - Express-like API
3. **Basic Routing** - Path matching with parameters
4. **Middleware Pipeline** - next() pattern
5. **Router Class** - Modular route organization
6. **Application Class** - Main framework entry point
7. **Static File Serving** - express.static equivalent
8. **Template Engines** - View rendering system
9. **Error Handling** - Custom errors and handlers
10. **Body Parsers** - JSON, URL-encoded, raw, text
11. **Cookies & Sessions** - Authentication support

## Framework API

### Creating an Application

```javascript
const express = require('./lib');

const app = express();
```

### Routing

```javascript
// Basic routes
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/users', (req, res) => {
  res.json({ created: req.body });
});

// Route parameters
app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id });
});

// Router for modular routes
const router = express.Router();
router.get('/', listProducts);
router.post('/', createProduct);
app.use('/api/products', router);
```

### Middleware

```javascript
// Application-level middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Built-in middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Cookie and session support
app.use(express.cookieParser('secret'));
app.use(express.session({ secret: 'secret' }));
```

### Request Object

```javascript
app.get('/example', (req, res) => {
  req.method;          // HTTP method
  req.url;             // Full URL
  req.path;            // URL path
  req.query;           // Query parameters
  req.params;          // Route parameters
  req.body;            // Parsed body
  req.cookies;         // Parsed cookies
  req.signedCookies;   // Verified signed cookies
  req.session;         // Session data
  req.headers;         // HTTP headers
  req.get('header');   // Get specific header
});
```

### Response Object

```javascript
app.get('/example', (req, res) => {
  // Status code
  res.status(201);

  // Headers
  res.set('X-Custom', 'value');

  // Send responses
  res.send('text');           // Send text/HTML
  res.json({ data: 'value' }); // Send JSON
  res.sendFile('/path/to/file'); // Send file

  // Cookies
  res.cookie('name', 'value', { httpOnly: true });
  res.clearCookie('name');

  // Redirects
  res.redirect('/other');
  res.redirect(301, '/permanent');

  // Rendering views
  res.render('template', { data: 'value' });
});
```

### View Engine

```javascript
// Setup
app.set('views', './views');
app.set('view engine', 'ejs');

// Render
app.get('/', (req, res) => {
  res.render('index', { title: 'Home' });
});
```

### Error Handling

```javascript
// Async error handling
app.get('/data', async (req, res, next) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Error middleware (4 arguments)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});
```

## Architecture Overview

```
Application
├── Settings (views, view engine, etc.)
├── Middleware Stack
│   ├── Built-in Middleware
│   │   ├── json()
│   │   ├── urlencoded()
│   │   ├── static()
│   │   ├── cookieParser()
│   │   └── session()
│   └── User Middleware
├── Router
│   ├── Route Layer
│   │   └── Path Matching (pathToRegexp)
│   └── Handlers
└── Error Handlers
```

## Comparison with Express.js

| Feature | Our Framework | Express.js |
|---------|--------------|------------|
| Routing | ✅ Full support | ✅ Full support |
| Middleware | ✅ Full support | ✅ Full support |
| Router | ✅ Full support | ✅ Full support |
| Static files | ✅ Basic support | ✅ Full support |
| Body parsing | ✅ JSON, URL, text, raw | ✅ More options |
| Cookies | ✅ Signed cookies | ✅ Signed cookies |
| Sessions | ✅ Memory store | ✅ Multiple stores |
| Views | ✅ EJS-like engine | ✅ Multiple engines |
| Error handling | ✅ Full support | ✅ Full support |

## Files Structure

```
lib/
├── index.js          # Main entry point (express function)
├── application.js    # Application class
├── router.js         # Router class
├── request.js        # Request enhancements
├── response.js       # Response enhancements
├── layer.js          # Route layer
├── middleware/       # Built-in middleware
│   ├── json.js
│   ├── urlencoded.js
│   ├── static.js
│   ├── cookie-parser.js
│   └── session.js
└── view.js           # View engine
```

## Running Examples

```bash
# Basic application
npm run example:basic

# REST API server
npm run example:api

# Full-stack application
npm run example:fullstack

# Compare with Express.js
npm run example:compare
```

## Running Tests

```bash
npm test
```

## What We Learned

1. **HTTP fundamentals** - How web servers work at the lowest level
2. **Routing patterns** - Path matching and parameter extraction
3. **Middleware concept** - The power of composable request handlers
4. **Separation of concerns** - Router, Application, Request, Response
5. **Error handling** - Proper async error propagation
6. **Security basics** - Signed cookies, session management
7. **Design patterns** - Factory, Chain of Responsibility, Strategy

## Next Steps

To extend this framework, you could add:

- HTTPS support
- HTTP/2 support
- More session stores (Redis, MongoDB)
- More template engines
- Request validation
- Rate limiting
- CORS middleware
- Compression middleware
- Logging middleware
- WebSocket support

## Congratulations!

You've successfully built a web framework from scratch! You now understand:
- How Express.js works internally
- Why certain design decisions were made
- How to extend or modify the framework
- The fundamentals of Node.js web development
