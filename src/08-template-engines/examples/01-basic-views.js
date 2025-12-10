/**
 * Example 01: Basic View Rendering
 *
 * Demonstrates fundamental template engine usage with res.render().
 *
 * Run: npm run example:basic
 */

'use strict';

const path = require('node:path');
const createApp = require('../lib');

const app = createApp();

// ============================================
// TEMPLATE ENGINE SETUP
// ============================================

// Register the simple template engine for .html files
app.engine('html', createApp.simpleEngine);

// Set the default view engine
app.set('view engine', 'html');

// Set the views directory
app.set('views', path.join(__dirname, 'views'));

// ============================================
// APP.LOCALS - Application-wide data
// ============================================

// These are available in ALL views
app.locals.siteName = 'Template Demo';
app.locals.year = new Date().getFullYear();
app.locals.version = '1.0.0';

// ============================================
// MIDDLEWARE - Request-specific data
// ============================================

// Simulate user authentication
app.use((req, res, next) => {
  // res.locals are available in views for THIS request only
  res.locals.user = {
    name: 'John Doe',
    email: 'john@example.com'
  };
  next();
});

// ============================================
// ROUTES
// ============================================

// Home page
app.get('/', (req, res) => {
  // Pass view-specific data to render()
  res.render('index', {
    title: 'Home',
    message: 'Welcome to the template engine demo!'
  });
});

// Users list
app.get('/users', (req, res) => {
  const users = [
    { name: 'Alice', email: 'alice@example.com', role: 'admin', bio: 'System administrator' },
    { name: 'Bob', email: 'bob@example.com', role: 'user' },
    { name: 'Charlie', email: 'charlie@example.com', role: 'user', bio: 'Software developer' }
  ];

  res.render('users', {
    title: 'Users',
    users
  });
});

// About page
app.get('/about', (req, res) => {
  res.render('about', {
    title: 'About',
    env: app.get('env')
  });
});

// API - Render to string (using callback)
app.get('/api/preview', (req, res) => {
  app.render('index', {
    title: 'Preview',
    message: 'This is a rendered preview',
    siteName: app.locals.siteName,
    year: app.locals.year
  }, (err, html) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      preview: html.substring(0, 500) + '...',
      length: html.length
    });
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Basic View Rendering                                    ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   View Engine: html (Simple Mustache-like)                        ║
║   Views Directory: ${path.join(__dirname, 'views').slice(-40)}   ║
║                                                                   ║
║   Data Sources:                                                   ║
║   • app.locals: siteName, year, version                           ║
║   • res.locals: user (from middleware)                            ║
║   • render(): title, message, users                               ║
║                                                                   ║
║   Pages:                                                          ║
║   /           Home page                                           ║
║   /users      Users list                                          ║
║   /about      About page                                          ║
║   /api/preview  Render preview                                    ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
