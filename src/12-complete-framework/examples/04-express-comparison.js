/**
 * Example: Express.js Comparison
 *
 * This example shows how our Mini-Express API compares to real Express.js.
 * The code is nearly identical, demonstrating we've built a compatible framework.
 *
 * Run: npm run example:compare
 */

'use strict';

// To use real Express.js, change this import:
// const express = require('express');
const express = require('../lib');

const app = express();

// ----- Middleware Setup (same as Express.js) -----

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware
app.use((req, res, next) => {
  req.requestTime = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ----- Routes (same as Express.js) -----

// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'Mini-Express vs Express.js Comparison',
    framework: 'Mini-Express',
    note: 'This API is identical to Express.js!'
  });
});

// Route with params
app.get('/users/:id', (req, res) => {
  res.json({
    userId: req.params.id,
    queryParams: req.query
  });
});

// POST with body
app.post('/echo', (req, res) => {
  res.json({
    received: req.body,
    method: req.method,
    path: req.path,
    timestamp: req.requestTime
  });
});

// ----- Router (same as Express.js) -----

const apiRouter = express.Router();

apiRouter.get('/status', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

apiRouter.get('/version', (req, res) => {
  res.json({ version: '1.0.0', node: process.version });
});

app.use('/api', apiRouter);

// ----- Response Methods (same as Express.js) -----

app.get('/demo/json', (req, res) => {
  res.json({ format: 'json' });
});

app.get('/demo/status', (req, res) => {
  res.status(201).json({ created: true });
});

app.get('/demo/redirect', (req, res) => {
  res.redirect('/');
});

app.get('/demo/headers', (req, res) => {
  res.set('X-Custom-Header', 'Hello');
  res.set({
    'X-Another': 'World',
    'X-Request-Id': '12345'
  });
  res.json({ headers: 'set' });
});

// ----- Error Handling (same as Express.js) -----

app.get('/error', (req, res, next) => {
  const error = new Error('Intentional error');
  error.status = 400;
  next(error);
});

// Error handler middleware
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message,
    stack: app.get('env') === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// ----- Settings (same as Express.js) -----

// Check settings
console.log('\nSettings:');
console.log('  env:', app.get('env'));
console.log('  x-powered-by:', app.enabled('x-powered-by'));

// ----- Start Server -----

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log('Express Comparison Example');
  console.log('='.repeat(50));
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('\nThis code works with both Mini-Express and Express.js!');
  console.log('\nTest endpoints:');
  console.log(`  GET  http://localhost:${PORT}/`);
  console.log(`  GET  http://localhost:${PORT}/users/123?name=test`);
  console.log(`  POST http://localhost:${PORT}/echo`);
  console.log(`  GET  http://localhost:${PORT}/api/status`);
  console.log(`  GET  http://localhost:${PORT}/demo/json`);
  console.log(`  GET  http://localhost:${PORT}/demo/status`);
  console.log(`  GET  http://localhost:${PORT}/demo/redirect`);
  console.log(`  GET  http://localhost:${PORT}/demo/headers`);
  console.log(`  GET  http://localhost:${PORT}/error`);
  console.log(`  GET  http://localhost:${PORT}/not-found`);
  console.log('\nTo test with real Express.js:');
  console.log('  1. npm install express');
  console.log('  2. Change the require statement at the top of this file');
  console.log('='.repeat(50));
});

/*
 * API Compatibility Checklist:
 *
 * ✅ express()           - Create app
 * ✅ app.get()           - Handle GET requests
 * ✅ app.post()          - Handle POST requests
 * ✅ app.put()           - Handle PUT requests
 * ✅ app.delete()        - Handle DELETE requests
 * ✅ app.use()           - Add middleware
 * ✅ app.listen()        - Start server
 * ✅ app.set()           - Set setting
 * ✅ app.get('setting')  - Get setting
 * ✅ app.enable()        - Enable setting
 * ✅ app.disable()       - Disable setting
 * ✅ app.enabled()       - Check if enabled
 * ✅ app.disabled()      - Check if disabled
 *
 * ✅ req.params          - Route parameters
 * ✅ req.query           - Query parameters
 * ✅ req.body            - Parsed body
 * ✅ req.path            - Request path
 * ✅ req.method          - HTTP method
 * ✅ req.headers         - Request headers
 * ✅ req.get()           - Get header
 * ✅ req.cookies         - Parsed cookies
 * ✅ req.signedCookies   - Verified signed cookies
 * ✅ req.session         - Session data
 *
 * ✅ res.json()          - Send JSON
 * ✅ res.send()          - Send response
 * ✅ res.status()        - Set status code
 * ✅ res.set()           - Set headers
 * ✅ res.redirect()      - Redirect
 * ✅ res.cookie()        - Set cookie
 * ✅ res.clearCookie()   - Clear cookie
 * ✅ res.render()        - Render view
 * ✅ res.sendFile()      - Send file
 *
 * ✅ express.json()      - JSON parser middleware
 * ✅ express.urlencoded() - URL-encoded parser
 * ✅ express.static()    - Static file serving
 * ✅ express.Router()    - Create router
 */
