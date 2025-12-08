# Querystring Module Questions

**Q1: What does `querystring.parse('name=john&age=30')` return?**

<details>
<summary>Answer</summary>

```javascript
{ name: 'john', age: '30' }
```

Note: All values are strings, not numbers!
</details>

---

**Q2: How does querystring handle duplicate keys?**

<details>
<summary>Answer</summary>

```javascript
querystring.parse('color=red&color=blue')
// { color: ['red', 'blue'] }
```

Duplicate keys become arrays.
</details>

---

**Q3: What's wrong with this code?**

```javascript
const parsed = querystring.parse('count=5')
const newCount = parsed.count + 1
```

<details>
<summary>Answer</summary>

`newCount` is `'51'` (string concatenation), not `6`.

Query values are always strings. Fix:
```javascript
const newCount = parseInt(parsed.count, 10) + 1  // 6
```
</details>

---

**Q4: What's the modern alternative to querystring?**

<details>
<summary>Answer</summary>

`URLSearchParams`:

```javascript
// Instead of querystring.parse()
const params = new URLSearchParams('a=1&b=2')
params.get('a')  // '1'

// Instead of querystring.stringify()
const params = new URLSearchParams({ a: 1, b: 2 })
params.toString()  // 'a=1&b=2'
```
</details>

---

## Self-Assessment

- [ ] I understand querystring is legacy
- [ ] I know values are always strings
- [ ] I prefer URLSearchParams for new code
- [ ] I understand Express uses `qs` package

---

*Understanding query string parsing helps debug Express applications.*
