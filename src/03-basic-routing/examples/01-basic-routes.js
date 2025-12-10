/**
 * Example 01: Basic Routes
 *
 * This example demonstrates basic route registration
 * using different HTTP methods.
 *
 * Run: npm run example:basic
 */

'use strict';

const { createApplication } = require('../lib');

const app = createApplication();

// Home route
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Basic Routing Demo</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; }
    .route { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
    .method { font-weight: bold; }
    .get { color: #61affe; }
    .post { color: #49cc90; }
    .put { color: #fca130; }
    .delete { color: #f93e3e; }
  </style>
</head>
<body>
  <h1>Basic Routing</h1>
  <p>Routes map HTTP methods and paths to handler functions.</p>

  <div class="route">
    <span class="method get">GET</span> <a href="/">/</a>
    <p>Home page (this page)</p>
  </div>

  <div class="route">
    <span class="method get">GET</span> <a href="/about">/about</a>
    <p>About page</p>
  </div>

  <div class="route">
    <span class="method get">GET</span> <a href="/users">/users</a>
    <p>List all users (JSON)</p>
  </div>

  <div class="route">
    <span class="method get">GET</span> <a href="/users/1">/users/:id</a>
    <p>Get single user</p>
  </div>

  <div class="route">
    <span class="method post">POST</span> <code>/users</code>
    <p><code>curl -X POST http://localhost:3000/users</code></p>
  </div>

  <div class="route">
    <span class="method put">PUT</span> <code>/users/:id</code>
    <p><code>curl -X PUT http://localhost:3000/users/1</code></p>
  </div>

  <div class="route">
    <span class="method delete">DELETE</span> <code>/users/:id</code>
    <p><code>curl -X DELETE http://localhost:3000/users/1</code></p>
  </div>
</body>
</html>
  `);
});

// About page
app.get('/about', (req, res) => {
  res.send('<h1>About</h1><p>This is the about page.</p><p><a href="/">Back</a></p>');
});

// Sample users data
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com' }
];

// List users
app.get('/users', (req, res) => {
  res.json(users);
});

// Get single user
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// Create user
app.post('/users', (req, res) => {
  res.status(201).json({
    message: 'User would be created',
    method: 'POST',
    note: 'Body parsing comes in Step 10'
  });
});

// Update user
app.put('/users/:id', (req, res) => {
  res.json({
    message: `User ${req.params.id} would be updated`,
    method: 'PUT'
  });
});

// Delete user
app.delete('/users/:id', (req, res) => {
  res.json({
    message: `User ${req.params.id} would be deleted`,
    method: 'DELETE'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Basic Routing Example                                    ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Open in browser or try these curl commands:                     ║
║                                                                   ║
║   curl http://localhost:${PORT}/users                               ║
║   curl http://localhost:${PORT}/users/1                             ║
║   curl -X POST http://localhost:${PORT}/users                       ║
║   curl -X PUT http://localhost:${PORT}/users/1                      ║
║   curl -X DELETE http://localhost:${PORT}/users/1                   ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
