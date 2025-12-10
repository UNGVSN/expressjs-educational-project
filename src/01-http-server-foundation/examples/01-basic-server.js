/**
 * Example 01: Basic HTTP Server
 *
 * This is the simplest possible HTTP server - the foundation
 * that everything else builds upon.
 *
 * Run: npm run example:basic
 * Test: curl http://localhost:3000
 */

'use strict';

const { createServer } = require('../lib');

// Create a server that responds to all requests
const server = createServer((req, res) => {
  // Log incoming request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Send a simple response
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello, World!');
});

// Start listening
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Basic HTTP Server Running!                       ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║   Server URL: http://localhost:${PORT}                      ║
║                                                           ║
║   Try these commands:                                     ║
║   • curl http://localhost:${PORT}                           ║
║   • curl http://localhost:${PORT}/any/path                  ║
║   • Open http://localhost:${PORT} in your browser           ║
║                                                           ║
║   Press Ctrl+C to stop                                    ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
