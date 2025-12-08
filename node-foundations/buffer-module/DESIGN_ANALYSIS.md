# Buffer Module Design Analysis

## Why Buffers?

JavaScript strings are UTF-16 encoded, but binary data (files, network packets) needs raw bytes. Buffers provide:

1. **Fixed-size memory allocation**
2. **Direct byte manipulation**
3. **Efficient binary handling**
4. **Encoding/decoding support**

## Memory Model

```
Buffer: [0x48, 0x65, 0x6C, 0x6C, 0x6F]  // "Hello"
         │     │     │     │     │
         0     1     2     3     4    (indices)
         ▲
         └─ Each element is a byte (0-255)
```

## alloc vs allocUnsafe

```javascript
// alloc: Zero-filled, slower
Buffer.alloc(100)  // All zeros

// allocUnsafe: Uninitialized, faster
Buffer.allocUnsafe(100)  // May contain old data!

// Use allocUnsafe only when:
// 1. You'll immediately overwrite all bytes
// 2. Performance is critical
// 3. NOT handling sensitive data
```

## Slice Shares Memory

```javascript
const original = Buffer.from('Hello World')
const slice = original.slice(0, 5)

slice[0] = 0x4A  // 'J'

original.toString()  // 'Jello World'
slice.toString()     // 'Jello'

// Use .subarray() (same behavior) or copy if isolation needed
```

## Buffer Pool

Node.js maintains a buffer pool for small allocations:

```javascript
// Small buffers (<= 4KB by default) share pool memory
const small1 = Buffer.from('hello')
const small2 = Buffer.from('world')
// May be adjacent in same pool

// Large buffers get dedicated allocation
const large = Buffer.alloc(1024 * 1024)
```

## TypedArrays Relationship

Buffers are `Uint8Array` subclasses:

```javascript
const buf = Buffer.from('Hello')

buf instanceof Uint8Array  // true
buf instanceof Buffer      // true

// Can use Uint8Array methods
buf.map(b => b + 1)
```

## Key Takeaways

1. **Buffers are for binary data** not text manipulation
2. **alloc() for safety**, allocUnsafe() for speed
3. **slice() shares memory** - use copy() for isolation
4. **toString() decodes** - specify encoding if needed
5. **Security**: Clear sensitive buffers, use timingSafeEqual()

---

*Understanding buffers is essential for efficient binary data handling.*
