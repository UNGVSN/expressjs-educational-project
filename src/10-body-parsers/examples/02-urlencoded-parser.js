/**
 * Example 02: URL-Encoded Body Parser
 *
 * Demonstrates parsing HTML form submissions.
 */

'use strict';

const createApp = require('../lib/index');
const { urlencoded } = require('../lib/index');

const app = createApp();

// ============================================
// Configure URL-Encoded Parser
// ============================================

// Use extended mode for nested object support
app.use(urlencoded({
  extended: true,       // Parse nested objects
  limit: '100kb',       // Max body size
  parameterLimit: 1000  // Max number of parameters
}));

// ============================================
// Routes
// ============================================

/**
 * Serve login form
 */
app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Login</title></head>
    <body>
      <h1>Login Form</h1>
      <form method="POST" action="/login">
        <p>
          <label>Username: <input type="text" name="username" required></label>
        </p>
        <p>
          <label>Password: <input type="password" name="password" required></label>
        </p>
        <p>
          <label><input type="checkbox" name="remember" value="yes"> Remember me</label>
        </p>
        <button type="submit">Login</button>
      </form>
    </body>
    </html>
  `);
});

/**
 * Handle login form
 */
app.post('/login', (req, res) => {
  const { username, password, remember } = req.body;

  console.log('Login attempt:', { username, remember });

  // In real app, validate credentials
  if (username && password) {
    res.send(`
      <h1>Welcome, ${username}!</h1>
      <p>Remember me: ${remember ? 'Yes' : 'No'}</p>
      <a href="/login">Back to login</a>
    `);
  } else {
    res.status(400).send('<h1>Missing credentials</h1>');
  }
});

/**
 * Serve registration form with nested fields
 */
app.get('/register', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Register</title></head>
    <body>
      <h1>Registration Form</h1>
      <form method="POST" action="/register">
        <h2>Account Info</h2>
        <p>
          <label>Email: <input type="email" name="user[email]" required></label>
        </p>
        <p>
          <label>Password: <input type="password" name="user[password]" required></label>
        </p>

        <h2>Profile</h2>
        <p>
          <label>First Name: <input type="text" name="profile[firstName]"></label>
        </p>
        <p>
          <label>Last Name: <input type="text" name="profile[lastName]"></label>
        </p>
        <p>
          <label>Age: <input type="number" name="profile[age]"></label>
        </p>

        <h2>Address</h2>
        <p>
          <label>Street: <input type="text" name="address[street]"></label>
        </p>
        <p>
          <label>City: <input type="text" name="address[city]"></label>
        </p>
        <p>
          <label>Zip: <input type="text" name="address[zip]"></label>
        </p>

        <h2>Interests</h2>
        <p>
          <label><input type="checkbox" name="interests[]" value="technology"> Technology</label>
          <label><input type="checkbox" name="interests[]" value="sports"> Sports</label>
          <label><input type="checkbox" name="interests[]" value="music"> Music</label>
          <label><input type="checkbox" name="interests[]" value="travel"> Travel</label>
        </p>

        <button type="submit">Register</button>
      </form>
    </body>
    </html>
  `);
});

/**
 * Handle registration form
 */
app.post('/register', (req, res) => {
  console.log('Registration data:', JSON.stringify(req.body, null, 2));

  const { user, profile, address, interests } = req.body;

  res.json({
    message: 'Registration received',
    data: {
      user: {
        email: user?.email,
        // Don't include password in response!
      },
      profile,
      address,
      interests: interests || []
    }
  });
});

/**
 * Dynamic form with array indices
 */
app.get('/products', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Add Products</title></head>
    <body>
      <h1>Add Products</h1>
      <form method="POST" action="/products">
        <h2>Product 1</h2>
        <p><label>Name: <input type="text" name="products[0][name]"></label></p>
        <p><label>Price: <input type="number" name="products[0][price]" step="0.01"></label></p>
        <p><label>Quantity: <input type="number" name="products[0][quantity]"></label></p>

        <h2>Product 2</h2>
        <p><label>Name: <input type="text" name="products[1][name]"></label></p>
        <p><label>Price: <input type="number" name="products[1][price]" step="0.01"></label></p>
        <p><label>Quantity: <input type="number" name="products[1][quantity]"></label></p>

        <h2>Product 3</h2>
        <p><label>Name: <input type="text" name="products[2][name]"></label></p>
        <p><label>Price: <input type="number" name="products[2][price]" step="0.01"></label></p>
        <p><label>Quantity: <input type="number" name="products[2][quantity]"></label></p>

        <button type="submit">Submit Products</button>
      </form>
    </body>
    </html>
  `);
});

/**
 * Handle product form
 */
app.post('/products', (req, res) => {
  console.log('Products:', JSON.stringify(req.body, null, 2));

  const { products } = req.body;

  // Filter out empty products
  const validProducts = (products || []).filter(p => p.name && p.price);

  res.json({
    message: 'Products received',
    count: validProducts.length,
    products: validProducts
  });
});

/**
 * API endpoint - form data
 */
app.post('/api/submit', (req, res) => {
  res.json({
    received: req.body,
    parsed: {
      isObject: typeof req.body === 'object',
      keys: Object.keys(req.body)
    }
  });
});

// ============================================
// Error Handling
// ============================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    error: err.message
  });
});

// ============================================
// Start Server
// ============================================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
===========================================
  URL-Encoded Body Parser Example
===========================================

Server running at http://localhost:${PORT}

Visit these pages in your browser:

  - http://localhost:${PORT}/login      (simple form)
  - http://localhost:${PORT}/register   (nested fields)
  - http://localhost:${PORT}/products   (array fields)

Or use curl:

  # Simple form data
  curl -X POST http://localhost:${PORT}/api/submit \\
    -d "name=John&email=john@example.com"

  # Nested objects (extended mode)
  curl -X POST http://localhost:${PORT}/api/submit \\
    -d "user[name]=John&user[email]=john@example.com"

  # Arrays
  curl -X POST http://localhost:${PORT}/api/submit \\
    -d "colors[]=red&colors[]=green&colors[]=blue"

  # Complex nested structure
  curl -X POST http://localhost:${PORT}/api/submit \\
    -d "items[0][name]=Apple&items[0][qty]=5&items[1][name]=Orange&items[1][qty]=3"

Press Ctrl+C to stop
===========================================
  `);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});
