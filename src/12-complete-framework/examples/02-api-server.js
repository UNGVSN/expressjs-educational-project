/**
 * Example: REST API Server
 *
 * A complete REST API with:
 * - CRUD operations
 * - JSON body parsing
 * - Validation middleware
 * - Error handling
 *
 * Run: npm run example:api
 */

'use strict';

const express = require('../lib');

const app = express();

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// In-memory database
const db = {
  users: [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' }
  ],
  nextId: 3
};

// API Router
const api = express.Router();

// List all users
api.get('/users', (req, res) => {
  res.json({
    success: true,
    data: db.users,
    count: db.users.length
  });
});

// Get single user
api.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = db.users.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  res.json({
    success: true,
    data: user
  });
});

// Create user
api.post('/users', (req, res) => {
  const { name, email } = req.body;

  // Validation
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      error: 'Name and email are required'
    });
  }

  // Check duplicate email
  if (db.users.some(u => u.email === email)) {
    return res.status(409).json({
      success: false,
      error: 'Email already exists'
    });
  }

  // Create user
  const user = {
    id: db.nextId++,
    name,
    email
  };

  db.users.push(user);

  res.status(201).json({
    success: true,
    data: user
  });
});

// Update user
api.put('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = db.users.findIndex(u => u.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  const { name, email } = req.body;

  // Update fields
  if (name) db.users[index].name = name;
  if (email) db.users[index].email = email;

  res.json({
    success: true,
    data: db.users[index]
  });
});

// Delete user
api.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = db.users.findIndex(u => u.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  const deleted = db.users.splice(index, 1)[0];

  res.json({
    success: true,
    data: deleted,
    message: 'User deleted'
  });
});

// Health check
api.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Mount API router
app.use('/api', api);

// API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'Mini-Express REST API',
    version: '1.0.0',
    endpoints: {
      'GET /api/users': 'List all users',
      'GET /api/users/:id': 'Get user by ID',
      'POST /api/users': 'Create new user (body: { name, email })',
      'PUT /api/users/:id': 'Update user (body: { name?, email? })',
      'DELETE /api/users/:id': 'Delete user',
      'GET /api/health': 'Health check'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`REST API running on http://localhost:${PORT}`);
  console.log('\nAPI Endpoints:');
  console.log(`  GET    http://localhost:${PORT}/api/users`);
  console.log(`  GET    http://localhost:${PORT}/api/users/1`);
  console.log(`  POST   http://localhost:${PORT}/api/users`);
  console.log(`  PUT    http://localhost:${PORT}/api/users/1`);
  console.log(`  DELETE http://localhost:${PORT}/api/users/1`);
  console.log('\nExample commands:');
  console.log(`  curl http://localhost:${PORT}/api/users`);
  console.log(`  curl -X POST -H "Content-Type: application/json" -d '{"name":"John","email":"john@example.com"}' http://localhost:${PORT}/api/users`);
});
