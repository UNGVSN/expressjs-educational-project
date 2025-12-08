# File System Module - Advanced Topics

Advanced file system features including permissions, symlinks, bulk operations, temporary files, and file watching.

## File Permissions

### Understanding Unix Permissions

```javascript
const fs = require('fs')
const { constants } = fs

// Permission constants
console.log(constants.S_IRUSR)  // 0o400 - Owner read
console.log(constants.S_IWUSR)  // 0o200 - Owner write
console.log(constants.S_IXUSR)  // 0o100 - Owner execute
console.log(constants.S_IRGRP)  // 0o040 - Group read
console.log(constants.S_IWGRP)  // 0o020 - Group write
console.log(constants.S_IXGRP)  // 0o010 - Group execute
console.log(constants.S_IROTH)  // 0o004 - Others read
console.log(constants.S_IWOTH)  // 0o002 - Others write
console.log(constants.S_IXOTH)  // 0o001 - Others execute

// Common permission combinations
const PERMISSION = {
  READ_WRITE_OWNER: 0o600,      // rw-------
  READ_ALL: 0o644,              // rw-r--r--
  READ_WRITE_ALL: 0o666,        // rw-rw-rw-
  EXECUTABLE: 0o755,            // rwxr-xr-x
  PRIVATE: 0o700,               // rwx------
  DIRECTORY_DEFAULT: 0o755,     // rwxr-xr-x
  FILE_DEFAULT: 0o644           // rw-r--r--
}
```

### chmod - Changing Permissions

```javascript
const fs = require('fs/promises')

// Change file permissions
await fs.chmod('script.sh', 0o755)  // Make executable

// Using constants
await fs.chmod('private.key', fs.constants.S_IRUSR | fs.constants.S_IWUSR)

// Safe permission setting
async function setSecurePermissions(filePath, mode) {
  try {
    await fs.chmod(filePath, mode)
    console.log(`Permissions set to ${mode.toString(8)} for ${filePath}`)
  } catch (err) {
    if (err.code === 'EPERM') {
      console.error('Permission denied - need elevated privileges')
    } else if (err.code === 'ENOENT') {
      console.error('File not found')
    } else {
      throw err
    }
  }
}

// Recursive permission change
async function chmodRecursive(dirPath, fileMode, dirMode) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      await fs.chmod(fullPath, dirMode)
      await chmodRecursive(fullPath, fileMode, dirMode)
    } else {
      await fs.chmod(fullPath, fileMode)
    }
  }
}

// Usage
await chmodRecursive('./project', 0o644, 0o755)
```

### chown - Changing Ownership

```javascript
const fs = require('fs/promises')
const os = require('os')

// Change file owner (requires root on Unix)
await fs.chown('file.txt', uid, gid)

// Get current user info
const userInfo = os.userInfo()
console.log('UID:', userInfo.uid)
console.log('GID:', userInfo.gid)

// Change to current user
await fs.chown('file.txt', userInfo.uid, userInfo.gid)

// Recursive ownership change
async function chownRecursive(dirPath, uid, gid) {
  await fs.chown(dirPath, uid, gid)

  const entries = await fs.readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    await fs.chown(fullPath, uid, gid)

    if (entry.isDirectory()) {
      await chownRecursive(fullPath, uid, gid)
    }
  }
}

// lchown - Don't follow symlinks
await fs.lchown('symlink', uid, gid)
```

### Checking Permissions

```javascript
const fs = require('fs/promises')
const { constants } = fs

// Check if file is accessible
async function checkAccess(filePath, mode = constants.F_OK) {
  try {
    await fs.access(filePath, mode)
    return true
  } catch {
    return false
  }
}

// Check specific permissions
async function checkPermissions(filePath) {
  return {
    exists: await checkAccess(filePath, constants.F_OK),
    readable: await checkAccess(filePath, constants.R_OK),
    writable: await checkAccess(filePath, constants.W_OK),
    executable: await checkAccess(filePath, constants.X_OK)
  }
}

// Usage
const perms = await checkPermissions('/usr/bin/node')
console.log(perms)
// { exists: true, readable: true, writable: false, executable: true }

// Get detailed file mode
async function getFileMode(filePath) {
  const stats = await fs.stat(filePath)
  const mode = stats.mode

  return {
    octal: (mode & 0o777).toString(8),
    isDirectory: stats.isDirectory(),
    isFile: stats.isFile(),
    isSymlink: stats.isSymbolicLink(),
    owner: {
      read: !!(mode & constants.S_IRUSR),
      write: !!(mode & constants.S_IWUSR),
      execute: !!(mode & constants.S_IXUSR)
    },
    group: {
      read: !!(mode & constants.S_IRGRP),
      write: !!(mode & constants.S_IWGRP),
      execute: !!(mode & constants.S_IXGRP)
    },
    others: {
      read: !!(mode & constants.S_IROTH),
      write: !!(mode & constants.S_IWOTH),
      execute: !!(mode & constants.S_IXOTH)
    }
  }
}
```

