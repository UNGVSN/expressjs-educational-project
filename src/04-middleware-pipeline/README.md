# Step 04: Middleware Pipeline

## Overview

The middleware pipeline is the **heart of Express.js**. It's what makes Express so flexible and powerful. In this step, we'll implement the complete middleware system, including the `next()` function, error handling middleware, and the ability to compose middleware chains.

## Learning Objectives

By the end of this step, you will understand:

1. What middleware is and why it's powerful
2. How the `next()` function works internally
3. How middleware execution order matters
4. How error handling middleware works (4-argument functions)
5. How to build reusable middleware
6. The "onion model" of request processing

## What is Middleware?

Middleware functions are functions that have access to:
- The **request object** (`req`)
- The **response object** (`res`)
- The **next function** (`next`) in the request-response cycle

```javascript
function middleware(req, res, next) {
  // Do something with req/res
  // Then either:
  // 1. End the response: res.send('done')
  // 2. Pass to next: next()
  // 3. Pass an error: next(err)
}
```

## The Middleware Pipeline

When a request comes in, it flows through a pipeline of middleware:

```
Request → Middleware 1 → Middleware 2 → Route Handler → Response
              ↓               ↓               ↓
           next()          next()          res.send()
```

Each middleware can:
1. **Execute code** - logging, parsing, authentication
2. **Modify req/res** - add properties, parse body
3. **End the request** - send response, redirect
4. **Call next()** - pass control to the next middleware

## Key Concepts Implemented

### 1. The `next()` Function

```javascript
// How next() works internally
function createNext(stack, index, req, res, done) {
  return function next(err) {
    if (err) {
      // Skip to error handling middleware
      return handleError(err, req, res, stack, index);
    }

    // Get next layer
    const layer = stack[index];
    if (!layer) {
      return done(); // End of stack
    }

    // Execute middleware with new next
    const nextFn = createNext(stack, index + 1, req, res, done);
    layer.handle(req, res, nextFn);
  };
}
```

### 2. The Stack/Layer Architecture

```javascript
class Application {
  constructor() {
    this.stack = [];  // Middleware stack
  }

  use(path, ...handlers) {
    // Normalize arguments
    if (typeof path === 'function') {
      handlers = [path, ...handlers];
      path = '/';
    }

    // Add each handler as a layer
    handlers.forEach(handler => {
      this.stack.push(new Layer(path, handler));
    });
  }
}
```

### 3. Middleware Types

```javascript
// Regular middleware (3 args)
app.use((req, res, next) => {
  console.log('Request:', req.method, req.url);
  next();
});

// Error handling middleware (4 args)
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).send('Something broke!');
});

// Path-specific middleware
app.use('/api', (req, res, next) => {
  // Only runs for /api/* paths
  next();
});
```

## Express's Middleware Pattern

Express uses what's called the "onion model":

```
        ┌─────────────────────────────────────┐
        │          Middleware 1               │
        │   ┌─────────────────────────────┐   │
        │   │       Middleware 2          │   │
        │   │   ┌─────────────────────┐   │   │
        │   │   │   Route Handler     │   │   │
        │   │   │   (core/center)     │   │   │
        │   │   └─────────────────────┘   │   │
        │   └─────────────────────────────┘   │
        └─────────────────────────────────────┘
```

Request flows IN through layers, response flows OUT through layers.

## File Structure

```
04-middleware-pipeline/
├── lib/
│   ├── index.js        # Application with middleware support
│   ├── layer.js        # Layer class (path + handler)
│   ├── middleware.js   # Built-in middleware helpers
│   └── utils.js        # Utility functions
├── test/
│   ├── middleware.test.js   # Core middleware tests
│   ├── next.test.js         # next() function tests
│   └── error.test.js        # Error handling tests
├── examples/
│   ├── 01-basic-middleware.js
│   ├── 02-next-function.js
│   ├── 03-middleware-chain.js
│   ├── 04-timing-middleware.js
│   ├── 05-auth-middleware.js
│   └── 06-error-handling.js
└── README.md
```

## Common Middleware Patterns

### Logging Middleware
```javascript
function logger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });

  next();
}
```

### Authentication Middleware
```javascript
function authenticate(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Request Timing
```javascript
function timing(req, res, next) {
  req.startTime = Date.now();

  const originalSend = res.send;
  res.send = function(...args) {
    res.set('X-Response-Time', `${Date.now() - req.startTime}ms`);
    return originalSend.apply(this, args);
  };

  next();
}
```

## How Express Implements This

In Express source code (lib/router/index.js):

```javascript
proto.handle = function handle(req, res, out) {
  var self = this;
  var idx = 0;
  var stack = self.stack;

  next();

  function next(err) {
    var layer = stack[idx++];

    if (!layer) {
      return out(err);
    }

    // Match layer path
    if (!layer.match(req.path)) {
      return next(err);
    }

    // Handle error or regular middleware
    if (err) {
      call(layer.handle_error, layer, err, req, res, next);
    } else {
      call(layer.handle_request, layer, req, res, next);
    }
  }
};
```

## Testing Middleware

```javascript
// Test middleware execution order
it('should execute middleware in order', async () => {
  const order = [];

  app.use((req, res, next) => {
    order.push(1);
    next();
  });

  app.use((req, res, next) => {
    order.push(2);
    next();
  });

  app.get('/', (req, res) => {
    order.push(3);
    res.send('done');
  });

  await request(app).get('/');
  assert.deepEqual(order, [1, 2, 3]);
});
```

## Running the Examples

```bash
# Basic middleware usage
npm run example:basic

# Understanding next()
npm run example:next

# Middleware chains
npm run example:chain

# Request timing middleware
npm run example:timing

# Authentication middleware
npm run example:auth

# Error handling
npm run example:error

# Run all tests
npm test
```

## Key Takeaways

1. **Middleware is a function** - It receives req, res, next
2. **next() is essential** - Without calling it, request hangs
3. **Order matters** - Middleware executes in registration order
4. **Errors skip regular middleware** - They go to error handlers
5. **Error handlers have 4 parameters** - (err, req, res, next)
6. **Middleware can be path-specific** - Only run for certain paths

## Next Step

In Step 05, we'll extract the routing logic into a separate **Router** class, enabling modular route definitions and sub-applications.

---

[← Previous: Step 03 - Basic Routing](../03-basic-routing/README.md) | [Next: Step 05 - Router Class →](../05-router-class/README.md)
