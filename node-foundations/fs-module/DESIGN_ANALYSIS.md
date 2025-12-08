# FS Module Design Analysis

## API Evolution

### Three API Styles

```javascript
// 1. Callback (original) - Node.js 0.x
fs.readFile(path, callback)

// 2. Synchronous - Blocking, for startup
fs.readFileSync(path)

// 3. Promises (recommended) - Node.js 10+
fs.promises.readFile(path)
// Or: require('fs/promises') in Node.js 14+
```

### Why Multiple APIs?

- **Callbacks**: Original Node.js async pattern
- **Sync**: Convenience for scripts and startup code
- **Promises**: Modern async/await support

## Async Design

### Non-Blocking I/O

```javascript
// File operations use libuv thread pool
// Main thread stays free for other requests

// BAD: Blocks entire server
app.get('/', (req, res) => {
  const data = fs.readFileSync('large.txt')  // Blocks!
  res.send(data)
})

// GOOD: Non-blocking
app.get('/', async (req, res) => {
  const data = await fs.promises.readFile('large.txt')
  res.send(data)
})
```

### Thread Pool

```javascript
// libuv uses thread pool for file I/O
// Default: 4 threads (UV_THREADPOOL_SIZE)

// For I/O heavy apps, increase:
// UV_THREADPOOL_SIZE=64 node app.js
```

## Streams vs Full Reads

### When to Use Streams

```javascript
// Full read: Small files (config, JSON)
const config = JSON.parse(await fs.readFile('config.json'))

// Stream: Large files (video, downloads)
const stream = fs.createReadStream('video.mp4')
stream.pipe(res)
```

### Memory Comparison

```
100MB file:
- readFile(): 100MB+ memory
- createReadStream(): ~64KB memory (chunks)
```

## Error Handling

### Common Error Codes

| Code | Meaning |
|------|---------|
| ENOENT | File not found |
| EACCES | Permission denied |
| EISDIR | Expected file, got directory |
| ENOTDIR | Expected directory, got file |
| EEXIST | File already exists |
| EMFILE | Too many open files |

### Proper Error Handling

```javascript
try {
  await fs.access(path)
} catch (err) {
  if (err.code === 'ENOENT') {
    // File doesn't exist
  }
}
```

## Key Takeaways

1. **Use promises API** for modern code
2. **Use streams** for large files
3. **Avoid sync methods** in request handlers
4. **Handle errors** by error code
5. **Validate paths** to prevent traversal attacks

---

*Understanding fs internals helps write efficient file-handling code.*
