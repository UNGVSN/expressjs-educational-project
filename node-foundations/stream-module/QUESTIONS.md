# Stream Module Questions

Test your understanding of Node.js streams with these questions covering fundamentals to advanced patterns.

---

## Conceptual Questions

### Beginner

**Q1: What are the four types of streams in Node.js?**

<details>
<summary>Answer</summary>

1. **Readable** - Source of data (can read from)
   - Examples: `fs.createReadStream()`, `http.IncomingMessage`, `process.stdin`

2. **Writable** - Destination for data (can write to)
   - Examples: `fs.createWriteStream()`, `http.ServerResponse`, `process.stdout`

3. **Duplex** - Both Readable and Writable (independent channels)
   - Examples: `net.Socket`, `tls.TLSSocket`

4. **Transform** - Duplex that modifies data passing through
   - Examples: `zlib.createGzip()`, `crypto.createCipheriv()`

```javascript
const fs = require('fs')
const zlib = require('zlib')

// Readable
const readable = fs.createReadStream('input.txt')

// Writable
const writable = fs.createWriteStream('output.txt')

// Transform
const gzip = zlib.createGzip()

// Pipe them together
readable.pipe(gzip).pipe(writable)
```
</details>

---

**Q2: What is the purpose of `pipe()` and what does it return?**

<details>
<summary>Answer</summary>

**Purpose:** Connects a Readable stream to a Writable stream, handling:
- Data transfer
- Backpressure (automatic pause/resume)
- End event propagation

**Returns:** The destination stream (for chaining)

```javascript
const fs = require('fs')
const zlib = require('zlib')

// Returns writable, enabling chaining
fs.createReadStream('input.txt')
  .pipe(zlib.createGzip())    // Returns gzip (transform/writable)
  .pipe(fs.createWriteStream('output.txt.gz'))  // Returns writeStream

// Equivalent to:
const readable = fs.createReadStream('input.txt')
const gzip = zlib.createGzip()
const writable = fs.createWriteStream('output.txt.gz')

readable.pipe(gzip)
gzip.pipe(writable)
```

**Important:** `pipe()` only returns the destination, so you can only access the last stream in a chain.
</details>

---

**Q3: In Express, which objects are streams?**

<details>
<summary>Answer</summary>

- **`req` (Request)** - Readable stream (request body)
- **`res` (Response)** - Writable stream (response body)

```javascript
const express = require('express')
const fs = require('fs')
const app = express()

// req is Readable - pipe upload to file
app.post('/upload', (req, res) => {
  const writeStream = fs.createWriteStream('upload.bin')
  req.pipe(writeStream)

  req.on('end', () => {
    res.send('Upload complete')
  })
})

// res is Writable - pipe file to response
app.get('/download', (req, res) => {
  const readStream = fs.createReadStream('file.pdf')
  res.setHeader('Content-Type', 'application/pdf')
  readStream.pipe(res)
})
```

**HTTP internals:**
- `req` extends `http.IncomingMessage` (extends `stream.Readable`)
- `res` extends `http.ServerResponse` (extends `stream.Writable`)
</details>

---

### Intermediate

**Q4: What is backpressure and why is it important?**

<details>
<summary>Answer</summary>

**Backpressure** is a mechanism to handle situations where data is produced faster than it can be consumed.

**Why important:**
- Prevents memory exhaustion
- Maintains system stability
- Ensures reliable data processing

**Without backpressure:**
```javascript
// Producer: 100 MB/s
// Consumer: 10 MB/s
// Result: Memory grows by 90 MB/s until crash
```

**With backpressure:**
```javascript
const readable = getFastSource()  // 100 MB/s
const writable = getSlowDestination()  // 10 MB/s

// Using pipe() - automatic backpressure
readable.pipe(writable)  // Producer slows to 10 MB/s

// Manual backpressure
readable.on('data', (chunk) => {
  const ok = writable.write(chunk)
  if (!ok) {
    readable.pause()  // Stop producer
  }
})

writable.on('drain', () => {
  readable.resume()  // Resume producer
})
```

**Key signals:**
- `write()` returns `false` → buffer full
- `'drain'` event → buffer empty, can write more
</details>

---

**Q5: What is the difference between flowing and paused mode for Readable streams?**

<details>
<summary>Answer</summary>

| Mode | Behavior | Data Access |
|------|----------|-------------|
| **Paused** | Data stays in buffer until read | `stream.read()` |
| **Flowing** | Data pushed automatically | `'data'` event |

