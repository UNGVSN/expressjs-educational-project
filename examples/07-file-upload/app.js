/**
 * Example 07: File Upload
 *
 * File upload handling with Multer.
 */

const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')

const app = express()
app.use(express.json())

// ============================================
// Directory Setup
// ============================================

const uploadDir = path.join(__dirname, 'uploads')
const tempDir = path.join(__dirname, 'temp')

// Create directories if they don't exist
;[uploadDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
})

// ============================================
// Multer Configuration
// ============================================

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

// File filter
const fileFilter = (req, file, cb) => {
  // Define allowed types
  const allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    document: ['application/pdf', 'application/msword', 'text/plain'],
    all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf', 'application/msword', 'text/plain']
  }

  const uploadType = req.params.type || 'all'
  const allowed = allowedTypes[uploadType] || allowedTypes.all

  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowed.join(', ')}`), false)
  }
}

// Create multer instances
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10
  }
})

// Memory storage for processing
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
})

// ============================================
// File Database (in-memory)
// ============================================

const files = []

// ============================================
// Routes
// ============================================

// Single file upload
app.post('/upload/single', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  const fileInfo = {
    id: uuidv4(),
    originalName: req.file.originalname,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: `/files/${req.file.filename}`,
    uploadedAt: new Date().toISOString()
  }

  files.push(fileInfo)

  res.status(201).json({
    message: 'File uploaded successfully',
    file: fileInfo
  })
})

// Multiple files upload
app.post('/upload/multiple', upload.array('files', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' })
  }

  const uploadedFiles = req.files.map(file => {
    const fileInfo = {
      id: uuidv4(),
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      path: `/files/${file.filename}`,
      uploadedAt: new Date().toISOString()
    }
    files.push(fileInfo)
    return fileInfo
  })

  res.status(201).json({
    message: `${uploadedFiles.length} files uploaded`,
    files: uploadedFiles
  })
})

// Multiple fields upload
app.post('/upload/fields', upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'documents', maxCount: 3 }
]), (req, res) => {
  const result = {}

  if (req.files.avatar) {
    result.avatar = req.files.avatar.map(f => ({
      filename: f.filename,
      path: `/files/${f.filename}`
    }))
  }

  if (req.files.documents) {
    result.documents = req.files.documents.map(f => ({
      filename: f.filename,
      path: `/files/${f.filename}`
    }))
  }

  res.status(201).json({
    message: 'Files uploaded',
    files: result
  })
})

// Type-specific upload
app.post('/upload/:type', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  const fileInfo = {
    id: uuidv4(),
    type: req.params.type,
    originalName: req.file.originalname,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: `/files/${req.file.filename}`,
    uploadedAt: new Date().toISOString()
  }

  files.push(fileInfo)

  res.status(201).json({
    message: `${req.params.type} uploaded successfully`,
    file: fileInfo
  })
})

// Memory upload (for processing without saving)
app.post('/upload/process', memoryUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  // File is in req.file.buffer
  const fileInfo = {
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    bufferLength: req.file.buffer.length
  }

  // Process file in memory (e.g., parse CSV, analyze image)
  // const processed = processFile(req.file.buffer)

  res.json({
    message: 'File processed (not saved)',
    file: fileInfo
  })
})

// List uploaded files
app.get('/files', (req, res) => {
  const { type, limit = 10, offset = 0 } = req.query

  let result = [...files]

  if (type) {
    result = result.filter(f => f.type === type)
  }

  result = result.slice(Number(offset), Number(offset) + Number(limit))

  res.json({
    files: result,
    total: files.length
  })
})

// Serve uploaded files
app.get('/files/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename)

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' })
  }

  res.sendFile(filePath)
})

// Download file with original name
app.get('/download/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename)

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' })
  }

  // Find original name
  const fileInfo = files.find(f => f.filename === req.params.filename)
  const downloadName = fileInfo ? fileInfo.originalName : req.params.filename

  res.download(filePath, downloadName)
})

// Delete file
app.delete('/files/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename)

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' })
  }

  fs.unlinkSync(filePath)

  // Remove from database
  const index = files.findIndex(f => f.filename === req.params.filename)
  if (index !== -1) {
    files.splice(index, 1)
  }

  res.json({ message: 'File deleted' })
})

// Get file info
app.get('/files/:filename/info', (req, res) => {
  const fileInfo = files.find(f => f.filename === req.params.filename)

  if (!fileInfo) {
    return res.status(404).json({ error: 'File not found' })
  }

  res.json(fileInfo)
})

// ============================================
// Error Handling
// ============================================

// Multer error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({ error: 'File too large' })
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({ error: 'Too many files' })
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ error: 'Unexpected field name' })
      default:
        return res.status(400).json({ error: err.message })
    }
  }

  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message })
  }

  next(err)
})

// General error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Server error' })
})

// ============================================
// HTML Form for Testing
// ============================================

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>File Upload Example</title>
      <style>
        body { font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        .form-group { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
        h3 { margin-top: 0; }
        input[type="file"] { margin: 10px 0; }
        button { padding: 10px 20px; cursor: pointer; }
        pre { background: #f5f5f5; padding: 10px; overflow: auto; }
      </style>
    </head>
    <body>
      <h1>File Upload Examples</h1>

      <div class="form-group">
        <h3>Single File Upload</h3>
        <form action="/upload/single" method="POST" enctype="multipart/form-data">
          <input type="file" name="file" required>
          <button type="submit">Upload</button>
        </form>
      </div>

      <div class="form-group">
        <h3>Multiple Files Upload</h3>
        <form action="/upload/multiple" method="POST" enctype="multipart/form-data">
          <input type="file" name="files" multiple required>
          <button type="submit">Upload</button>
        </form>
      </div>

      <div class="form-group">
        <h3>Image Only Upload</h3>
        <form action="/upload/image" method="POST" enctype="multipart/form-data">
          <input type="file" name="file" accept="image/*" required>
          <button type="submit">Upload Image</button>
        </form>
      </div>

      <div class="form-group">
        <h3>Multiple Fields</h3>
        <form action="/upload/fields" method="POST" enctype="multipart/form-data">
          <div>
            <label>Avatar:</label>
            <input type="file" name="avatar" accept="image/*">
          </div>
          <div>
            <label>Documents:</label>
            <input type="file" name="documents" multiple>
          </div>
          <button type="submit">Upload</button>
        </form>
      </div>

      <div class="form-group">
        <h3>Uploaded Files</h3>
        <button onclick="loadFiles()">Refresh List</button>
        <pre id="fileList">Click refresh to load files</pre>
      </div>

      <script>
        async function loadFiles() {
          const res = await fetch('/files')
          const data = await res.json()
          document.getElementById('fileList').textContent = JSON.stringify(data, null, 2)
        }
      </script>
    </body>
    </html>
  `)
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`File upload server running on http://localhost:${PORT}`)
  console.log(`Upload directory: ${uploadDir}`)
  console.log('\nEndpoints:')
  console.log('  POST /upload/single    - Single file')
  console.log('  POST /upload/multiple  - Multiple files')
  console.log('  POST /upload/fields    - Multiple fields')
  console.log('  POST /upload/image     - Image only')
  console.log('  POST /upload/document  - Document only')
  console.log('  POST /upload/process   - Process without saving')
  console.log('\n  GET  /files            - List files')
  console.log('  GET  /files/:name      - View file')
  console.log('  GET  /download/:name   - Download file')
  console.log('  DELETE /files/:name    - Delete file')
})
