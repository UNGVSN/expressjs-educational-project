# Router Design Analysis

## Router vs Application

Both share routing capabilities but have key differences:

| Feature | Application | Router |
|---------|-------------|--------|
| `listen()` | Yes | No |
| `set()` / settings | Yes | No |
| `locals` | Yes (app.locals) | No |
| Mountable | Yes (sub-app) | Yes |
| Middleware stack | Yes | Yes |
| HTTP methods | Yes | Yes |

## Internal Structure

```javascript
// Router has a stack of Layer objects
router.stack = [
  Layer { path: '/', handle: middleware },
  Layer { path: '/users', handle: route },
  Layer { path: '/posts', handle: nestedRouter }
]

// Each Layer can be:
// - Middleware function
// - Route (another stack of handlers)
// - Router (nested routing)
```

## Path Matching

```javascript
// When request comes in:
// 1. Find matching Layer
// 2. If Layer is Route, match HTTP method
// 3. Execute handler(s)
// 4. Continue or stop based on next() call

router.get('/users/:id', handler)
// Creates: Layer { path: '/users/:id', route: Route { get: [handler] } }
```

## mergeParams Option

```javascript
// Without mergeParams (default)
const parent = express.Router()
const child = express.Router()

parent.use('/:parentId', child)
child.get('/:childId', (req, res) => {
  req.params.parentId  // undefined!
  req.params.childId   // available
})

// With mergeParams
const child = express.Router({ mergeParams: true })
child.get('/:childId', (req, res) => {
  req.params.parentId  // available
  req.params.childId   // available
})
```

## Route Execution Flow

```
Request: GET /api/users/123

app.use('/api', apiRouter)
         │
         ▼
apiRouter.use('/users', usersRouter)
         │
         ▼
usersRouter.get('/:id', handler)
         │
         ▼
handler receives req.params.id = '123'
```

## Key Takeaways

1. **Routers are mini-apps** without server features
2. **Stack-based matching** - first match wins
3. **mergeParams** for nested router params
4. **Layer abstraction** unifies middleware and routes
5. **Modular** - each router is independent

---

*Understanding router internals helps debug routing issues.*