**Paused mode (default):**
```javascript
const readable = fs.createReadStream('file.txt')

readable.on('readable', () => {
  let chunk
  // Must call read() to get data
  while ((chunk = readable.read()) !== null) {
    console.log(chunk.toString())
  }
})
```

**Flowing mode:**
```javascript
const readable = fs.createReadStream('file.txt')

// Any of these switch to flowing mode:
readable.on('data', (chunk) => {
  console.log(chunk.toString())  // Data pushed automatically
})

// Or:
readable.resume()

// Or:
readable.pipe(writable)
```

**Switching modes:**
```javascript
// Pause flowing stream
readable.pause()

// Resume (switch to flowing)
readable.resume()

// Note: Adding 'data' listener also switches to flowing
```

**Use cases:**
- **Paused**: When you need precise control over read timing
- **Flowing**: When processing all data as fast as possible
</details>

---

**Q6: What is `highWaterMark` and how does it affect stream behavior?**

<details>
<summary>Answer</summary>

`highWaterMark` is the internal buffer size threshold (in bytes or objects) that controls:
- When to stop reading from source (Readable)
- When `write()` returns false (Writable)

**Readable:**
```javascript
const readable = fs.createReadStream('file.txt', {
  highWaterMark: 64 * 1024  // 64KB buffer (default: 16KB)
})

// Stream calls _read() to fill buffer up to highWaterMark
// When buffer >= highWaterMark, stops calling _read()
```

**Writable:**
```javascript
const writable = fs.createWriteStream('output.txt', {
  highWaterMark: 32 * 1024  // 32KB buffer
})

// write() returns true if buffer < highWaterMark
// write() returns false if buffer >= highWaterMark
const canContinue = writable.write(data)

if (!canContinue) {
  // Buffer full, wait for drain
  writable.once('drain', continueWriting)
}
```

**Object mode:**
```javascript
const transform = new Transform({
  objectMode: true,
  highWaterMark: 16  // 16 objects (not bytes)
})
```

**Trade-offs:**
- Higher: Better throughput, more memory usage
- Lower: Less memory, more frequent I/O
</details>

---

### Advanced

**Q7: How would you implement a custom Transform stream?**

<details>
<summary>Answer</summary>

```javascript
const { Transform } = require('stream')

// Option 1: Constructor with options
const upperCase = new Transform({
  transform(chunk, encoding, callback) {
    // chunk: Buffer or string
    // encoding: 'buffer' or string encoding
    // callback: (error, data) => void

    const upper = chunk.toString().toUpperCase()
    callback(null, upper)  // Or: this.push(upper); callback()
  },

  flush(callback) {
    // Called before 'end', for cleanup/final data
    this.push('\n--- END ---\n')
    callback()
  }
})

// Option 2: Class-based
class JSONParser extends Transform {
  constructor() {
    super({ objectMode: true })  // Output objects
    this.buffer = ''
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString()
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop()  // Keep incomplete line

    for (const line of lines) {
      if (line.trim()) {
        try {
          this.push(JSON.parse(line))
        } catch (err) {
          // Skip invalid JSON or emit error
          this.emit('parseError', line, err)
        }
      }
    }
    callback()
  }

  _flush(callback) {
    // Process remaining buffer
    if (this.buffer.trim()) {
      try {
        this.push(JSON.parse(this.buffer))
      } catch (err) {
        this.emit('parseError', this.buffer, err)
      }
    }
    callback()
  }
}

// Usage
const parser = new JSONParser()
parser.on('data', (obj) => console.log('Parsed:', obj))
parser.on('parseError', (line, err) => console.error('Invalid:', line))

parser.write('{"a":1}\n')
parser.write('{"b":2}\n')
parser.end()
```
</details>

---

**Q8: Explain the difference between `pipeline()` and chained `pipe()` calls.**

<details>
<summary>Answer</summary>

**`pipe()` chain:**
```javascript
readable
  .pipe(transform1)
  .pipe(transform2)
  .pipe(writable)
```

**Problems with `pipe()`:**
1. Error handling is incomplete - errors don't propagate
2. Must attach error handlers to each stream
3. Streams may not be properly destroyed on error

```javascript
// Error handling nightmare
readable
  .on('error', handleError)
  .pipe(transform1)
  .on('error', handleError)
  .pipe(transform2)
  .on('error', handleError)
  .pipe(writable)
  .on('error', handleError)
```

