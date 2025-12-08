# Core Concepts Summary

Quick reference for Express.js core concepts.

---

## Express Function

```javascript
const express = require('express')
const app = express()

// Built-in middleware
express.json()          // JSON body parser
express.urlencoded()    // Form body parser
express.static()        // Static files
express.Router()        // Router factory
```

## Application

```javascript
// Settings
app.set('view engine', 'pug')
app.get('env')
app.enable('trust proxy')

// Routing
app.get('/path', handler)
app.use(middleware)
app.use('/api', router)

// Lifecycle
app.listen(3000, callback)
```

## Request (req)

```javascript
req.params.id      // Route parameters
req.query.page     // Query string
req.body.name      // Body (needs middleware)
req.path           // URL path
req.method         // HTTP method
req.get('header')  // Get header
req.accepts('json') // Content negotiation
```

## Response (res)

```javascript
res.send('text')         // Send response
res.json({ data })       // Send JSON
res.status(404)          // Set status
res.redirect('/path')    // Redirect
res.render('view', data) // Render template
res.sendFile(path)       // Send file
res.set('header', 'val') // Set header
res.cookie('name', 'val') // Set cookie
```

## Router

```javascript
const router = express.Router()

router.get('/', handler)
router.post('/', handler)
router.use(middleware)
router.param('id', preprocessor)

app.use('/prefix', router)
```

---

## Request-Response Flow

```
Request → Middleware Stack → Route Handler → Response
   │           │                   │            │
   └───────────┴───────────────────┴────────────┘
              All have access to (req, res, next)
```

## Key Patterns

### Middleware Pattern
```javascript
app.use((req, res, next) => {
  // Do something
  next()  // Continue
})
```

### Error Handling
```javascript
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message })
})
```

### Route Chaining
```javascript
app.route('/resource')
  .get(list)
  .post(create)
```

---

*Master these core concepts to build any Express application.*
