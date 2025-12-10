/**
 * Example: Basic Cookie Handling
 *
 * Demonstrates:
 * - Setting cookies with res.cookie()
 * - Reading cookies with cookie-parser middleware
 * - Cookie options (maxAge, httpOnly, secure, etc.)
 * - Clearing cookies with res.clearCookie()
 *
 * Run: npm run example:cookies
 * Test with: curl -v http://localhost:3000/set
 */

'use strict';

const createApp = require('../lib/index');
const { cookieParser } = require('../lib/index');

const app = createApp();

// Parse cookies from request headers
app.use(cookieParser());

// Home page - shows all cookies
app.get('/', (req, res) => {
  res.json({
    message: 'Cookie Example',
    endpoints: {
      '/set': 'Set some cookies',
      '/read': 'Read current cookies',
      '/preferences': 'Set preference cookies',
      '/clear': 'Clear all cookies'
    },
    currentCookies: req.cookies
  });
});

// Set basic cookies
app.get('/set', (req, res) => {
  // Simple cookie (session cookie - expires when browser closes)
  res.cookie('visitor', 'anonymous');

  // Cookie with max age (15 minutes)
  res.cookie('timestamp', Date.now().toString(), {
    maxAge: 15 * 60 * 1000
  });

  // HttpOnly cookie (not accessible via JavaScript)
  res.cookie('httponly_token', 'secret123', {
    httpOnly: true
  });

  res.json({
    message: 'Cookies set!',
    cookies: {
      visitor: 'anonymous',
      timestamp: 'current timestamp',
      httponly_token: 'secret123 (httpOnly)'
    }
  });
});

// Read cookies
app.get('/read', (req, res) => {
  res.json({
    message: 'Current cookies',
    cookies: req.cookies,
    count: Object.keys(req.cookies).length
  });
});

// Set preference cookies
app.get('/preferences', (req, res) => {
  // Theme preference - lasts 1 year
  res.cookie('theme', 'dark', {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: '/'
  });

  // Language preference
  res.cookie('language', 'en', {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: '/'
  });

  // Secure preferences (use in production with HTTPS)
  res.cookie('secure_pref', 'value', {
    httpOnly: true,
    // secure: true,     // Uncomment for HTTPS
    sameSite: 'strict'
  });

  res.json({
    message: 'Preference cookies set',
    preferences: {
      theme: 'dark',
      language: 'en',
      secure_pref: 'value (with security options)'
    }
  });
});

// Set a JSON cookie
app.get('/json-cookie', (req, res) => {
  // Cookie can store JSON objects (serialized with j: prefix)
  res.cookie('user_prefs', {
    theme: 'dark',
    fontSize: 14,
    notifications: true
  }, {
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({
    message: 'JSON cookie set',
    note: 'Object is serialized as j:{json}'
  });
});

// Clear all cookies
app.get('/clear', (req, res) => {
  // Get list of cookies to clear
  const cookieNames = Object.keys(req.cookies);

  // Clear each cookie
  cookieNames.forEach(name => {
    res.clearCookie(name);
  });

  res.json({
    message: 'All cookies cleared',
    clearedCookies: cookieNames
  });
});

// Clear specific cookie
app.get('/clear/:name', (req, res) => {
  const { name } = req.params;

  if (req.cookies[name]) {
    res.clearCookie(name);
    res.json({
      message: `Cookie '${name}' cleared`
    });
  } else {
    res.status(404).json({
      error: `Cookie '${name}' not found`
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Cookie example running on http://localhost:${PORT}`);
  console.log('\nTry these commands:');
  console.log(`  curl -c cookies.txt http://localhost:${PORT}/set`);
  console.log(`  curl -b cookies.txt http://localhost:${PORT}/read`);
  console.log(`  curl -b cookies.txt http://localhost:${PORT}/clear`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => {
    process.exit(0);
  });
});
