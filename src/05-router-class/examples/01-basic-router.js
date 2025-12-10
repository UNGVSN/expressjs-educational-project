/**
 * Example 01: Basic Router Usage
 *
 * Demonstrates creating and using a Router instance.
 *
 * Run: npm run example:basic
 */

'use strict';

const createApp = require('../lib');
const Router = require('../lib/router');

const app = createApp();

// ============================================
// CREATE A ROUTER
// ============================================

const router = new Router();

// Router-level middleware
router.use((req, res, next) => {
  console.log(`[Router] ${req.method} ${req.url}`);
  req.routerTime = Date.now();
  next();
});

// Router routes (relative to mount point)
router.get('/', (req, res) => {
  res.json({
    message: 'Router root',
    routerTime: req.routerTime
  });
});

router.get('/hello', (req, res) => {
  res.json({ message: 'Hello from router!' });
});

router.get('/items', (req, res) => {
  res.json({
    items: [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' }
    ]
  });
});

router.get('/items/:id', (req, res) => {
  res.json({
    item: {
      id: req.params.id,
      name: `Item ${req.params.id}`
    }
  });
});

// POST route
router.post('/items', (req, res) => {
  res.status(201).json({
    message: 'Item created',
    id: Date.now()
  });
});

// Route chaining
router.route('/resource')
  .get((req, res) => res.json({ method: 'GET', resource: true }))
  .post((req, res) => res.json({ method: 'POST', resource: true }))
  .put((req, res) => res.json({ method: 'PUT', resource: true }))
  .delete((req, res) => res.json({ method: 'DELETE', resource: true }));

// ============================================
// MOUNT ROUTER ON APP
// ============================================

// Global middleware
app.use((req, res, next) => {
  console.log(`[App] ${req.method} ${req.url}`);
  next();
});

// Home page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Basic Router</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; }
    .box { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 8px; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Basic Router Example</h1>

  <div class="box">
    <h3>Router Mounted at /api</h3>
    <p>The router handles all /api/* routes.</p>
    <ul>
      <li><a href="/api">/api</a> - Router root</li>
      <li><a href="/api/hello">/api/hello</a> - Hello route</li>
      <li><a href="/api/items">/api/items</a> - List items</li>
      <li><a href="/api/items/42">/api/items/42</a> - Get item</li>
      <li><a href="/api/resource">/api/resource</a> - Route chaining</li>
    </ul>
  </div>

  <div class="box">
    <h3>How It Works</h3>
    <pre><code>// Create router
const router = new Router();

// Add routes to router
router.get('/items', handler);
router.get('/items/:id', handler);

// Mount router at /api
app.use('/api', router);</code></pre>
  </div>

  <div class="box">
    <h3>Watch the Console</h3>
    <p>Notice how both app-level and router-level middleware log requests.</p>
  </div>
</body>
</html>
  `);
});

// Mount the router at /api
app.use('/api', router);

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Basic Router Example                                     ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Router mounted at /api                                          ║
║                                                                   ║
║   Try these endpoints:                                            ║
║   http://localhost:${PORT}/api                                      ║
║   http://localhost:${PORT}/api/hello                                ║
║   http://localhost:${PORT}/api/items                                ║
║   http://localhost:${PORT}/api/items/42                             ║
║   http://localhost:${PORT}/api/resource                             ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