**`pipeline()` solution:**
```javascript
const { pipeline } = require('stream')

// Callback style
pipeline(
  readable,
  transform1,
  transform2,
  writable,
  (err) => {
    if (err) {
      console.error('Pipeline failed:', err)
      // All streams already destroyed
    } else {
      console.log('Pipeline succeeded')
    }
  }
)

// Promise style (Node.js 15+)
const { pipeline: pipelineAsync } = require('stream/promises')

async function process() {
  try {
    await pipelineAsync(readable, transform1, transform2, writable)
    console.log('Success')
  } catch (err) {
    console.error('Failed:', err)
  }
}
```

**Benefits of `pipeline()`:**
1. Single error handler for all streams
2. Automatic cleanup on error
3. Properly destroys all streams
4. Works with async/await
</details>

---

**Q9: How do you handle streams with async/await?**

<details>
<summary>Answer</summary>

**Async iteration (Node.js 10+):**
```javascript
const fs = require('fs')

async function processFile() {
  const readable = fs.createReadStream('file.txt')

  for await (const chunk of readable) {
    console.log('Chunk:', chunk.length, 'bytes')
    await processChunk(chunk)  // Can await inside
  }

  console.log('Done')
}
```

**`events.once()` for single events:**
```javascript
const { once } = require('events')
const fs = require('fs')

async function waitForEnd() {
  const readable = fs.createReadStream('file.txt')
  readable.resume()  // Start flowing

  await once(readable, 'end')
  console.log('Stream ended')
}
```

**`stream/promises` (Node.js 15+):**
```javascript
const { pipeline, finished } = require('stream/promises')
const fs = require('fs')
const zlib = require('zlib')

async function compress() {
  await pipeline(
    fs.createReadStream('input.txt'),
    zlib.createGzip(),
    fs.createWriteStream('input.txt.gz')
  )
}

async function waitForWrite() {
  const writable = fs.createWriteStream('output.txt')
  writable.write('Hello')
  writable.end()

  await finished(writable)
  console.log('Write complete')
}
```

**`Readable.from()` with async generators:**
```javascript
const { Readable } = require('stream')

async function* generateData() {
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 100))
    yield `Line ${i}\n`
  }
}

const readable = Readable.from(generateData())

for await (const line of readable) {
  console.log(line)
}
```
</details>

---

## Code Analysis Questions

**Q10: What's wrong with this code?**

```javascript
const fs = require('fs')

const readable = fs.createReadStream('large-file.txt')
let content = ''

readable.on('data', (chunk) => {
  content += chunk
})

readable.on('end', () => {
  processContent(content)
})
```

<details>
<summary>Answer</summary>

**Problem:** Accumulating all data in memory defeats the purpose of streams.

For a 10GB file:
- Memory usage: 10GB+ (entire file in `content`)
- Should use: ~16KB (stream buffer)

**Better approaches:**

**Option 1: Process chunks individually:**
```javascript
readable.on('data', (chunk) => {
  processChunk(chunk)  // Process immediately, don't accumulate
})
```

**Option 2: Pipe to destination:**
```javascript
const writable = fs.createWriteStream('output.txt')
readable.pipe(writable)
```

**Option 3: Use Transform for processing:**
```javascript
const { Transform } = require('stream')

const processor = new Transform({
  transform(chunk, encoding, callback) {
    const processed = processChunk(chunk)
    callback(null, processed)
  }
})

readable.pipe(processor).pipe(writable)
```

**Option 4: Line-by-line for text files:**
```javascript
const readline = require('readline')

const rl = readline.createInterface({ input: readable })

for await (const line of rl) {
  processLine(line)  // One line at a time
}
```
</details>

---

**Q11: Identify the bug in this streaming file server:**

```javascript
app.get('/download/:file', (req, res) => {
  const filePath = `./files/${req.params.file}`
  const stream = fs.createReadStream(filePath)
  stream.pipe(res)
})
```

<details>
<summary>Answer</summary>

**Bug:** No error handling. If file doesn't exist or can't be read:
- Error is emitted on stream
- No response sent to client
- Client hangs indefinitely

**Fixed version:**
```javascript
app.get('/download/:file', (req, res) => {
  const filePath = `./files/${req.params.file}`
  const stream = fs.createReadStream(filePath)

  // Handle stream errors
  stream.on('error', (err) => {
    if (err.code === 'ENOENT') {
      res.status(404).send('File not found')
    } else {
      console.error('Stream error:', err)
      res.status(500).send('Server error')
    }
  })

  // Set headers before piping
  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.file}"`)

  stream.pipe(res)
})

