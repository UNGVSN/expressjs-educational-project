# Buffer Module - Advanced Topics

Advanced buffer features including numeric read/write methods, iteration patterns, binary data handling, and memory management.

## Numeric Read/Write Methods

### Integer Operations

```javascript
const buf = Buffer.alloc(16)

// Unsigned integers
buf.writeUInt8(255, 0)              // 1 byte, 0-255
buf.writeUInt16BE(65535, 1)         // 2 bytes, Big Endian
buf.writeUInt16LE(65535, 3)         // 2 bytes, Little Endian
buf.writeUInt32BE(4294967295, 5)    // 4 bytes, Big Endian
buf.writeUInt32LE(4294967295, 9)    // 4 bytes, Little Endian

// Read back
console.log(buf.readUInt8(0))       // 255
console.log(buf.readUInt16BE(1))    // 65535
console.log(buf.readUInt16LE(3))    // 65535
console.log(buf.readUInt32BE(5))    // 4294967295
console.log(buf.readUInt32LE(9))    // 4294967295

// Signed integers
const signedBuf = Buffer.alloc(8)
signedBuf.writeInt8(-128, 0)        // -128 to 127
signedBuf.writeInt16BE(-32768, 1)   // -32768 to 32767
signedBuf.writeInt16LE(-32768, 3)
signedBuf.writeInt32BE(-2147483648, 4)

console.log(signedBuf.readInt8(0))      // -128
console.log(signedBuf.readInt16BE(1))   // -32768
```

### BigInt Operations

```javascript
const bigBuf = Buffer.alloc(16)

// 64-bit integers (BigInt)
bigBuf.writeBigUInt64BE(BigInt('18446744073709551615'), 0)  // Max uint64
bigBuf.writeBigUInt64LE(BigInt('18446744073709551615'), 8)

console.log(bigBuf.readBigUInt64BE(0))  // 18446744073709551615n
console.log(bigBuf.readBigUInt64LE(8))  // 18446744073709551615n

// Signed 64-bit
const signedBigBuf = Buffer.alloc(8)
signedBigBuf.writeBigInt64BE(BigInt('-9223372036854775808'), 0)

console.log(signedBigBuf.readBigInt64BE(0))  // -9223372036854775808n
```

### Floating Point Operations

```javascript
const floatBuf = Buffer.alloc(12)

// Float (32-bit, ~7 significant digits)
floatBuf.writeFloatBE(3.14159, 0)
floatBuf.writeFloatLE(3.14159, 4)

console.log(floatBuf.readFloatBE(0))  // 3.141590118408203
console.log(floatBuf.readFloatLE(4))  // 3.141590118408203

// Double (64-bit, ~16 significant digits)
const doubleBuf = Buffer.alloc(16)
doubleBuf.writeDoubleBE(Math.PI, 0)
doubleBuf.writeDoubleLE(Math.PI, 8)

console.log(doubleBuf.readDoubleBE(0))  // 3.141592653589793
console.log(doubleBuf.readDoubleLE(8))  // 3.141592653589793
```

### Variable-Length Integers

```javascript
// Read/write integers of any byte length (up to 6 bytes)
const varBuf = Buffer.alloc(8)

// 3-byte integer (24-bit)
varBuf.writeUIntBE(16777215, 0, 3)  // Max 24-bit value
varBuf.writeUIntLE(16777215, 3, 3)

console.log(varBuf.readUIntBE(0, 3))  // 16777215
console.log(varBuf.readUIntLE(3, 3))  // 16777215

// 5-byte integer (40-bit)
varBuf.writeIntBE(-549755813887, 0, 5)  // Signed

console.log(varBuf.readIntBE(0, 5))  // -549755813887
```

### Practical Numeric Examples

