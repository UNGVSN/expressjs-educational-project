/**
 * Example: Complete Authentication System
 *
 * Demonstrates:
 * - User registration and login
 * - Password hashing (simulated)
 * - Session-based authentication
 * - Protected routes
 * - Logout and session destruction
 * - Remember me functionality
 * - Flash messages
 *
 * Run: npm run example:auth
 */

'use strict';

const crypto = require('crypto');
const createApp = require('../lib/index');
const { cookieParser, session } = require('../lib/index');

const app = createApp();

// Configuration
const SECRET = 'auth-example-secret';
const REMEMBER_ME_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

// In-memory user database (use real database in production!)
const users = new Map();

// Helper: Hash password (use bcrypt in production!)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + SECRET).digest('hex');
}

// Helper: Verify password
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// Setup middleware
app.use(cookieParser(SECRET));
app.use(session({
  secret: SECRET,
  name: 'auth.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: SESSION_DURATION,
    httpOnly: true
  }
}));

// Flash message middleware
app.use((req, res, next) => {
  // Get flash message from session
  res.locals = res.locals || {};
  if (req.session.flash) {
    res.locals.flash = req.session.flash;
    delete req.session.flash;
  }

  // Helper to set flash message
  req.flash = (type, message) => {
    req.session.flash = { type, message };
  };

  next();
});

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    req.flash('error', 'Please log in to access this page');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Please log in first',
      loginUrl: '/login'
    });
  }
  next();
}

// Home page
app.get('/', (req, res) => {
  const user = req.session.userId ? users.get(req.session.userId) : null;

  res.json({
    message: 'Authentication Example',
    loggedIn: !!user,
    user: user ? { id: req.session.userId, username: user.username } : null,
    flash: res.locals.flash,
    endpoints: {
      'POST /register': 'Register new user (username, password)',
      'POST /login': 'Login (username, password, rememberMe?)',
      'POST /logout': 'Logout',
      'GET /profile': 'View profile (protected)',
      'GET /dashboard': 'Dashboard (protected)',
      'POST /change-password': 'Change password (protected)'
    }
  });
});

// Register new user
app.post('/register', (req, res) => {
  // In real app, parse body with body-parser
  // For this example, use query params
  const username = req.query.username;
  const password = req.query.password;

  if (!username || !password) {
    return res.status(400).json({
      error: 'Missing credentials',
      usage: '/register?username=xxx&password=xxx'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'Password must be at least 6 characters'
    });
  }

  // Check if username exists
  for (const [, user] of users) {
    if (user.username === username) {
      return res.status(409).json({
        error: 'Username already taken'
      });
    }
  }

  // Create user
  const userId = crypto.randomUUID();
  users.set(userId, {
    username,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  });

  console.log(`User registered: ${username}`);

  res.status(201).json({
    message: 'Registration successful',
    userId,
    username,
    note: 'Please login now'
  });
});

// Login
app.post('/login', (req, res) => {
  const username = req.query.username;
  const password = req.query.password;
  const rememberMe = req.query.remember === 'true';

  if (!username || !password) {
    return res.status(400).json({
      error: 'Missing credentials',
      usage: '/login?username=xxx&password=xxx&remember=true'
    });
  }

  // Find user
  let foundUserId = null;
  let foundUser = null;

  for (const [userId, user] of users) {
    if (user.username === username) {
      foundUserId = userId;
      foundUser = user;
      break;
    }
  }

  if (!foundUser || !verifyPassword(password, foundUser.passwordHash)) {
    return res.status(401).json({
      error: 'Invalid credentials'
    });
  }

  // Regenerate session ID to prevent session fixation
  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({ error: 'Session error' });
    }

    // Store user ID in session
    req.session.userId = foundUserId;
    req.session.loginTime = new Date().toISOString();

    // Remember me - extend session cookie
    if (rememberMe) {
      req.session.cookie.maxAge = REMEMBER_ME_DURATION;
    }

    console.log(`User logged in: ${username}`);

    res.json({
      message: 'Login successful',
      user: {
        id: foundUserId,
        username: foundUser.username
      },
      rememberMe,
      sessionExpiresIn: req.session.cookie.maxAge
    });
  });
});

// Logout
app.post('/logout', (req, res) => {
  const username = req.session.userId
    ? users.get(req.session.userId)?.username
    : 'unknown';

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }

    // Clear session cookie
    res.clearCookie('auth.sid');

    console.log(`User logged out: ${username}`);

    res.json({
      message: 'Logged out successfully'
    });
  });
});

// Protected: View profile
app.get('/profile', requireAuth, (req, res) => {
  const user = users.get(req.session.userId);

  res.json({
    message: 'Your Profile',
    profile: {
      id: req.session.userId,
      username: user.username,
      createdAt: user.createdAt
    },
    session: {
      loginTime: req.session.loginTime,
      expiresIn: req.session.cookie.maxAge
    }
  });
});

// Protected: Dashboard
app.get('/dashboard', requireAuth, (req, res) => {
  const user = users.get(req.session.userId);

  res.json({
    message: `Welcome back, ${user.username}!`,
    dashboard: {
      lastLogin: req.session.loginTime,
      totalUsers: users.size,
      features: ['View Profile', 'Change Password', 'Logout']
    }
  });
});

// Protected: Change password
app.post('/change-password', requireAuth, (req, res) => {
  const currentPassword = req.query.current;
  const newPassword = req.query.new;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      error: 'Missing passwords',
      usage: '/change-password?current=xxx&new=xxx'
    });
  }

  const user = users.get(req.session.userId);

  // Verify current password
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return res.status(401).json({
      error: 'Current password is incorrect'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      error: 'New password must be at least 6 characters'
    });
  }

  // Update password
  user.passwordHash = hashPassword(newPassword);

  // Regenerate session for security
  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({ error: 'Session error' });
    }

    req.session.userId = users.get(req.session.userId)
      ? req.session.userId
      : null;

    res.json({
      message: 'Password changed successfully',
      note: 'Session ID regenerated for security'
    });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Auth example running on http://localhost:${PORT}`);
  console.log('\nComplete authentication flow example.');
  console.log('\nTry this flow:');
  console.log(`  1. Register: curl -X POST "http://localhost:${PORT}/register?username=john&password=secret123"`);
  console.log(`  2. Login:    curl -c jar.txt -X POST "http://localhost:${PORT}/login?username=john&password=secret123"`);
  console.log(`  3. Profile:  curl -b jar.txt http://localhost:${PORT}/profile`);
  console.log(`  4. Logout:   curl -b jar.txt -X POST http://localhost:${PORT}/logout`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