// Even better: Use pipeline
const { pipeline } = require('stream')

app.get('/download/:file', (req, res) => {
  const filePath = `./files/${req.params.file}`

  pipeline(
    fs.createReadStream(filePath),
    res,
    (err) => {
      if (err) {
        if (!res.headersSent) {
          res.status(500).send('Download failed')
        }
      }
    }
  )
})
```
</details>

---

**Q12: What will this code output and why?**

```javascript
const { Readable } = require('stream')

const readable = new Readable({
  read() {
    this.push('a')
    this.push('b')
    this.push(null)
  }
})

readable.on('data', (chunk) => {
  console.log('Data:', chunk.toString())
})

readable.on('end', () => {
  console.log('End')
})
```

<details>
<summary>Answer</summary>

**Output:**
```
Data: ab
End
```

Or potentially:
```
Data: a
Data: b
End
```

**Explanation:**

When `_read()` is called, it pushes 'a', 'b', and `null` synchronously. The data may be:
1. Buffered together and delivered as one chunk ('ab')
2. Delivered as separate chunks ('a', then 'b')

This depends on:
- `highWaterMark` setting
- Internal buffering behavior
- Node.js version

**To guarantee separate chunks:**
```javascript
const readable = new Readable({
  read() {
    // Only push one item per _read() call
    if (this.count === undefined) this.count = 0

    if (this.count === 0) {
      this.push('a')
      this.count++
    } else if (this.count === 1) {
      this.push('b')
      this.count++
    } else {
      this.push(null)
    }
  }
})
```

**Key insight:** Don't rely on exact chunking behavior - process data correctly regardless of how it's chunked.
</details>

---

## Practical Implementation Questions

**Q13: Implement a stream that counts words in real-time.**

<details>
<summary>Answer</summary>

```javascript
const { Transform } = require('stream')

class WordCounter extends Transform {
  constructor() {
    super({ objectMode: true })  // Emit objects
    this.wordCount = 0
    this.buffer = ''
  }

  _transform(chunk, encoding, callback) {
    // Add chunk to buffer (handle word splits across chunks)
    this.buffer += chunk.toString()

    // Split on whitespace
    const words = this.buffer.split(/\s+/)

    // Keep last partial word in buffer
    this.buffer = words.pop() || ''

    // Count complete words
    const completeWords = words.filter(w => w.length > 0)
    this.wordCount += completeWords.length

    // Emit running count
    this.push({
      words: completeWords,
      runningCount: this.wordCount
    })

    callback()
  }

  _flush(callback) {
    // Process remaining buffer
    if (this.buffer.trim()) {
      this.wordCount++
      this.push({
        words: [this.buffer.trim()],
        runningCount: this.wordCount
      })
    }

    // Emit final count
    this.push({
      final: true,
      totalCount: this.wordCount
    })

    callback()
  }
}

// Usage
const fs = require('fs')

const counter = new WordCounter()

counter.on('data', (data) => {
  if (data.final) {
    console.log('Total words:', data.totalCount)
  } else {
    console.log('Running count:', data.runningCount)
  }
})

fs.createReadStream('document.txt').pipe(counter)
```
</details>

---

**Q14: Create a rate-limited readable stream.**

<details>
<summary>Answer</summary>

```javascript
const { Readable } = require('stream')

class RateLimitedStream extends Readable {
  constructor(source, bytesPerSecond) {
    super()
    this.source = source
    this.bytesPerSecond = bytesPerSecond
    this.bytesThisSecond = 0
    this.queue = []
    this.sourceEnded = false

    // Reset counter every second
    this.interval = setInterval(() => {
      this.bytesThisSecond = 0
      this._processQueue()
    }, 1000)

    // Read from source
    this.source.on('data', (chunk) => {
      this.queue.push(chunk)
      this._processQueue()
    })

    this.source.on('end', () => {
      this.sourceEnded = true
      this._processQueue()
    })

    this.source.on('error', (err) => {
      this.destroy(err)
    })
  }

  _processQueue() {
    while (this.queue.length > 0) {
      const chunk = this.queue[0]
      const remaining = this.bytesPerSecond - this.bytesThisSecond

      if (remaining <= 0) {
        // Rate limit reached, wait for next second
        return
      }

      if (chunk.length <= remaining) {
        // Can send entire chunk
        this.queue.shift()
        this.bytesThisSecond += chunk.length
        this.push(chunk)
      } else {
        // Send partial chunk
        const partial = chunk.slice(0, remaining)
        this.queue[0] = chunk.slice(remaining)
        this.bytesThisSecond += partial.length
        this.push(partial)
        return  // Wait for next second
      }
    }

    // Check if source ended
    if (this.sourceEnded && this.queue.length === 0) {
      clearInterval(this.interval)
      this.push(null)
    }
  }

