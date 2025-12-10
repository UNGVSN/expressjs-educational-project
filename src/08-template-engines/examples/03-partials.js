/**
 * Example 03: Partials
 *
 * Demonstrates reusable template components with partials.
 *
 * Run: npm run example:partials
 */

'use strict';

const path = require('node:path');
const fs = require('node:fs');
const createApp = require('../lib');

const app = createApp();

// ============================================
// SETUP: Create views with partials
// ============================================

const viewsDir = path.join(__dirname, 'partial-views');
fs.mkdirSync(path.join(viewsDir, 'partials'), { recursive: true });

// Partials - reusable components
fs.writeFileSync(path.join(viewsDir, 'partials', 'header.html'), `
<header style="background: #333; color: white; padding: 20px;">
  <div style="max-width: 1000px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center;">
    <h1 style="font-size: 1.5em;">{{siteName}}</h1>
    <nav>
      <a href="/" style="color: white; margin-left: 20px;">Home</a>
      <a href="/products" style="color: white; margin-left: 20px;">Products</a>
      <a href="/cart" style="color: white; margin-left: 20px;">Cart ({{cartCount}})</a>
    </nav>
  </div>
</header>
`);

fs.writeFileSync(path.join(viewsDir, 'partials', 'footer.html'), `
<footer style="background: #f5f5f5; padding: 40px 20px; margin-top: 40px;">
  <div style="max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px;">
    <div>
      <h4>About</h4>
      <p style="color: #666; font-size: 0.9em;">{{siteName}} - Your trusted online store since {{year}}.</p>
    </div>
    <div>
      <h4>Links</h4>
      <ul style="list-style: none; padding: 0;">
        <li><a href="/privacy" style="color: #666;">Privacy Policy</a></li>
        <li><a href="/terms" style="color: #666;">Terms of Service</a></li>
        <li><a href="/contact" style="color: #666;">Contact Us</a></li>
      </ul>
    </div>
    <div>
      <h4>Newsletter</h4>
      <input type="email" placeholder="Your email" style="padding: 10px; width: 100%; border: 1px solid #ddd; border-radius: 4px;">
    </div>
  </div>
  <div style="text-align: center; margin-top: 30px; color: #999;">
    &copy; {{year}} {{siteName}}
  </div>
</footer>
`);

fs.writeFileSync(path.join(viewsDir, 'partials', 'product-card.html'), `
<div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
  <div style="height: 200px; background: {{color}}; display: flex; align-items: center; justify-content: center; color: white; font-size: 3em;">
    {{icon}}
  </div>
  <div style="padding: 20px;">
    <h3 style="margin: 0 0 10px 0;">{{name}}</h3>
    <p style="color: #666; font-size: 0.9em; margin: 0 0 15px 0;">{{description}}</p>
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 1.5em; font-weight: bold; color: #333;">{{price}}</span>
      <button style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
        Add to Cart
      </button>
    </div>
  </div>
</div>
`);

fs.writeFileSync(path.join(viewsDir, 'partials', 'alert.html'), `
<div style="padding: 15px 20px; border-radius: 4px; margin: 20px 0; background: {{background}}; border-left: 4px solid {{border}};">
  {{#if title}}<strong>{{title}}</strong>{{/if}}
  <p style="margin: {{#if title}}10px 0 0 0{{else}}0{{/if}};">{{message}}</p>
</div>
`);

// Main pages using partials
fs.writeFileSync(path.join(viewsDir, 'home.html'), `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Home | {{siteName}}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui; line-height: 1.6; color: #333; background: #f9f9f9; }
    .container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
    h2 { margin-bottom: 20px; }
  </style>
</head>
<body>
  {{> partials/header}}

  <div class="container">
    <h2>Welcome to {{siteName}}</h2>
    <p>Explore our amazing products!</p>

    {{#if notification}}
    {{> partials/alert}}
    {{/if}}

    <h3 style="margin: 40px 0 20px 0;">Featured Products</h3>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
      {{#each products}}
      {{> partials/product-card}}
      {{/each}}
    </div>
  </div>

  {{> partials/footer}}
</body>
</html>
`);

