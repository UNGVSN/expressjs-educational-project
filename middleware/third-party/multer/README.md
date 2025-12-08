# Multer

Multer is middleware for handling `multipart/form-data`, primarily used for file uploads.

## Installation

```bash
npm install multer
```

## Basic Usage

```javascript
const express = require('express')
const multer = require('multer')

const app = express()
const upload = multer({ dest: 'uploads/' })

// Single file upload
app.post('/upload', upload.single('file'), (req, res) => {
  console.log(req.file)   // Uploaded file info
  console.log(req.body)   // Other form fields
  res.json({ file: req.file })
})
```

## HTML Form

```html
<!-- enctype is required for file uploads -->
<form action="/upload" method="POST" enctype="multipart/form-data">
  <input type="file" name="file">
  <input type="text" name="title">
  <button type="submit">Upload</button>
</form>
```

## Upload Types

### Single File

```javascript
// Field name must match input name
app.post('/upload', upload.single('avatar'), (req, res) => {
  // req.file contains the file
  res.json({ file: req.file })
})
```

### Multiple Files (Same Field)

```javascript
// Up to 10 files on 'photos' field
app.post('/photos', upload.array('photos', 10), (req, res) => {
  // req.files is array of files
  res.json({ files: req.files })
})
```

### Multiple Fields

```javascript
const cpUpload = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'gallery', maxCount: 8 }
])

app.post('/profile', cpUpload, (req, res) => {
  // req.files is an object
  // req.files.avatar[0]
  // req.files.gallery[0..7]
  res.json({ files: req.files })
})
```

### No Files (Text Only)

```javascript
// Parse only text fields
app.post('/form', upload.none(), (req, res) => {
  // req.body contains text fields
  res.json({ body: req.body })
})
```

### Any Files

```javascript
// Accept any files (use with caution)
app.post('/any', upload.any(), (req, res) => {
  res.json({ files: req.files })
})
```

## File Object

```javascript
req.file = {
  fieldname: 'avatar',              // Field name from form
  originalname: 'photo.jpg',        // Original filename
  encoding: '7bit',                 // Encoding type
  mimetype: 'image/jpeg',           // MIME type
  destination: 'uploads/',          // Destination folder
  filename: 'abc123def456.jpg',     // Saved filename
  path: 'uploads/abc123def456.jpg', // Full path
  size: 12345                       // File size in bytes
}
```

## Storage Engines

### Disk Storage

```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    // Custom filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, file.fieldname + '-' + uniqueSuffix + ext)
  }
})

const upload = multer({ storage })
```

### Memory Storage

```javascript
// Store files in memory as Buffer
const storage = multer.memoryStorage()
const upload = multer({ storage })

app.post('/upload', upload.single('file'), (req, res) => {
  // req.file.buffer contains the file data
  console.log(req.file.buffer)
  res.send('Uploaded')
})
```

### Custom Storage

```javascript
// For cloud storage (S3, GCS, etc.)
// npm install multer-s3 @aws-sdk/client-s3
const multerS3 = require('multer-s3')
const { S3Client } = require('@aws-sdk/client-s3')

const s3 = new S3Client({ region: 'us-east-1' })

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'my-bucket',
    key: (req, file, cb) => {
      cb(null, Date.now().toString() + '-' + file.originalname)
    }
  })
})
```

## File Filtering

```javascript
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only images allowed'), false)
    }
  }
})

// More specific filter
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG and GIF allowed.'), false)
  }
}

const upload = multer({
  dest: 'uploads/',
  fileFilter: imageFilter
})
```

## Limits

```javascript
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5 MB
    files: 5,                    // Max 5 files
    fields: 10,                  // Max 10 non-file fields
    fieldNameSize: 100,          // Max field name length
    fieldSize: 1024 * 1024       // Max field value size (1 MB)
  }
})
```

## Error Handling

```javascript
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 1024 * 1024 }  // 1 MB
})

app.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer error
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large' })
      }
      return res.status(400).json({ error: err.message })
    } else if (err) {
      // Other error (from fileFilter, etc.)
      return res.status(400).json({ error: err.message })
    }

    // Success
    res.json({ file: req.file })
  })
})

// Or with middleware error handler
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ file: req.file })
})

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message })
  }
  next(err)
})
```

## Common Patterns

### Image Upload with Validation

```javascript
const path = require('path')

const storage = multer.diskStorage({
  destination: 'uploads/images/',
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueName + path.extname(file.originalname))
  }
})

const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },  // 5 MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = filetypes.test(file.mimetype)

    if (extname && mimetype) {
      return cb(null, true)
    }
    cb(new Error('Images only!'))
  }
})

app.post('/upload/image', imageUpload.single('image'), (req, res) => {
  res.json({
    message: 'Image uploaded',
    file: {
      filename: req.file.filename,
      path: `/uploads/images/${req.file.filename}`,
      size: req.file.size
    }
  })
})
```

### Avatar Upload with Resize

```javascript
const sharp = require('sharp')

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only images allowed'))
    }
  }
})

app.post('/upload/avatar', avatarUpload.single('avatar'), async (req, res) => {
  try {
    const filename = `avatar-${req.user.id}-${Date.now()}.jpg`

    await sharp(req.file.buffer)
      .resize(200, 200)
      .jpeg({ quality: 80 })
      .toFile(`uploads/avatars/${filename}`)

    res.json({ avatar: `/uploads/avatars/${filename}` })
  } catch (err) {
    res.status(500).json({ error: 'Failed to process image' })
  }
})
```

### Document Upload

```javascript
const documentUpload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/documents/',
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname)
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },  // 10 MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only PDF and Word documents allowed'))
    }
  }
})

app.post('/upload/document', documentUpload.single('document'), (req, res) => {
  res.json({ document: req.file })
})
```

### Multiple File Types

```javascript
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Different folders for different file types
      if (file.mimetype.startsWith('image/')) {
        cb(null, 'uploads/images/')
      } else if (file.mimetype === 'application/pdf') {
        cb(null, 'uploads/documents/')
      } else {
        cb(null, 'uploads/other/')
      }
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname))
    }
  })
})
```

## Security Considerations

```javascript
// 1. Always validate file types
fileFilter: (req, file, cb) => {
  // Check both extension and MIME type
  const ext = path.extname(file.originalname).toLowerCase()
  const mime = file.mimetype

  // Don't trust client-provided info blindly
  if (ext === '.jpg' && mime === 'image/jpeg') {
    cb(null, true)
  } else {
    cb(new Error('Invalid file'))
  }
}

// 2. Set reasonable limits
limits: {
  fileSize: 5 * 1024 * 1024,
  files: 5
}

// 3. Use unique filenames
filename: (req, file, cb) => {
  cb(null, crypto.randomUUID() + path.extname(file.originalname))
}

// 4. Store outside web root or use secure serving
app.use('/uploads', express.static('uploads'))  // Be careful!
```

## Related

- [express-validator](../express-validator/) - Input validation
- [helmet](../helmet/) - Security headers

---

*Multer is essential for handling file uploads in Express applications.*
