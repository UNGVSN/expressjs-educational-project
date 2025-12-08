# FS Module Questions

## Questions

**Q1: What are the three API styles in the fs module?**

<details>
<summary>Answer</summary>

1. **Callback**: `fs.readFile(path, callback)`
2. **Synchronous**: `fs.readFileSync(path)`
3. **Promise**: `fs.promises.readFile(path)` or `require('fs/promises')`

Use promises for async code, sync only at startup.
</details>

---

**Q2: Why shouldn't you use sync methods in Express route handlers?**

<details>
<summary>Answer</summary>

Sync methods block the event loop, preventing all other requests:

```javascript
// BAD: Server handles 0 requests during file read
app.get('/', (req, res) => {
  const data = fs.readFileSync('large.txt')
  res.send(data)
})

// GOOD: Server handles other requests while waiting
app.get('/', async (req, res) => {
  const data = await fs.promises.readFile('large.txt')
  res.send(data)
})
```
</details>

---

**Q3: When should you use streams instead of readFile?**

<details>
<summary>Answer</summary>

Use streams for:
- Large files (videos, downloads)
- Unknown file sizes
- Memory-constrained environments

```javascript
// 100MB file
// readFile: Uses 100MB+ memory
// Stream: Uses ~64KB memory

app.get('/video', (req, res) => {
  fs.createReadStream('video.mp4').pipe(res)
})
```
</details>

---

**Q4: How do you check if a file exists?**

<details>
<summary>Answer</summary>

```javascript
const fs = require('fs').promises

async function exists(path) {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

// Or check during read
try {
  const data = await fs.readFile(path)
} catch (err) {
  if (err.code === 'ENOENT') {
    // File doesn't exist
  }
}
```

Note: `fs.exists()` is deprecated.
</details>

---

**Q5: What does error code ENOENT mean?**

<details>
<summary>Answer</summary>

**ENOENT**: "Error NO ENTry" - File or directory not found.

```javascript
try {
  await fs.readFile('/nonexistent.txt')
} catch (err) {
  if (err.code === 'ENOENT') {
    console.log('File not found')
  }
}
```

Common codes: ENOENT (not found), EACCES (permission), EISDIR (is directory)
</details>

---

## Self-Assessment

- [ ] I know when to use promises vs sync vs callbacks
- [ ] I understand why sync blocks the event loop
- [ ] I know when to use streams vs readFile
- [ ] I can handle file errors by error code
- [ ] I can prevent path traversal attacks

---

*The fs module is foundational for file-based applications.*
