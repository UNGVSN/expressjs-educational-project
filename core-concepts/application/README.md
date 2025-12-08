# Application Object

The `app` object represents the Express application. It has methods for routing HTTP requests, configuring middleware, rendering HTML views, and registering template engines.

## Overview

```javascript
const express = require('express')
const app = express()

// app has methods for:
// - Routing: app.get(), app.post(), app.use()
// - Settings: app.set(), app.get(), app.enable()
// - Middleware: app.use()
// - Lifecycle: app.listen()
```

## Properties

### app.locals

Application-level variables available to all templates:

```javascript
app.locals.title = 'My App'
app.locals.email = 'contact@example.com'

// Available in all templates
app.get('/', (req, res) => {
  res.render('index')  // Can access title and email
})
```

### app.mountpath

The path pattern on which a sub-app was mounted:

```javascript
const admin = express()

admin.get('/', (req, res) => {
  console.log(admin.mountpath)  // '/admin'
  res.send('Admin Home')
})

app.use('/admin', admin)
```

## Settings Methods

### app.set(name, value)

Set application settings:

```javascript
// View engine
app.set('view engine', 'pug')
app.set('views', './views')

// Trust proxy (behind load balancer)
app.set('trust proxy', true)

// Environment
app.set('env', 'production')

// Case sensitivity
app.set('case sensitive routing', true)

// Strict routing (/foo vs /foo/)
app.set('strict routing', true)

// JSON formatting
app.set('json spaces', 2)

// Query parser
app.set('query parser', 'extended')
```

### app.get(name)

Get setting value (also used for GET routes):

```javascript
app.get('view engine')  // 'pug'
app.get('env')          // 'development'
```

### app.enable(name) / app.disable(name)

Boolean setting shortcuts:

```javascript
app.enable('trust proxy')
// Same as: app.set('trust proxy', true)

app.disable('x-powered-by')
// Same as: app.set('x-powered-by', false)

app.enabled('trust proxy')   // true
app.disabled('x-powered-by') // true
```

## Common Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `env` | `NODE_ENV` or `'development'` | Environment mode |
| `trust proxy` | `false` | Trust X-Forwarded headers |
| `view engine` | undefined | Default template engine |
| `views` | `'./views'` | View directory |
| `case sensitive routing` | `false` | `/Foo` vs `/foo` |
| `strict routing` | `false` | `/foo` vs `/foo/` |
| `x-powered-by` | `true` | Send X-Powered-By header |
| `etag` | `'weak'` | ETag generation |
| `json spaces` | undefined | JSON pretty-print |
| `query parser` | `'extended'` | Query string parser |

## Routing Methods

### HTTP Methods

```javascript
app.get('/users', (req, res) => {})
app.post('/users', (req, res) => {})
app.put('/users/:id', (req, res) => {})
app.patch('/users/:id', (req, res) => {})
app.delete('/users/:id', (req, res) => {})
app.options('/users', (req, res) => {})
app.head('/users', (req, res) => {})

// All methods
app.all('/secret', (req, res) => {})
```

### app.route()

Chain route handlers:

```javascript
app.route('/users')
  .get((req, res) => {
    res.json([])
  })
  .post((req, res) => {
    res.status(201).json({ created: true })
  })

app.route('/users/:id')
  .get((req, res) => {
    res.json({ id: req.params.id })
  })
  .put((req, res) => {
    res.json({ updated: true })
  })
  .delete((req, res) => {
    res.json({ deleted: true })
  })
```

### app.param()

Middleware for route parameters:

```javascript
app.param('id', (req, res, next, id) => {
  // Runs for any route with :id parameter
  User.findById(id)
    .then(user => {
      if (!user) {
        return res.status(404).send('User not found')
      }
      req.user = user
      next()
    })
    .catch(next)
})

// Now req.user is available
app.get('/users/:id', (req, res) => {
  res.json(req.user)
})

app.put('/users/:id', (req, res) => {
  req.user.update(req.body)
})
```

## Middleware Methods

### app.use()

Mount middleware:

```javascript
// Run for all requests
app.use(express.json())

// Run for path prefix
app.use('/api', apiRouter)

// Multiple middleware
app.use('/admin', authenticate, authorize, adminRouter)

// Error handling (4 parameters)
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message })
})
```

## Template Methods

### app.engine()

Register template engine:

```javascript
const pug = require('pug')

// Map .html files to pug
app.engine('html', pug.renderFile)
app.set('view engine', 'html')

// Custom engine
app.engine('ntl', (filePath, options, callback) => {
  // Custom render logic
  const content = renderTemplate(filePath, options)
  callback(null, content)
})
```

### app.render()

Render view without sending:

```javascript
app.render('email', { user }, (err, html) => {
  if (err) return console.error(err)
  sendEmail(user.email, html)
})
```

## Server Methods

### app.listen()

Start HTTP server:

```javascript
// Basic
app.listen(3000)

// With callback
app.listen(3000, () => {
  console.log('Server running on port 3000')
})

// With host
app.listen(3000, '0.0.0.0', () => {
  console.log('Listening on all interfaces')
})

// Returns http.Server
const server = app.listen(3000)
server.close()
```

### app.path()

Get canonical path:

```javascript
const admin = express()
app.use('/admin', admin)

admin.path()  // '/admin'

const users = express()
admin.use('/users', users)

users.path()  // '/admin/users'
```

## Events

### mount Event

Fired when sub-app is mounted:

```javascript
const admin = express()

admin.on('mount', (parent) => {
  console.log('Admin mounted on:', parent)
})

app.use('/admin', admin)  // Triggers mount event
```

## Common Patterns

### Configuration by Environment

```javascript
const app = express()

// Common settings
app.set('view engine', 'pug')
app.use(express.json())

// Environment-specific
if (app.get('env') === 'development') {
  app.use(morgan('dev'))
  app.set('json spaces', 2)
}

if (app.get('env') === 'production') {
  app.enable('trust proxy')
  app.use(compression())
}
```

### Trust Proxy Configuration

```javascript
// Behind single proxy
app.set('trust proxy', true)
// Or: app.set('trust proxy', 1)

// Behind multiple proxies
app.set('trust proxy', 2)

// Trust specific subnets
app.set('trust proxy', 'loopback, 10.0.0.0/8')

// Custom function
app.set('trust proxy', (ip) => {
  return ip === '127.0.0.1'
})
```

## Related

- [express-function](../express-function/) - Creating apps
- [router](../router/) - Modular routing

## Next Steps

1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md)
2. Test knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Move to [request](../request/)

---

*The app object is the central hub of your Express application.*
