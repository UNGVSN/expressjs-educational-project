# Express Function Questions

**Q1: What does `express()` return?**

<details>
<summary>Answer</summary>

A function that is also an object:
```javascript
const app = express()

typeof app  // 'function' - can be passed to http.createServer
app.get     // function - has methods
app.set     // function - has more methods
```
</details>

---

**Q2: What built-in middleware does Express provide?**

<details>
<summary>Answer</summary>

```javascript
express.json()          // JSON body parser
express.urlencoded()    // URL-encoded body parser
express.static()        // Static file serving
express.raw()           // Raw body (Buffer)
express.text()          // Text body (string)
express.Router()        // Router factory
```
</details>

---

**Q3: Why can you pass `app` to `http.createServer()`?**

<details>
<summary>Answer</summary>

Because `app` is a function with signature `(req, res, next)`:

```javascript
const app = express()

// This works because app IS a request handler
http.createServer(app).listen(3000)

// Internally, app does:
function app(req, res, next) {
  app.handle(req, res, next)
}
```
</details>

---

**Q4: How do you create testable Express apps?**

<details>
<summary>Answer</summary>

Use a factory function:

```javascript
function createApp() {
  const app = express()
  app.use(express.json())
  app.get('/', (req, res) => res.json({ ok: true }))
  return app
}

// Test
const app = createApp()
const response = await request(app).get('/')
```
</details>

---

## Self-Assessment

- [ ] I understand app is both function and object
- [ ] I know the built-in middleware
- [ ] I can create testable applications
- [ ] I understand app vs router differences

---

*The express() function creates everything you need for a web application.*