```javascript
// Binary protocol parsing
function parseHeader(buf) {
  return {
    version: buf.readUInt8(0),
    flags: buf.readUInt8(1),
    length: buf.readUInt16BE(2),
    timestamp: Number(buf.readBigUInt64BE(4)),
    checksum: buf.readUInt32BE(12)
  }
}

function createHeader(data) {
  const buf = Buffer.alloc(16)
  buf.writeUInt8(data.version, 0)
  buf.writeUInt8(data.flags, 1)
  buf.writeUInt16BE(data.length, 2)
  buf.writeBigUInt64BE(BigInt(data.timestamp), 4)
  buf.writeUInt32BE(data.checksum, 12)
  return buf
}

// Network byte order (always Big Endian)
function createNetworkPacket(payload) {
  const header = Buffer.alloc(8)
  header.writeUInt32BE(0x4E455450, 0)  // Magic number "NETP"
  header.writeUInt32BE(payload.length, 4)

  return Buffer.concat([header, payload])
}

function parseNetworkPacket(buf) {
  const magic = buf.readUInt32BE(0)
  if (magic !== 0x4E455450) {
    throw new Error('Invalid packet magic number')
  }

  const payloadLength = buf.readUInt32BE(4)
  const payload = buf.subarray(8, 8 + payloadLength)

  return { magic, payloadLength, payload }
}
```

## Iteration Patterns

### Built-in Iterators

```javascript
const buf = Buffer.from('Hello')

// Iterator over bytes
for (const byte of buf) {
  console.log(byte)  // 72, 101, 108, 108, 111
}

// Values iterator (same as default)
for (const byte of buf.values()) {
  console.log(byte)
}

// Keys iterator (indices)
for (const index of buf.keys()) {
  console.log(index)  // 0, 1, 2, 3, 4
}

// Entries iterator (index, value pairs)
for (const [index, byte] of buf.entries()) {
  console.log(`${index}: ${byte}`)  // "0: 72", "1: 101", ...
}

// Spread into array
const bytes = [...buf]  // [72, 101, 108, 108, 111]

// Array.from with mapping
const hexBytes = Array.from(buf, b => b.toString(16).padStart(2, '0'))
// ['48', '65', '6c', '6c', '6f']
```

### Custom Iteration

```javascript
// Iterate over chunks
function* iterateChunks(buf, chunkSize) {
  for (let i = 0; i < buf.length; i += chunkSize) {
    yield buf.subarray(i, Math.min(i + chunkSize, buf.length))
  }
}

const largeBuf = Buffer.alloc(1000)
for (const chunk of iterateChunks(largeBuf, 256)) {
  console.log('Chunk size:', chunk.length)
}

// Iterate over 16-bit values
function* iterateUInt16BE(buf) {
  for (let i = 0; i < buf.length - 1; i += 2) {
    yield buf.readUInt16BE(i)
  }
}

const numBuf = Buffer.from([0x00, 0x01, 0x00, 0x02, 0x00, 0x03])
for (const value of iterateUInt16BE(numBuf)) {
  console.log(value)  // 1, 2, 3
}

// Iterate over null-terminated strings
function* iterateStrings(buf) {
  let start = 0
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0) {
      if (i > start) {
        yield buf.subarray(start, i).toString()
      }
      start = i + 1
    }
  }
  if (start < buf.length) {
    yield buf.subarray(start).toString()
  }
}

const stringBuf = Buffer.from('hello\0world\0foo\0')
for (const str of iterateStrings(stringBuf)) {
  console.log(str)  // "hello", "world", "foo"
}
```

### Async Buffer Iteration

```javascript
const { Readable } = require('stream')

// Create readable stream from buffer with async iteration
async function* asyncBufferChunks(buf, chunkSize) {
  for (let i = 0; i < buf.length; i += chunkSize) {
    await new Promise(r => setImmediate(r))  // Yield to event loop
    yield buf.subarray(i, Math.min(i + chunkSize, buf.length))
  }
}

// Process large buffer without blocking
async function processLargeBuffer(buf) {
  for await (const chunk of asyncBufferChunks(buf, 64 * 1024)) {
    await processChunk(chunk)
  }
}

// Stream to buffer with async iteration
async function streamToBuffer(stream) {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}
```

## Binary Data Handling

### Bit Manipulation

