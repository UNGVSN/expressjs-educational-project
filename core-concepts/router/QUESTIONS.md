# Router Questions

**Q1: What's the difference between Router and Application?**

<details>
<summary>Answer</summary>

| Router | Application |
|--------|-------------|
| No `listen()` | Has `listen()` |
| No `set()` | Has settings |
| No `locals` | Has `app.locals` |
| Mini-app | Full app |

Both support `use()`, routes, and middleware.
</details>

---

**Q2: What does `mergeParams: true` do?**

<details>
<summary>Answer</summary>

Makes parent router params available in child:
```javascript
const child = express.Router({ mergeParams: true })

// Parent: /users/:userId
// Child mounted at: /posts
parent.use('/:userId/posts', child)

child.get('/:postId', (req, res) => {
  req.params.userId  // Available!
  req.params.postId  // Available
})
```
</details>

---

**Q3: How do you create a resource router?**

<details>
<summary>Answer</summary>

```javascript
const router = express.Router()

router.route('/')
  .get(listItems)
  .post(createItem)

router.route('/:id')
  .get(getItem)
  .put(updateItem)
  .delete(deleteItem)

app.use('/items', router)
```
</details>

---

**Q4: What does `router.param()` do?**

<details>
<summary>Answer</summary>

Pre-processes a route parameter:
```javascript
router.param('id', async (req, res, next, id) => {
  const item = await Item.findById(id)
  if (!item) return res.status(404).send('Not found')
  req.item = item
  next()
})

// req.item now available in all routes with :id
router.get('/:id', (req, res) => {
  res.json(req.item)  // Already loaded
})
```
</details>

---

**Q5: How do you add middleware to only one router?**

<details>
<summary>Answer</summary>

```javascript
const router = express.Router()

// Applies only to this router
router.use(authenticate)
router.use(authorize)

router.get('/protected', handler)

app.use('/admin', router)  // Middleware only runs for /admin/*
```
</details>

---

## Self-Assessment

- [ ] I understand Router vs Application
- [ ] I can use mergeParams for nested routers
- [ ] I can create CRUD resource routers
- [ ] I understand router.param()
- [ ] I can apply middleware to specific routers

---

*Routers are essential for organizing Express applications.*
