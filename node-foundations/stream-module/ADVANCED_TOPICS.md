# Stream Module - Advanced Topics

Advanced stream features including PassThrough, highWaterMark tuning, addAbortSignal, and async iteration.

## PassThrough Stream

PassThrough streams pass data through unchanged, useful for monitoring, logging, or branching data flow.

### Basic PassThrough

```javascript
const { PassThrough } = require('stream')
const fs = require('fs')

// PassThrough for monitoring
const monitor = new PassThrough()
let bytesTransferred = 0

monitor.on('data', (chunk) => {
  bytesTransferred += chunk.length
  console.log(`Transferred: ${bytesTransferred} bytes`)
})

fs.createReadStream('large-file.txt')
  .pipe(monitor)
  .pipe(fs.createWriteStream('output.txt'))
```

### Progress Tracking

```javascript
const { PassThrough } = require('stream')

function createProgressStream(totalSize, onProgress) {
  const passThrough = new PassThrough()
  let transferred = 0

  passThrough.on('data', (chunk) => {
    transferred += chunk.length
    const percent = Math.round((transferred / totalSize) * 100)
    onProgress({ transferred, totalSize, percent })
  })

  return passThrough
}

// Usage in Express
app.get('/download/:id', async (req, res) => {
  const file = await getFile(req.params.id)
  const progressStream = createProgressStream(file.size, (progress) => {
    console.log(`Download progress: ${progress.percent}%`)
  })

  file.stream
    .pipe(progressStream)
    .pipe(res)
})
```

### Tee (Branching) Pattern

```javascript
const { PassThrough } = require('stream')
const fs = require('fs')
const crypto = require('crypto')

function teeStream(source, ...destinations) {
  const passthroughs = destinations.map(() => new PassThrough())

  source.on('data', (chunk) => {
    passthroughs.forEach(pt => pt.write(chunk))
  })

  source.on('end', () => {
    passthroughs.forEach(pt => pt.end())
  })

  source.on('error', (err) => {
    passthroughs.forEach(pt => pt.destroy(err))
  })

  return passthroughs
}

// Write to file AND calculate hash simultaneously
const readStream = fs.createReadStream('input.txt')
const hash = crypto.createHash('sha256')
const writeStream = fs.createWriteStream('output.txt')

const [fileStream, hashStream] = teeStream(readStream, writeStream, hash)

fileStream.pipe(writeStream)
hashStream.pipe(hash).on('data', (digest) => {
  console.log('Hash:', digest.toString('hex'))
})
```

### Lazy Stream Initialization

```javascript
const { PassThrough } = require('stream')

function createLazyStream(factory) {
  const passThrough = new PassThrough()
  let initialized = false

  passThrough.on('pipe', () => {
    if (!initialized) {
      initialized = true
      const source = factory()
      source.pipe(passThrough)
    }
  })

  // Also initialize on read
  const originalRead = passThrough._read.bind(passThrough)
  passThrough._read = function(size) {
    if (!initialized) {
      initialized = true
      const source = factory()
      source.pipe(passThrough)
    }
    return originalRead(size)
  }

  return passThrough
}

// Usage - database query only executed when stream is consumed
const lazyUserStream = createLazyStream(() => {
  console.log('Initializing database stream...')
  return db.collection('users').find().stream()
})

// Query doesn't run until this:
lazyUserStream.pipe(process.stdout)
```

## highWaterMark Configuration

The highWaterMark controls buffer size and backpressure behavior.

### Understanding highWaterMark

```javascript
const { Readable, Writable } = require('stream')

// Default highWaterMark: 16KB for byte streams, 16 objects for object mode
const readable = new Readable({
  highWaterMark: 64 * 1024,  // 64KB buffer
  read(size) {
    // Called when internal buffer falls below highWaterMark
    this.push(generateData())
  }
})

const writable = new Writable({
  highWaterMark: 32 * 1024,  // 32KB buffer
  write(chunk, encoding, callback) {
    // write() returns false when buffer exceeds highWaterMark
    processData(chunk).then(callback)
  }
})

// Check buffer status
console.log('Readable buffer:', readable.readableLength)
console.log('Readable highWaterMark:', readable.readableHighWaterMark)
console.log('Writable buffer:', writable.writableLength)
console.log('Writable highWaterMark:', writable.writableHighWaterMark)
```

### Tuning for Different Scenarios

