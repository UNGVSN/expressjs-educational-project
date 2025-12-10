/**
 * Example 03: Application Locals
 *
 * Demonstrates app.locals for sharing data across views and requests.
 *
 * Run: npm run example:locals
 */

'use strict';

const createApp = require('../lib');

const app = createApp();

// ============================================
// SETTING UP APP.LOCALS
// ============================================

// App-wide data available in all views
app.locals.appName = 'My Awesome App';
app.locals.appVersion = '2.0.0';
app.locals.copyright = `© ${new Date().getFullYear()} My Company`;

// Helper functions available in templates
app.locals.formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

app.locals.formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

app.locals.truncate = (str, length = 100) => {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
};

// Site navigation (shared across pages)
app.locals.navigation = [
  { url: '/', label: 'Home', icon: '🏠' },
  { url: '/products', label: 'Products', icon: '📦' },
  { url: '/about', label: 'About', icon: 'ℹ️' },
  { url: '/contact', label: 'Contact', icon: '📧' }
];

// ============================================
// MIDDLEWARE TO DEMONSTRATE res.locals
// ============================================

// res.locals are per-request, app.locals are app-wide
app.use((req, res, next) => {
  // Add request-specific data to res.locals
  res.locals.requestTime = new Date().toISOString();
  res.locals.requestId = Math.random().toString(36).substring(7);
  res.locals.currentPath = req.path;
  next();
});

// ============================================
// ROUTES
// ============================================

