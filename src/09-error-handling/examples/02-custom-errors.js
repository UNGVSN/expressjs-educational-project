/**
 * Example 02: Custom Error Classes
 *
 * Demonstrates using custom error classes for:
 * - Semantic error types
 * - Automatic status codes
 * - Structured error responses
 * - Operational vs programming errors
 */

'use strict';

const createApp = require('../lib/index');
const {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError
} = require('../lib/index');

const app = createApp();

// ============================================
// Simulated Database
// ============================================

const users = new Map([
  [1, { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' }],
  [2, { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' }]
]);

const requestCounts = new Map();

// ============================================
// Routes demonstrating custom errors
// ============================================

/**
 * 400 Bad Request - Invalid input
 */
app.get('/users', (req, res) => {
  const { limit } = req.query;

  if (limit && isNaN(parseInt(limit))) {
    throw new BadRequestError('Limit must be a number');
  }

  const userList = Array.from(users.values());
  const limited = limit ? userList.slice(0, parseInt(limit)) : userList;

  res.json({ users: limited });
});

/**
 * 401 Unauthorized - No authentication
 */
app.get('/profile', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new UnauthorizedError('Authentication required');
  }

  // Simulate token validation
  if (authHeader !== 'Bearer valid-token') {
    throw new UnauthorizedError('Invalid token');
  }

  res.json({ user: users.get(1) });
});

/**
 * 403 Forbidden - Insufficient permissions
 */
app.get('/admin', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new UnauthorizedError('Authentication required');
  }

  // Simulate permission check
  const isAdmin = authHeader === 'Bearer admin-token';

  if (!isAdmin) {
    throw new ForbiddenError('Admin access required');
  }

  res.json({
    message: 'Welcome to admin panel',
    stats: { users: users.size }
  });
});

/**
 * 404 Not Found - Resource doesn't exist
 */
app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.get(id);

  if (!user) {
    throw new NotFoundError(`User with ID ${id} not found`);
  }

  res.json({ user });
});

/**
 * 409 Conflict - Resource conflict
 */
app.post('/users', (req, res) => {
  // Simulate checking for existing email
  const email = 'alice@example.com'; // Hardcoded for demo

  const existingUser = Array.from(users.values())
    .find(u => u.email === email);

  if (existingUser) {
    throw new ConflictError(`User with email ${email} already exists`);
  }

  res.status(201).json({ message: 'User created' });
});

/**
 * 422 Validation Error - Invalid data format
 */
app.post('/register', (req, res) => {
  // Simulate validation
  const errors = [];

  // These would normally come from request body
  const name = '';
  const email = 'invalid-email';
  const age = -5;

  if (!name) {
    errors.push({ field: 'name', message: 'Name is required' });
  }

  if (!email.includes('@')) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  if (age < 0) {
    errors.push({ field: 'age', message: 'Age must be positive' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  res.status(201).json({ message: 'User registered' });
});

/**
 * 429 Rate Limit - Too many requests
 */
app.get('/api/data', (req, res) => {
  const clientIP = req.headers['x-forwarded-for'] || 'unknown';
  const count = (requestCounts.get(clientIP) || 0) + 1;
  requestCounts.set(clientIP, count);

  // Allow 3 requests before rate limiting
  if (count > 3) {
    const error = new RateLimitError('Too many requests, please slow down', 30);
    throw error;
  }

  res.json({
    data: 'Here is your data',
    requestsRemaining: 3 - count
  });
});

// Reset rate limit endpoint
app.post('/api/reset-limit', (req, res) => {
  requestCounts.clear();
  res.json({ message: 'Rate limits reset' });
});

/**
 * Generic AppError example
 */
app.get('/custom', (req, res) => {
  throw new AppError('This is a custom application error', 418);
});

// ============================================
// Error Handling Middleware
// ============================================

/**
 * Validation error handler
 * Formats validation errors nicely
 */
app.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(422).json({
      error: {
        type: 'ValidationError',
        message: err.message,
        statusCode: 422,
        errors: err.errors
      }
    });
  }
  next(err);
});

/**
 * Rate limit error handler
 * Adds Retry-After header
 */
app.use((err, req, res, next) => {
  if (err instanceof RateLimitError) {
    res.setHeader('Retry-After', err.retryAfter);
    return res.status(429).json({
      error: {
        type: 'RateLimitError',
        message: err.message,
        statusCode: 429,
        retryAfter: err.retryAfter
      }
    });
  }
  next(err);
});

/**
 * Generic error handler for all AppError types
 */
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        type: err.name,
        message: err.message,
        statusCode: err.statusCode,
        status: err.status
      }
    });
  }
  next(err);
});

/**
 * Catch-all error handler
 */
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err);

  res.status(500).json({
    error: {
      type: 'InternalError',
      message: 'An unexpected error occurred',
      statusCode: 500
    }
  });
});

// ============================================
// Start Server
// ============================================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
===========================================
  Custom Error Classes Example
===========================================

Server running at http://localhost:${PORT}

Try these routes:

  400 Bad Request:
  - GET /users?limit=abc      → Invalid parameter

  401 Unauthorized:
  - GET /profile              → No auth header
  - GET /profile (with wrong token)

  403 Forbidden:
  - GET /admin (with non-admin token)

  404 Not Found:
  - GET /users/999            → User doesn't exist

  409 Conflict:
  - POST /users               → Duplicate email

  422 Validation Error:
  - POST /register            → Invalid data

  429 Rate Limit:
  - GET /api/data (4+ times)  → Rate limited
  - POST /api/reset-limit     → Reset counter

  Custom Error:
  - GET /custom               → 418 I'm a teapot

Press Ctrl+C to stop
===========================================
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});
