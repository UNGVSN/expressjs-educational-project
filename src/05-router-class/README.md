# Step 05: The Router Class

## Overview

The Router class is one of Express's most powerful features. It allows you to create modular, mountable route handlers. A Router instance is a complete middleware and routing system - essentially a "mini-application" that can be mounted on a main app.

## Learning Objectives

By the end of this step, you will understand:

1. Why the Router class exists
2. How routers enable modular code organization
3. How router mounting and path prefixes work
4. How to use `router.param()` for parameter preprocessing
5. How Express uses routers internally

## Why Use Routers?

Without routers, all routes live on the main application:

```javascript
// Without Router - everything in one file
app.get('/api/users', listUsers);
app.get('/api/users/:id', getUser);
app.post('/api/users', createUser);
app.get('/api/posts', listPosts);
app.get('/api/posts/:id', getPost);
app.post('/api/posts', createPost);
// ... gets messy quickly
```

With routers, you can organize by feature:

```javascript
// routes/users.js
const router = express.Router();
router.get('/', listUsers);
router.get('/:id', getUser);
router.post('/', createUser);
module.exports = router;

// routes/posts.js
const router = express.Router();
router.get('/', listPosts);
router.get('/:id', getPost);
router.post('/', createPost);
module.exports = router;

// app.js
const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');

app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);
```

## Key Concepts

### 1. Router as Mini-Application

A Router is like a mini Express app. It has:
- Its own middleware stack
- Its own route handlers
- Its own error handlers

```javascript
const router = express.Router();

// Router-level middleware
router.use((req, res, next) => {
  console.log('Router middleware');
  next();
});

// Router routes
router.get('/', (req, res) => {
  res.send('Router home');
});
```

### 2. Router Mounting

When you mount a router, it's like attaching a mini-app at a path:

```javascript
const apiRouter = express.Router();

apiRouter.get('/status', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount at /api
app.use('/api', apiRouter);

// Now /api/status → apiRouter's /status handler
```

### 3. Path Stripping

When a router is mounted, the mount path is stripped for the router's handlers:

```javascript
app.use('/api/v1', router);

// Request to /api/v1/users
// Inside router, req.path is '/users'
// req.baseUrl is '/api/v1'
// req.originalUrl is '/api/v1/users'
```

### 4. Router Parameters

`router.param()` lets you preprocess route parameters:

```javascript
router.param('id', (req, res, next, id) => {
  // This runs for any route with :id
  const user = database.findUser(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  req.user = user;
  next();
});

router.get('/:id', (req, res) => {
  // req.user is already set!
  res.json(req.user);
});
```

## Implementation Details

### Router Class Structure

```javascript
class Router {
  constructor(options = {}) {
    this.stack = [];           // Layer stack
    this.params = {};          // Parameter handlers
    this.caseSensitive = options.caseSensitive || false;
    this.strict = options.strict || false;
  }

  // HTTP method handlers
  get(path, ...handlers) { }
  post(path, ...handlers) { }
  put(path, ...handlers) { }
  delete(path, ...handlers) { }

  // Middleware
  use(path, ...handlers) { }

  // Route chaining
  route(path) { }

  // Parameter preprocessing
  param(name, handler) { }

  // Handle request (called when mounted)
  handle(req, res, done) { }
}
```

### The handle() Method

This is the heart of the router - it processes requests through its stack:

```javascript
handle(req, res, done) {
  let index = 0;

  const next = (err) => {
    const layer = this.stack[index++];
    if (!layer) return done(err);

    if (!layer.match(req.path)) {
      return next(err);
    }

    // Process parameter handlers first
    this.processParams(layer.params, req, res, (err) => {
      if (err) return next(err);
      layer.handle(req, res, next);
    });
  };

  next();
}
```

## File Structure

```
05-router-class/
├── lib/
│   ├── index.js        # Application with router support
│   ├── router.js       # Router class
│   ├── route.js        # Route class (method handlers)
│   └── layer.js        # Layer class
├── test/
│   ├── router.test.js      # Router tests
│   ├── mounting.test.js    # Mount/path tests
│   └── params.test.js      # Parameter tests
├── examples/
│   ├── 01-basic-router.js
│   ├── 02-mounted-routers.js
│   ├── 03-api-routes.js
│   └── 04-router-params.js
└── README.md
```

## Express Router Internals

In Express source code (lib/router/index.js):

```javascript
var proto = module.exports = function(options) {
  var opts = options || {};

  function router(req, res, next) {
    router.handle(req, res, next);
  }

  // mixin Router class functions
  setPrototypeOf(router, proto);

  router.params = {};
  router._params = [];
  router.caseSensitive = opts.caseSensitive;
  router.mergeParams = opts.mergeParams;
  router.strict = opts.strict;
  router.stack = [];

  return router;
};
```

Note how the router is itself a function! This allows `app.use('/api', router)`.

## Common Patterns

### API Versioning

```javascript
const v1Router = express.Router();
const v2Router = express.Router();

v1Router.get('/users', getUsersV1);
v2Router.get('/users', getUsersV2);

app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);
```

### Feature-based Organization

```
routes/
├── auth.js      // /auth/*
├── users.js     // /users/*
├── posts.js     // /posts/*
└── admin.js     // /admin/*
```

### Nested Routers

```javascript
const apiRouter = express.Router();
const usersRouter = express.Router();

usersRouter.get('/', listUsers);
usersRouter.get('/:id', getUser);

apiRouter.use('/users', usersRouter);
app.use('/api', apiRouter);

// /api/users → usersRouter
// /api/users/123 → usersRouter with id param
```

## Running the Examples

```bash
# Basic router usage
npm run example:basic

# Mounted routers
npm run example:mounted

# API organization
npm run example:api

# Router parameters
npm run example:params

# Run all tests
npm test
```

## Key Takeaways

1. **Router = Mini App** - Has its own stack, middleware, and routes
2. **Mounting attaches routers** - `app.use('/path', router)`
3. **Paths are relative** - Router sees paths relative to mount point
4. **router.param()** - Preprocess parameters before route handlers
5. **Enables modular code** - Organize routes by feature/resource

## Next Step

In Step 06, we'll build the complete **Application** class that ties everything together and adds advanced features like settings, engines, and locals.

---

[← Previous: Step 04 - Middleware Pipeline](../04-middleware-pipeline/README.md) | [Next: Step 06 - Application Class →](../06-application-class/README.md)