## Symbolic and Hard Links

### Creating Symlinks

```javascript
const fs = require('fs/promises')
const path = require('path')

// Create symbolic link
// symlink(target, path) - path points to target
await fs.symlink('./original.txt', './link-to-original.txt')

// Directory symlink
await fs.symlink('./src', './source', 'dir')  // 'dir' type for Windows

// Absolute vs relative paths
await fs.symlink('/absolute/path/file.txt', './link.txt')
await fs.symlink('../relative/path/file.txt', './link.txt')

// Creating symlinks safely
async function createSymlink(target, linkPath, type = 'file') {
  try {
    // Check if link already exists
    const linkStats = await fs.lstat(linkPath).catch(() => null)

    if (linkStats) {
      if (linkStats.isSymbolicLink()) {
        const existingTarget = await fs.readlink(linkPath)
        if (existingTarget === target) {
          console.log('Symlink already exists and points to correct target')
          return
        }
        // Remove old symlink
        await fs.unlink(linkPath)
      } else {
        throw new Error(`${linkPath} exists and is not a symlink`)
      }
    }

    await fs.symlink(target, linkPath, type)
    console.log(`Created symlink: ${linkPath} -> ${target}`)
  } catch (err) {
    console.error('Failed to create symlink:', err.message)
    throw err
  }
}
```

### Creating Hard Links

```javascript
const fs = require('fs/promises')

// Create hard link
// link(existingPath, newPath)
await fs.link('./original.txt', './hardlink.txt')

// Hard links share the same inode
const originalStats = await fs.stat('./original.txt')
const hardlinkStats = await fs.stat('./hardlink.txt')
console.log(originalStats.ino === hardlinkStats.ino)  // true

// Hard link count
console.log('Link count:', originalStats.nlink)  // 2

// Hard links vs Symlinks
// - Hard links: Same inode, can't cross filesystems, can't link directories
// - Symlinks: Different inode, can cross filesystems, can link directories
```

### Reading and Following Links

```javascript
const fs = require('fs/promises')

// Read symlink target (doesn't follow)
const target = await fs.readlink('./symlink.txt')
console.log('Points to:', target)

// lstat - Get link stats (doesn't follow symlink)
const linkStats = await fs.lstat('./symlink.txt')
console.log('Is symlink:', linkStats.isSymbolicLink())

// stat - Get target stats (follows symlink)
const targetStats = await fs.stat('./symlink.txt')
console.log('Target is file:', targetStats.isFile())

// realpath - Resolve all symlinks to absolute path
const realPath = await fs.realpath('./symlink.txt')
console.log('Real path:', realPath)

// Check if path is a symlink
async function isSymlink(filePath) {
  try {
    const stats = await fs.lstat(filePath)
    return stats.isSymbolicLink()
  } catch {
    return false
  }
}

// Resolve symlink chain
async function resolveSymlinkChain(linkPath) {
  const chain = [linkPath]
  let current = linkPath
  const seen = new Set()

  while (true) {
    const stats = await fs.lstat(current).catch(() => null)

    if (!stats || !stats.isSymbolicLink()) {
      break
    }

    const target = await fs.readlink(current)
    const resolved = path.resolve(path.dirname(current), target)

    // Detect cycles
    if (seen.has(resolved)) {
      throw new Error(`Symlink cycle detected: ${resolved}`)
    }
    seen.add(resolved)

    chain.push(resolved)
    current = resolved
  }

  return chain
}
```

## Bulk Operations

