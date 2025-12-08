# Request Questions

**Q1: Why is `req.body` undefined without middleware?**

<details>
<summary>Answer</summary>

Body parsing is not built-in. You need middleware:
```javascript
app.use(express.json())           // For JSON
app.use(express.urlencoded())     // For forms

// Now req.body is available
```
This gives flexibility and security (limit body size).
</details>

---

**Q2: What's the difference between `req.params`, `req.query`, and `req.body`?**

<details>
<summary>Answer</summary>

```javascript
// URL: POST /users/123?active=true
// Body: { "name": "John" }

app.post('/users/:id', (req, res) => {
  req.params.id     // '123' - from URL path
  req.query.active  // 'true' - from query string
  req.body.name     // 'John' - from request body
})
```
</details>

---

**Q3: Why are query parameters always strings?**

<details>
<summary>Answer</summary>

Query strings have no type information. Everything is text:
```javascript
// ?page=2&active=true
req.query.page    // '2' (string)
req.query.active  // 'true' (string)

// Convert explicitly
const page = parseInt(req.query.page, 10)
const active = req.query.active === 'true'
```
</details>

---

**Q4: What does `req.accepts('json')` do?**

<details>
<summary>Answer</summary>

Checks if client accepts JSON (from Accept header):
```javascript
// Accept: application/json, text/html

req.accepts('json')  // 'json'
req.accepts('xml')   // false

// Content negotiation
if (req.accepts('json')) {
  res.json(data)
} else {
  res.render('view', data)
}
```
</details>

---

**Q5: How does `trust proxy` affect req.ip?**

<details>
<summary>Answer</summary>

```javascript
// Without trust proxy: Socket IP
req.ip  // '127.0.0.1' (proxy's IP)

// With trust proxy: Client IP from X-Forwarded-For
app.enable('trust proxy')
req.ip  // '203.0.113.1' (client's IP)
```
Essential when behind load balancer/proxy.
</details>

---

## Self-Assessment

- [ ] I understand body parsing requires middleware
- [ ] I know params vs query vs body
- [ ] I convert query strings to proper types
- [ ] I can use content negotiation
- [ ] I understand trust proxy effects

---

*The req object is your interface to all request data.*
