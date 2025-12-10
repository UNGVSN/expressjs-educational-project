/**
 * Example 02: Static Middleware Options
 *
 * Demonstrates various configuration options for static file serving.
 *
 * Run: npm run example:options
 */

'use strict';

const path = require('node:path');
const fs = require('node:fs');
const createApp = require('../lib');

const app = createApp();

// ============================================
// SETUP: Create demo files
// ============================================

const demoDir = path.join(__dirname, 'demo-files');

// Create demo directory and files
if (!fs.existsSync(demoDir)) {
  fs.mkdirSync(demoDir, { recursive: true });
}

// Create various test files
fs.writeFileSync(path.join(demoDir, 'index.html'), `
<!DOCTYPE html>
<html>
<head><title>Index</title></head>
<body>
  <h1>Index File</h1>
  <p>This is served when you request a directory.</p>
  <ul>
    <li><a href="/test">/test</a> - Extension fallback (test.html)</li>
    <li><a href="/about">/about</a> - Extension fallback (about.html)</li>
    <li><a href="/.hidden">.hidden</a> - Dotfile test</li>
    <li><a href="/api/settings">/api/settings</a> - Current settings</li>
  </ul>
</body>
</html>
`);

fs.writeFileSync(path.join(demoDir, 'test.html'), '<html><body><h1>Test Page</h1></body></html>');
fs.writeFileSync(path.join(demoDir, 'about.html'), '<html><body><h1>About Page</h1></body></html>');
fs.writeFileSync(path.join(demoDir, '.hidden'), 'This is a hidden file');
fs.writeFileSync(path.join(demoDir, 'data.json'), '{"message": "JSON data"}');

// Create subdirectory with index
fs.mkdirSync(path.join(demoDir, 'subdir'), { recursive: true });
fs.writeFileSync(path.join(demoDir, 'subdir', 'index.html'), '<html><body><h1>Subdirectory Index</h1></body></html>');

// ============================================
// STATIC WITH OPTIONS
// ============================================

// Configuration options
const staticOptions = {
  // Index files to serve for directories
  index: ['index.html', 'index.htm'],

  // How to handle dotfiles: 'allow', 'deny', 'ignore'
  dotfiles: 'ignore',

  // Extension fallbacks - request /test will try /test.html
  extensions: ['html', 'htm'],

  // Enable ETag header
  etag: true,

  // Enable Last-Modified header
  lastModified: true,

  // Cache-Control max-age (in milliseconds)
  // '1d' = 1 day = 86400000ms
  maxAge: '1h', // 1 hour

  // Redirect /dir to /dir/
  redirect: true,

  // Custom headers callback
  setHeaders: (res, filePath, stat) => {
    // Add custom header based on file type
    if (filePath.endsWith('.html')) {
      res.setHeader('X-Content-Type', 'HTML Document');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('X-Content-Type', 'JSON Data');
    }

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
};

app.use(createApp.static(demoDir, staticOptions));

// ============================================
// API ENDPOINTS
// ============================================

app.get('/api/settings', (req, res) => {
  res.json({
    staticOptions: {
      ...staticOptions,
      setHeaders: '[Function]' // Can't serialize function
    },
    explanation: {
      index: 'Files to serve for directory requests',
      dotfiles: 'How to handle files starting with .',
      extensions: 'Try these extensions if file not found',
      etag: 'Send ETag header for caching',
      lastModified: 'Send Last-Modified header',
      maxAge: 'Cache-Control max-age value',
      redirect: 'Redirect /dir to /dir/',
      setHeaders: 'Custom header callback'
    }
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Static Options Example                                  ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Options configured:                                             ║
║   • index: ['index.html', 'index.htm']                            ║
║   • dotfiles: 'ignore'                                            ║
║   • extensions: ['html', 'htm']                                   ║
║   • maxAge: '1h' (1 hour)                                         ║
║   • etag: true                                                    ║
║   • lastModified: true                                            ║
║   • redirect: true                                                ║
║   • setHeaders: [custom function]                                 ║
║                                                                   ║
║   Test URLs:                                                      ║
║   /           Index file                                          ║
║   /test       Extension fallback -> test.html                     ║
║   /about      Extension fallback -> about.html                    ║
║   /.hidden    Dotfile (ignored)                                   ║
║   /subdir     Redirect to /subdir/                                ║
║   /subdir/    Subdirectory index                                  ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\\nCleaning up demo files...');
  try {
    fs.rmSync(demoDir, { recursive: true });
    console.log('Demo files removed.');
  } catch {
    // Ignore errors
  }
  process.exit(0);
});