### Parallel File Processing

```javascript
const fs = require('fs/promises')
const path = require('path')

// Process files in parallel with concurrency limit
async function processFiles(files, processor, concurrency = 10) {
  const results = []
  const executing = new Set()

  for (const file of files) {
    const promise = processor(file).then(result => {
      executing.delete(promise)
      return result
    })
    results.push(promise)
    executing.add(promise)

    if (executing.size >= concurrency) {
      await Promise.race(executing)
    }
  }

  return Promise.all(results)
}

// Usage: Read all files in directory
async function readAllFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const files = entries
    .filter(e => e.isFile())
    .map(e => path.join(dirPath, e.name))

  return processFiles(files, async (file) => ({
    path: file,
    content: await fs.readFile(file, 'utf8')
  }), 10)
}
```

### Bulk Copy

```javascript
const fs = require('fs/promises')
const path = require('path')

// Copy directory recursively
async function copyDir(src, dest, options = {}) {
  const { overwrite = true, filter = () => true } = options

  // Create destination directory
  await fs.mkdir(dest, { recursive: true })

  const entries = await fs.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (!filter(srcPath, entry)) {
      continue
    }

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, options)
    } else if (entry.isSymbolicLink()) {
      const target = await fs.readlink(srcPath)
      await fs.symlink(target, destPath)
    } else {
      await fs.copyFile(
        srcPath,
        destPath,
        overwrite ? 0 : fs.constants.COPYFILE_EXCL
      )
    }
  }
}

// Copy with progress
async function copyDirWithProgress(src, dest, onProgress) {
  // First, count total files
  let totalFiles = 0
  let copiedFiles = 0

  async function countFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await countFiles(path.join(dir, entry.name))
      } else {
        totalFiles++
      }
    }
  }

  await countFiles(src)

  // Then copy with progress
  async function copyWithCount(srcDir, destDir) {
    await fs.mkdir(destDir, { recursive: true })
    const entries = await fs.readdir(srcDir, { withFileTypes: true })

    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name)
      const destPath = path.join(destDir, entry.name)

      if (entry.isDirectory()) {
        await copyWithCount(srcPath, destPath)
      } else {
        await fs.copyFile(srcPath, destPath)
        copiedFiles++
        onProgress({
          copied: copiedFiles,
          total: totalFiles,
          percent: Math.round((copiedFiles / totalFiles) * 100),
          currentFile: srcPath
        })
      }
    }
  }

  await copyWithCount(src, dest)
}
```

### Bulk Delete

```javascript
const fs = require('fs/promises')
const path = require('path')

// Delete directory recursively (Node.js 14.14+)
await fs.rm('./directory', { recursive: true, force: true })

// Custom recursive delete with filtering
async function deleteMatching(dirPath, pattern) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      await deleteMatching(fullPath, pattern)

      // Remove empty directories
      const remaining = await fs.readdir(fullPath)
      if (remaining.length === 0) {
        await fs.rmdir(fullPath)
      }
    } else if (pattern.test(entry.name)) {
      await fs.unlink(fullPath)
      console.log('Deleted:', fullPath)
    }
  }
}

// Delete all .tmp files
await deleteMatching('./project', /\.tmp$/)

// Bulk delete with confirmation
async function bulkDelete(paths, dryRun = false) {
  const results = { deleted: [], failed: [], skipped: [] }

  for (const filePath of paths) {
    try {
      const stats = await fs.stat(filePath)

      if (dryRun) {
        results.skipped.push({ path: filePath, reason: 'dry-run' })
        continue
      }

      if (stats.isDirectory()) {
        await fs.rm(filePath, { recursive: true })
      } else {
        await fs.unlink(filePath)
      }
      results.deleted.push(filePath)
    } catch (err) {
      results.failed.push({ path: filePath, error: err.message })
    }
  }

  return results
}
```

### Bulk Rename

