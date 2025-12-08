# FS Module

The `fs` (file system) module provides APIs for interacting with the file system. Express uses it for static file serving, file uploads, and reading configuration.

## Overview

The fs module provides synchronous, callback-based, and promise-based methods for file operations. For Express applications, prefer async methods to avoid blocking the event loop.

## Express Connection

```javascript
const express = require('express')
const fs = require('fs')
const path = require('path')
const app = express()

// express.static uses fs internally
app.use(express.static(path.join(__dirname, 'public')))

// Read config file
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'))

// Stream large file downloads
app.get('/download/:file', (req, res) => {
  const stream = fs.createReadStream(`./files/${req.params.file}`)
  stream.pipe(res)
})
```

## API Styles

### Callback Style (Original)

```javascript
const fs = require('fs')

fs.readFile('./file.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('Error:', err)
    return
  }
  console.log(data)
})
```

### Promise Style (Recommended)

```javascript
const fs = require('fs').promises
// Or: const { readFile } = require('fs/promises')

async function readConfig() {
  try {
    const data = await fs.readFile('./config.json', 'utf8')
    return JSON.parse(data)
  } catch (err) {
    console.error('Error:', err)
    throw err
  }
}
```

### Synchronous Style (Startup Only)

```javascript
const fs = require('fs')

// OK for startup/initialization
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'))

// AVOID in request handlers - blocks event loop!
app.get('/data', (req, res) => {
  const data = fs.readFileSync('./data.json')  // BAD!
  res.json(data)
})
```

## Common Operations

### Reading Files

```javascript
const fs = require('fs').promises

// Read as string
const text = await fs.readFile('./file.txt', 'utf8')

// Read as buffer
const buffer = await fs.readFile('./image.png')

// Read JSON
const config = JSON.parse(await fs.readFile('./config.json', 'utf8'))
```

### Writing Files

```javascript
const fs = require('fs').promises

// Write string
await fs.writeFile('./output.txt', 'Hello World', 'utf8')

// Write JSON
await fs.writeFile('./data.json', JSON.stringify(data, null, 2))

// Append to file
await fs.appendFile('./log.txt', 'New log entry\n')
```

### Directory Operations

```javascript
const fs = require('fs').promises

// Create directory
await fs.mkdir('./uploads', { recursive: true })

// Read directory contents
const files = await fs.readdir('./uploads')

// Read with file types
const entries = await fs.readdir('./uploads', { withFileTypes: true })
entries.forEach(entry => {
  console.log(entry.name, entry.isDirectory() ? 'DIR' : 'FILE')
})

// Remove directory
await fs.rmdir('./temp')
await fs.rm('./temp', { recursive: true, force: true })  // Node 14+
```

### File Information

```javascript
const fs = require('fs').promises

const stats = await fs.stat('./file.txt')
console.log({
  size: stats.size,
  isFile: stats.isFile(),
  isDirectory: stats.isDirectory(),
  created: stats.birthtime,
  modified: stats.mtime
})

// Check if file exists
async function exists(path) {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}
```

### File Streams

```javascript
const fs = require('fs')

// Read stream (for large files)
const readStream = fs.createReadStream('./large-file.txt', {
  encoding: 'utf8',
  highWaterMark: 64 * 1024  // 64KB chunks
})

readStream.on('data', chunk => console.log('Chunk:', chunk.length))
readStream.on('end', () => console.log('Done'))

// Write stream
const writeStream = fs.createWriteStream('./output.txt')
writeStream.write('Hello ')
writeStream.write('World')
writeStream.end()

// Pipe streams
fs.createReadStream('./input.txt')
  .pipe(fs.createWriteStream('./output.txt'))
```

### Watching Files

```javascript
const fs = require('fs')

// Watch file for changes
fs.watch('./config.json', (eventType, filename) => {
  console.log(`${filename} ${eventType}`)
})

// Watch directory
const watcher = fs.watch('./uploads', { recursive: true }, (event, filename) => {
  console.log(`${event}: ${filename}`)
})

// Stop watching
watcher.close()
```

## Express.js Patterns

### Static File Server

```javascript
const express = require('express')
const fs = require('fs').promises
const path = require('path')
const app = express()

// Custom static file handler
app.get('/files/:filename', async (req, res) => {
  const filePath = path.join(__dirname, 'public', req.params.filename)

  try {
    const stats = await fs.stat(filePath)

    if (!stats.isFile()) {
      return res.status(404).send('Not found')
    }

    res.setHeader('Content-Length', stats.size)
    fs.createReadStream(filePath).pipe(res)
  } catch (err) {
    res.status(404).send('Not found')
  }
})
```

### File Upload Handling

```javascript
const express = require('express')
const fs = require('fs').promises
const path = require('path')
const multer = require('multer')

const app = express()
const upload = multer({ dest: 'uploads/' })

app.post('/upload', upload.single('file'), async (req, res) => {
  const tempPath = req.file.path
  const targetPath = path.join(__dirname, 'uploads', req.file.originalname)

  try {
    await fs.rename(tempPath, targetPath)
    res.json({ message: 'File uploaded', filename: req.file.originalname })
  } catch (err) {
    await fs.unlink(tempPath)  // Clean up temp file
    res.status(500).json({ error: 'Upload failed' })
  }
})
```

### Configuration Loading

```javascript
const fs = require('fs')
const path = require('path')

function loadConfig() {
  const env = process.env.NODE_ENV || 'development'
  const configPath = path.join(__dirname, 'config', `${env}.json`)

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch (err) {
    console.error(`Failed to load config: ${configPath}`)
    return {}
  }
}

const config = loadConfig()
```

## Error Handling

```javascript
const fs = require('fs').promises

async function safeReadFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch (err) {
    switch (err.code) {
      case 'ENOENT':
        throw new Error('File not found')
      case 'EACCES':
        throw new Error('Permission denied')
      case 'EISDIR':
        throw new Error('Path is a directory')
      default:
        throw err
    }
  }
}
```

## Security Considerations

```javascript
const fs = require('fs').promises
const path = require('path')

// Prevent path traversal
async function safeReadFile(baseDir, userPath) {
  const fullPath = path.resolve(baseDir, userPath)
  const basePath = path.resolve(baseDir)

  if (!fullPath.startsWith(basePath + path.sep)) {
    throw new Error('Access denied')
  }

  return fs.readFile(fullPath)
}
```

## Related Modules

- [path](../path-module/) - Path manipulation
- [stream](../stream-module/) - File streams

## Next Steps

1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md) for deeper insights
2. Test your knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Move to [url-module](../url-module/)

---

*The fs module is essential for any application that works with files.*
