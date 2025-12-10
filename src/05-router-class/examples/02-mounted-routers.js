/**
 * Example 02: Mounted Routers
 *
 * Demonstrates mounting routers at different paths
 * to create modular API structures.
 *
 * Run: npm run example:mounted
 */

'use strict';

const createApp = require('../lib');
const Router = require('../lib/router');

const app = createApp();

// ============================================
// USERS ROUTER
// ============================================

const usersRouter = new Router();

// Fake user data
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com' }
];

usersRouter.get('/', (req, res) => {
  res.json({ users });
});

usersRouter.get('/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

usersRouter.post('/', (req, res) => {
  const newUser = {
    id: users.length + 1,
    name: 'New User',
    email: 'new@example.com'
  };
  users.push(newUser);
  res.status(201).json({ user: newUser });
});

// ============================================
// POSTS ROUTER
// ============================================

const postsRouter = new Router();

const posts = [
  { id: 1, title: 'First Post', authorId: 1 },
  { id: 2, title: 'Second Post', authorId: 2 },
  { id: 3, title: 'Third Post', authorId: 1 }
];

postsRouter.get('/', (req, res) => {
  res.json({ posts });
});

postsRouter.get('/:id', (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  res.json({ post });
});

// ============================================
// ADMIN ROUTER
// ============================================

const adminRouter = new Router();

// Admin middleware - runs for all admin routes
adminRouter.use((req, res, next) => {
  console.log('[Admin] Access attempt');
  // In real app, check authentication
  req.isAdmin = true;
  next();
});

adminRouter.get('/', (req, res) => {
  res.json({
    message: 'Admin Dashboard',
    stats: {
      users: users.length,
      posts: posts.length
    }
  });
});

adminRouter.get('/users', (req, res) => {
  res.json({
    users: users.map(u => ({
      ...u,
      _admin: true
    }))
  });
});

// ============================================
// API VERSIONING
// ============================================

const v1Router = new Router();
const v2Router = new Router();

v1Router.get('/info', (req, res) => {
  res.json({ version: '1.0', deprecated: true });
});

v2Router.get('/info', (req, res) => {
  res.json({ version: '2.0', current: true });
});

// ============================================
// MOUNT ALL ROUTERS
// ============================================

// Home page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Mounted Routers</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    .router { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2196F3; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
    h3 { margin-top: 0; }
  </style>
</head>
<body>
  <h1>Mounted Routers</h1>
  <p>Each router handles a different section of the API.</p>

  <div class="router">
    <h3>Users Router → /api/users</h3>
    <ul>
      <li><a href="/api/users">/api/users</a> - List all users</li>
      <li><a href="/api/users/1">/api/users/1</a> - Get user by ID</li>
    </ul>
  </div>

  <div class="router">
    <h3>Posts Router → /api/posts</h3>
    <ul>
      <li><a href="/api/posts">/api/posts</a> - List all posts</li>
      <li><a href="/api/posts/1">/api/posts/1</a> - Get post by ID</li>
    </ul>
  </div>

  <div class="router">
    <h3>Admin Router → /admin</h3>
    <ul>
      <li><a href="/admin">/admin</a> - Admin dashboard</li>
      <li><a href="/admin/users">/admin/users</a> - Admin users view</li>
    </ul>
  </div>

  <div class="router">
    <h3>API Versioning</h3>
    <ul>
      <li><a href="/api/v1/info">/api/v1/info</a> - API v1 (deprecated)</li>
      <li><a href="/api/v2/info">/api/v2/info</a> - API v2 (current)</li>
    </ul>
  </div>
</body>
</html>
  `);
});

// Mount routers
app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);
app.use('/admin', adminRouter);
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Mounted Routers Example                                  ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Mounted Routers:                                                ║
║   /api/users  → Users Router                                      ║
║   /api/posts  → Posts Router                                      ║
║   /admin      → Admin Router                                      ║
║   /api/v1     → API v1                                            ║
║   /api/v2     → API v2                                            ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