```javascript
// Bit flags
const flags = Buffer.alloc(1)

// Set individual bits
function setBit(buf, offset, bit) {
  buf[offset] |= (1 << bit)
}

function clearBit(buf, offset, bit) {
  buf[offset] &= ~(1 << bit)
}

function toggleBit(buf, offset, bit) {
  buf[offset] ^= (1 << bit)
}

function getBit(buf, offset, bit) {
  return (buf[offset] >> bit) & 1
}

setBit(flags, 0, 0)    // Set bit 0
setBit(flags, 0, 2)    // Set bit 2
console.log(flags[0].toString(2))  // "101" (5)

console.log(getBit(flags, 0, 0))  // 1
console.log(getBit(flags, 0, 1))  // 0
console.log(getBit(flags, 0, 2))  // 1

// Bit field extraction
function extractBits(value, start, count) {
  const mask = (1 << count) - 1
  return (value >> start) & mask
}

// Pack multiple values into byte
function packByte(a, b, c) {
  // a: 2 bits, b: 3 bits, c: 3 bits
  return ((a & 0x03) << 6) | ((b & 0x07) << 3) | (c & 0x07)
}

function unpackByte(value) {
  return {
    a: (value >> 6) & 0x03,
    b: (value >> 3) & 0x07,
    c: value & 0x07
  }
}
```

### Binary Protocols

```javascript
// Simple TLV (Type-Length-Value) parser
class TLVParser {
  static encode(type, value) {
    const valueBuffer = Buffer.isBuffer(value) ? value : Buffer.from(value)
    const tlv = Buffer.alloc(2 + 2 + valueBuffer.length)

    tlv.writeUInt16BE(type, 0)
    tlv.writeUInt16BE(valueBuffer.length, 2)
    valueBuffer.copy(tlv, 4)

    return tlv
  }

  static decode(buf) {
    const type = buf.readUInt16BE(0)
    const length = buf.readUInt16BE(2)
    const value = buf.subarray(4, 4 + length)

    return { type, length, value }
  }

  static* parseStream(buf) {
    let offset = 0
    while (offset < buf.length - 4) {
      const type = buf.readUInt16BE(offset)
      const length = buf.readUInt16BE(offset + 2)
      const value = buf.subarray(offset + 4, offset + 4 + length)

      yield { type, length, value }
      offset += 4 + length
    }
  }
}

// Usage
const tlv1 = TLVParser.encode(0x0001, 'Hello')
const tlv2 = TLVParser.encode(0x0002, 'World')
const stream = Buffer.concat([tlv1, tlv2])

for (const { type, value } of TLVParser.parseStream(stream)) {
  console.log(`Type: ${type}, Value: ${value.toString()}`)
}
```

### Struct-like Binary Data

```javascript
// Define struct layout
class BinaryStruct {
  constructor(layout) {
    this.layout = layout
    this.size = 0

    for (const [name, type] of Object.entries(layout)) {
      const [typeName, size] = this.getTypeInfo(type)
      this.layout[name] = { type: typeName, size, offset: this.size }
      this.size += size
    }
  }

  getTypeInfo(type) {
    const types = {
      'uint8': ['UInt8', 1],
      'int8': ['Int8', 1],
      'uint16be': ['UInt16BE', 2],
      'uint16le': ['UInt16LE', 2],
      'uint32be': ['UInt32BE', 4],
      'uint32le': ['UInt32LE', 4],
      'float': ['FloatBE', 4],
      'double': ['DoubleBE', 8]
    }
    return types[type] || [type, parseInt(type.match(/\d+/)?.[0]) || 1]
  }

  encode(obj) {
    const buf = Buffer.alloc(this.size)

    for (const [name, { type, offset }] of Object.entries(this.layout)) {
      if (obj[name] !== undefined) {
        const method = `write${type}`
        if (buf[method]) {
          buf[method](obj[name], offset)
        }
      }
    }

    return buf
  }

  decode(buf) {
    const obj = {}

    for (const [name, { type, offset }] of Object.entries(this.layout)) {
      const method = `read${type}`
      if (buf[method]) {
        obj[name] = buf[method](offset)
      }
    }

    return obj
  }
}

// Usage
const PacketHeader = new BinaryStruct({
  version: 'uint8',
  flags: 'uint8',
  length: 'uint16be',
  sequence: 'uint32be',
  timestamp: 'double'
})

const header = PacketHeader.encode({
  version: 1,
  flags: 0x0F,
  length: 1024,
  sequence: 12345,
  timestamp: Date.now()
})

console.log(PacketHeader.decode(header))
```

