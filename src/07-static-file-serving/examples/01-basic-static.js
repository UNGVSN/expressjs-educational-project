/**
 * Example 01: Basic Static File Serving
 *
 * Demonstrates the fundamental static file serving capabilities.
 *
 * Run: npm run example:basic
 */

'use strict';

const path = require('node:path');
const createApp = require('../lib');

const app = createApp();

// ============================================
// STATIC FILE SERVING
// ============================================

// Serve files from 'public' directory
// Files are served at root path:
//   public/index.html  ->  GET /
//   public/css/style.css  ->  GET /css/style.css
//   public/js/app.js  ->  GET /js/app.js
const publicDir = path.join(__dirname, 'public');
app.use(createApp.static(publicDir));

// ============================================
// API ROUTES (alongside static files)
// ============================================

app.get('/api/info', (req, res) => {
  res.json({
    name: 'Static File Serving Demo',
    version: '1.0.0',
    staticDir: publicDir,
    note: 'This API route coexists with static file serving'
  });
});

app.get('/api/files', (req, res) => {
  const fs = require('node:fs');

  function listFiles(dir, prefix = '') {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const urlPath = prefix + '/' + entry.name;

      if (entry.isDirectory()) {
        files.push(...listFiles(fullPath, urlPath));
      } else {
        const stat = fs.statSync(fullPath);
        files.push({
          path: urlPath,
          size: stat.size,
          mimeType: createApp.mime.lookup(entry.name),
          modified: stat.mtime.toISOString()
        });
      }
    }

    return files;
  }

  res.json({
    rootDirectory: publicDir,
    files: listFiles(publicDir)
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Basic Static File Serving                               ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Static Directory: ${publicDir.slice(-30).padStart(30)}  ║
║                                                                   ║
║   Static Files:                                                   ║
║   /                     index.html                                ║
║   /css/style.css        Stylesheet                                ║
║   /js/app.js            JavaScript                                ║
║                                                                   ║
║   API Endpoints:                                                  ║
║   /api/info             Server info                               ║
║   /api/files            List all static files                     ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
