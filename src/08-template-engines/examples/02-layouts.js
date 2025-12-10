/**
 * Example 02: Layouts
 *
 * Demonstrates layout patterns for consistent page structure.
 *
 * Run: npm run example:layouts
 */

'use strict';

const path = require('node:path');
const fs = require('node:fs');
const createApp = require('../lib');

const app = createApp();

// ============================================
// SETUP: Create layout views
// ============================================

const viewsDir = path.join(__dirname, 'layout-views');
fs.mkdirSync(path.join(viewsDir, 'layouts'), { recursive: true });

// Main layout
fs.writeFileSync(path.join(viewsDir, 'layouts', 'main.html'), `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{{title}} | {{siteName}}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui; line-height: 1.6; color: #333; }
    header { background: #333; color: white; padding: 20px; }
    header h1 { font-size: 1.5em; }
    nav { background: #444; padding: 10px 20px; }
    nav a { color: white; text-decoration: none; margin-right: 20px; }
    nav a:hover { text-decoration: underline; }
    main { max-width: 800px; margin: 40px auto; padding: 0 20px; }
    footer { background: #f5f5f5; padding: 20px; text-align: center; margin-top: 40px; }
    .content { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <header>
    <h1>{{siteName}}</h1>
  </header>

  <nav>
    <a href="/">Home</a>
    <a href="/blog">Blog</a>
    <a href="/contact">Contact</a>
  </nav>

  <main>
    <div class="content">
      {{{body}}}
    </div>
  </main>

  <footer>
    <p>&copy; {{year}} {{siteName}}. All rights reserved.</p>
  </footer>
</body>
</html>
`);

// Admin layout
fs.writeFileSync(path.join(viewsDir, 'layouts', 'admin.html'), `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{{title}} | Admin Panel</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui; display: flex; min-height: 100vh; }
    .sidebar { width: 250px; background: #2c3e50; color: white; padding: 20px; }
    .sidebar h2 { margin-bottom: 20px; font-size: 1.2em; }
    .sidebar a { display: block; color: #ecf0f1; padding: 10px; text-decoration: none; border-radius: 4px; margin: 5px 0; }
    .sidebar a:hover { background: #34495e; }
    .main-content { flex: 1; padding: 20px; background: #f5f5f5; }
    .main-content h1 { margin-bottom: 20px; color: #333; }
    .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <aside class="sidebar">
    <h2>Admin Panel</h2>
    <a href="/admin">Dashboard</a>
    <a href="/admin/users">Users</a>
    <a href="/admin/settings">Settings</a>
    <a href="/">← Back to Site</a>
  </aside>

  <div class="main-content">
    <h1>{{title}}</h1>
    <div class="card">
      {{{body}}}
    </div>
  </div>
</body>
</html>
`);

// Page templates
fs.writeFileSync(path.join(viewsDir, 'home.html'), `
<h2>Welcome Home</h2>
<p>{{message}}</p>
<p>This page uses the <strong>main</strong> layout.</p>
`);

fs.writeFileSync(path.join(viewsDir, 'blog.html'), `
<h2>Blog</h2>
{{#each posts}}
<article style="margin: 20px 0; padding-bottom: 20px; border-bottom: 1px solid #eee;">
  <h3>{{title}}</h3>
  <p style="color: #666; font-size: 0.9em;">{{date}}</p>
  <p>{{excerpt}}</p>
</article>
{{/each}}
`);

fs.writeFileSync(path.join(viewsDir, 'contact.html'), `
<h2>Contact Us</h2>
<p>Get in touch using the form below.</p>
<form style="margin-top: 20px;">
  <div style="margin-bottom: 15px;">
    <label style="display: block; margin-bottom: 5px;">Name</label>
    <input type="text" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
  </div>
  <div style="margin-bottom: 15px;">
    <label style="display: block; margin-bottom: 5px;">Email</label>
    <input type="email" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
  </div>
  <div style="margin-bottom: 15px;">
    <label style="display: block; margin-bottom: 5px;">Message</label>
    <textarea rows="5" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
  </div>
  <button type="submit" style="background: #333; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Send Message</button>
</form>
`);

