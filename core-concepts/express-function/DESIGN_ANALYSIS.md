# Express Function Design Analysis

## The Function-Object Hybrid

Express uses a unique pattern: the app is both a function AND an object.

```javascript
const app = express()

// As function: handles HTTP requests
http.createServer(app)

// As object: has methods and properties
app.get('/', handler)
app.set('views', './views')
```

### Why This Design?

1. **Compatible with http.createServer()**: The app IS the request handler
2. **Extensible**: Methods and properties can be added
3. **Mountable**: Sub-apps are also functions

### Implementation Pattern

```javascript
// Simplified Express internals
function createApplication() {
  // Create request handler function
  const app = function(req, res, next) {
    app.handle(req, res, next)
  }

  // Make it an EventEmitter
  mixin(app, EventEmitter.prototype)

  // Add application prototype
  mixin(app, proto)

  // Initialize
  app.request = Object.create(request)
  app.response = Object.create(response)
  app.init()

  return app
}
```

## Built-in Middleware Design

Express 4.x+ moved body parsers to separate packages but kept:

```javascript
// These are re-exports from body-parser
express.json()         // body-parser/json
express.urlencoded()   // body-parser/urlencoded
express.raw()          // body-parser/raw
express.text()         // body-parser/text

// This is from serve-static
express.static()
```

### Why Re-export?

- Convenience: Common middleware easily accessible
- Version control: Express controls compatible versions
- Simplicity: One import for common needs

## Router vs Application

Both support routes and middleware, but:

| Feature | Application | Router |
|---------|-------------|--------|
| `app.listen()` | Yes | No |
| Settings (`app.set()`) | Yes | No |
| Sub-apps | Can mount | Can mount |
| Middleware | Full stack | Own stack |

## Key Takeaways

1. **App is a function** that handles requests
2. **App is an object** with methods and properties
3. **Built-in middleware** is convenience re-exports
4. **Routers** are mini-apps without server features

---

*Understanding the function-object hybrid unlocks Express internals.*
