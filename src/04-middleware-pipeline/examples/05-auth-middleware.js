/**
 * Example 05: Authentication Middleware
 *
 * Demonstrates how to build authentication middleware
 * that protects routes and manages user sessions.
 *
 * Run: npm run example:auth
 */

'use strict';

const createApp = require('../lib');

const app = createApp();

// ============================================
// SIMULATED USER DATABASE
// ============================================

const users = {
  'admin': { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
  'user': { id: 2, username: 'user', password: 'user123', role: 'user' },
  'guest': { id: 3, username: 'guest', password: 'guest123', role: 'guest' }
};

// Simple token store (in real app, use JWT or session store)
const tokens = new Map();

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

/**
 * Basic authentication middleware
 * Parses Basic auth header and validates credentials
 */
function basicAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
    return res.status(401).json({
      error: 'Authentication required',
      type: 'basic',
      hint: 'Use Authorization: Basic base64(username:password)'
    });
  }

  // Decode base64 credentials
  const base64 = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  // Validate
  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({
      error: 'Invalid credentials'
    });
  }

  // Attach user to request
  req.user = { id: user.id, username: user.username, role: user.role };
  next();
}

/**
 * Token authentication middleware
 * Validates Bearer token
 */
function tokenAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      type: 'bearer',
      hint: 'Use Authorization: Bearer <token>'
    });
  }

  const token = authHeader.split(' ')[1];
  const user = tokens.get(token);

  if (!user) {
    return res.status(401).json({
      error: 'Invalid or expired token'
    });
  }

  req.user = user;
  next();
}

/**
 * Optional authentication
 * Attaches user if authenticated, continues if not
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const user = tokens.get(token);
    if (user) {
      req.user = user;
    }
  }

  next();
}

/**
 * Role-based access control middleware factory
 */
function requireRole(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role '${req.user.role}' is not allowed. Required: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
}

// ============================================
// ROUTES
// ============================================

// Home page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authentication Middleware</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    .section { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 8px; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
    th { background: #f0f0f0; }
  </style>
</head>
<body>
  <h1>Authentication Middleware</h1>

  <div class="section">
    <h3>Test Users</h3>
    <table>
      <tr><th>Username</th><th>Password</th><th>Role</th></tr>
      <tr><td>admin</td><td>admin123</td><td>admin</td></tr>
      <tr><td>user</td><td>user123</td><td>user</td></tr>
      <tr><td>guest</td><td>guest123</td><td>guest</td></tr>
    </table>
  </div>

  <div class="section">
    <h3>1. Basic Auth Endpoint</h3>
    <pre>curl -u admin:admin123 http://localhost:3000/basic/protected</pre>
    <p>Try: <a href="/basic/protected">/basic/protected</a> (will prompt for credentials)</p>
  </div>

  <div class="section">
    <h3>2. Token Auth Flow</h3>
    <p><strong>Step 1:</strong> Login to get token</p>
    <pre>curl -X POST http://localhost:3000/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin123"}'</pre>

    <p><strong>Step 2:</strong> Use token for protected routes</p>
    <pre>curl http://localhost:3000/api/profile \\
  -H "Authorization: Bearer YOUR_TOKEN"</pre>
  </div>

  <div class="section">
    <h3>3. Role-Based Access</h3>
    <ul>
      <li><code>/api/admin</code> - Requires 'admin' role</li>
      <li><code>/api/dashboard</code> - Requires 'admin' or 'user' role</li>
      <li><code>/api/public</code> - Optional auth</li>
    </ul>
  </div>
</body>
</html>
  `);
});

// ============================================
// BASIC AUTH ROUTES
// ============================================

app.get('/basic/protected', basicAuth, (req, res) => {
  res.json({
    message: 'You accessed the basic auth protected route!',
    user: req.user
  });
});

// ============================================
// TOKEN AUTH ROUTES
// ============================================

// Login endpoint - issues tokens
app.post('/auth/login', (req, res) => {
  // Note: In real app, parse JSON body
  // For demo, accept query params or use test credentials
  const username = req.query.username || 'admin';
  const password = req.query.password || 'admin123';

  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({
      error: 'Invalid credentials'
    });
  }

  // Generate token
  const token = `${username}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Store token
  tokens.set(token, {
    id: user.id,
    username: user.username,
    role: user.role
  });

  res.json({
    message: 'Login successful',
    token: token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    },
    usage: `Authorization: Bearer ${token}`
  });
});

// Logout endpoint
app.post('/auth/logout', tokenAuth, (req, res) => {
  // Find and remove token
  const authHeader = req.headers.authorization;
  const token = authHeader.split(' ')[1];
  tokens.delete(token);

  res.json({ message: 'Logged out successfully' });
});

// ============================================
// PROTECTED API ROUTES
// ============================================

// Profile - requires authentication
app.get('/api/profile', tokenAuth, (req, res) => {
  res.json({
    message: 'Your profile',
    user: req.user
  });
});

// Admin only
app.get('/api/admin', tokenAuth, requireRole('admin'), (req, res) => {
  res.json({
    message: 'Admin area',
    user: req.user,
    secrets: ['Secret 1', 'Secret 2']
  });
});

// Admin or User
app.get('/api/dashboard', tokenAuth, requireRole('admin', 'user'), (req, res) => {
  res.json({
    message: 'Dashboard',
    user: req.user,
    data: {
      stats: 42,
      chart: [1, 2, 3]
    }
  });
});

// Optional auth - different response based on authentication
app.get('/api/public', optionalAuth, (req, res) => {
  if (req.user) {
    res.json({
      message: 'Welcome back!',
      user: req.user,
      personalizedContent: true
    });
  } else {
    res.json({
      message: 'Hello anonymous visitor',
      personalizedContent: false,
      hint: 'Login for personalized content'
    });
  }
});

// Quick login for testing (GET endpoint)
app.get('/auth/quick-login', (req, res) => {
  const username = req.query.user || 'admin';
  const user = users[username];

  if (!user) {
    return res.status(400).json({ error: 'Unknown user' });
  }

  const token = `${username}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  tokens.set(token, {
    id: user.id,
    username: user.username,
    role: user.role
  });

  res.json({
    token,
    usage: `curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/profile`
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Authentication Middleware Example                        ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Quick Start:                                                    ║
║                                                                   ║
║   1. Get a token:                                                 ║
║      curl "http://localhost:${PORT}/auth/quick-login?user=admin"    ║
║                                                                   ║
║   2. Access protected route:                                      ║
║      curl -H "Authorization: Bearer TOKEN"                        ║
║           http://localhost:${PORT}/api/profile                      ║
║                                                                   ║
║   Test Users: admin/admin123, user/user123, guest/guest123        ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
