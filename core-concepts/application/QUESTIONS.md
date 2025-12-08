# Application Questions

**Q1: What does `app.get()` do?**

<details>
<summary>Answer</summary>

It's dual-purpose:
```javascript
app.get('view engine')       // Returns setting value
app.get('/', (req, res) => {})  // Registers GET route
```
Context determines behavior.
</details>

---

**Q2: What's the difference between `app.set()` and `app.enable()`?**

<details>
<summary>Answer</summary>

```javascript
app.enable('trust proxy')
// Same as:
app.set('trust proxy', true)

app.disable('x-powered-by')
// Same as:
app.set('x-powered-by', false)
```
`enable()`/`disable()` are boolean shortcuts.
</details>

---

**Q3: What does `app.locals` do?**

<details>
<summary>Answer</summary>

Stores application-wide variables available in templates:
```javascript
app.locals.title = 'My App'
app.locals.helpers = { formatDate }

// Available in all views automatically
res.render('page')  // Can use title, helpers
```
</details>

---

**Q4: What does `trust proxy` affect?**

<details>
<summary>Answer</summary>

Behind a proxy, it enables:
```javascript
app.enable('trust proxy')

req.ip        // Client IP from X-Forwarded-For
req.hostname  // From X-Forwarded-Host
req.protocol  // From X-Forwarded-Proto
req.secure    // true if HTTPS
```
</details>

---

**Q5: How do you run code when a sub-app is mounted?**

<details>
<summary>Answer</summary>

Use the `mount` event:
```javascript
const api = express()

api.on('mount', (parent) => {
  console.log('Mounted on', parent)
  console.log('Mount path:', api.mountpath)
})

app.use('/api', api)  // Triggers mount
```
</details>

---

## Self-Assessment

- [ ] I understand dual-purpose app.get()
- [ ] I can configure app settings
- [ ] I know what trust proxy enables
- [ ] I can use app.locals for templates
- [ ] I understand sub-app mounting

---

*The app object is the central configuration point for Express.*
