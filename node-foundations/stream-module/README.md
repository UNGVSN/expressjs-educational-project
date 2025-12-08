# Stream Module

The `stream` module provides the API for implementing streaming data in Node.js. Streams are collections of data that might not be available all at once and don't have to fit in memory. Understanding streams is essential because HTTP requests and responses in Express are streams.

## Overview

Streams enable efficient data processing by working with chunks of data rather than loading everything into memory. This is crucial for handling large files, network data, and real-time processing.

## Express Connection

```javascript
const express = require('express')
const fs = require('fs')
const app = express()

app.get('/video', (req, res) => {
  // res is a Writable stream
  const videoStream = fs.createReadStream('./video.mp4')
  videoStream.pipe(res)  // Efficient streaming
})

app.post('/upload', (req, res) => {
  // req is a Readable stream
  const writeStream = fs.createWriteStream('./upload.txt')
  req.pipe(writeStream)

  req.on('end', () => {
    res.send('Upload complete')
  })
})
```

## Stream Types

### Readable Streams

Streams from which data can be read:

```javascript
const { Readable } = require('stream')
const fs = require('fs')

// File read stream
const fileStream = fs.createReadStream('file.txt')

fileStream.on('data', (chunk) => {
  console.log('Received:', chunk.length, 'bytes')
})

fileStream.on('end', () => {
  console.log('File read complete')
})

fileStream.on('error', (err) => {
  console.error('Error:', err)
})
```

**Common Readable Streams:**
- `fs.createReadStream()` - File reading
- `http.IncomingMessage` (req) - HTTP request body
- `process.stdin` - Standard input
- `crypto.createHash().pipe()` - Crypto operations

### Writable Streams

Streams to which data can be written:

```javascript
const { Writable } = require('stream')
const fs = require('fs')

// File write stream
const fileStream = fs.createWriteStream('output.txt')

fileStream.write('Hello ')
fileStream.write('World')
fileStream.end('!')  // Final write and close

fileStream.on('finish', () => {
  console.log('Write complete')
})

fileStream.on('error', (err) => {
  console.error('Error:', err)
})
```

**Common Writable Streams:**
- `fs.createWriteStream()` - File writing
- `http.ServerResponse` (res) - HTTP response body
- `process.stdout` - Standard output
- `process.stderr` - Standard error

### Duplex Streams

Streams that are both Readable and Writable:

```javascript
const { Duplex } = require('stream')
const net = require('net')

// TCP socket is duplex
const socket = net.connect({ port: 80, host: 'example.com' })

// Read from socket
socket.on('data', (data) => {
  console.log('Received:', data.toString())
})

// Write to socket
socket.write('GET / HTTP/1.1\r\n\r\n')
```

**Common Duplex Streams:**
- `net.Socket` - TCP sockets
- `tls.TLSSocket` - TLS sockets
- `crypto.Cipher/Decipher` - Encryption

### Transform Streams

Duplex streams that modify data as it passes through:

```javascript
const { Transform } = require('stream')
const zlib = require('zlib')

// Gzip transform
const gzip = zlib.createGzip()

// Custom transform
const upperCase = new Transform({
  transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase())
    callback()
  }
})

// Chain transforms
process.stdin
  .pipe(upperCase)
  .pipe(gzip)
  .pipe(process.stdout)
```

**Common Transform Streams:**
- `zlib.createGzip()` - Compression
- `zlib.createGunzip()` - Decompression
- `crypto.createCipheriv()` - Encryption
- Custom data transformations

## Core Concepts

### Piping

The `pipe()` method connects streams:

```javascript
const fs = require('fs')
const zlib = require('zlib')

// Read → Compress → Write
fs.createReadStream('input.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('input.txt.gz'))

// With error handling
const readable = fs.createReadStream('input.txt')
const writable = fs.createWriteStream('output.txt')

readable
  .on('error', handleError)
  .pipe(writable)
  .on('error', handleError)
  .on('finish', () => console.log('Done'))
```

### Backpressure

Backpressure occurs when data arrives faster than it can be processed:

```javascript
const fs = require('fs')

const readable = fs.createReadStream('large-file.txt')
const writable = fs.createWriteStream('output.txt')

// Manual backpressure handling
readable.on('data', (chunk) => {
  const canContinue = writable.write(chunk)

  if (!canContinue) {
    // Pause reading until writable drains
    readable.pause()

    writable.once('drain', () => {
      readable.resume()
    })
  }
})

readable.on('end', () => {
  writable.end()
})

// pipe() handles backpressure automatically
readable.pipe(writable)
```

### Flowing vs Paused Mode

Readable streams operate in two modes:

```javascript
const fs = require('fs')

const stream = fs.createReadStream('file.txt')

// Flowing mode - data events fire automatically
stream.on('data', (chunk) => {
  console.log(chunk)
})

// Paused mode - must call read() manually
stream.on('readable', () => {
  let chunk
  while ((chunk = stream.read()) !== null) {
    console.log(chunk)
  }
})

// Switch to flowing
stream.resume()

// Switch to paused
stream.pause()
```

