/**
 * Example: Basic Express Application
 *
 * Demonstrates the simplest possible Express-like application.
 *
 * Run: npm run example:basic
 */

'use strict';

const express = require('../lib');

// Create application
const app = express();

// Simple routes
app.get('/', (req, res) => {
  res.send(`
    <h1>Welcome to Mini-Express!</h1>
    <p>This is a basic application built from scratch.</p>
    <ul>
      <li><a href="/about">About</a></li>
      <li><a href="/json">JSON Response</a></li>
      <li><a href="/users/123">User Profile</a></li>
      <li><a href="/search?q=express">Search</a></li>
    </ul>
  `);
});

app.get('/about', (req, res) => {
  res.send(`
    <h1>About</h1>
    <p>This is a Mini-Express application.</p>
    <p><a href="/">Back to Home</a></p>
  `);
});

app.get('/json', (req, res) => {
  res.json({
    message: 'Hello from Mini-Express!',
    timestamp: new Date().toISOString(),
    framework: 'Mini-Express'
  });
});

// Route with parameter
app.get('/users/:id', (req, res) => {
  res.json({
    userId: req.params.id,
    profile: {
      name: 'User ' + req.params.id,
      email: `user${req.params.id}@example.com`
    }
  });
});

// Route with query parameters
app.get('/search', (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;

  res.json({
    query: q,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    results: q ? [`Result 1 for "${q}"`, `Result 2 for "${q}"`] : []
  });
});

// POST route
app.post('/echo', (req, res) => {
  res.json({
    method: req.method,
    path: req.path,
    headers: req.headers,
    message: 'Echo!'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Basic app running on http://localhost:${PORT}`);
  console.log('\nTry these routes:');
  console.log(`  GET  http://localhost:${PORT}/`);
  console.log(`  GET  http://localhost:${PORT}/about`);
  console.log(`  GET  http://localhost:${PORT}/json`);
  console.log(`  GET  http://localhost:${PORT}/users/42`);
  console.log(`  GET  http://localhost:${PORT}/search?q=hello`);
  console.log(`  POST http://localhost:${PORT}/echo`);
});