```javascript
const fs = require('fs/promises')
const path = require('path')

// Rename files matching pattern
async function bulkRename(dirPath, pattern, replacement) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const results = []

  for (const entry of entries) {
    if (!entry.isFile()) continue

    const newName = entry.name.replace(pattern, replacement)
    if (newName === entry.name) continue

    const oldPath = path.join(dirPath, entry.name)
    const newPath = path.join(dirPath, newName)

    try {
      await fs.rename(oldPath, newPath)
      results.push({ old: entry.name, new: newName, success: true })
    } catch (err) {
      results.push({ old: entry.name, new: newName, success: false, error: err.message })
    }
  }

  return results
}

// Usage: Add prefix to all files
await bulkRename('./images', /^/, 'prefix_')

// Sequential numbering
async function sequentialRename(dirPath, prefix, extension) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const files = entries.filter(e => e.isFile() && e.name.endsWith(extension))

  // Sort by name or date
  files.sort((a, b) => a.name.localeCompare(b.name))

  for (let i = 0; i < files.length; i++) {
    const oldPath = path.join(dirPath, files[i].name)
    const newPath = path.join(dirPath, `${prefix}${String(i + 1).padStart(4, '0')}${extension}`)

    await fs.rename(oldPath, newPath)
  }
}

// Rename IMG_001.jpg, IMG_002.jpg -> photo_0001.jpg, photo_0002.jpg
await sequentialRename('./photos', 'photo_', '.jpg')
```

## Temporary Files

### Creating Temp Files

```javascript
const fs = require('fs/promises')
const os = require('os')
const path = require('path')
const crypto = require('crypto')

// Get system temp directory
const tmpDir = os.tmpdir()
console.log('Temp directory:', tmpDir)

// Create unique temp file
async function createTempFile(prefix = 'tmp', extension = '') {
  const randomId = crypto.randomBytes(8).toString('hex')
  const fileName = `${prefix}-${randomId}${extension}`
  const filePath = path.join(tmpDir, fileName)

  await fs.writeFile(filePath, '')
  return filePath
}

// Create temp file with content
async function createTempFileWithContent(content, options = {}) {
  const { prefix = 'tmp', extension = '', encoding = 'utf8' } = options
  const filePath = await createTempFile(prefix, extension)
  await fs.writeFile(filePath, content, encoding)
  return filePath
}

// Create temp directory
async function createTempDir(prefix = 'tmp') {
  const randomId = crypto.randomBytes(8).toString('hex')
  const dirPath = path.join(tmpDir, `${prefix}-${randomId}`)

  await fs.mkdir(dirPath, { recursive: true })
  return dirPath
}

// Using fs.mkdtemp (built-in)
const tempDir = await fs.mkdtemp(path.join(tmpDir, 'myapp-'))
console.log('Created temp directory:', tempDir)
```

### Temp File with Automatic Cleanup

```javascript
const fs = require('fs/promises')
const os = require('os')
const path = require('path')
const crypto = require('crypto')

class TempFile {
  constructor(filePath) {
    this.path = filePath
    this.closed = false
  }

  static async create(options = {}) {
    const { prefix = 'tmp', extension = '', content = '' } = options
    const randomId = crypto.randomBytes(8).toString('hex')
    const fileName = `${prefix}-${randomId}${extension}`
    const filePath = path.join(os.tmpdir(), fileName)

    await fs.writeFile(filePath, content)
    return new TempFile(filePath)
  }

  async read(encoding = 'utf8') {
    return fs.readFile(this.path, encoding)
  }

  async write(content, encoding = 'utf8') {
    return fs.writeFile(this.path, content, encoding)
  }

  async append(content, encoding = 'utf8') {
    return fs.appendFile(this.path, content, encoding)
  }

  async cleanup() {
    if (!this.closed) {
      try {
        await fs.unlink(this.path)
        this.closed = true
      } catch (err) {
        if (err.code !== 'ENOENT') throw err
      }
    }
  }

  // Use with try-finally or dispose pattern
  async [Symbol.asyncDispose]() {
    await this.cleanup()
  }
}

// Usage
async function processWithTempFile() {
  const temp = await TempFile.create({ prefix: 'process', extension: '.json' })

  try {
    await temp.write(JSON.stringify({ data: 'value' }))
    const content = await temp.read()
    console.log('Temp file content:', content)
    // Process...
  } finally {
    await temp.cleanup()
  }
}

// With Symbol.asyncDispose (Node.js 20+)
async function processWithAsyncUsing() {
  await using temp = await TempFile.create({ prefix: 'data' })
  await temp.write('Hello, World!')
  // File automatically cleaned up when block exits
}
```

