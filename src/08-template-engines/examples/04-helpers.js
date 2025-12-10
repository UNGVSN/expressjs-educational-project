/**
 * Example 04: Template Helpers
 *
 * Demonstrates helper functions for templates.
 *
 * Run: npm run example:helpers
 */

'use strict';

const path = require('node:path');
const fs = require('node:fs');
const createApp = require('../lib');

const app = createApp();

// ============================================
// SETUP: Create views
// ============================================

const viewsDir = path.join(__dirname, 'helper-views');
fs.mkdirSync(viewsDir, { recursive: true });

fs.writeFileSync(path.join(viewsDir, 'index.html'), `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Template Helpers Demo</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    .card { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .price { color: #28a745; font-size: 1.5em; font-weight: bold; }
    .date { color: #666; font-size: 0.9em; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
    th { background: #f0f0f0; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Template Helpers Demo</h1>
  <p>This example shows how to use helper functions in templates.</p>

  <h2>Date Formatting</h2>
  <div class="card">
    <p>Raw date: {{rawDate}}</p>
    <p>Formatted: <span class="date">{{formattedDate}}</span></p>
    <p>Relative: {{relativeDate}}</p>
  </div>

  <h2>Number & Currency Formatting</h2>
  <div class="card">
    <p>Raw price: {{rawPrice}}</p>
    <p class="price">Formatted: {{formattedPrice}}</p>
    <p>With discount: <span style="text-decoration: line-through;">{{originalPrice}}</span> → <span class="price">{{discountedPrice}}</span></p>
  </div>

  <h2>Text Helpers</h2>
  <div class="card">
    <p><strong>Original:</strong> {{longText}}</p>
    <p><strong>Truncated:</strong> {{truncatedText}}</p>
    <p><strong>Slugified:</strong> <code>{{slugifiedText}}</code></p>
    <p><strong>Capitalized:</strong> {{capitalizedText}}</p>
  </div>

  <h2>Products with Helpers</h2>
  <table>
    <tr>
      <th>Name</th>
      <th>Description</th>
      <th>Price</th>
      <th>Added</th>
    </tr>
    {{#each products}}
    <tr>
      <td>{{name}}</td>
      <td>{{shortDescription}}</td>
      <td class="price">{{formattedPrice}}</td>
      <td class="date">{{formattedDate}}</td>
    </tr>
    {{/each}}
  </table>

  <h2>Conditional Helpers</h2>
  <div class="card">
    {{#if isAdmin}}
    <p style="color: green;">✓ You have admin access</p>
    {{else}}
    <p style="color: red;">✗ Regular user access</p>
    {{/if}}

    <p>Status: {{statusBadge}}</p>
  </div>

  <h2>How to Create Helpers</h2>
  <pre><code>// In app.locals - available in all views
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

// Usage in template
// {{formatDate(post.createdAt)}}
// {{formatCurrency(product.price)}}</code></pre>

  <h2>API</h2>
  <ul>
    <li><a href="/api/helpers">/api/helpers</a> - List available helpers</li>
  </ul>

  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
    <p>Generated at {{generatedAt}}</p>
  </footer>
</body>
</html>
`);

// ============================================
// TEMPLATE ENGINE SETUP
// ============================================

app.engine('html', createApp.simpleEngine);
app.set('view engine', 'html');
app.set('views', viewsDir);

// ============================================
// HELPER FUNCTIONS (app.locals)
// ============================================

// Date helpers
app.locals.formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

app.locals.relativeTime = (date) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

// Currency helpers
app.locals.formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};

app.locals.applyDiscount = (price, discountPercent) => {
  return price * (1 - discountPercent / 100);
};

// Text helpers
app.locals.truncate = (str, length = 100) => {
  if (!str) return '';
  return str.length > length ? str.slice(0, length) + '...' : str;
};

app.locals.slugify = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
};

