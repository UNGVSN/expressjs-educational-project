# express.raw()

Parses incoming request bodies as a Buffer. Useful for handling binary data, webhooks with signature verification, or custom content types.

## Overview

```javascript
const express = require('express')
const app = express()

// Parse raw bodies
app.use(express.raw())

app.post('/webhook', (req, res) => {
  console.log(req.body)  // Buffer
  console.log(req.body.toString())  // String representation
  res.send('OK')
})
```

## Options

```javascript
app.use(express.raw({
  inflate: true,                   // Handle compressed bodies
  limit: '100kb',                  // Max body size
  type: 'application/octet-stream', // Content-Type to parse
  verify: undefined                // Verification function
}))
```

### inflate

```javascript
// Handle deflate/gzip compressed bodies
app.use(express.raw({ inflate: true }))  // Default: true
```

### limit

```javascript
// String format
app.use(express.raw({ limit: '1mb' }))

// Number format (bytes)
app.use(express.raw({ limit: 1048576 }))  // 1MB
```

### type

```javascript
// Default: application/octet-stream only
app.use(express.raw())

// Parse any content type as raw
app.use(express.raw({ type: '*/*' }))

// Specific types
app.use(express.raw({ type: 'application/octet-stream' }))
app.use(express.raw({ type: 'image/*' }))

// Multiple types
app.use(express.raw({
  type: ['application/octet-stream', 'application/pdf']
}))

// Function for dynamic matching
app.use(express.raw({
  type: (req) => req.headers['x-raw-body'] === 'true'
}))
```

### verify

```javascript
// Verify raw body before accepting
app.use(express.raw({
  verify: (req, res, buf, encoding) => {
    // buf is the raw Buffer
    if (buf.length > 500000) {
      throw new Error('Request too large')
    }
  }
}))
```

## Common Use Cases

### Webhook Signature Verification

Most webhook providers (Stripe, GitHub, Slack) require verifying a signature using the raw request body.

```javascript
// Stripe webhook
app.post('/webhook/stripe',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['stripe-signature']
    const rawBody = req.body  // Buffer

    try {
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        endpointSecret
      )

      // Handle event
      switch (event.type) {
        case 'payment_intent.succeeded':
          // Handle successful payment
          break
      }

      res.json({ received: true })
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`)
    }
  }
)
```

### GitHub Webhook

```javascript
const crypto = require('crypto')

app.post('/webhook/github',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-hub-signature-256']
    const rawBody = req.body

    // Verify signature
    const hmac = crypto.createHmac('sha256', process.env.GITHUB_SECRET)
    const digest = 'sha256=' + hmac.update(rawBody).digest('hex')

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
      return res.status(401).send('Invalid signature')
    }

    // Parse and handle
    const payload = JSON.parse(rawBody.toString())
    console.log('GitHub event:', req.headers['x-github-event'])
    console.log('Payload:', payload)

    res.send('OK')
  }
)
```

### Binary File Upload

```javascript
const fs = require('fs')
const path = require('path')

app.post('/upload/binary',
  express.raw({ type: '*/*', limit: '50mb' }),
  (req, res) => {
    const filename = req.headers['x-filename'] || 'upload.bin'
    const filepath = path.join(__dirname, 'uploads', filename)

    fs.writeFile(filepath, req.body, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to save file' })
      }
      res.json({
        message: 'File saved',
        size: req.body.length,
        filename
      })
    })
  }
)
```

### Image Processing

```javascript
const sharp = require('sharp')

app.post('/images/resize',
  express.raw({ type: 'image/*', limit: '10mb' }),
  async (req, res) => {
    try {
      const resized = await sharp(req.body)
        .resize(200, 200)
        .jpeg({ quality: 80 })
        .toBuffer()

      res.set('Content-Type', 'image/jpeg')
      res.send(resized)
    } catch (err) {
      res.status(400).json({ error: 'Invalid image' })
    }
  }
)
```

### Custom Protocol Handling

```javascript
// Handle custom binary protocol
app.post('/api/custom-protocol',
  express.raw({ type: 'application/x-custom-protocol' }),
  (req, res) => {
    const buffer = req.body

    // Parse custom protocol
    const version = buffer.readUInt8(0)
    const messageType = buffer.readUInt8(1)
    const payloadLength = buffer.readUInt16BE(2)
    const payload = buffer.slice(4, 4 + payloadLength)

    console.log({ version, messageType, payload: payload.toString() })

    // Respond with binary
    const response = Buffer.alloc(4)
    response.writeUInt8(1, 0)  // status: OK
    response.writeUInt8(messageType, 1)  // echo message type
    response.writeUInt16BE(0, 2)  // no payload

    res.set('Content-Type', 'application/x-custom-protocol')
    res.send(response)
  }
)
```

## Combining with JSON Parser

```javascript
// For webhooks that need both raw body for verification
// and parsed JSON for handling

// Method 1: Store raw body during JSON parsing
app.use('/webhook', express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf
  }
}))

app.post('/webhook', (req, res) => {
  // req.rawBody - Buffer for signature verification
  // req.body - Parsed JSON object
})

// Method 2: Use raw parser, manually parse JSON
app.post('/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const rawBody = req.body  // Buffer for verification
    const jsonBody = JSON.parse(req.body.toString())  // Parsed
  }
)
```

## Route-Specific Usage

```javascript
// Don't use globally - only where needed
// Global JSON parsing
app.use(express.json())

// Raw parsing only for webhooks
app.use('/webhook', express.raw({ type: 'application/json' }))

// Normal routes use parsed JSON
app.post('/api/data', (req, res) => {
  console.log(req.body)  // Parsed JSON object
})

// Webhook route gets raw buffer
app.post('/webhook', (req, res) => {
  console.log(req.body)  // Buffer
})
```

## Performance Considerations

```javascript
// 1. Set appropriate size limits
app.use(express.raw({ limit: '5mb' }))  // Don't allow unlimited

// 2. Only use where needed
app.use('/webhook', express.raw())  // Not globally

// 3. Stream large files instead
const busboy = require('busboy')
app.post('/upload/large', (req, res) => {
  const bb = busboy({ headers: req.headers })
  bb.on('file', (name, file, info) => {
    file.pipe(fs.createWriteStream(`uploads/${info.filename}`))
  })
  req.pipe(bb)
})
```

## Related

- [express-json](../express-json/) - JSON body parsing
- [express-text](../express-text/) - Text body parsing
- [multer](../../third-party/multer/) - File upload handling

---

*express.raw() is essential for webhook signature verification and binary data handling.*
