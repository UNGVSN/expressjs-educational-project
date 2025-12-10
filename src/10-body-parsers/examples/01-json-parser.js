/**
 * Example 01: JSON Body Parser
 *
 * Demonstrates parsing JSON request bodies.
 */

'use strict';

const createApp = require('../lib/index');
const { json } = require('../lib/index');

const app = createApp();

// ============================================
// Configure JSON Parser
// ============================================

app.use(json({
  limit: '100kb',   // Max body size
  strict: true      // Only accept objects and arrays
}));

// ============================================
// Routes
// ============================================

/**
 * Basic JSON endpoint
 */
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;

  // Validate
  if (!name || !email) {
    return res.status(400).json({
      error: 'Name and email are required'
    });
  }

  res.status(201).json({
    message: 'User created',
    user: { id: Date.now(), name, email }
  });
});

/**
 * Echo endpoint - returns what it receives
 */
app.post('/api/echo', (req, res) => {
  res.json({
    received: req.body,
    headers: {
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length']
    }
  });
});

/**
 * Nested data example
 */
app.post('/api/orders', (req, res) => {
  const { customer, items, shipping } = req.body;

  // Basic validation
  if (!customer || !items || !Array.isArray(items)) {
    return res.status(400).json({
      error: 'Invalid order data'
    });
  }

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  res.status(201).json({
    orderId: `ORD-${Date.now()}`,
    customer,
    items,
    shipping,
    total: total.toFixed(2),
    status: 'pending'
  });
});

/**
 * Bulk data example
 */
app.post('/api/bulk', (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({
      error: 'Expected array of items'
    });
  }

  res.json({
    processed: items.length,
    results: items.map((item, idx) => ({
      id: idx + 1,
      ...item,
      status: 'processed'
    }))
  });
});

// ============================================
// Error Handling
// ============================================

// Handle parse errors
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'The request body could not be parsed as JSON'
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request body exceeds the 100kb limit'
    });
  }

  next(err);
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error'
  });
});

// ============================================
// Start Server
// ============================================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
===========================================
  JSON Body Parser Example
===========================================

Server running at http://localhost:${PORT}

Try these requests:

  # Create user
  curl -X POST http://localhost:${PORT}/api/users \\
    -H "Content-Type: application/json" \\
    -d '{"name":"John Doe","email":"john@example.com"}'

  # Echo data
  curl -X POST http://localhost:${PORT}/api/echo \\
    -H "Content-Type: application/json" \\
    -d '{"any":"data","nested":{"works":true}}'

  # Create order
  curl -X POST http://localhost:${PORT}/api/orders \\
    -H "Content-Type: application/json" \\
    -d '{
      "customer":{"name":"Jane","email":"jane@example.com"},
      "items":[
        {"name":"Widget","price":9.99,"quantity":2},
        {"name":"Gadget","price":19.99,"quantity":1}
      ],
      "shipping":{"method":"express","address":"123 Main St"}
    }'

  # Bulk processing
  curl -X POST http://localhost:${PORT}/api/bulk \\
    -H "Content-Type: application/json" \\
    -d '{"items":[{"name":"item1"},{"name":"item2"},{"name":"item3"}]}'

  # Test invalid JSON (will return 400)
  curl -X POST http://localhost:${PORT}/api/echo \\
    -H "Content-Type: application/json" \\
    -d 'not valid json'

Press Ctrl+C to stop
===========================================
  `);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});
