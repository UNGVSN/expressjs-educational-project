# Buffer Module

The `Buffer` class provides a way to work with binary data directly. Express uses buffers for handling raw request bodies, file uploads, and binary responses.

## Overview

Buffers represent fixed-length sequences of bytes. They're essential for working with:
- Raw HTTP request/response bodies
- File I/O
- Cryptographic operations
- Network protocols

## Express Connection

```javascript
const express = require('express')
const app = express()

// Raw body parser creates buffer
app.use(express.raw({ type: '*/*' }))

app.post('/upload', (req, res) => {
  console.log(Buffer.isBuffer(req.body))  // true
  console.log(req.body.length)            // bytes
})

// Binary response
app.get('/image', (req, res) => {
  const imageBuffer = generateImage()
  res.type('image/png')
  res.send(imageBuffer)
})
```

## Creating Buffers

```javascript
// From string
const buf1 = Buffer.from('Hello World')
const buf2 = Buffer.from('Hello', 'utf8')  // explicit encoding

// From array
const buf3 = Buffer.from([72, 101, 108, 108, 111])  // 'Hello'

// Allocate fixed size
const buf4 = Buffer.alloc(10)        // 10 zero-filled bytes
const buf5 = Buffer.allocUnsafe(10)  // 10 uninitialized bytes (faster)

// From other buffer
const buf6 = Buffer.from(buf1)  // copy
```

## Reading and Writing

```javascript
const buf = Buffer.alloc(4)

// Write to buffer
buf.writeUInt8(0xFF, 0)           // Write byte at offset 0
buf.writeUInt16BE(0x0102, 1)      // Write 2 bytes, big-endian
buf.writeUInt8(0x03, 3)           // Write byte at offset 3

// Read from buffer
buf.readUInt8(0)                  // 255
buf.readUInt16BE(1)               // 258 (0x0102)

// String conversion
const strBuf = Buffer.from('Hello World')
strBuf.toString()                 // 'Hello World'
strBuf.toString('utf8', 0, 5)     // 'Hello'
strBuf.toString('hex')            // '48656c6c6f20576f726c64'
strBuf.toString('base64')         // 'SGVsbG8gV29ybGQ='
```

## Buffer Operations

```javascript
// Concatenate
const buf1 = Buffer.from('Hello ')
const buf2 = Buffer.from('World')
const combined = Buffer.concat([buf1, buf2])  // 'Hello World'

// Slice (shares memory!)
const slice = buf1.slice(0, 5)  // Reference to same memory

// Copy (new memory)
const copy = Buffer.alloc(5)
buf1.copy(copy, 0, 0, 5)

// Compare
buf1.equals(buf2)               // false
buf1.compare(buf2)              // -1, 0, or 1

// Fill
const filled = Buffer.alloc(10)
filled.fill('a')                // 'aaaaaaaaaa'
```

## Encodings

```javascript
const buf = Buffer.from('Hello World')

// Supported encodings
buf.toString('utf8')     // Default: UTF-8
buf.toString('ascii')    // ASCII (7-bit)
buf.toString('utf16le')  // UTF-16 Little Endian
buf.toString('base64')   // Base64
buf.toString('base64url')// URL-safe Base64
buf.toString('hex')      // Hexadecimal
buf.toString('latin1')   // ISO-8859-1
buf.toString('binary')   // Alias for latin1

// Encoding to buffer
Buffer.from('SGVsbG8=', 'base64')  // From base64
Buffer.from('48656c6c6f', 'hex')   // From hex
```

## Express.js Patterns

### Raw Body Handling

```javascript
const express = require('express')
const crypto = require('crypto')
const app = express()

// Verify webhook signature
app.post('/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-signature']
    const hash = crypto
      .createHmac('sha256', process.env.SECRET)
      .update(req.body)  // req.body is Buffer
      .digest('hex')

    if (signature !== hash) {
      return res.status(401).send('Invalid signature')
    }

    const data = JSON.parse(req.body.toString())
    // Process webhook...
  }
)
```

### File Response

```javascript
const fs = require('fs').promises

app.get('/file/:name', async (req, res) => {
  const buffer = await fs.readFile(`./files/${req.params.name}`)
  res.type('application/octet-stream')
  res.send(buffer)
})
```

### Base64 Handling

```javascript
// Decode base64 image
app.post('/upload-base64', express.json(), (req, res) => {
  const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')

  // Save or process buffer
  fs.writeFileSync('upload.png', buffer)

  res.json({ size: buffer.length })
})
```

## Security Considerations

```javascript
// Use alloc() not allocUnsafe() for sensitive data
const safe = Buffer.alloc(100)      // Zero-filled
const unsafe = Buffer.allocUnsafe(100)  // May contain old data

// Clear sensitive data when done
function clearBuffer(buf) {
  buf.fill(0)
}

// Constant-time comparison for security
const crypto = require('crypto')
function secureCompare(a, b) {
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}
```

## Performance Tips

```javascript
// Pre-allocate buffers for better performance
const pool = Buffer.allocUnsafe(1024)  // Faster than alloc()

// Use Buffer.concat() instead of string concatenation for binary
const chunks = []
stream.on('data', chunk => chunks.push(chunk))
stream.on('end', () => {
  const result = Buffer.concat(chunks)  // Efficient
})

// Reuse buffers when possible
const buf = Buffer.alloc(4096)
while (hasData) {
  readIntoBuffer(buf)  // Reuse same buffer
  processBuffer(buf)
}
```

## Related Modules

- [stream](../stream-module/) - Streams use buffers
- [fs](../fs-module/) - File operations return buffers

## Next Steps

1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md)
2. Test knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Proceed to [core-concepts](../../core-concepts/)

---

*Buffers are essential for handling binary data in Node.js and Express.*
