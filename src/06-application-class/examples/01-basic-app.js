/**
 * Example 01: Basic Application
 *
 * Demonstrates the core Application class features.
 *
 * Run: npm run example:basic
 */

'use strict';

const createApp = require('../lib');

const app = createApp();

// ============================================
// APPLICATION SETUP
// ============================================

// Middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ============================================
// ROUTES
// ============================================

// Home page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Basic Application</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; }
    .box { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 8px; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Basic Application</h1>
  <p>Environment: <code>${app.get('env')}</code></p>

  <div class="box">
    <h3>Application Features</h3>
    <ul>
      <li>Settings system (app.set, app.get)</li>
      <li>Middleware support (app.use)</li>
      <li>Route handling (app.get, app.post, etc.)</li>
      <li>Response helpers (res.json, res.send, etc.)</li>
      <li>Request enhancements (req.query, req.params, etc.)</li>
    </ul>
  </div>

  <div class="box">
    <h3>Try These Endpoints</h3>
    <ul>
      <li><a href="/api/info">/api/info</a> - App information</li>
      <li><a href="/api/users">/api/users</a> - List users</li>
      <li><a href="/api/users/1">/api/users/1</a> - Get user by ID</li>
      <li><a href="/search?q=test&page=1">/search?q=test&page=1</a> - Query params</li>
    </ul>
  </div>

  <div class="box">
    <h3>Creating the App</h3>
    <pre><code>const createApp = require('../lib');
const app = createApp();

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(3000);</code></pre>
  </div>
</body>
</html>
  `);
});

// API info
app.get('/api/info', (req, res) => {
  res.json({
    app: 'Mini-Express',
    environment: app.get('env'),
    poweredBy: app.enabled('x-powered-by'),
    settings: {
      'trust proxy': app.get('trust proxy'),
      'strict routing': app.get('strict routing')
    }
  });
});

// Users endpoint
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
];

app.get('/api/users', (req, res) => {
  res.json({ users });
});

app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

// Search with query params
app.get('/search', (req, res) => {
  res.json({
    query: req.query,
    path: req.path,
    originalUrl: req.originalUrl
  });
});

// POST example
app.post('/api/users', (req, res) => {
  res.status(201).json({
    message: 'User created',
    user: { id: users.length + 1, name: 'New User' }
  });
});

// Route chaining
app.route('/api/resource')
  .get((req, res) => res.json({ method: 'GET' }))
  .post((req, res) => res.json({ method: 'POST' }))
  .put((req, res) => res.json({ method: 'PUT' }))
  .delete((req, res) => res.json({ method: 'DELETE' }));

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Basic Application Example                                ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║   Environment: ${app.get('env')}                                       ║
║                                                                   ║
║   Endpoints:                                                      ║
║   GET  /              Home page                                   ║
║   GET  /api/info      App information                             ║
║   GET  /api/users     List users                                  ║
║   GET  /api/users/:id Get user                                    ║
║   POST /api/users     Create user                                 ║
║   GET  /search        Query parameters                            ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