### Temp Directory Manager

```javascript
const fs = require('fs/promises')
const os = require('os')
const path = require('path')

class TempDirectory {
  constructor(dirPath) {
    this.path = dirPath
    this.files = new Set()
  }

  static async create(prefix = 'tmp') {
    const dirPath = await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`))
    return new TempDirectory(dirPath)
  }

  async createFile(name, content = '') {
    const filePath = path.join(this.path, name)
    await fs.writeFile(filePath, content)
    this.files.add(filePath)
    return filePath
  }

  async createSubdir(name) {
    const dirPath = path.join(this.path, name)
    await fs.mkdir(dirPath, { recursive: true })
    return dirPath
  }

  getPath(name) {
    return path.join(this.path, name)
  }

  async cleanup() {
    try {
      await fs.rm(this.path, { recursive: true, force: true })
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
  }

  async [Symbol.asyncDispose]() {
    await this.cleanup()
  }
}

// Usage
async function runTests() {
  const tmpDir = await TempDirectory.create('test')

  try {
    // Create test files
    await tmpDir.createFile('config.json', '{}')
    await tmpDir.createFile('data.txt', 'test data')
    await tmpDir.createSubdir('output')

    // Run tests using tmpDir.path
    const configPath = tmpDir.getPath('config.json')
    // ...
  } finally {
    await tmpDir.cleanup()
  }
}
```

## File Watching

### Basic Watch

```javascript
const fs = require('fs')
const fsPromises = require('fs/promises')

// Watch file for changes
const watcher = fs.watch('file.txt', (eventType, filename) => {
  console.log(`Event: ${eventType}, File: ${filename}`)
})

// Watch directory
const dirWatcher = fs.watch('./src', { recursive: true }, (eventType, filename) => {
  console.log(`${eventType}: ${filename}`)
})

// Stop watching
watcher.close()
dirWatcher.close()

// Using fs.watchFile (polling-based, cross-platform)
fs.watchFile('file.txt', { interval: 1000 }, (curr, prev) => {
  if (curr.mtime !== prev.mtime) {
    console.log('File modified')
  }
})

// Stop polling
fs.unwatchFile('file.txt')
```

### Advanced Watcher

```javascript
const fs = require('fs')
const path = require('path')
const { EventEmitter } = require('events')

class FileWatcher extends EventEmitter {
  constructor(watchPath, options = {}) {
    super()
    this.watchPath = watchPath
    this.options = {
      recursive: true,
      debounce: 100,
      ignored: /node_modules|\.git/,
      ...options
    }
    this.watchers = new Map()
    this.pending = new Map()
  }

  start() {
    this.addWatcher(this.watchPath)
    this.emit('ready', this.watchPath)
    return this
  }

  addWatcher(dirPath) {
    if (this.options.ignored.test(dirPath)) return

    try {
      const watcher = fs.watch(dirPath, (eventType, filename) => {
        if (!filename) return

        const fullPath = path.join(dirPath, filename)

        // Debounce events
        if (this.pending.has(fullPath)) {
          clearTimeout(this.pending.get(fullPath))
        }

        this.pending.set(fullPath, setTimeout(() => {
          this.pending.delete(fullPath)
          this.handleEvent(eventType, fullPath)
        }, this.options.debounce))
      })

      this.watchers.set(dirPath, watcher)

      // Add watchers for subdirectories
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          this.addWatcher(path.join(dirPath, entry.name))
        }
      }
    } catch (err) {
      this.emit('error', err)
    }
  }

  handleEvent(eventType, filePath) {
    try {
      const stats = fs.statSync(filePath)

      if (stats.isDirectory()) {
        if (eventType === 'rename') {
          // New directory created
          this.addWatcher(filePath)
          this.emit('addDir', filePath)
        }
      } else {
        this.emit(eventType === 'change' ? 'change' : 'add', filePath)
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File/directory deleted
        this.emit('unlink', filePath)
        this.removeWatcher(filePath)
      } else {
        this.emit('error', err)
      }
    }
  }

  removeWatcher(dirPath) {
    const watcher = this.watchers.get(dirPath)
    if (watcher) {
      watcher.close()
      this.watchers.delete(dirPath)
    }
  }

  stop() {
    for (const [, watcher] of this.watchers) {
      watcher.close()
    }
    this.watchers.clear()
    for (const timeout of this.pending.values()) {
      clearTimeout(timeout)
    }
    this.pending.clear()
    this.emit('close')
  }
}