```javascript
const fs = require('fs')
const { Transform } = require('stream')

// Large file processing - larger buffers
const largeFileStream = fs.createReadStream('huge-file.bin', {
  highWaterMark: 1024 * 1024  // 1MB chunks
})

// Network streaming - smaller buffers for lower latency
const networkStream = fs.createReadStream('video.mp4', {
  highWaterMark: 16 * 1024  // 16KB chunks
})

// Object mode - count of objects, not bytes
const objectStream = new Transform({
  objectMode: true,
  highWaterMark: 100,  // Buffer up to 100 objects
  transform(obj, encoding, callback) {
    this.push(processObject(obj))
    callback()
  }
})

// Real-time processing - minimal buffering
const realTimeStream = new Transform({
  highWaterMark: 0,  // No buffering - process immediately
  transform(chunk, encoding, callback) {
    this.push(chunk)
    callback()
  }
})
```

### Dynamic highWaterMark

```javascript
const { Readable } = require('stream')

class AdaptiveReadable extends Readable {
  constructor(options = {}) {
    super(options)
    this.baseHighWaterMark = options.highWaterMark || 16384
    this.processingTime = []
  }

  _read(size) {
    const start = Date.now()
    const data = this.fetchData()

    if (data) {
      this.push(data)

      // Track processing time
      this.processingTime.push(Date.now() - start)
      if (this.processingTime.length > 10) {
        this.processingTime.shift()
      }

      // Adjust based on processing speed
      const avgTime = this.processingTime.reduce((a, b) => a + b, 0) /
        this.processingTime.length

      if (avgTime < 10) {
        // Fast processing - increase buffer
        this.readableHighWaterMark = Math.min(
          this.baseHighWaterMark * 4,
          1024 * 1024
        )
      } else if (avgTime > 100) {
        // Slow processing - decrease buffer
        this.readableHighWaterMark = Math.max(
          this.baseHighWaterMark / 2,
          1024
        )
      }
    } else {
      this.push(null)
    }
  }
}
```

### Memory Monitoring

```javascript
const { Transform } = require('stream')

function createMemoryMonitoredStream(options = {}) {
  const maxMemory = options.maxMemory || 100 * 1024 * 1024  // 100MB
  let paused = false

  const transform = new Transform({
    highWaterMark: options.highWaterMark || 64 * 1024,

    transform(chunk, encoding, callback) {
      const memUsage = process.memoryUsage()

      if (memUsage.heapUsed > maxMemory && !paused) {
        paused = true
        console.warn('Memory limit reached, pausing stream')

        // Force garbage collection if available
        if (global.gc) global.gc()

        // Resume after memory drops
        const checkMemory = setInterval(() => {
          if (process.memoryUsage().heapUsed < maxMemory * 0.8) {
            paused = false
            clearInterval(checkMemory)
            console.log('Memory recovered, resuming stream')
          }
        }, 100)
      }

      if (!paused) {
        this.push(chunk)
        callback()
      } else {
        // Delay callback to create backpressure
        setTimeout(() => {
          this.push(chunk)
          callback()
        }, 100)
      }
    }
  })

  return transform
}
```

## AbortSignal Integration

### Using addAbortSignal

```javascript
const { Readable, addAbortSignal } = require('stream')
const fs = require('fs')

// Create abortable stream
const controller = new AbortController()
const { signal } = controller

const readable = fs.createReadStream('large-file.txt')
addAbortSignal(signal, readable)

readable.on('error', (err) => {
  if (err.name === 'AbortError') {
    console.log('Stream was aborted')
  } else {
    console.error('Stream error:', err)
  }
})

readable.pipe(process.stdout)

// Abort after 5 seconds
setTimeout(() => {
  controller.abort()
}, 5000)
```

### Timeout Pattern

```javascript
const { pipeline, addAbortSignal } = require('stream')
const { setTimeout: sleep } = require('timers/promises')

async function streamWithTimeout(source, destination, timeoutMs) {
  const controller = new AbortController()
  const { signal } = controller

  // Set timeout
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    addAbortSignal(signal, source)
    addAbortSignal(signal, destination)

    await pipeline(source, destination)
    clearTimeout(timeoutId)
  } catch (err) {
    clearTimeout(timeoutId)

    if (err.name === 'AbortError') {
      throw new Error(`Stream timeout after ${timeoutMs}ms`)
    }
    throw err
  }
}

// Usage
const fs = require('fs')

try {
  await streamWithTimeout(
    fs.createReadStream('input.txt'),
    fs.createWriteStream('output.txt'),
    5000  // 5 second timeout
  )
  console.log('Stream completed')
} catch (err) {
  console.error('Stream failed:', err.message)
}
```

### Request Cancellation in Express

