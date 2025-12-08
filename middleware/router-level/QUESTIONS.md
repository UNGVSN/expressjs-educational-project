# Router-Level Middleware Questions

**Q1: What's the difference between router.use() and app.use()?**

<details>
<summary>Answer</summary>

| Feature | app.use() | router.use() |
|---------|-----------|--------------|
| Scope | Entire application | Specific router |
| Server | Can call app.listen() | Cannot start server |
| Settings | app.set() available | No settings |
| Must mount | No | Yes (on app or router) |

```javascript
// app.use() - global
app.use(globalMiddleware)

// router.use() - scoped
const router = express.Router()
router.use(scopedMiddleware)
app.use('/api', router)  // Must mount
```
</details>

---

**Q2: What does mergeParams: true do?**

<details>
<summary>Answer</summary>

Makes parent router parameters available in child router:

```javascript
const parent = express.Router()
const child = express.Router({ mergeParams: true })

parent.use('/:parentId/child', child)

child.get('/:childId', (req, res) => {
  // Without mergeParams: req.params = { childId: '456' }
  // With mergeParams: req.params = { parentId: '123', childId: '456' }
  res.json(req.params)
})
```
</details>

---

**Q3: How do you create a protected router where all routes require authentication?**

<details>
<summary>Answer</summary>

```javascript
const protectedRouter = express.Router()

// Apply auth to ALL routes in this router
protectedRouter.use(authenticate)

// All these routes require authentication
protectedRouter.get('/dashboard', showDashboard)
protectedRouter.get('/profile', showProfile)
protectedRouter.put('/settings', updateSettings)

app.use('/app', protectedRouter)
```
</details>

---

**Q4: How do you implement API versioning with routers?**

<details>
<summary>Answer</summary>

```javascript
// v1/index.js
const v1Router = express.Router()
v1Router.get('/users', v1GetUsers)
module.exports = v1Router

// v2/index.js
const v2Router = express.Router()
v2Router.get('/users', v2GetUsers)  // Different implementation
module.exports = v2Router

// app.js
app.use('/api/v1', require('./v1'))
app.use('/api/v2', require('./v2'))
```
</details>

---

**Q5: How does router.param() work?**

<details>
<summary>Answer</summary>

Preprocesses route parameters before handler executes:

```javascript
const router = express.Router()

// Runs for any route with :id
router.param('id', async (req, res, next, id) => {
  const item = await Item.findById(id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  req.item = item
  next()
})

// req.item already loaded
router.get('/:id', (req, res) => res.json(req.item))
router.put('/:id', (req, res) => { /* update req.item */ })
router.delete('/:id', (req, res) => { /* delete req.item */ })
```
</details>

---

**Q6: How do you add error handling specific to a router?**

<details>
<summary>Answer</summary>

Add error middleware at the end of the router:

```javascript
const apiRouter = express.Router()

// Routes
apiRouter.get('/users', asyncHandler(getUsers))
apiRouter.post('/users', asyncHandler(createUser))

// Router-specific error handler (must have 4 params)
apiRouter.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  // Pass to app error handler
  next(err)
})
```
</details>

---

**Q7: What router options are available?**

<details>
<summary>Answer</summary>

```javascript
const router = express.Router({
  caseSensitive: true,   // /Foo !== /foo (default: false)
  mergeParams: true,     // Access parent params (default: false)
  strict: true           // /foo !== /foo/ (default: false)
})
```

| Option | Default | Effect |
|--------|---------|--------|
| caseSensitive | false | Path case matters |
| mergeParams | false | Parent params available |
| strict | false | Trailing slash matters |
</details>

---

**Q8: How do you create nested routers?**

<details>
<summary>Answer</summary>

```javascript
// users/posts.js
const postsRouter = express.Router({ mergeParams: true })
postsRouter.get('/', (req, res) => {
  res.json({ userId: req.params.userId, posts: [] })
})
module.exports = postsRouter

// users/index.js
const usersRouter = express.Router()
usersRouter.get('/', listUsers)
usersRouter.get('/:userId', getUser)
usersRouter.use('/:userId/posts', require('./posts'))
module.exports = usersRouter

// app.js
app.use('/users', require('./users'))

// GET /users/123/posts -> { userId: '123', posts: [] }
```
</details>

---

**Q9: Can you mount the same router multiple times?**

<details>
<summary>Answer</summary>

Yes, routers can be reused:

```javascript
const healthRouter = express.Router()
healthRouter.get('/health', (req, res) => res.send('OK'))
healthRouter.get('/ready', (req, res) => res.send('Ready'))

// Mount same router at different paths
app.use('/api/v1', healthRouter)
app.use('/api/v2', healthRouter)
app.use('/internal', healthRouter)

// All three paths serve the same routes
```
</details>

---

**Q10: How do you create a resource router factory?**

<details>
<summary>Answer</summary>

```javascript
function createResourceRouter(controller, options = {}) {
  const router = express.Router({ mergeParams: options.mergeParams })

  // Apply middleware if provided
  if (options.middleware) {
    router.use(options.middleware)
  }

  // Standard CRUD routes
  router.get('/', controller.list)
  router.get('/:id', controller.get)
  router.post('/', controller.create)
  router.put('/:id', controller.update)
  router.delete('/:id', controller.delete)

  return router
}

// Usage
const usersRouter = createResourceRouter(usersController, {
  middleware: authenticate
})
app.use('/users', usersRouter)
```
</details>

---

## Self-Assessment

- [ ] I understand router vs app middleware scope
- [ ] I can use mergeParams for nested routers
- [ ] I can create protected routers with authentication
- [ ] I can implement API versioning with routers
- [ ] I understand router.param() preprocessing
- [ ] I can add router-specific error handlers
- [ ] I know all router options
- [ ] I can create and nest routers effectively

---

*Router-level middleware is key to organizing Express applications.*
