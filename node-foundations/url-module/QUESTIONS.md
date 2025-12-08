# URL Module Questions

**Q1: What's the difference between legacy `url.parse()` and `new URL()`?**

<details>
<summary>Answer</summary>

| Legacy | WHATWG |
|--------|--------|
| `url.parse(str)` | `new URL(str, base)` |
| Node-specific | Web standard |
| Deprecated | Recommended |
| Query as object | Use URLSearchParams |
</details>

---

**Q2: How do you parse query parameters with the WHATWG API?**

<details>
<summary>Answer</summary>

```javascript
const url = new URL('https://example.com?name=john&age=30')

url.searchParams.get('name')  // 'john'
url.searchParams.get('age')   // '30'
url.searchParams.has('name')  // true

// Iterate
for (const [key, value] of url.searchParams) {
  console.log(key, value)
}
```
</details>

---

**Q3: Why does `new URL('/path')` throw an error?**

<details>
<summary>Answer</summary>

Relative URLs require a base URL:

```javascript
new URL('/path')  // TypeError
new URL('/path', 'https://example.com')  // OK
new URL('https://example.com/path')  // OK (absolute)
```
</details>

---

**Q4: How do you build a URL with query parameters?**

<details>
<summary>Answer</summary>

```javascript
const url = new URL('https://example.com/api')
url.searchParams.set('page', '1')
url.searchParams.set('limit', '10')

url.href  // 'https://example.com/api?page=1&limit=10'
```
</details>

---

**Q5: How do you validate a URL?**

<details>
<summary>Answer</summary>

```javascript
function isValidUrl(string) {
  try {
    const url = new URL(string)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}
```
</details>

---

## Self-Assessment

- [ ] I use WHATWG URL API over legacy
- [ ] I can parse and build URLs
- [ ] I understand URLSearchParams
- [ ] I can validate URLs safely

---

*URL handling is fundamental for web applications.*