```javascript
const express = require('express')
const { addAbortSignal, Readable } = require('stream')

const app = express()

app.get('/stream', (req, res) => {
  const controller = new AbortController()
  const { signal } = controller

  // Abort stream if client disconnects
  req.on('close', () => {
    if (!res.writableFinished) {
      controller.abort()
    }
  })

  // Create data stream
  const dataStream = createDataStream()
  addAbortSignal(signal, dataStream)

  dataStream.on('error', (err) => {
    if (err.name === 'AbortError') {
      console.log('Client disconnected, stream aborted')
    } else {
      console.error('Stream error:', err)
      if (!res.headersSent) {
        res.status(500).send('Error')
      }
    }
  })

  dataStream.pipe(res)
})

function createDataStream() {
  let i = 0
  return new Readable({
    async read() {
      await new Promise(r => setTimeout(r, 100))
      if (i < 100) {
        this.push(`Data chunk ${i++}\n`)
      } else {
        this.push(null)
      }
    }
  })
}
```

## Async Iteration

### For-await-of with Streams

```javascript
const fs = require('fs')
const readline = require('readline')

// Async iteration over readable stream
async function processStream(stream) {
  for await (const chunk of stream) {
    console.log('Chunk:', chunk.toString())
  }
  console.log('Stream ended')
}

// Line-by-line processing
async function processLines(filePath) {
  const fileStream = fs.createReadStream(filePath)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })

  let lineNumber = 0
  for await (const line of rl) {
    lineNumber++
    await processLine(lineNumber, line)
  }

  console.log(`Processed ${lineNumber} lines`)
}

// Object mode stream iteration
async function processObjects(stream) {
  const results = []
  for await (const obj of stream) {
    const processed = await transformObject(obj)
    results.push(processed)
  }
  return results
}
```

### Creating Async Iterable Streams

```javascript
const { Readable } = require('stream')

// From async generator
async function* generateData() {
  for (let i = 0; i < 100; i++) {
    await new Promise(r => setTimeout(r, 10))
    yield { id: i, data: `Item ${i}` }
  }
}

const asyncStream = Readable.from(generateData(), { objectMode: true })

// From paginated API
async function* fetchPaginatedData(url) {
  let page = 1
  let hasMore = true

  while (hasMore) {
    const response = await fetch(`${url}?page=${page}`)
    const data = await response.json()

    for (const item of data.items) {
      yield item
    }

    hasMore = data.hasMore
    page++
  }
}

const apiStream = Readable.from(fetchPaginatedData('https://api.example.com/data'))

// Process with async iteration
for await (const item of apiStream) {
  await processItem(item)
}
```

### Parallel Processing with Async Iteration

```javascript
const { Readable } = require('stream')

async function parallelProcess(stream, processor, concurrency = 10) {
  const pending = new Set()
  const results = []

  for await (const item of stream) {
    // Start processing
    const promise = processor(item).then(result => {
      pending.delete(promise)
      results.push(result)
    })
    pending.add(promise)

    // Control concurrency
    if (pending.size >= concurrency) {
      await Promise.race(pending)
    }
  }

  // Wait for remaining
  await Promise.all(pending)
  return results
}

// Usage
const itemStream = Readable.from(items, { objectMode: true })
const processed = await parallelProcess(
  itemStream,
  async (item) => {
    const result = await expensiveOperation(item)
    return result
  },
  5  // Process 5 items concurrently
)
```

## Web Streams Interoperability

Node.js 16+ supports Web Streams API and conversion between Node and Web streams.

### Converting Streams

```javascript
const { Readable, Writable } = require('stream')

// Node stream to Web stream
const nodeReadable = fs.createReadStream('file.txt')
const webReadable = Readable.toWeb(nodeReadable)

// Web stream to Node stream
const webStream = fetch('https://example.com').then(r => r.body)
const nodeStream = Readable.fromWeb(await webStream)

// Writable conversion
const nodeWritable = fs.createWriteStream('output.txt')
const webWritable = Writable.toWeb(nodeWritable)

// From Web API
const webWritableStream = new WritableStream({
  write(chunk) {
    console.log('Web stream received:', chunk)
  }
})
const nodeWritableFromWeb = Writable.fromWeb(webWritableStream)
```

### Using with Fetch

```javascript
const { Readable } = require('stream')
const { pipeline } = require('stream/promises')
const fs = require('fs')

// Download with Node streams
async function downloadFile(url, destPath) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const webStream = response.body
  const nodeStream = Readable.fromWeb(webStream)
  const fileStream = fs.createWriteStream(destPath)

  await pipeline(nodeStream, fileStream)
}

// Upload with streaming body
async function uploadFile(url, filePath) {
  const fileStream = fs.createReadStream(filePath)
  const webStream = Readable.toWeb(fileStream)

  const response = await fetch(url, {
    method: 'POST',
    body: webStream,
    duplex: 'half'  // Required for streaming body
  })

  return response.json()
}
```

