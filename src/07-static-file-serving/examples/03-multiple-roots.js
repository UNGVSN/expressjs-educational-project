/**
 * Example 03: Multiple Static Roots
 *
 * Demonstrates serving static files from multiple directories.
 *
 * Run: npm run example:multiple
 */

'use strict';

const path = require('node:path');
const fs = require('node:fs');
const createApp = require('../lib');

const app = createApp();

// ============================================
// SETUP: Create multiple directories
// ============================================

const publicDir = path.join(__dirname, 'multiple', 'public');
const uploadsDir = path.join(__dirname, 'multiple', 'uploads');
const assetsDir = path.join(__dirname, 'multiple', 'assets');

// Create directories
[publicDir, uploadsDir, assetsDir].forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// Create files in public
fs.writeFileSync(path.join(publicDir, 'index.html'), `
<!DOCTYPE html>
<html>
<head>
  <title>Multiple Roots</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <h1>Multiple Static Roots</h1>
  <p>This example serves files from three directories.</p>

  <h2>Search Order</h2>
  <ol>
    <li><code>/public</code> - Main public files</li>
    <li><code>/uploads</code> - User uploads</li>
    <li><code>/assets</code> - Additional assets</li>
  </ol>

  <h2>Virtual Path Prefixes</h2>
  <ul>
    <li><a href="/static/test.txt">/static/test.txt</a> - /static prefix</li>
    <li><a href="/uploads/photo.txt">/uploads/photo.txt</a> - /uploads prefix</li>
    <li><a href="/vendor/lib.txt">/vendor/lib.txt</a> - /vendor prefix</li>
  </ul>

  <h2>Fallback Demo</h2>
  <ul>
    <li><a href="/shared.txt">/shared.txt</a> - from public (first match)</li>
    <li><a href="/unique-upload.txt">/unique-upload.txt</a> - from uploads</li>
    <li><a href="/unique-asset.txt">/unique-asset.txt</a> - from assets</li>
  </ul>

  <h2>API</h2>
  <ul>
    <li><a href="/api/directories">/api/directories</a> - List directories</li>
  </ul>
</body>
</html>
`);

fs.mkdirSync(path.join(publicDir, 'css'), { recursive: true });
fs.writeFileSync(path.join(publicDir, 'css', 'style.css'), `
body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; }
h1, h2 { color: #333; }
code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
`);

fs.writeFileSync(path.join(publicDir, 'shared.txt'), 'This is from PUBLIC directory');
fs.writeFileSync(path.join(publicDir, 'test.txt'), 'Test file from public');

// Create files in uploads
fs.writeFileSync(path.join(uploadsDir, 'photo.txt'), 'Simulated photo upload');
fs.writeFileSync(path.join(uploadsDir, 'shared.txt'), 'This is from UPLOADS directory (not served - public wins)');
fs.writeFileSync(path.join(uploadsDir, 'unique-upload.txt'), 'This file only exists in uploads');

// Create files in assets
fs.writeFileSync(path.join(assetsDir, 'lib.txt'), 'Vendor library file');
fs.writeFileSync(path.join(assetsDir, 'shared.txt'), 'This is from ASSETS directory (not served)');
fs.writeFileSync(path.join(assetsDir, 'unique-asset.txt'), 'This file only exists in assets');

// ============================================
// MULTIPLE STATIC MIDDLEWARE
// ============================================

// Method 1: Multiple directories at root (fallback chain)
// Express tries each directory in order until a file is found
app.use(createApp.static(publicDir));
app.use(createApp.static(uploadsDir));
app.use(createApp.static(assetsDir));

// Method 2: Virtual path prefixes
// Files are served under specific URL paths
app.use('/static', createApp.static(publicDir));
app.use('/uploads', createApp.static(uploadsDir));
app.use('/vendor', createApp.static(assetsDir));

// ============================================
// API ENDPOINTS
// ============================================

app.get('/api/directories', (req, res) => {
  const listDir = (dir) => {
    try {
      return fs.readdirSync(dir);
    } catch {
      return [];
    }
  };

  res.json({
    configuration: {
      description: 'Files are searched in order: public -> uploads -> assets',
      note: 'First matching file wins'
    },
    directories: {
      public: {
        path: publicDir,
        files: listDir(publicDir),
        mountedAt: ['/', '/static']
      },
      uploads: {
        path: uploadsDir,
        files: listDir(uploadsDir),
        mountedAt: ['/', '/uploads']
      },
      assets: {
        path: assetsDir,
        files: listDir(assetsDir),
        mountedAt: ['/', '/vendor']
      }
    },
    examples: [
      { url: '/shared.txt', servedFrom: 'public (first match)' },
      { url: '/unique-upload.txt', servedFrom: 'uploads' },
      { url: '/unique-asset.txt', servedFrom: 'assets' },
      { url: '/static/test.txt', servedFrom: 'public via /static prefix' },
      { url: '/uploads/photo.txt', servedFrom: 'uploads via /uploads prefix' }
    ]
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Multiple Static Roots                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Directory Chain (searched in order):                            ║
║   1. public/   - Main public files                                ║
║   2. uploads/  - User uploads                                     ║
║   3. assets/   - Additional assets                                ║
║                                                                   ║
║   Virtual Prefixes:                                               ║
║   /static/*  -> public/                                           ║
║   /uploads/* -> uploads/                                          ║
║   /vendor/*  -> assets/                                           ║
║                                                                   ║
║   Test URLs:                                                      ║
║   /                     Index page                                ║
║   /shared.txt           From public (first match)                 ║
║   /unique-upload.txt    From uploads                              ║
║   /unique-asset.txt     From assets                               ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\\nCleaning up demo files...');
  try {
    fs.rmSync(path.join(__dirname, 'multiple'), { recursive: true });
    console.log('Demo files removed.');
  } catch {
    // Ignore errors
  }
  process.exit(0);
});
