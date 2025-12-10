/**
 * Example: Full-Stack Application
 *
 * A complete web application with:
 * - Static file serving
 * - Template rendering
 * - Session authentication
 * - CRUD operations
 *
 * Run: npm run example:fullstack
 */

'use strict';

const path = require('path');
const express = require('../lib');

const app = express();

// Settings
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.cookieParser('fullstack-secret'));
app.use(express.session({ secret: 'fullstack-secret' }));

// Static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Flash messages middleware
app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  res.locals.user = req.session.user;
  next();
});

// In-memory data
const todos = [
  { id: 1, title: 'Learn Express', completed: true, userId: 1 },
  { id: 2, title: 'Build a framework', completed: false, userId: 1 }
];
let nextTodoId = 3;

const users = [
  { id: 1, username: 'demo', password: 'demo123' }
];

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.flash = { type: 'error', message: 'Please log in first' };
    return res.redirect('/login');
  }
  next();
}

// Routes

// Home page
app.get('/', (req, res) => {
  res.render('home', {
    title: 'Mini-Express Fullstack App',
    features: [
      'Static file serving',
      'Template rendering',
      'Session authentication',
      'CRUD operations',
      'Flash messages'
    ]
  });
});

// Login page
app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/todos');
  }
  res.render('login', { title: 'Login' });
});

// Login action
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    req.session.flash = { type: 'error', message: 'Invalid credentials' };
    return res.redirect('/login');
  }

  req.session.user = { id: user.id, username: user.username };
  req.session.flash = { type: 'success', message: 'Welcome back!' };
  res.redirect('/todos');
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Todos list (protected)
app.get('/todos', requireAuth, (req, res) => {
  const userTodos = todos.filter(t => t.userId === req.session.user.id);
  res.render('todos', {
    title: 'My Todos',
    todos: userTodos
  });
});

// Create todo
app.post('/todos', requireAuth, (req, res) => {
  const { title } = req.body;

  if (!title || !title.trim()) {
    req.session.flash = { type: 'error', message: 'Title is required' };
    return res.redirect('/todos');
  }

  todos.push({
    id: nextTodoId++,
    title: title.trim(),
    completed: false,
    userId: req.session.user.id
  });

  req.session.flash = { type: 'success', message: 'Todo created!' };
  res.redirect('/todos');
});

// Toggle todo
app.post('/todos/:id/toggle', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const todo = todos.find(t => t.id === id && t.userId === req.session.user.id);

  if (todo) {
    todo.completed = !todo.completed;
  }

  res.redirect('/todos');
});

// Delete todo
app.post('/todos/:id/delete', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = todos.findIndex(t => t.id === id && t.userId === req.session.user.id);

  if (index !== -1) {
    todos.splice(index, 1);
    req.session.flash = { type: 'success', message: 'Todo deleted' };
  }

  res.redirect('/todos');
});

// API endpoints (JSON)
app.get('/api/todos', requireAuth, (req, res) => {
  const userTodos = todos.filter(t => t.userId === req.session.user.id);
  res.json({ success: true, data: userTodos });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Not Found',
    message: 'The page you requested was not found.'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', {
    title: 'Error',
    message: 'An unexpected error occurred.'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Fullstack app running on http://localhost:${PORT}`);
  console.log('\nDemo credentials: demo / demo123');
  console.log('\nRoutes:');
  console.log(`  GET  http://localhost:${PORT}/`);
  console.log(`  GET  http://localhost:${PORT}/login`);
  console.log(`  GET  http://localhost:${PORT}/todos (after login)`);
});