## Stream Composition

### Combining Multiple Streams

```javascript
const { PassThrough, pipeline } = require('stream')

// Merge multiple readable streams
function mergeStreams(...streams) {
  const merged = new PassThrough()
  let activeStreams = streams.length

  streams.forEach(stream => {
    stream.pipe(merged, { end: false })

    stream.on('end', () => {
      activeStreams--
      if (activeStreams === 0) {
        merged.end()
      }
    })

    stream.on('error', (err) => {
      merged.destroy(err)
    })
  })

  return merged
}

// Usage
const stream1 = fs.createReadStream('file1.txt')
const stream2 = fs.createReadStream('file2.txt')
const merged = mergeStreams(stream1, stream2)

merged.pipe(fs.createWriteStream('combined.txt'))
```

### Conditional Pipeline

```javascript
const { Transform, pipeline } = require('stream')
const zlib = require('zlib')

function conditionalPipeline(source, destination, options = {}) {
  const stages = [source]

  // Add compression if requested
  if (options.compress) {
    stages.push(zlib.createGzip())
  }

  // Add encryption if requested
  if (options.encrypt) {
    stages.push(createEncryptionStream(options.key))
  }

  // Add transformation if provided
  if (options.transform) {
    stages.push(new Transform({
      transform(chunk, encoding, callback) {
        callback(null, options.transform(chunk))
      }
    }))
  }

  stages.push(destination)

  return pipeline(...stages, (err) => {
    if (err) console.error('Pipeline error:', err)
  })
}

// Usage
conditionalPipeline(
  fs.createReadStream('input.txt'),
  fs.createWriteStream('output.txt.gz.enc'),
  {
    compress: true,
    encrypt: true,
    key: 'encryption-key',
    transform: (chunk) => chunk.toString().toUpperCase()
  }
)
```

### Stream Pool

```javascript
const { Readable, Writable } = require('stream')

class StreamPool {
  constructor(factory, poolSize = 5) {
    this.factory = factory
    this.available = []
    this.waiting = []

    // Pre-create streams
    for (let i = 0; i < poolSize; i++) {
      this.available.push(this.factory())
    }
  }

  async acquire() {
    if (this.available.length > 0) {
      return this.available.pop()
    }

    // Wait for available stream
    return new Promise((resolve) => {
      this.waiting.push(resolve)
    })
  }

  release(stream) {
    // Reset stream if needed
    this.resetStream(stream)

    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()
      resolve(stream)
    } else {
      this.available.push(stream)
    }
  }

  resetStream(stream) {
    // Override in subclass for stream-specific reset
  }
}

// Usage for compression
const gzipPool = new StreamPool(() => zlib.createGzip(), 10)

async function compressData(data) {
  const gzip = await gzipPool.acquire()
  const chunks = []

  return new Promise((resolve, reject) => {
    gzip.on('data', chunk => chunks.push(chunk))
    gzip.on('end', () => {
      gzipPool.release(gzip)
      resolve(Buffer.concat(chunks))
    })
    gzip.on('error', reject)

    gzip.write(data)
    gzip.end()
  })
}
```

## Error Recovery

### Retry Pattern

```javascript
const { pipeline } = require('stream/promises')
const { PassThrough } = require('stream')

async function pipelineWithRetry(createSource, destination, maxRetries = 3) {
  let attempt = 0
  let bytesWritten = 0

  while (attempt < maxRetries) {
    attempt++

    try {
      const source = createSource(bytesWritten)  // Resume from offset

      // Track progress
      const progress = new PassThrough()
      progress.on('data', (chunk) => {
        bytesWritten += chunk.length
      })

      await pipeline(source, progress, destination)
      return  // Success
    } catch (err) {
      console.warn(`Attempt ${attempt} failed:`, err.message)

      if (attempt === maxRetries) {
        throw err
      }

      // Wait before retry
      await new Promise(r => setTimeout(r, 1000 * attempt))
    }
  }
}

// Usage for resumable download
await pipelineWithRetry(
  (offset) => {
    return fetch(url, {
      headers: { Range: `bytes=${offset}-` }
    }).then(r => Readable.fromWeb(r.body))
  },
  fs.createWriteStream('download.bin', { flags: 'a' }),  // Append mode
  3
)
```

## Related Topics

- [Events Module](../events-module/README.md)
- [Buffer Module](../buffer-module/README.md)
- [HTTP Module Advanced](../http-module/ADVANCED_TOPICS.md)