## Memory Management

### Buffer Pooling

```javascript
class BufferPool {
  constructor(bufferSize, poolSize = 10) {
    this.bufferSize = bufferSize
    this.pool = []
    this.inUse = new Set()

    // Pre-allocate buffers
    for (let i = 0; i < poolSize; i++) {
      this.pool.push(Buffer.allocUnsafe(bufferSize))
    }
  }

  acquire() {
    let buf = this.pool.pop()

    if (!buf) {
      // Pool exhausted, create new buffer
      buf = Buffer.allocUnsafe(this.bufferSize)
    }

    this.inUse.add(buf)
    return buf
  }

  release(buf) {
    if (!this.inUse.has(buf)) {
      throw new Error('Buffer not from this pool')
    }

    this.inUse.delete(buf)
    buf.fill(0)  // Clear sensitive data
    this.pool.push(buf)
  }

  get stats() {
    return {
      available: this.pool.length,
      inUse: this.inUse.size,
      bufferSize: this.bufferSize
    }
  }
}

// Usage
const pool = new BufferPool(4096, 5)

const buf1 = pool.acquire()
const buf2 = pool.acquire()

// Use buffers...

pool.release(buf1)
pool.release(buf2)
```

### Zero-Copy Operations

```javascript
// Share memory between buffers (zero-copy)
const original = Buffer.from('Hello, World!')

// subarray creates a view, not a copy
const view = original.subarray(0, 5)
view[0] = 74  // 'J'

console.log(original.toString())  // "Jello, World!"

// slice also creates a view (same as subarray)
const slice = original.slice(7, 12)
console.log(slice.toString())  // "World"

// To create a copy, use Buffer.from() or copy()
const copy = Buffer.from(original)
copy[0] = 72  // 'H'
console.log(original.toString())  // "Jello, World!" (unchanged)
console.log(copy.toString())       // "Hello, World!"

// TypedArray views share memory
const buf = Buffer.alloc(8)
const uint32View = new Uint32Array(buf.buffer, buf.byteOffset, 2)

uint32View[0] = 0x12345678
console.log(buf.readUInt32LE(0).toString(16))  // "12345678"

// Be aware of byte order!
uint32View[1] = 0xDEADBEEF
console.log(buf.toString('hex'))  // "78563412efbeadde" (Little Endian)
```

### Memory-Efficient String Handling

```javascript
// Avoid creating intermediate strings
function processLargeBuffer(buf) {
  // Bad: Creates string in memory
  // const str = buf.toString()
  // if (str.includes('error')) { ... }

  // Good: Search in buffer directly
  const searchTerm = Buffer.from('error')
  if (buf.includes(searchTerm)) {
    // Found
  }
}

// Stream processing without accumulating
const { Transform } = require('stream')

class LineProcessor extends Transform {
  constructor() {
    super()
    this.remainder = Buffer.alloc(0)
  }

  _transform(chunk, encoding, callback) {
    const data = Buffer.concat([this.remainder, chunk])
    let start = 0

    for (let i = 0; i < data.length; i++) {
      if (data[i] === 0x0A) {  // newline
        const line = data.subarray(start, i)
        this.processLine(line)
        start = i + 1
      }
    }

    this.remainder = data.subarray(start)
    callback()
  }

  processLine(line) {
    // Process without converting to string if possible
    if (line.includes(Buffer.from('ERROR'))) {
      console.log('Error line:', line.toString())
    }
  }
}
```

## TypedArray Interoperability

### Converting Between Buffer and TypedArray

