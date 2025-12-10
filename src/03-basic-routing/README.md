# Step 03: Basic Routing

## Overview

Routing is at the heart of Express. It's how we map HTTP requests to specific handler functions based on the request's path and method. In this step, we'll implement a routing system that supports:

- Path matching (exact and pattern-based)
- Route parameters (`:id`, `:name`, etc.)
- HTTP method-specific handlers
- Multiple handlers for the same route

## Learning Objectives

By the end of this step, you will:
1. Understand how path-to-regexp style matching works
2. Implement route parameter extraction
3. Build a route registration and matching system
4. Handle different HTTP methods
5. Understand the relationship between routes and handlers

## The Big Picture

```
Request: GET /users/123/posts

                    Route Table
┌────────────────────────────────────────────────┐
│  Method    Path Pattern         Handler        │
├────────────────────────────────────────────────┤
│  GET       /                    homeHandler    │
│  GET       /users               listUsers      │
│  GET       /users/:id           getUser        │  ◄── Match!
│  POST      /users               createUser     │
│  GET       /users/:id/posts     getUserPosts   │  ◄── Better match!
│  PUT       /users/:id           updateUser     │
│  DELETE    /users/:id           deleteUser     │
└────────────────────────────────────────────────┘
                    │
                    ▼
          Extract params: { id: '123' }
                    │
                    ▼
          Call getUserPosts(req, res)
          with req.params = { id: '123' }
```

## Files in This Step

```
03-basic-routing/
├── lib/
│   ├── index.js          # Main application with routing
│   ├── route.js          # Route class - single route definition
│   ├── layer.js          # Layer class - route + handler
│   └── path-to-regexp.js # Path pattern matching
├── test/
│   ├── routing.test.js   # Routing tests
│   ├── params.test.js    # Parameter extraction tests
│   └── path.test.js      # Path matching tests
└── examples/
    ├── 01-basic-routes.js
    ├── 02-route-params.js
    ├── 03-http-methods.js
    └── 04-route-patterns.js
```

## Core Concepts

### 1. Route Registration

Express provides methods to register routes:

```javascript
app.get('/users', handler);      // GET requests to /users
app.post('/users', handler);     // POST requests to /users
app.put('/users/:id', handler);  // PUT requests to /users/:id
app.delete('/users/:id', handler); // DELETE requests to /users/:id
app.all('/api/*', handler);      // All methods to /api/*
```

### 2. Path Patterns

Express supports various path patterns:

| Pattern | Matches | Params |
|---------|---------|--------|
| `/users` | `/users` | `{}` |
| `/users/:id` | `/users/123` | `{ id: '123' }` |
| `/users/:id/posts/:postId` | `/users/5/posts/99` | `{ id: '5', postId: '99' }` |
| `/files/*` | `/files/a/b/c.txt` | `{ 0: 'a/b/c.txt' }` |
| `/api/:version?` | `/api` or `/api/v2` | `{ version: undefined }` or `{ version: 'v2' }` |

### 3. Route Matching Algorithm

```javascript
function matchRoute(method, path, routes) {
  for (const route of routes) {
    // Check method first (faster)
    if (route.method !== 'all' && route.method !== method.toLowerCase()) {
      continue;
    }

    // Then check path pattern
    const match = route.regexp.exec(path);
    if (match) {
      // Extract params from match groups
      const params = extractParams(route.keys, match);
      return { route, params };
    }
  }
  return null;
}
```

### 4. Parameter Extraction

```javascript
// Route: /users/:id/posts/:postId
// Path:  /users/123/posts/456

// The regexp captures groups for each parameter
// regexp.exec('/users/123/posts/456') returns:
// ['/users/123/posts/456', '123', '456']

// We map these to parameter names from route.keys:
// keys = ['id', 'postId']
// result = { id: '123', postId: '456' }
```

## Implementation Guide

### Part 1: Path Pattern Compiler

```javascript
// lib/path-to-regexp.js

/**
 * Convert a path pattern to a regular expression.
 *
 * @param {string} path - Path pattern like '/users/:id'
 * @returns {{ regexp: RegExp, keys: string[] }}
 */
function pathToRegexp(path) {
  const keys = [];

  // Escape special regex characters except our patterns
  let pattern = path
    .replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');

  // Convert :param to named capture groups
  pattern = pattern.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, key) => {
    keys.push(key);
    return '([^/]+)';  // Match anything except /
  });

  // Convert * to wildcard
  pattern = pattern.replace(/\\\*/g, '(.*)');

  // Anchor pattern
  const regexp = new RegExp(`^${pattern}$`);

  return { regexp, keys };
}
```

### Part 2: Layer Class

```javascript
// lib/layer.js

class Layer {
  constructor(path, handler, options = {}) {
    this.path = path;
    this.handler = handler;
    this.method = options.method || 'all';

    // Compile path to regexp
    const { regexp, keys } = pathToRegexp(path);
    this.regexp = regexp;
    this.keys = keys;
  }

  /**
   * Check if this layer matches the given path.
   */
  match(path) {
    const match = this.regexp.exec(path);
    if (!match) return false;

    // Extract params
    this.params = {};
    for (let i = 0; i < this.keys.length; i++) {
      this.params[this.keys[i]] = match[i + 1];
    }

    return true;
  }

  /**
   * Handle the request.
   */
  handleRequest(req, res, next) {
    try {
      this.handler(req, res, next);
    } catch (err) {
      next(err);
    }
  }
}
```

