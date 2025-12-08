# Response Questions

**Q1: What's the difference between `res.send()` and `res.json()`?**

<details>
<summary>Answer</summary>

```javascript
// res.send() - auto-detects type
res.send('text')   // text/html
res.send({ a: 1 }) // Calls res.json internally

// res.json() - always JSON
res.json({ a: 1 }) // application/json
res.json('text')   // "text" (JSON string)
```
Use `res.json()` for explicit JSON responses.
</details>

---

**Q2: What does `res.sendStatus(404)` do?**

<details>
<summary>Answer</summary>

Sets status AND sends status text as body:
```javascript
res.sendStatus(404)
// Status: 404
// Body: 'Not Found'

// Equivalent to:
res.status(404).send('Not Found')
```
</details>

---

**Q3: What's `res.locals` used for?**

<details>
<summary>Answer</summary>

Request-scoped variables for templates:
```javascript
app.use((req, res, next) => {
  res.locals.user = req.user
  res.locals.csrfToken = generateToken()
  next()
})

// Available in all templates
res.render('page')  // Can use user, csrfToken
```
Unlike `app.locals`, reset each request.
</details>

---

**Q4: How do you send a file download?**

<details>
<summary>Answer</summary>

```javascript
// Force download prompt
res.download('/path/to/file.pdf')

// Custom filename
res.download('/path/to/report.pdf', 'annual-report.pdf')

// Just send file (may display in browser)
res.sendFile('/path/to/file.pdf')
```
</details>

---

**Q5: What happens if you call res.send() twice?**

<details>
<summary>Answer</summary>

Error! Headers are already sent:
```javascript
app.get('/', (req, res) => {
  res.send('First')  // Sends response
  res.send('Second') // Error: Can't set headers after sent

  // Check with
  res.headersSent  // true after first send
})
```
Always use return or if/else to prevent double sends.
</details>

---

## Self-Assessment

- [ ] I know send() vs json() vs sendStatus()
- [ ] I understand res.locals scope
- [ ] I can send file downloads
- [ ] I understand headersSent guard
- [ ] I can use content negotiation with format()

---

*The res object provides all methods for sending responses.*