  _read() {
    // Called when consumer wants data
    this._processQueue()
  }

  _destroy(err, callback) {
    clearInterval(this.interval)
    this.source.destroy()
    callback(err)
  }
}

// Usage: Limit file read to 1KB/s
const fs = require('fs')

const source = fs.createReadStream('large-file.txt')
const limited = new RateLimitedStream(source, 1024)

limited.on('data', (chunk) => {
  console.log('Received:', chunk.length, 'bytes')
})

limited.pipe(fs.createWriteStream('output.txt'))
```
</details>

---

**Q15: Implement streaming JSON array parsing.**

<details>
<summary>Answer</summary>

```javascript
const { Transform } = require('stream')

class JSONArrayParser extends Transform {
  constructor() {
    super({ objectMode: true })
    this.buffer = ''
    this.depth = 0
    this.inString = false
    this.escape = false
    this.started = false
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString()

    while (this.buffer.length > 0) {
      const result = this._extractNextObject()
      if (result === null) break
      if (result !== undefined) {
        this.push(result)
      }
    }

    callback()
  }

  _extractNextObject() {
    let objectStart = -1
    let objectEnd = -1

    for (let i = 0; i < this.buffer.length; i++) {
      const char = this.buffer[i]

      // Handle escape sequences
      if (this.escape) {
        this.escape = false
        continue
      }

      if (char === '\\' && this.inString) {
        this.escape = true
        continue
      }

      // Handle strings
      if (char === '"') {
        this.inString = !this.inString
        continue
      }

      if (this.inString) continue

      // Handle array start
      if (char === '[' && !this.started) {
        this.started = true
        this.buffer = this.buffer.slice(i + 1)
        return undefined  // Continue parsing
      }

      // Handle object/array depth
      if (char === '{' || char === '[') {
        if (this.depth === 0) {
          objectStart = i
        }
        this.depth++
      } else if (char === '}' || char === ']') {
        this.depth--
        if (this.depth === 0 && objectStart !== -1) {
          objectEnd = i
          break
        }
        if (this.depth === -1) {
          // End of array
          this.buffer = this.buffer.slice(i + 1)
          return null
        }
      }
    }

    if (objectStart !== -1 && objectEnd !== -1) {
      const jsonStr = this.buffer.slice(objectStart, objectEnd + 1)
      this.buffer = this.buffer.slice(objectEnd + 1)

      // Skip comma
      this.buffer = this.buffer.replace(/^\s*,?\s*/, '')

      try {
        return JSON.parse(jsonStr)
      } catch (err) {
        this.emit('error', err)
        return undefined
      }
    }

    return null  // Need more data
  }

  _flush(callback) {
    // Process any remaining buffer
    if (this.buffer.trim() && this.buffer.trim() !== ']') {
      try {
        const obj = JSON.parse(this.buffer.trim().replace(/,$/, ''))
        this.push(obj)
      } catch (err) {
        // Ignore final parsing errors
      }
    }
    callback()
  }
}

// Usage
const fs = require('fs')

const parser = new JSONArrayParser()

parser.on('data', (obj) => {
  console.log('Parsed object:', obj)
})

// Parse large JSON array file
// [{"id":1},{"id":2},{"id":3},...]
fs.createReadStream('large-array.json').pipe(parser)
```
</details>

---

## Self-Assessment Checklist

- [ ] I understand the four types of streams (Readable, Writable, Duplex, Transform)
- [ ] I can use `pipe()` to connect streams
- [ ] I understand backpressure and how to handle it
- [ ] I know the difference between flowing and paused modes
- [ ] I can create custom Readable, Writable, and Transform streams
- [ ] I understand `highWaterMark` and its effects
- [ ] I can use `pipeline()` for proper error handling
- [ ] I know how to use streams with async/await
- [ ] I understand object mode streams
- [ ] I can identify and fix common stream mistakes

---

## Next Steps

After mastering streams:
1. Move to [Path Module](../path-module/) for file path handling
2. Study [FS Module](../fs-module/) for file system streams
3. Explore compression with `zlib` streams

---

*Streams are fundamental to efficient Node.js programming. Master them to handle any data scale.*
