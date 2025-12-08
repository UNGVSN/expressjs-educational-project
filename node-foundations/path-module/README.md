# Path Module

The `path` module provides utilities for working with file and directory paths. It's essential for Express applications that serve static files, handle file uploads, or work with views.

## Overview

The `path` module helps manipulate file paths in a cross-platform way, handling differences between Windows (`\`) and POSIX (`/`) path separators automatically.

## Express Connection

```javascript
const express = require('express')
const path = require('path')
const app = express()

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')))

// Set views directory
app.set('views', path.join(__dirname, 'views'))

// Resolve uploaded file path
app.post('/upload', (req, res) => {
  const uploadPath = path.join(__dirname, 'uploads', req.file.filename)
})
```

## Core Methods

### path.join()

Joins path segments with the platform separator:

```javascript
const path = require('path')

path.join('/users', 'john', 'documents')
// POSIX: '/users/john/documents'
// Windows: '\\users\\john\\documents'

path.join('folder', '..', 'other')
// Returns: 'other' (.. is resolved)

path.join(__dirname, 'public', 'images')
// Joins current directory with subdirectories
```

### path.resolve()

Resolves segments into an absolute path:

```javascript
path.resolve('folder', 'file.txt')
// Returns absolute path from cwd: '/home/user/project/folder/file.txt'

path.resolve('/root', 'folder', 'file.txt')
// Returns: '/root/folder/file.txt'

path.resolve('/root', '/other', 'file.txt')
// Returns: '/other/file.txt' (starts over at absolute path)
```

### path.dirname(), path.basename(), path.extname()

Extract path components:

```javascript
const filePath = '/users/john/documents/report.pdf'

path.dirname(filePath)   // '/users/john/documents'
path.basename(filePath)  // 'report.pdf'
path.basename(filePath, '.pdf')  // 'report'
path.extname(filePath)   // '.pdf'
```

### path.parse() and path.format()

Parse and build paths:

```javascript
// Parse path into object
path.parse('/users/john/documents/report.pdf')
// {
//   root: '/',
//   dir: '/users/john/documents',
//   base: 'report.pdf',
//   ext: '.pdf',
//   name: 'report'
// }

// Build path from object
path.format({
  root: '/',
  dir: '/users/john',
  base: 'file.txt'
})
// Returns: '/users/john/file.txt'
```

### path.normalize()

Normalizes path by resolving `..` and `.`:

```javascript
path.normalize('/users/john/../jane/./documents')
// Returns: '/users/jane/documents'

path.normalize('folder//subfolder///file.txt')
// Returns: 'folder/subfolder/file.txt'
```

### path.relative()

Returns relative path between two paths:

```javascript
path.relative('/data/users', '/data/images/photo.jpg')
// Returns: '../images/photo.jpg'

path.relative('/a/b/c', '/a/b/c/d/e')
// Returns: 'd/e'
```

### path.isAbsolute()

Checks if path is absolute:

```javascript
path.isAbsolute('/users/john')  // true
path.isAbsolute('./relative')   // false
path.isAbsolute('file.txt')     // false

// Windows
path.isAbsolute('C:\\users')    // true
path.isAbsolute('\\\\server')   // true
```

## Platform Differences

### path.sep and path.delimiter

```javascript
// Path separator
path.sep  // '/' on POSIX, '\\' on Windows

// Path delimiter (for PATH variable)
path.delimiter  // ':' on POSIX, ';' on Windows

// Split PATH variable
process.env.PATH.split(path.delimiter)
```

### path.posix and path.win32

Use specific platform methods:

```javascript
// Always use POSIX (for URLs, etc.)
path.posix.join('users', 'john')  // 'users/john'

// Always use Windows
path.win32.join('users', 'john')  // 'users\\john'
```

## Express.js Patterns

### Static File Serving

```javascript
const express = require('express')
const path = require('path')
const app = express()

// Serve from multiple directories
app.use('/public', express.static(path.join(__dirname, 'public')))
app.use('/assets', express.static(path.join(__dirname, 'assets')))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
```

### Safe File Access

```javascript
const path = require('path')

// Prevent directory traversal attacks
function getSafeFilePath(baseDir, userInput) {
  const resolved = path.resolve(baseDir, userInput)

  // Ensure path stays within base directory
  if (!resolved.startsWith(path.resolve(baseDir))) {
    throw new Error('Invalid path: directory traversal detected')
  }

  return resolved
}

app.get('/files/:filename', (req, res) => {
  try {
    const filePath = getSafeFilePath('./uploads', req.params.filename)
    res.sendFile(filePath)
  } catch (err) {
    res.status(403).send('Access denied')
  }
})
```

### View Engine Setup

```javascript
const express = require('express')
const path = require('path')
const app = express()

app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))

// Renders views/pages/home.pug
app.get('/', (req, res) => {
  res.render('pages/home')
})
```

### File Upload Handling

```javascript
const multer = require('multer')
const path = require('path')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'))
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const ext = path.extname(file.originalname)
    cb(null, `${uniqueName}${ext}`)
  }
})

const upload = multer({ storage })
```

## Common Patterns

### __dirname vs process.cwd()

```javascript
// __dirname: Directory of current file
console.log(__dirname)  // '/home/user/project/src'

// process.cwd(): Current working directory
console.log(process.cwd())  // '/home/user/project'

// Use __dirname for paths relative to source files
const config = require(path.join(__dirname, 'config.json'))

// Use process.cwd() for user-specified paths
const userFile = path.join(process.cwd(), args.input)
```

### Building URLs vs File Paths

```javascript
// File paths: Use path module
const filePath = path.join(__dirname, 'public', 'images', 'logo.png')

// URL paths: Use forward slashes directly
const urlPath = '/public/images/logo.png'

// Or use path.posix for URL-like paths
const urlPath2 = path.posix.join('public', 'images', 'logo.png')
```

## Related Modules

- [fs](../fs-module/) - File system operations
- [url](../url-module/) - URL handling

## Next Steps

1. Study [DESIGN_ANALYSIS.md](./DESIGN_ANALYSIS.md) for deeper insights
2. Test your knowledge with [QUESTIONS.md](./QUESTIONS.md)
3. Move to [fs-module](../fs-module/) for file operations

---

*The path module ensures your file paths work correctly across all platforms.*
