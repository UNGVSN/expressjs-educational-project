# express.text()

Parses incoming request bodies as plain text strings. Useful for handling text-based content types like plain text, XML, or custom text formats.

## Overview

```javascript
const express = require('express')
const app = express()

// Parse text bodies
app.use(express.text())

app.post('/text', (req, res) => {
  console.log(req.body)  // String
  console.log(typeof req.body)  // 'string'
  res.send('Received')
})
```

## Options

```javascript
app.use(express.text({
  defaultCharset: 'utf-8',  // Default charset
  inflate: true,            // Handle compressed bodies
  limit: '100kb',           // Max body size
  type: 'text/plain',       // Content-Type to parse
  verify: undefined         // Verification function
}))
```

### defaultCharset

```javascript
// Default charset when not specified in Content-Type
app.use(express.text({
  defaultCharset: 'utf-8'  // Default
  // defaultCharset: 'iso-8859-1'
}))
```

### limit

```javascript
// String format
app.use(express.text({ limit: '100kb' }))
app.use(express.text({ limit: '1mb' }))

// Number format (bytes)
app.use(express.text({ limit: 102400 }))  // 100KB
```

### type

```javascript
// Default: text/plain only
app.use(express.text())

// XML content
app.use(express.text({ type: 'text/xml' }))
app.use(express.text({ type: 'application/xml' }))

// Multiple types
app.use(express.text({
  type: ['text/plain', 'text/xml', 'text/html']
}))

// All text types
app.use(express.text({ type: 'text/*' }))

// Function for dynamic matching
app.use(express.text({
  type: (req) => req.headers['content-type']?.startsWith('text/')
}))
```

### verify

```javascript
// Verify body before accepting
app.use(express.text({
  verify: (req, res, buf, encoding) => {
    // Check for malicious content
    const text = buf.toString(encoding)
    if (text.includes('<script>')) {
      throw new Error('Invalid content')
    }
  }
}))
```

## Common Use Cases

### Plain Text API

```javascript
app.use('/text', express.text())

app.post('/text/analyze', (req, res) => {
  const text = req.body

  const analysis = {
    length: text.length,
    words: text.split(/\s+/).length,
    lines: text.split('\n').length
  }

  res.json(analysis)
})
```

### XML Handling

```javascript
const xml2js = require('xml2js')

app.use('/xml', express.text({ type: 'text/xml' }))

app.post('/xml/parse', async (req, res) => {
  try {
    const result = await xml2js.parseStringPromise(req.body)
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: 'Invalid XML' })
  }
})
```

### CSV Import

```javascript
const csv = require('csv-parse/sync')

app.post('/import/csv',
  express.text({ type: 'text/csv', limit: '10mb' }),
  (req, res) => {
    try {
      const records = csv.parse(req.body, {
        columns: true,
        skip_empty_lines: true
      })

      res.json({
        imported: records.length,
        records
      })
    } catch (err) {
      res.status(400).json({ error: 'Invalid CSV' })
    }
  }
)
```

### Markdown Processing

```javascript
const marked = require('marked')

app.post('/markdown/render',
  express.text({ type: 'text/markdown' }),
  (req, res) => {
    const html = marked.parse(req.body)
    res.type('html').send(html)
  }
)
```

### Log Ingestion

```javascript
app.post('/logs',
  express.text({ type: 'text/plain', limit: '1mb' }),
  (req, res) => {
    const logs = req.body.split('\n').filter(Boolean)

    logs.forEach(log => {
      // Parse and store each log line
      const [timestamp, level, message] = log.split(' | ')
      storeLog({ timestamp, level, message })
    })

    res.json({ processed: logs.length })
  }
)
```

### Custom DSL Processing

```javascript
// Handle custom domain-specific language
app.post('/dsl/execute',
  express.text({ type: 'text/x-custom-dsl' }),
  (req, res) => {
    const commands = req.body.split('\n')
    const results = []

    for (const command of commands) {
      const [action, ...args] = command.trim().split(' ')

      switch (action) {
        case 'CREATE':
          results.push({ action, id: createItem(args[0]) })
          break
        case 'DELETE':
          results.push({ action, success: deleteItem(args[0]) })
          break
        default:
          results.push({ action, error: 'Unknown command' })
      }
    }

    res.json({ results })
  }
)
```

### SOAP Web Services

```javascript
app.post('/soap',
  express.text({ type: 'text/xml', limit: '1mb' }),
  async (req, res) => {
    // Parse SOAP envelope
    const soapBody = req.body

    // Extract operation and data from SOAP
    const operation = extractSoapOperation(soapBody)
    const data = extractSoapData(soapBody)

    // Process request
    const result = await processSoapRequest(operation, data)

    // Return SOAP response
    res.type('text/xml').send(`
      <?xml version="1.0"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <Response>${result}</Response>
        </soap:Body>
      </soap:Envelope>
    `)
  }
)
```

## Route-Specific Usage

```javascript
// Global JSON parsing
app.use(express.json())

// Text parsing only for specific routes
app.post('/text',
  express.text(),
  (req, res) => {
    console.log(req.body)  // String
  }
)

app.post('/xml',
  express.text({ type: 'text/xml' }),
  (req, res) => {
    console.log(req.body)  // XML string
  }
)

// Normal routes use JSON
app.post('/api/data', (req, res) => {
  console.log(req.body)  // Parsed JSON object
})
```

## Combining Parsers

```javascript
// Support multiple content types
app.use(express.json())  // application/json
app.use(express.text({ type: 'text/plain' }))  // text/plain
app.use(express.text({ type: 'text/xml' }))  // text/xml

app.post('/data', (req, res) => {
  const contentType = req.headers['content-type']

  if (contentType?.includes('json')) {
    // req.body is object
    res.json({ type: 'json', data: req.body })
  } else if (contentType?.includes('xml')) {
    // req.body is string
    res.json({ type: 'xml', data: parseXml(req.body) })
  } else {
    // req.body is string
    res.json({ type: 'text', data: req.body })
  }
})
```

## Charset Handling

```javascript
// Request with charset
// Content-Type: text/plain; charset=iso-8859-1

app.use(express.text())

app.post('/text', (req, res) => {
  // Body decoded using specified charset
  console.log(req.body)
})

// Force specific charset
app.use(express.text({
  defaultCharset: 'utf-8'  // Use UTF-8 when not specified
}))
```

## Related

- [express-json](../express-json/) - JSON body parsing
- [express-raw](../express-raw/) - Raw body parsing
- [express-urlencoded](../express-urlencoded/) - Form body parsing

---

*express.text() is useful for handling plain text, XML, CSV, and other text-based content types.*
