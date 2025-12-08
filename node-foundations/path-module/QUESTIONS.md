# Path Module Questions

Test your understanding of the Node.js `path` module.

---

## Questions

**Q1: What is the difference between `path.join()` and `path.resolve()`?**

<details>
<summary>Answer</summary>

**join()**: Concatenates paths and normalizes
```javascript
path.join('a', 'b', 'c')      // 'a/b/c'
path.join('/a', '/b')         // '/a/b'  (joins as-is)
```

**resolve()**: Creates absolute path, processing right-to-left
```javascript
path.resolve('a', 'b')        // '/cwd/a/b'  (uses cwd)
path.resolve('/a', '/b')      // '/b'  (restarts at absolute)
```

**Rule**: Use `join()` for building relative paths, `resolve()` for absolute paths.
</details>

---

**Q2: Why should you use `path.join(__dirname, 'public')` instead of `__dirname + '/public'`?**

<details>
<summary>Answer</summary>

Cross-platform compatibility:

```javascript
// GOOD: Works on all platforms
path.join(__dirname, 'public')
// Windows: 'C:\\project\\public'
// POSIX: '/project/public'

// BAD: Hardcodes POSIX separator
__dirname + '/public'
// Windows: 'C:\\project/public' (mixed separators - may fail)
```
</details>

---

**Q3: How do you prevent directory traversal attacks?**

<details>
<summary>Answer</summary>

Validate that resolved path stays within base directory:

```javascript
function safePath(base, userInput) {
  const resolved = path.resolve(base, userInput)
  const baseResolved = path.resolve(base)

  if (!resolved.startsWith(baseResolved + path.sep)) {
    throw new Error('Invalid path')
  }

  return resolved
}

// Test
safePath('/uploads', 'file.txt')        // OK: /uploads/file.txt
safePath('/uploads', '../etc/passwd')   // Throws: Invalid path
```
</details>

---

**Q4: What does `path.parse('/home/user/file.txt')` return?**

<details>
<summary>Answer</summary>

```javascript
{
  root: '/',
  dir: '/home/user',
  base: 'file.txt',
  ext: '.txt',
  name: 'file'
}
```

- `root`: Root directory
- `dir`: Directory path (without filename)
- `base`: Filename with extension
- `ext`: Extension (includes dot)
- `name`: Filename without extension
</details>

---

**Q5: When would you use `path.posix` or `path.win32`?**

<details>
<summary>Answer</summary>

**path.posix**: For URL-like paths (always forward slashes)
```javascript
const urlPath = path.posix.join('api', 'users', id)  // 'api/users/123'
```

**path.win32**: For Windows-specific paths on non-Windows systems
```javascript
// Parsing Windows path on Linux
path.win32.parse('C:\\Users\\file.txt')
```

**Default path**: Use for file system operations on current platform
```javascript
const filePath = path.join(__dirname, 'data')
```
</details>

---

**Q6: What's the output of these expressions?**

```javascript
path.normalize('/users/john/../jane/./docs')
path.relative('/a/b/c', '/a/d/e')
path.extname('file.tar.gz')
```

<details>
<summary>Answer</summary>

```javascript
path.normalize('/users/john/../jane/./docs')
// '/users/jane/docs'

path.relative('/a/b/c', '/a/d/e')
// '../../d/e'

path.extname('file.tar.gz')
// '.gz'  (only last extension)
```
</details>

---

## Self-Assessment Checklist

- [ ] I understand the difference between `join()` and `resolve()`
- [ ] I know why to use path module instead of string concatenation
- [ ] I can prevent directory traversal attacks
- [ ] I know when to use `path.posix` vs `path.win32`
- [ ] I understand `__dirname` vs `process.cwd()`

---

*The path module is essential for writing portable Node.js applications.*