```javascript
// Buffer to TypedArray
const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8])

// Uint8Array view (shares memory)
const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.length)

// Int16Array view
const int16 = new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2)

// Float32Array view
const float32 = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4)

// TypedArray to Buffer (shares memory)
const typedArray = new Uint16Array([1, 2, 3, 4])
const bufFromTyped = Buffer.from(typedArray.buffer)

// DataView for mixed types
const dataView = new DataView(buf.buffer, buf.byteOffset, buf.length)
dataView.setUint16(0, 0x1234, false)  // Big Endian
dataView.setFloat32(2, 3.14, true)     // Little Endian
```

### ArrayBuffer Operations

```javascript
// Create Buffer from ArrayBuffer
const arrayBuffer = new ArrayBuffer(16)
const buf = Buffer.from(arrayBuffer)

// Create Buffer from shared ArrayBuffer
const sharedArrayBuffer = new SharedArrayBuffer(16)
const sharedBuf = Buffer.from(sharedArrayBuffer)

// Access underlying ArrayBuffer
const originalBuf = Buffer.alloc(16)
const underlyingArrayBuffer = originalBuf.buffer

// Note: buffer.buffer may not start at offset 0
// Always use byteOffset
console.log(originalBuf.byteOffset)  // Usually 0, but not guaranteed
```

## Express Integration

```javascript
const express = require('express')
const app = express()

// Parse binary body without conversion
app.use((req, res, next) => {
  if (req.is('application/octet-stream')) {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => {
      req.body = Buffer.concat(chunks)
      next()
    })
  } else {
    next()
  }
})

// Binary protocol endpoint
app.post('/binary', (req, res) => {
  const buf = req.body

  // Parse header
  const version = buf.readUInt8(0)
  const command = buf.readUInt16BE(1)
  const payloadLength = buf.readUInt32BE(3)
  const payload = buf.subarray(7, 7 + payloadLength)

  // Create response
  const response = Buffer.alloc(8)
  response.writeUInt8(version, 0)
  response.writeUInt16BE(0x0001, 1)  // ACK command
  response.writeUInt32BE(0, 3)       // No payload
  response.writeUInt8(0x00, 7)       // Success status

  res.type('application/octet-stream')
  res.send(response)
})

// Efficient file hash
const crypto = require('crypto')
const fs = require('fs')

app.get('/file-hash/:filename', async (req, res) => {
  const hash = crypto.createHash('sha256')
  const stream = fs.createReadStream(`./files/${req.params.filename}`)

  for await (const chunk of stream) {
    hash.update(chunk)
  }

  res.json({ hash: hash.digest('hex') })
})

app.listen(3000)
```

## Performance Tips

```javascript
// 1. Use allocUnsafe when you'll overwrite all bytes
const fastBuf = Buffer.allocUnsafe(1024)
// Fill immediately to avoid leaking old memory
fastBuf.fill(0)

// 2. Reuse buffers when possible
const reusableBuf = Buffer.alloc(4096)
function processData(data) {
  data.copy(reusableBuf)
  // Process reusableBuf
  return reusableBuf.subarray(0, data.length)
}

// 3. Use subarray instead of slice (identical, clearer intent)
const view = buf.subarray(0, 100)  // No copy

// 4. Avoid unnecessary string conversions
// Bad
const str = buf.toString()
if (str.startsWith('HEAD')) { }

// Good
if (buf[0] === 72 && buf[1] === 69 && buf[2] === 65 && buf[3] === 68) { }
// Or use buf.indexOf() / buf.includes()

// 5. Pre-allocate for known sizes
const header = Buffer.allocUnsafe(16)
header.writeUInt32BE(type, 0)
header.writeUInt32BE(length, 4)
// ... faster than multiple Buffer.alloc calls

// 6. Use Buffer.concat efficiently
// Bad: repeated concat
let result = Buffer.alloc(0)
for (const chunk of chunks) {
  result = Buffer.concat([result, chunk])
}

// Good: single concat
const result = Buffer.concat(chunks)

// 7. Use streams for large data
// Instead of loading entire file into buffer
const stream = fs.createReadStream('large-file.bin')
for await (const chunk of stream) {
  await processChunk(chunk)
}
```

## Related Topics

- [Stream Module Advanced](../stream-module/ADVANCED_TOPICS.md)
- [HTTP Module](../http-module/README.md)
- [Crypto Operations](../../advanced/security/README.md)