## Creating Custom Streams

### Custom Readable

```javascript
const { Readable } = require('stream')

// Simple readable
const readable = new Readable({
  read(size) {
    this.push('Hello ')
    this.push('World')
    this.push(null)  // End of stream
  }
})

// Class-based
class Counter extends Readable {
  constructor(max) {
    super()
    this.max = max
    this.current = 0
  }

  _read() {
    if (this.current <= this.max) {
      this.push(String(this.current++))
    } else {
      this.push(null)
    }
  }
}

const counter = new Counter(5)
counter.pipe(process.stdout)
// Output: 012345
```

### Custom Writable

```javascript
const { Writable } = require('stream')

// Simple writable
const writable = new Writable({
  write(chunk, encoding, callback) {
    console.log('Received:', chunk.toString())
    callback()  // Signal completion
  }
})

// Class-based
class ArrayWriter extends Writable {
  constructor() {
    super()
    this.data = []
  }

  _write(chunk, encoding, callback) {
    this.data.push(chunk.toString())
    callback()
  }

  getData() {
    return this.data
  }
}

const writer = new ArrayWriter()
writer.write('Hello')
writer.write('World')
writer.end()
console.log(writer.getData())  // ['Hello', 'World']
```

### Custom Transform

```javascript
const { Transform } = require('stream')

// JSON line parser
class JSONLineParser extends Transform {
  constructor() {
    super({ objectMode: true })
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
          this.emit('error', err)
        }
      }
    }
    callback()
  }

  _flush(callback) {
    if (this.buffer.trim()) {
      try {
        this.push(JSON.parse(this.buffer))
      } catch (err) {
        this.emit('error', err)
      }
    }
    callback()
  }
}
```

## Object Mode

Streams can work with objects instead of buffers:

```javascript
const { Transform } = require('stream')

// Object mode transform
const objectTransform = new Transform({
  objectMode: true,

  transform(obj, encoding, callback) {
    // Transform object
    obj.processed = true
    obj.timestamp = Date.now()
    this.push(obj)
    callback()
  }
})

// Usage
objectTransform.write({ id: 1, name: 'Item 1' })
objectTransform.write({ id: 2, name: 'Item 2' })

objectTransform.on('data', (obj) => {
  console.log(obj)
  // { id: 1, name: 'Item 1', processed: true, timestamp: ... }
})
```

## Stream Utilities

### pipeline()

Modern way to pipe streams with error handling:

```javascript
const { pipeline } = require('stream')
const fs = require('fs')
const zlib = require('zlib')

// Callback style
pipeline(
  fs.createReadStream('input.txt'),
  zlib.createGzip(),
  fs.createWriteStream('input.txt.gz'),
  (err) => {
    if (err) {
      console.error('Pipeline failed:', err)
    } else {
      console.log('Pipeline succeeded')
    }
  }
)

// Promise style (Node.js 15+)
const { pipeline: pipelineAsync } = require('stream/promises')

async function compress() {
  await pipelineAsync(
    fs.createReadStream('input.txt'),
    zlib.createGzip(),
    fs.createWriteStream('input.txt.gz')
  )
  console.log('Done')
}
```

### finished()

Wait for stream to finish:

```javascript
const { finished } = require('stream')
const fs = require('fs')

const stream = fs.createWriteStream('file.txt')
stream.write('Hello')
stream.end()

// Callback style
finished(stream, (err) => {
  if (err) {
    console.error('Stream failed:', err)
  } else {
    console.log('Stream finished')
  }
})

// Promise style
const { finished: finishedAsync } = require('stream/promises')

async function waitForStream() {
  await finishedAsync(stream)
  console.log('Stream finished')
}
```

### Readable.from()

Create readable stream from iterable:

```javascript
const { Readable } = require('stream')

// From array
const arrayStream = Readable.from(['a', 'b', 'c'])

// From generator
function* generateData() {
  yield 'Hello'
  yield ' '
  yield 'World'
}

const generatorStream = Readable.from(generateData())

// From async generator
async function* fetchData() {
  for (let i = 0; i < 5; i++) {
    await new Promise(resolve => setTimeout(resolve, 100))
    yield `Item ${i}\n`
  }
}

const asyncStream = Readable.from(fetchData())
asyncStream.pipe(process.stdout)
```

## Express.js Patterns

### Streaming Responses

```javascript
const express = require('express')
const fs = require('fs')
const app = express()

// Stream file download
app.get('/download/:filename', (req, res) => {
  const filePath = `./files/${req.params.filename}`

  res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`)

  const stream = fs.createReadStream(filePath)

  stream.on('error', (err) => {
    if (err.code === 'ENOENT') {
      res.status(404).send('File not found')
    } else {
      res.status(500).send('Server error')
    }
  })

  stream.pipe(res)
})

