# Example 07: File Upload

File upload handling with Multer.

## What You'll Learn

- Single file upload
- Multiple files upload
- Multiple fields
- File type validation
- Size limits
- Memory vs disk storage
- File serving and download

## Running the Example

```bash
npm install
npm start

# Visit http://localhost:3000 for upload forms
```

## Testing with cURL

### Single File

```bash
curl -X POST http://localhost:3000/upload/single \
  -F "file=@/path/to/file.jpg"
```

### Multiple Files

```bash
curl -X POST http://localhost:3000/upload/multiple \
  -F "files=@file1.jpg" \
  -F "files=@file2.jpg"
```

### Type-Specific Upload

```bash
# Image only
curl -X POST http://localhost:3000/upload/image \
  -F "file=@image.jpg"

# Document only
curl -X POST http://localhost:3000/upload/document \
  -F "file=@document.pdf"
```

### Multiple Fields

```bash
curl -X POST http://localhost:3000/upload/fields \
  -F "avatar=@avatar.jpg" \
  -F "documents=@doc1.pdf" \
  -F "documents=@doc2.pdf"
```

### File Operations

```bash
# List files
curl http://localhost:3000/files

# Download file
curl -O http://localhost:3000/download/filename.jpg

# Delete file
curl -X DELETE http://localhost:3000/files/filename.jpg
```

## Key Concepts

### Multer Configuration

```javascript
const multer = require('multer')

// Disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + file.originalname
    cb(null, unique)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only images allowed'), false)
    }
  }
})
```

### Upload Methods

```javascript
// Single file
app.post('/upload', upload.single('file'), handler)
// req.file

// Multiple files (same field)
app.post('/upload', upload.array('files', 5), handler)
// req.files

// Multiple fields
app.post('/upload', upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'documents', maxCount: 3 }
]), handler)
// req.files.avatar, req.files.documents
```

### Memory Storage

```javascript
const memoryUpload = multer({
  storage: multer.memoryStorage()
})

app.post('/process', memoryUpload.single('file'), (req, res) => {
  // File in req.file.buffer
  const data = processFile(req.file.buffer)
  res.json(data)
})
```

### Error Handling

```javascript
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' })
    }
  }
  next(err)
})
```

## File Object Properties

| Property | Description |
|----------|-------------|
| `fieldname` | Form field name |
| `originalname` | Original filename |
| `encoding` | File encoding |
| `mimetype` | MIME type |
| `size` | Size in bytes |
| `destination` | Upload directory |
| `filename` | Saved filename |
| `path` | Full path |
| `buffer` | File buffer (memory) |

## Security Considerations

1. **File Type Validation**: Check MIME type and extension
2. **Size Limits**: Set appropriate file size limits
3. **Filename Sanitization**: Generate unique filenames
4. **Upload Directory**: Keep outside webroot
5. **Virus Scanning**: Scan uploads in production

## Exercises

1. Add image resizing on upload
2. Implement chunked uploads for large files
3. Add progress tracking
4. Store file metadata in database
5. Implement file versioning

## Next Steps

→ [08-real-time](../08-real-time/) - Add real-time features
