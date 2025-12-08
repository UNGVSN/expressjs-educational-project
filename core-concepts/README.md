# Core Concepts

This section covers the fundamental Express.js concepts that every developer must understand. These are the building blocks upon which all Express applications are built.

## Overview

Express.js core consists of four main components:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Express Application                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   express()  │  │    Router    │  │  Middleware  │          │
│  │  Application │──│    System    │──│    Stack     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Request / Response Cycle                     │  │
│  │                                                           │  │
│  │   Request ──► Middleware ──► Route Handler ──► Response   │  │
│  │     (req)        Stack           (req, res)      (res)    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Modules

| Module | Description | Key Concepts |
|--------|-------------|--------------|
| [express-function](./express-function/) | The express() factory | Creating applications |
| [application](./application/) | The app object | Settings, methods, lifecycle |
| [request](./request/) | The req object | Request data, parsing |
| [response](./response/) | The res object | Sending responses |
| [router](./router/) | The Router class | Modular routing |

## The Express Function

```javascript
const express = require('express')

// express() creates an application
const app = express()

// The app is actually a function
typeof app  // 'function'

// It can be passed to http.createServer()
const http = require('http')
http.createServer(app).listen(3000)

// Or use the shorthand
app.listen(3000)
```

## The Application Object

```javascript
const app = express()

// Settings
app.set('view engine', 'pug')
app.set('views', './views')
app.get('env')  // 'development'

// Middleware
app.use(express.json())
app.use('/api', apiRouter)

// Routes
app.get('/', (req, res) => res.send('Hello'))
app.post('/users', createUser)

// Listening
app.listen(3000, () => console.log('Server running'))
```

## The Request Object

```javascript
app.get('/users/:id', (req, res) => {
  // URL parameters
  req.params.id          // '123'

  // Query string
  req.query.sort         // 'name'

  // Request body (with parser middleware)
  req.body.name          // 'John'

  // Headers
  req.get('Content-Type')  // 'application/json'

  // Other properties
  req.method             // 'GET'
  req.path               // '/users/123'
  req.hostname           // 'localhost'
  req.ip                 // '127.0.0.1'
})
```

## The Response Object

```javascript
app.get('/api/data', (req, res) => {
  // Send JSON
  res.json({ message: 'Hello' })

  // Send with status
  res.status(201).json({ created: true })

  // Send file
  res.sendFile('/path/to/file.pdf')

  // Redirect
  res.redirect('/new-location')

  // Set headers
  res.set('X-Custom', 'value')

  // Render view
  res.render('template', { data })
})
```

## The Router Object

```javascript
const express = require('express')
const router = express.Router()

// Define routes on router
router.get('/', (req, res) => {
  res.json({ users: [] })
})

router.get('/:id', (req, res) => {
  res.json({ user: req.params.id })
})

router.post('/', (req, res) => {
  res.status(201).json({ created: req.body })
})

// Mount router on app
app.use('/users', router)
```

## Request-Response Lifecycle

```
1. Client sends HTTP request
         │
         ▼
2. Express receives request
         │
         ▼
3. Create req (IncomingMessage) and res (ServerResponse)
         │
         ▼
4. Add Express properties/methods to req and res
         │
         ▼
5. Run middleware stack in order
         │
         ├─── Middleware 1 (logging)
         │         │
         │         ▼
         ├─── Middleware 2 (body parsing)
         │         │
         │         ▼
         ├─── Middleware 3 (authentication)
         │         │
         │         ▼
         └─── Route Handler (app.get, etc.)
                   │
                   ▼
6. Response sent via res.send(), res.json(), etc.
         │
         ▼
7. Client receives HTTP response
```

## Learning Path

1. **Start with [express-function](./express-function/)** - Understand how applications are created
2. **Study [application](./application/)** - Learn the app object API
3. **Master [request](./request/)** - Access request data
4. **Understand [response](./response/)** - Send responses
5. **Learn [router](./router/)** - Organize routes

## Key Principles

### Everything is Middleware

```javascript
// Route handlers are middleware that don't call next()
app.get('/', (req, res, next) => {
  res.send('Hello')
  // No next() - response sent
})

// Regular middleware calls next()
app.use((req, res, next) => {
  console.log('Request received')
  next()  // Pass to next middleware
})
```

### The Chain Pattern

```javascript
// Methods are chainable
app
  .use(express.json())
  .use(express.static('public'))
  .get('/', handler)
  .listen(3000)

// Response methods are chainable
res
  .status(200)
  .set('X-Custom', 'value')
  .json({ data })
```

### Error-First Pattern

```javascript
// Error handling middleware (4 parameters)
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message })
})

// Trigger error handling
app.get('/error', (req, res, next) => {
  next(new Error('Something went wrong'))
})
```

## Next Steps

After completing Core Concepts:
1. [Middleware](../middleware/) - Deep dive into middleware patterns
2. [Routing](../routing/) - Advanced routing techniques
3. [Advanced](../advanced/) - Production patterns

---

*These core concepts form the foundation of every Express.js application.*