app.get('/', (req, res) => {
  // Both app.locals and res.locals would be available in views
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${app.locals.appName} - Home</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    nav { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    nav a { margin-right: 15px; text-decoration: none; color: #333; }
    nav a:hover { color: #007bff; }
    nav a.active { color: #007bff; font-weight: bold; }
    .box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .meta { color: #666; font-size: 0.9em; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <nav>
    ${app.locals.navigation.map(item =>
      `<a href="${item.url}" class="${res.locals.currentPath === item.url ? 'active' : ''}">${item.icon} ${item.label}</a>`
    ).join('')}
  </nav>

  <h1>${app.locals.appName}</h1>
  <p class="meta">Version ${app.locals.appVersion} | Request ID: ${res.locals.requestId}</p>

  <div class="box">
    <h2>Application Locals (app.locals)</h2>
    <p>Data shared across ALL requests and views:</p>
    <table>
      <tr><th>Key</th><th>Value</th><th>Type</th></tr>
      <tr><td>appName</td><td>${app.locals.appName}</td><td>string</td></tr>
      <tr><td>appVersion</td><td>${app.locals.appVersion}</td><td>string</td></tr>
      <tr><td>copyright</td><td>${app.locals.copyright}</td><td>string</td></tr>
      <tr><td>formatDate</td><td>[Function]</td><td>function</td></tr>
      <tr><td>formatCurrency</td><td>[Function]</td><td>function</td></tr>
      <tr><td>truncate</td><td>[Function]</td><td>function</td></tr>
      <tr><td>navigation</td><td>[${app.locals.navigation.length} items]</td><td>array</td></tr>
    </table>
  </div>

  <div class="box">
    <h2>Response Locals (res.locals)</h2>
    <p>Data specific to THIS request only:</p>
    <table>
      <tr><th>Key</th><th>Value</th></tr>
      <tr><td>requestTime</td><td>${res.locals.requestTime}</td></tr>
      <tr><td>requestId</td><td>${res.locals.requestId}</td></tr>
      <tr><td>currentPath</td><td>${res.locals.currentPath}</td></tr>
    </table>
  </div>

  <div class="box">
    <h2>Helper Functions Demo</h2>
    <ul>
      <li>formatDate('2024-01-15'): <strong>${app.locals.formatDate('2024-01-15')}</strong></li>
      <li>formatCurrency(1234.56): <strong>${app.locals.formatCurrency(1234.56)}</strong></li>
      <li>truncate('Lorem ipsum...', 20): <strong>${app.locals.truncate('Lorem ipsum dolor sit amet', 20)}</strong></li>
    </ul>
  </div>

  <h2>API Endpoints</h2>
  <ul>
    <li><a href="/api/locals">/api/locals</a> - View app.locals as JSON</li>
    <li><a href="/products">/products</a> - Products page (uses locals)</li>
  </ul>

  <h2>Code Example</h2>
  <pre><code>// Set app-wide locals
app.locals.appName = 'My App';
app.locals.formatDate = (d) => new Date(d).toLocaleDateString();

// Set request-specific locals in middleware
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.requestId = generateId();
  next();
});

// In views/templates, both are available:
// &lt;h1&gt;{{ appName }}&lt;/h1&gt;          &lt;-- from app.locals
// &lt;p&gt;Welcome {{ user.name }}&lt;/p&gt;  &lt;-- from res.locals</code></pre>

  <footer class="meta" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
    ${app.locals.copyright}
  </footer>
</body>
</html>
  `);
});

// Products page demonstrating locals usage
app.get('/products', (req, res) => {
  // Sample products data
  const products = [
    { id: 1, name: 'Widget Pro', price: 29.99, date: '2024-01-15' },
    { id: 2, name: 'Gadget Plus', price: 49.99, date: '2024-02-20' },
    { id: 3, name: 'Tool Master', price: 99.99, date: '2024-03-10' }
  ];

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${app.locals.appName} - Products</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    nav { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    nav a { margin-right: 15px; text-decoration: none; color: #333; }
    nav a:hover { color: #007bff; }
    nav a.active { color: #007bff; font-weight: bold; }
    .product { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .price { color: #28a745; font-weight: bold; font-size: 1.2em; }
    .date { color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <nav>
    ${app.locals.navigation.map(item =>
      `<a href="${item.url}" class="${res.locals.currentPath === item.url ? 'active' : ''}">${item.icon} ${item.label}</a>`
    ).join('')}
  </nav>

  <h1>Products</h1>
  <p>Request ID: ${res.locals.requestId}</p>

  ${products.map(product => `
    <div class="product">
      <h3>${product.name}</h3>
      <p class="price">${app.locals.formatCurrency(product.price)}</p>
      <p class="date">Added: ${app.locals.formatDate(product.date)}</p>
    </div>
  `).join('')}

  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
    ${app.locals.copyright}
  </footer>
</body>
</html>
  `);
});

// API endpoint
app.get('/api/locals', (req, res) => {
  // Return app.locals (excluding functions for JSON)
  const locals = {};
  for (const [key, value] of Object.entries(app.locals)) {
    if (typeof value === 'function') {
      locals[key] = '[Function]';
    } else {
      locals[key] = value;
    }
  }

  res.json({
    'app.locals': locals,
    'res.locals': res.locals,
    note: 'app.locals persist across requests, res.locals are per-request'
  });
});

// About page
app.get('/about', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${app.locals.appName} - About</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    nav { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    nav a { margin-right: 15px; text-decoration: none; color: #333; }
    nav a.active { color: #007bff; font-weight: bold; }
  </style>
</head>
<body>
  <nav>
    ${app.locals.navigation.map(item =>
      `<a href="${item.url}" class="${res.locals.currentPath === item.url ? 'active' : ''}">${item.icon} ${item.label}</a>`
    ).join('')}
  </nav>
  <h1>About ${app.locals.appName}</h1>
  <p>Version: ${app.locals.appVersion}</p>
  <p>This example demonstrates how app.locals provides shared data across all views.</p>
  <footer style="margin-top: 40px; color: #666;">${app.locals.copyright}</footer>
</body>
</html>
  `);
});

// Contact page
app.get('/contact', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${app.locals.appName} - Contact</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    nav { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    nav a { margin-right: 15px; text-decoration: none; color: #333; }
    nav a.active { color: #007bff; font-weight: bold; }
  </style>
</head>
<body>
  <nav>
    ${app.locals.navigation.map(item =>
      `<a href="${item.url}" class="${res.locals.currentPath === item.url ? 'active' : ''}">${item.icon} ${item.label}</a>`
    ).join('')}
  </nav>
  <h1>Contact Us</h1>
  <p>Request processed at: ${res.locals.requestTime}</p>
  <footer style="margin-top: 40px; color: #666;">${app.locals.copyright}</footer>
</body>
</html>
  `);
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Application Locals Example                              ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   app.locals configured:                                          ║
║   • appName: ${app.locals.appName}                             ║
║   • appVersion: ${app.locals.appVersion}                                     ║
║   • copyright: ${app.locals.copyright}                          ║
║   • Helper functions: formatDate, formatCurrency, truncate        ║
║   • navigation: ${app.locals.navigation.length} items                                       ║
║                                                                   ║
║   Pages:                                                          ║
║   /           Home page                                           ║
║   /products   Products listing                                    ║
║   /about      About page                                          ║
║   /contact    Contact page                                        ║
║   /api/locals View locals as JSON                                 ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