app.locals.capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// UI helpers
app.locals.statusBadge = (status) => {
  const badges = {
    active: '<span style="background:#28a745;color:white;padding:2px 8px;border-radius:4px;">Active</span>',
    pending: '<span style="background:#ffc107;color:black;padding:2px 8px;border-radius:4px;">Pending</span>',
    inactive: '<span style="background:#dc3545;color:white;padding:2px 8px;border-radius:4px;">Inactive</span>'
  };
  return badges[status] || status;
};

// ============================================
// ROUTES
// ============================================

app.get('/', (req, res) => {
  const now = new Date();
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const longText = 'This is a very long piece of text that should be truncated when displayed in the template to keep the UI clean and readable.';

  // Pre-compute values since our simple engine doesn't execute functions
  const products = [
    {
      name: 'Widget Pro',
      description: 'Professional widget with advanced features for power users who need maximum productivity',
      price: 29.99,
      createdAt: oneWeekAgo
    },
    {
      name: 'Gadget Plus',
      description: 'The ultimate gadget for all your needs with premium support',
      price: 49.99,
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000)
    },
    {
      name: 'Tool Master',
      description: 'Complete toolkit for professionals and hobbyists alike',
      price: 99.99,
      createdAt: now
    }
  ].map(p => ({
    name: p.name,
    shortDescription: app.locals.truncate(p.description, 50),
    formattedPrice: app.locals.formatCurrency(p.price),
    formattedDate: app.locals.relativeTime(p.createdAt)
  }));

  res.render('index', {
    // Date demo
    rawDate: oneWeekAgo.toISOString(),
    formattedDate: app.locals.formatDate(oneWeekAgo),
    relativeDate: app.locals.relativeTime(oneWeekAgo),

    // Currency demo
    rawPrice: 1234.56,
    formattedPrice: app.locals.formatCurrency(1234.56),
    originalPrice: app.locals.formatCurrency(100),
    discountedPrice: app.locals.formatCurrency(app.locals.applyDiscount(100, 20)),

    // Text demo
    longText,
    truncatedText: app.locals.truncate(longText, 80),
    slugifiedText: app.locals.slugify('Hello World! This is a Test'),
    capitalizedText: app.locals.capitalize('hello WORLD'),

    // Products
    products,

    // Conditional
    isAdmin: true,
    statusBadge: app.locals.statusBadge('active'),

    // Footer
    generatedAt: app.locals.formatDate(now)
  });
});

app.get('/api/helpers', (req, res) => {
  res.json({
    available: [
      { name: 'formatDate', description: 'Format date to locale string', example: 'formatDate(date)' },
      { name: 'relativeTime', description: 'Convert date to relative time', example: 'relativeTime(date)' },
      { name: 'formatCurrency', description: 'Format number as currency', example: 'formatCurrency(amount)' },
      { name: 'applyDiscount', description: 'Calculate discounted price', example: 'applyDiscount(price, percent)' },
      { name: 'truncate', description: 'Truncate text with ellipsis', example: 'truncate(str, length)' },
      { name: 'slugify', description: 'Convert text to URL slug', example: 'slugify(str)' },
      { name: 'capitalize', description: 'Capitalize first letter', example: 'capitalize(str)' },
      { name: 'statusBadge', description: 'Generate status badge HTML', example: 'statusBadge(status)' }
    ],
    note: 'Helpers are defined in app.locals and available in all views'
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Template Helpers Example                                ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Available Helpers:                                              ║
║   • formatDate(date)       - Format date                          ║
║   • relativeTime(date)     - "2 days ago"                         ║
║   • formatCurrency(amount) - "$1,234.56"                          ║
║   • applyDiscount(price, %) - Calculate discount                  ║
║   • truncate(str, len)     - Truncate with "..."                  ║
║   • slugify(str)           - URL-safe slug                        ║
║   • capitalize(str)        - First letter upper                   ║
║   • statusBadge(status)    - HTML badge                           ║
║                                                                   ║
║   Pages:                                                          ║
║   /           Helper demos                                        ║
║   /api/helpers List helpers                                       ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});

// Cleanup
process.on('SIGINT', () => {
  console.log('\\nCleaning up demo files...');
  try { fs.rmSync(viewsDir, { recursive: true }); } catch {}
  process.exit(0);
});
