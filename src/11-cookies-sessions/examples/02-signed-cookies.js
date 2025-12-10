/**
 * Example: Signed Cookies
 *
 * Demonstrates:
 * - Setting up cookie-parser with a secret
 * - Creating signed cookies (tamper-proof)
 * - Verifying signed cookies
 * - Detecting cookie tampering
 *
 * Run: npm run example:signed
 * Test with: curl -v http://localhost:3000/set
 */

'use strict';

const createApp = require('../lib/index');
const { cookieParser } = require('../lib/index');

const app = createApp();

// Secret key for signing cookies
// In production, use environment variable: process.env.COOKIE_SECRET
const COOKIE_SECRET = 'super-secret-key-change-in-production';

// Initialize cookie parser with secret for signed cookies
app.use(cookieParser(COOKIE_SECRET));

// Home page
app.get('/', (req, res) => {
  res.json({
    message: 'Signed Cookies Example',
    endpoints: {
      '/set': 'Set signed cookies',
      '/read': 'Read and verify signed cookies',
      '/tamper': 'Demonstrate tampering detection'
    },
    regularCookies: req.cookies,
    signedCookies: req.signedCookies
  });
});

// Set signed cookies
app.get('/set', (req, res) => {
  // Signed cookie - value is authenticated with HMAC
  res.cookie('user_id', '12345', {
    signed: true,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });

  // Another signed cookie
  res.cookie('role', 'admin', {
    signed: true,
    httpOnly: true
  });

  // Regular (unsigned) cookie for comparison
  res.cookie('regular', 'not-signed');

  res.json({
    message: 'Signed cookies set!',
    explanation: {
      format: 'Signed cookies have format: s:value.signature',
      security: 'If anyone modifies the value, the signature won\'t match',
      storage: 'The signature is based on HMAC-SHA256'
    }
  });
});

// Read signed cookies
app.get('/read', (req, res) => {
  res.json({
    message: 'Cookie verification results',

    // Regular cookies (from req.cookies)
    regularCookies: {
      values: req.cookies,
      note: 'These cookies are NOT verified'
    },

    // Signed cookies (from req.signedCookies)
    signedCookies: {
      values: req.signedCookies,
      note: 'These values are verified via HMAC signature'
    },

    // Check if specific signed cookie is valid
    verification: {
      user_id: req.signedCookies.user_id
        ? { valid: true, value: req.signedCookies.user_id }
        : { valid: false, reason: 'Cookie missing or tampered' },

      role: req.signedCookies.role
        ? { valid: true, value: req.signedCookies.role }
        : { valid: false, reason: 'Cookie missing or tampered' }
    }
  });
});

// Demonstrate tampering detection
app.get('/tamper', (req, res) => {
  // The tamperedValue simulates what happens when someone tries to
  // modify a signed cookie in their browser
  const tamperedExamples = [
    {
      original: 's:12345.validSignature',
      tampered: 's:99999.validSignature',
      result: 'false - signature doesn\'t match modified value'
    },
    {
      original: 's:admin.signature',
      tampered: 's:superadmin.signature',
      result: 'false - attacker can\'t forge valid signature without secret'
    }
  ];

  res.json({
    message: 'How signed cookie tampering is detected',
    howItWorks: [
      '1. When setting: value + secret -> HMAC signature',
      '2. Cookie stored as: s:value.signature',
      '3. When reading: recalculate signature with secret',
      '4. Compare signatures: if match, value is authentic',
      '5. If signatures differ: value was tampered, return false'
    ],
    examples: tamperedExamples,
    currentSignedCookies: req.signedCookies,
    note: 'Any false values indicate tampered cookies'
  });
});

// Protected route that requires valid signed cookie
app.get('/protected', (req, res) => {
  // Check for valid signed user_id cookie
  const userId = req.signedCookies.user_id;

  if (!userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      reason: 'Missing or invalid user_id cookie',
      hint: 'Visit /set first to get a signed cookie'
    });
  }

  // Cookie is valid!
  res.json({
    message: 'Welcome to protected resource!',
    userId: userId,
    role: req.signedCookies.role || 'user'
  });
});

// Clear signed cookies
app.get('/clear', (req, res) => {
  res.clearCookie('user_id');
  res.clearCookie('role');
  res.clearCookie('regular');

  res.json({
    message: 'All cookies cleared'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Signed cookies example running on http://localhost:${PORT}`);
  console.log('\nSigned cookies prevent tampering using HMAC signatures.');
  console.log('\nTry these commands:');
  console.log(`  curl -c cookies.txt http://localhost:${PORT}/set`);
  console.log(`  curl -b cookies.txt http://localhost:${PORT}/read`);
  console.log(`  curl -b cookies.txt http://localhost:${PORT}/protected`);
  console.log('\nThen try manually editing cookies.txt and re-reading!');
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