### Part 3: Route Class

```javascript
// lib/route.js

class Route {
  constructor(path) {
    this.path = path;
    this.stack = [];  // Layers for different methods
    this.methods = {};
  }

  /**
   * Add a handler for specific method.
   */
  addHandler(method, handler) {
    const layer = new Layer(this.path, handler, { method });
    this.methods[method] = true;
    this.stack.push(layer);
    return this;
  }

  // Convenience methods
  get(handler) { return this.addHandler('get', handler); }
  post(handler) { return this.addHandler('post', handler); }
  put(handler) { return this.addHandler('put', handler); }
  delete(handler) { return this.addHandler('delete', handler); }
  patch(handler) { return this.addHandler('patch', handler); }
  all(handler) { return this.addHandler('all', handler); }
}
```

### Part 4: Application with Routing

```javascript
// lib/index.js

function createApplication() {
  const routes = [];

  function app(req, res) {
    // Find matching route
    const method = req.method.toLowerCase();

    for (const layer of routes) {
      if (layer.match(req.path)) {
        if (layer.method === 'all' || layer.method === method) {
          // Attach params to request
          req.params = layer.params;

          // Call handler
          layer.handleRequest(req, res);
          return;
        }
      }
    }

    // No route found
    res.status(404).send('Not Found');
  }

  // Route registration methods
  app.get = (path, handler) => {
    routes.push(new Layer(path, handler, { method: 'get' }));
    return app;
  };

  app.post = (path, handler) => {
    routes.push(new Layer(path, handler, { method: 'post' }));
    return app;
  };

  // ... other methods

  return app;
}
```

## Step-by-Step Examples

### Example 1: Basic Routes

```javascript
const app = createApplication();

app.get('/', (req, res) => {
  res.send('Home Page');
});

app.get('/about', (req, res) => {
  res.send('About Page');
});

app.get('/contact', (req, res) => {
  res.send('Contact Page');
});
```

### Example 2: Route Parameters

```javascript
const app = createApplication();

// Single parameter
app.get('/users/:id', (req, res) => {
  res.json({ userId: req.params.id });
});

// Multiple parameters
app.get('/users/:userId/posts/:postId', (req, res) => {
  res.json({
    userId: req.params.userId,
    postId: req.params.postId
  });
});

// Optional parameter (handled with two routes)
app.get('/api/:version/users', (req, res) => {
  res.json({ version: req.params.version });
});
```

### Example 3: HTTP Methods

```javascript
const app = createApplication();
const users = [];

// List all users
app.get('/users', (req, res) => {
  res.json(users);
});

// Create user
app.post('/users', async (req, res) => {
  const body = await readJsonBody(req);
  const user = { id: users.length + 1, ...body };
  users.push(user);
  res.status(201).json(user);
});

// Get single user
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// Update user
app.put('/users/:id', async (req, res) => {
  const index = users.findIndex(u => u.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  const body = await readJsonBody(req);
  users[index] = { ...users[index], ...body };
  res.json(users[index]);
});

// Delete user
app.delete('/users/:id', (req, res) => {
  const index = users.findIndex(u => u.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  users.splice(index, 1);
  res.status(204).end();
});
```

## How Express Actually Does This

Express uses a more sophisticated approach:

1. **path-to-regexp**: External library for pattern matching
2. **Layer stack**: Each route has multiple layers
3. **Router inheritance**: Routers can be nested
4. **Method dispatch**: Optimized method matching

```javascript
// Simplified Express route matching
Router.prototype.handle = function(req, res, done) {
  let idx = 0;
  const stack = this.stack;

  function next(err) {
    if (idx >= stack.length) return done(err);

    const layer = stack[idx++];

    if (!layer.match(req.path)) return next(err);
    if (!layer.route) return layer.handle(req, res, next);
    if (!layer.route.handles_method(req.method)) return next(err);

    layer.handle_request(req, res, next);
  }

  next();
};
```

## Testing Your Routes

```bash
# Basic routes
curl http://localhost:3000/
curl http://localhost:3000/about

# Route params
curl http://localhost:3000/users/123
curl http://localhost:3000/users/456/posts/789

# CRUD operations
curl http://localhost:3000/users
curl -X POST http://localhost:3000/users -d '{"name":"John"}'
curl http://localhost:3000/users/1
curl -X PUT http://localhost:3000/users/1 -d '{"name":"Jane"}'
curl -X DELETE http://localhost:3000/users/1
```

## Key Takeaways

1. **Routes are patterns** - Not just strings, but patterns that match
2. **Order matters** - First matching route wins
3. **Params are extracted** - From URL segments into req.params
4. **Methods are matched** - GET, POST, etc. filter routes
5. **Handler receives req, res** - Standard signature

## Exercises

1. **Basic**: Add support for `app.head()` method
2. **Intermediate**: Implement route chaining like `app.route('/users').get(fn).post(fn)`
3. **Advanced**: Add support for optional parameters with `?` syntax

## Next Step

In [Step 04: Middleware Pipeline](../04-middleware-pipeline/), we'll implement the middleware system - the `next()` function and how multiple handlers work together.
