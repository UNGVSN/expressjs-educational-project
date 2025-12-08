# Application Design Analysis

## The Settings System

Express uses a simple key-value settings store:

```javascript
// Internal structure
app.settings = {
  'view engine': 'pug',
  'views': './views',
  'trust proxy': false,
  // ...
}

// Dual-purpose get()
app.get('view engine')      // Returns setting
app.get('/path', handler)   // Registers route
```

### Why Dual-Purpose get()?

1. **Consistency** with HTTP verb methods
2. **Legacy** - always worked this way
3. **Context-dependent** - string vs path+handler

## Middleware Stack Design

```
app._router.stack = [
  Layer { path: '/', handle: query() },
  Layer { path: '/', handle: expressInit() },
  Layer { path: '/', handle: json() },
  Layer { path: '/api', handle: Router },
  Layer { path: '/', handle: errorHandler() }
]
```

### Execution Order

```javascript
app.use(a)
app.use(b)
app.get('/', c)
app.use(d)

// Request to '/' executes: a → b → c
// (d never runs because c sends response)
```

## Sub-Application Mounting

```javascript
const api = express()
app.use('/api', api)

// Creates hierarchy:
// app._router.stack includes Layer pointing to api
// api.parent = app
// api.mountpath = '/api'
```

### Path Resolution

```javascript
const admin = express()
const users = express()

app.use('/admin', admin)
admin.use('/users', users)

// Request to /admin/users/123
// - app matches /admin → delegates to admin
// - admin matches /users → delegates to users
// - users handles /123
```

## Trust Proxy Implications

When `trust proxy` is enabled:

```javascript
// Behind proxy: X-Forwarded-For: client, proxy1, proxy2

app.enable('trust proxy')

req.ip          // 'client' (leftmost)
req.ips         // ['client', 'proxy1', 'proxy2']
req.hostname    // From X-Forwarded-Host
req.protocol    // From X-Forwarded-Proto
req.secure      // true if protocol is https
```

## Key Takeaways

1. **Settings are simple key-value pairs**
2. **Middleware executes in registration order**
3. **Sub-apps create routing hierarchies**
4. **Trust proxy affects req properties**
5. **app.get() is overloaded** for settings and routes

---

*Understanding app internals helps debug routing and middleware issues.*