// Usage
const watcher = new FileWatcher('./src')

watcher.on('ready', (path) => console.log('Watching:', path))
watcher.on('add', (path) => console.log('Added:', path))
watcher.on('change', (path) => console.log('Changed:', path))
watcher.on('unlink', (path) => console.log('Deleted:', path))
watcher.on('addDir', (path) => console.log('Dir added:', path))
watcher.on('error', (err) => console.error('Error:', err))

watcher.start()

// Stop on SIGINT
process.on('SIGINT', () => {
  watcher.stop()
  process.exit()
})
```

### Watch with Async Iterator

```javascript
const fs = require('fs/promises')
const path = require('path')

// Using fs.watch with async iterator (Node.js 18+)
async function watchDirectory(dirPath, signal) {
  const watcher = fs.watch(dirPath, { recursive: true, signal })

  try {
    for await (const event of watcher) {
      console.log(`${event.eventType}: ${event.filename}`)
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Watcher stopped')
    } else {
      throw err
    }
  }
}

// Usage with AbortController
const controller = new AbortController()

watchDirectory('./src', controller.signal)

// Stop after 60 seconds
setTimeout(() => {
  controller.abort()
}, 60000)
```

## File Locking

### Advisory File Locking

```javascript
const fs = require('fs/promises')
const path = require('path')

class FileLock {
  constructor(filePath) {
    this.filePath = filePath
    this.lockPath = `${filePath}.lock`
  }

  async acquire(timeout = 5000) {
    const start = Date.now()

    while (Date.now() - start < timeout) {
      try {
        // Try to create lock file (exclusive)
        const fd = await fs.open(this.lockPath, 'wx')
        await fd.write(String(process.pid))
        await fd.close()
        return true
      } catch (err) {
        if (err.code === 'EEXIST') {
          // Lock exists, wait and retry
          await new Promise(r => setTimeout(r, 100))
        } else {
          throw err
        }
      }
    }

    throw new Error('Could not acquire lock: timeout')
  }

  async release() {
    try {
      await fs.unlink(this.lockPath)
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
  }

  async isLocked() {
    try {
      await fs.access(this.lockPath)
      return true
    } catch {
      return false
    }
  }

  async withLock(fn) {
    await this.acquire()
    try {
      return await fn()
    } finally {
      await this.release()
    }
  }
}

// Usage
const lock = new FileLock('./data.json')

await lock.withLock(async () => {
  const data = JSON.parse(await fs.readFile('./data.json', 'utf8'))
  data.counter++
  await fs.writeFile('./data.json', JSON.stringify(data))
})
```

## Express Integration

```javascript
const express = require('express')
const fs = require('fs/promises')
const path = require('path')
const os = require('os')

const app = express()

// Serve files with proper permissions check
app.get('/files/:filename', async (req, res) => {
  const filePath = path.join('./uploads', req.params.filename)

  // Security: Prevent directory traversal
  const realPath = await fs.realpath(filePath).catch(() => null)
  if (!realPath || !realPath.startsWith(path.resolve('./uploads'))) {
    return res.status(404).send('Not found')
  }

  // Check read permission
  try {
    await fs.access(realPath, fs.constants.R_OK)
  } catch {
    return res.status(403).send('Forbidden')
  }

  res.sendFile(realPath)
})

// Upload to temp, then move
app.post('/upload', async (req, res) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'upload-'))

  try {
    const tmpPath = path.join(tmpDir, 'upload.bin')

    // Stream upload to temp file
    const writeStream = require('fs').createWriteStream(tmpPath)
    req.pipe(writeStream)

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
    })

    // Process and move to final location
    const finalPath = path.join('./uploads', `${Date.now()}.bin`)
    await fs.rename(tmpPath, finalPath)

    res.json({ path: finalPath })
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
})

app.listen(3000)
```

## Related Topics

- [Stream Module Advanced](../stream-module/ADVANCED_TOPICS.md)
- [Path Module](../path-module/README.md)
- [Buffer Module](../buffer-module/README.md)
