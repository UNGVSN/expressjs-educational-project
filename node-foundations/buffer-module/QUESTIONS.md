# Buffer Module Questions

**Q1: What's the difference between `Buffer.alloc()` and `Buffer.allocUnsafe()`?**

<details>
<summary>Answer</summary>

```javascript
Buffer.alloc(100)       // Zero-filled, slower, safe
Buffer.allocUnsafe(100) // Uninitialized, faster, may leak data

// Use allocUnsafe only when you'll overwrite all bytes immediately
```
</details>

---

**Q2: What happens when you slice a buffer?**

<details>
<summary>Answer</summary>

Slice shares memory with original:

```javascript
const buf = Buffer.from('Hello')
const slice = buf.slice(0, 2)

slice[0] = 0x4A  // Modify slice
buf.toString()   // 'Jello' - original changed!
```

Use `Buffer.from(slice)` for a copy.
</details>

---

**Q3: How do you convert between buffer and base64?**

<details>
<summary>Answer</summary>

```javascript
// String to base64
const buf = Buffer.from('Hello')
const base64 = buf.toString('base64')  // 'SGVsbG8='

// Base64 to buffer
const decoded = Buffer.from('SGVsbG8=', 'base64')
decoded.toString()  // 'Hello'
```
</details>

---

**Q4: Why is this security code wrong?**

```javascript
function checkPassword(input, stored) {
  return Buffer.from(input).equals(Buffer.from(stored))
}
```

<details>
<summary>Answer</summary>

`.equals()` is vulnerable to timing attacks. Use:

```javascript
const crypto = require('crypto')

function checkPassword(input, stored) {
  return crypto.timingSafeEqual(
    Buffer.from(input),
    Buffer.from(stored)
  )
}
```

Note: Both buffers must be same length for timingSafeEqual.
</details>

---

**Q5: How do you handle raw body in Express?**

<details>
<summary>Answer</summary>

```javascript
app.use(express.raw({ type: '*/*' }))

app.post('/webhook', (req, res) => {
  // req.body is a Buffer
  const hash = crypto
    .createHmac('sha256', SECRET)
    .update(req.body)
    .digest('hex')
})
```
</details>

---

## Self-Assessment

- [ ] I understand alloc vs allocUnsafe
- [ ] I know slice shares memory
- [ ] I can convert between encodings
- [ ] I use timingSafeEqual for security
- [ ] I can handle raw buffers in Express

---

*Buffers are fundamental for binary data in Node.js.*
