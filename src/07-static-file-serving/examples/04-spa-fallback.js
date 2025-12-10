/**
 * Example 04: SPA (Single Page Application) Fallback
 *
 * Demonstrates static file serving for single page applications
 * with client-side routing support.
 *
 * Run: npm run example:spa
 */

'use strict';

const path = require('node:path');
const fs = require('node:fs');
const createApp = require('../lib');

const app = createApp();

// ============================================
// SETUP: Create SPA files
// ============================================

const spaDir = path.join(__dirname, 'spa-demo');

fs.mkdirSync(path.join(spaDir, 'assets'), { recursive: true });

// Main SPA HTML - this is served for all routes
fs.writeFileSync(path.join(spaDir, 'index.html'), `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SPA Demo</title>
  <link rel="stylesheet" href="/assets/app.css">
</head>
<body>
  <div id="app">
    <nav>
      <a href="/" data-link>Home</a>
      <a href="/about" data-link>About</a>
      <a href="/users" data-link>Users</a>
      <a href="/users/123" data-link>User 123</a>
      <a href="/settings" data-link>Settings</a>
    </nav>

    <main id="content">
      <p>Loading...</p>
    </main>

    <footer>
      <p>SPA Fallback Demo - All routes serve index.html</p>
      <p>Current Path: <code id="current-path"></code></p>
    </footer>
  </div>

  <script src="/assets/app.js"></script>
</body>
</html>
`);

// SPA JavaScript with client-side routing
fs.writeFileSync(path.join(spaDir, 'assets', 'app.js'), `
(function() {
  'use strict';

  // Simple client-side router
  const routes = {
    '/': '<h1>Home</h1><p>Welcome to the SPA demo!</p>',
    '/about': '<h1>About</h1><p>This demonstrates SPA fallback routing.</p>',
    '/users': '<h1>Users</h1><p>User list would go here.</p><ul><li><a href="/users/1" data-link>User 1</a></li><li><a href="/users/2" data-link>User 2</a></li></ul>',
    '/settings': '<h1>Settings</h1><p>Settings page content.</p>'
  };

  function navigate(path) {
    // Update URL without reload
    history.pushState(null, null, path);
    render(path);
  }

  function render(path) {
    const content = document.getElementById('content');
    const pathDisplay = document.getElementById('current-path');

    // Check for exact match
    if (routes[path]) {
      content.innerHTML = routes[path];
    }
    // Check for dynamic routes (e.g., /users/:id)
    else if (path.startsWith('/users/')) {
      const userId = path.split('/')[2];
      content.innerHTML = '<h1>User ' + userId + '</h1><p>Viewing user profile for ID: ' + userId + '</p><p><a href="/users" data-link>Back to users</a></p>';
    }
    // 404
    else {
      content.innerHTML = '<h1>404 - Not Found</h1><p>Path: ' + path + '</p><p><a href="/" data-link>Go Home</a></p>';
    }

    pathDisplay.textContent = path;

    // Re-bind links
    bindLinks();
  }

  function bindLinks() {
    document.querySelectorAll('[data-link]').forEach(link => {
      link.onclick = (e) => {
        e.preventDefault();
        navigate(link.getAttribute('href'));
      };
    });
  }

  // Handle browser back/forward
  window.onpopstate = () => {
    render(location.pathname);
  };

  // Initial render
  document.addEventListener('DOMContentLoaded', () => {
    render(location.pathname);
  });
})();
`);

// SPA CSS
fs.writeFileSync(path.join(spaDir, 'assets', 'app.css'), `
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f5f5f5;
}

#app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

nav {
  background: #333;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

nav a {
  color: white;
  text-decoration: none;
  margin-right: 20px;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background 0.3s;
}

nav a:hover {
  background: rgba(255, 255, 255, 0.2);
}

main {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-height: 300px;
}

h1 {
  color: #007bff;
  margin-bottom: 1rem;
}

a {
  color: #007bff;
}

footer {
  margin-top: 20px;
  text-align: center;
  color: #666;
}

footer code {
  background: #e0e0e0;
  padding: 2px 8px;
  border-radius: 4px;
}

ul {
  margin: 1rem 0;
  padding-left: 20px;
}

li {
  margin: 0.5rem 0;
}
`);

// ============================================
// STATIC FILE SERVING
// ============================================

// Serve static assets (JS, CSS, images, etc.)
app.use(createApp.static(spaDir));

// ============================================
// API ROUTES
// ============================================

// API routes are handled before the SPA fallback
app.get('/api/users', (req, res) => {
  res.json({
    users: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' }
    ]
  });
});

app.get('/api/users/:id', (req, res) => {
  res.json({
    user: { id: req.params.id, name: 'User ' + req.params.id }
  });
});

// ============================================
// SPA FALLBACK
// ============================================

// This is the key part: serve index.html for all non-API routes
// This allows client-side routing to work
app.get('*', (req, res) => {
  // Don't serve index.html for API routes or static assets
  if (req.path.startsWith('/api/') || req.path.startsWith('/assets/')) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Serve the SPA
  res.sendFile(path.join(spaDir, 'index.html'));
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           SPA Fallback Example                                    ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   How it works:                                                   ║
║   1. Static files served normally (/assets/*)                     ║
║   2. API routes handled by Express (/api/*)                       ║
║   3. All other routes serve index.html (SPA fallback)             ║
║                                                                   ║
║   Try these URLs (all serve index.html):                          ║
║   /                                                               ║
║   /about                                                          ║
║   /users                                                          ║
║   /users/123                                                      ║
║   /any/path/here                                                  ║
║                                                                   ║
║   API endpoints (return JSON):                                    ║
║   /api/users                                                      ║
║   /api/users/1                                                    ║
║                                                                   ║
║   The client-side JavaScript handles routing!                     ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\\nCleaning up demo files...');
  try {
    fs.rmSync(spaDir, { recursive: true });
    console.log('Demo files removed.');
  } catch {
    // Ignore errors
  }
  process.exit(0);
});