fs.writeFileSync(path.join(viewsDir, 'admin-dashboard.html'), `
<p>Welcome to the admin panel, <strong>{{user.name}}</strong>!</p>

<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px;">
  <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; text-align: center;">
    <h3 style="font-size: 2em; color: #1976d2;">{{stats.users}}</h3>
    <p>Total Users</p>
  </div>
  <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; text-align: center;">
    <h3 style="font-size: 2em; color: #388e3c;">{{stats.posts}}</h3>
    <p>Blog Posts</p>
  </div>
  <div style="background: #fff3e0; padding: 20px; border-radius: 8px; text-align: center;">
    <h3 style="font-size: 2em; color: #f57c00;">{{stats.comments}}</h3>
    <p>Comments</p>
  </div>
</div>
`);

// ============================================
// TEMPLATE ENGINE SETUP
// ============================================

app.engine('html', createApp.simpleEngine);
app.set('view engine', 'html');
app.set('views', viewsDir);

app.locals.siteName = 'Layout Demo';
app.locals.year = new Date().getFullYear();

// ============================================
// MIDDLEWARE - Render with layout helper
// ============================================

// Add renderWithLayout helper
app.use((req, res, next) => {
  res.renderWithLayout = function(view, layoutName, options = {}) {
    const app = this.app;

    // First render the page content
    app.render(view, { ...app.locals, ...res.locals, ...options }, (err, body) => {
      if (err) return next(err);

      // Then render the layout with the body
      const layoutPath = `layouts/${layoutName}`;
      app.render(layoutPath, { ...app.locals, ...res.locals, ...options, body }, (err, html) => {
        if (err) return next(err);
        this.send(html);
      });
    });
  };

  next();
});

// Simulate admin user
app.use((req, res, next) => {
  res.locals.user = { name: 'Admin User', role: 'admin' };
  next();
});

// ============================================
// ROUTES - Public pages with main layout
// ============================================

app.get('/', (req, res) => {
  res.renderWithLayout('home', 'main', {
    title: 'Home',
    message: 'This is the homepage content rendered inside a layout.'
  });
});

app.get('/blog', (req, res) => {
  res.renderWithLayout('blog', 'main', {
    title: 'Blog',
    posts: [
      { title: 'Getting Started with Express', date: 'December 1, 2024', excerpt: 'Learn the basics of Express.js framework...' },
      { title: 'Template Engines Explained', date: 'November 28, 2024', excerpt: 'Understanding how template engines work...' },
      { title: 'Building REST APIs', date: 'November 25, 2024', excerpt: 'A comprehensive guide to REST API development...' }
    ]
  });
});

app.get('/contact', (req, res) => {
  res.renderWithLayout('contact', 'main', {
    title: 'Contact'
  });
});

// ============================================
// ROUTES - Admin pages with admin layout
// ============================================

app.get('/admin', (req, res) => {
  res.renderWithLayout('admin-dashboard', 'admin', {
    title: 'Dashboard',
    stats: { users: 1234, posts: 56, comments: 789 }
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Layouts Example                                         ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Layouts:                                                        ║
║   • main.html  - Public pages layout                              ║
║   • admin.html - Admin panel layout                               ║
║                                                                   ║
║   Public Pages (main layout):                                     ║
║   /           Home page                                           ║
║   /blog       Blog posts                                          ║
║   /contact    Contact form                                        ║
║                                                                   ║
║   Admin Pages (admin layout):                                     ║
║   /admin      Dashboard                                           ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\\nCleaning up demo files...');
  try {
    fs.rmSync(viewsDir, { recursive: true });
  } catch {}
  process.exit(0);
});