// Stream JSON array
app.get('/users', async (req, res) => {
  res.setHeader('Content-Type', 'application/json')

  res.write('[\n')

  let first = true
  for await (const user of getUsersIterator()) {
    if (!first) res.write(',\n')
    res.write(JSON.stringify(user))
    first = false
  }

  res.write('\n]')
  res.end()
})
```

### Streaming Request Body

```javascript
const express = require('express')
const fs = require('fs')
const crypto = require('crypto')
const app = express()

// Stream upload with progress
app.post('/upload', (req, res) => {
  const totalSize = parseInt(req.headers['content-length'], 10)
  let uploadedSize = 0

  const writeStream = fs.createWriteStream('./upload.bin')

  req.on('data', (chunk) => {
    uploadedSize += chunk.length
    const progress = Math.round((uploadedSize / totalSize) * 100)
    console.log(`Upload progress: ${progress}%`)
  })

  req.pipe(writeStream)

  writeStream.on('finish', () => {
    res.json({ message: 'Upload complete', size: uploadedSize })
  })

  writeStream.on('error', (err) => {
    res.status(500).json({ error: err.message })
  })
})

// Stream with hash calculation
app.post('/upload-with-hash', (req, res) => {
  const hash = crypto.createHash('sha256')
  const writeStream = fs.createWriteStream('./upload.bin')

  req
    .pipe(hash)
    .on('data', () => {})  // Consume hash stream

  req.pipe(writeStream)

  writeStream.on('finish', () => {
    res.json({
      message: 'Upload complete',
      hash: hash.digest('hex')
    })
  })
})
```

### Compression Middleware

```javascript
const express = require('express')
const zlib = require('zlib')
const app = express()

// Simple compression middleware
app.use((req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || ''

  if (acceptEncoding.includes('gzip')) {
    // Store original methods
    const originalWrite = res.write.bind(res)
    const originalEnd = res.end.bind(res)

    const gzip = zlib.createGzip()
    res.setHeader('Content-Encoding', 'gzip')
    res.removeHeader('Content-Length')

    // Override write/end to compress
    res.write = (chunk, ...args) => gzip.write(chunk, ...args)
    res.end = (chunk, ...args) => {
      if (chunk) gzip.write(chunk)
      gzip.end()
    }

    gzip.on('data', (chunk) => originalWrite(chunk))
    gzip.on('end', () => originalEnd())
  }

  next()
})

// Better: use compression package
const compression = require('compression')
app.use(compression())
```

## Performance Patterns

### Chunked Processing

```javascript
const { Transform } = require('stream')

// Process in batches
class BatchProcessor extends Transform {
  constructor(batchSize = 100) {
    super({ objectMode: true })
    this.batch = []
    this.batchSize = batchSize
  }

  _transform(item, encoding, callback) {
    this.batch.push(item)

    if (this.batch.length >= this.batchSize) {
      this.push(this.batch)
      this.batch = []
    }

    callback()
  }

  _flush(callback) {
    if (this.batch.length > 0) {
      this.push(this.batch)
    }
    callback()
  }
}

// Usage with database
async function processLargeDataset() {
  const dataStream = getDataStream()
  const batcher = new BatchProcessor(100)

  for await (const batch of dataStream.pipe(batcher)) {
    await db.insertMany(batch)
  }
}
```

### Memory-Efficient Large File Processing

```javascript
const fs = require('fs')
const readline = require('readline')

// Process file line by line
async function processLargeFile(filePath) {
  const fileStream = fs.createReadStream(filePath)

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })

  let lineCount = 0

  for await (const line of rl) {
    lineCount++
    // Process line without loading entire file
    await processLine(line)
  }

  console.log(`Processed ${lineCount} lines`)
}
```

## Error Handling

### Comprehensive Error Handling

```javascript
const { pipeline } = require('stream/promises')
const fs = require('fs')

async function safePipeline() {
  const readable = fs.createReadStream('input.txt')
  const writable = fs.createWriteStream('output.txt')

  try {
    await pipeline(readable, writable)
    console.log('Pipeline succeeded')
  } catch (err) {
    console.error('Pipeline failed:', err)

    // Clean up partial output
    try {
      await fs.promises.unlink('output.txt')
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Error propagation with transforms
function createSafeTransform() {
  return new Transform({
    transform(chunk, encoding, callback) {
      try {
        const result = processChunk(chunk)
        callback(null, result)
      } catch (err) {
        callback(err)
      }
    }
  })
}
```

## Related Modules

- [events](../events-module/) - Streams extend EventEmitter
- [fs](../fs-module/) - File streams
- [http](../http-module/) - Request/response are streams
- [buffer](../buffer-module/) - Stream data type

## Next Steps

After understanding the stream module:
1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md) for deeper insights
2. Test your knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Move to [path-module](../path-module/) for file path handling

---

*Streams are the backbone of efficient I/O in Node.js. Master them to handle large data efficiently.*