fs.writeFileSync(path.join(viewsDir, 'products.html'), `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Products | {{siteName}}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui; line-height: 1.6; color: #333; background: #f9f9f9; }
    .container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
  </style>
</head>
<body>
  {{> partials/header}}

  <div class="container">
    <h2>All Products</h2>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px;">
      {{#each products}}
      {{> partials/product-card}}
      {{/each}}
    </div>
  </div>

  {{> partials/footer}}
</body>
</html>
`);

fs.writeFileSync(path.join(viewsDir, 'cart.html'), `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cart | {{siteName}}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui; line-height: 1.6; color: #333; background: #f9f9f9; }
    .container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
    .cart-empty { text-align: center; padding: 60px 20px; background: white; border-radius: 8px; }
  </style>
</head>
<body>
  {{> partials/header}}

  <div class="container">
    <h2>Shopping Cart</h2>

    {{#if cartItems}}
      <div style="background: white; border-radius: 8px; margin-top: 20px; overflow: hidden;">
        {{#each cartItems}}
        <div style="padding: 20px; border-bottom: 1px solid #eee; display: flex; align-items: center;">
          <div style="width: 80px; height: 80px; background: {{color}}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 2em;">
            {{icon}}
          </div>
          <div style="flex: 1; margin-left: 20px;">
            <h4>{{name}}</h4>
            <p style="color: #666;">{{price}}</p>
          </div>
          <button style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Remove</button>
        </div>
        {{/each}}
      </div>
      <div style="text-align: right; margin-top: 20px;">
        <button style="background: #28a745; color: white; border: none; padding: 15px 30px; border-radius: 4px; font-size: 1.1em; cursor: pointer;">
          Checkout
        </button>
      </div>
    {{else}}
      <div class="cart-empty">
        <p style="font-size: 3em;">🛒</p>
        <h3>Your cart is empty</h3>
        <p style="color: #666;">Add some products to get started!</p>
        <a href="/products" style="display: inline-block; margin-top: 20px; background: #007bff; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
          Browse Products
        </a>
      </div>
    {{/if}}
  </div>

  {{> partials/footer}}
</body>
</html>
`);

// ============================================
// TEMPLATE ENGINE SETUP
// ============================================

app.engine('html', createApp.simpleEngine);
app.set('view engine', 'html');
app.set('views', viewsDir);

app.locals.siteName = 'Partials Shop';
app.locals.year = new Date().getFullYear();

// ============================================
// MIDDLEWARE
// ============================================

// Simulate cart
app.use((req, res, next) => {
  res.locals.cartCount = 2;
  res.locals.cartItems = [
    { name: 'Widget', price: '$29.99', color: '#007bff', icon: '⚙️' },
    { name: 'Gadget', price: '$49.99', color: '#28a745', icon: '📱' }
  ];
  next();
});

// Sample products
const products = [
  { name: 'Widget Pro', description: 'The ultimate widget for professionals', price: '$29.99', color: '#007bff', icon: '⚙️' },
  { name: 'Gadget Plus', description: 'Advanced gadget with premium features', price: '$49.99', color: '#28a745', icon: '📱' },
  { name: 'Tool Master', description: 'Professional-grade tool set', price: '$99.99', color: '#dc3545', icon: '🔧' },
  { name: 'Smart Thing', description: 'IoT device for smart homes', price: '$79.99', color: '#ffc107', icon: '💡' },
  { name: 'Power Pack', description: 'High-capacity battery pack', price: '$39.99', color: '#17a2b8', icon: '🔋' },
  { name: 'Data Hub', description: 'Centralized data management', price: '$149.99', color: '#6f42c1', icon: '💾' }
];

// ============================================
// ROUTES
// ============================================

app.get('/', (req, res) => {
  res.render('home', {
    products: products.slice(0, 3),
    notification: {
      title: 'Special Offer!',
      message: 'Get 20% off on all products this week.',
      background: '#d4edda',
      border: '#28a745'
    }
  });
});

app.get('/products', (req, res) => {
  res.render('products', { products });
});

app.get('/cart', (req, res) => {
  res.render('cart');
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Partials Example                                        ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Partials (reusable components):                                 ║
║   • header.html   - Site header with navigation                   ║
║   • footer.html   - Site footer                                   ║
║   • product-card.html - Product display card                      ║
║   • alert.html    - Notification alert                            ║
║                                                                   ║
║   Pages:                                                          ║
║   /           Home with featured products                         ║
║   /products   All products                                        ║
║   /cart       Shopping cart                                       ║
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
