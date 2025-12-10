/**
 * Example 03: Parsing URLs
 *
 * URLs contain lots of information that we need to parse.
 * This example demonstrates URL parsing in detail.
 *
 * Run: npm run example:urls
 * Test: curl "http://localhost:3000/users/123/posts?sort=date&order=desc"
 */

'use strict';

const { createServer, parseUrl, sendJson } = require('../lib');

const server = createServer((req, res) => {
  // Parse the URL
  const urlInfo = parseUrl(req);

  // Log parsed information
  console.log('\n--- URL Parsed ---');
  console.log('Raw URL:', req.url);
  console.log('Path:', urlInfo.path);
  console.log('Query:', urlInfo.query);
  console.log('Search:', urlInfo.search);
  console.log('Host:', urlInfo.host);
  console.log('-----------------\n');

  // Demonstrate path-based routing (we'll formalize this in Step 03)
  const path = urlInfo.path;

  // Simple path matching
  if (path === '/') {
    sendJson(res, {
      message: 'Welcome to the URL parsing example!',
      tryUrls: [
        '/users',
        '/users/123',
        '/users/123/posts',
        '/search?q=hello&page=1',
        '/api/v1/resources?sort=date&limit=10'
      ]
    });
    return;
  }

  if (path === '/users') {
    sendJson(res, {
      message: 'User list endpoint',
      path: path,
      query: urlInfo.query
    });
    return;
  }

  // Match patterns like /users/:id
  const userMatch = path.match(/^\/users\/(\d+)$/);
  if (userMatch) {
    sendJson(res, {
      message: 'Single user endpoint',
      userId: userMatch[1],
      path: path,
      note: 'In Step 03, we will build proper route parameter extraction'
    });
    return;
  }

  // Match patterns like /users/:id/posts
  const userPostsMatch = path.match(/^\/users\/(\d+)\/posts$/);
  if (userPostsMatch) {
    sendJson(res, {
      message: 'User posts endpoint',
      userId: userPostsMatch[1],
      path: path,
      query: urlInfo.query
    });
    return;
  }

  if (path === '/search') {
    sendJson(res, {
      message: 'Search endpoint',
      searchQuery: urlInfo.query.q || '(no query)',
      page: urlInfo.query.page || '1',
      allParams: urlInfo.query
    });
    return;
  }

  // Return full URL analysis for any path
  sendJson(res, {
    message: 'URL Analysis',
    analysis: {
      originalUrl: req.url,
      path: urlInfo.path,
      pathname: urlInfo.pathname,
      query: urlInfo.query,
      search: urlInfo.search,
      href: urlInfo.href,
      host: urlInfo.host,
      hostname: urlInfo.hostname,
      port: urlInfo.port
    },
    httpInfo: {
      method: req.method,
      httpVersion: req.httpVersion
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           URL Parsing Example                              ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║   Server URL: http://localhost:${PORT}                      ║
║                                                           ║
║   Try these URLs:                                         ║
║                                                           ║
║   Basic paths:                                            ║
║   curl http://localhost:${PORT}/                            ║
║   curl http://localhost:${PORT}/users                       ║
║   curl http://localhost:${PORT}/users/123                   ║
║   curl http://localhost:${PORT}/users/123/posts             ║
║                                                           ║
║   With query parameters:                                  ║
║   curl "http://localhost:${PORT}/search?q=hello"            ║
║   curl "http://localhost:${PORT}/search?q=test&page=2"      ║
║   curl "http://localhost:${PORT}/users?sort=name&order=asc" ║
║                                                           ║
║   Complex URLs:                                           ║
║   curl "http://localhost:${PORT}/api/v1/data?a=1&b=2&c=3"   ║
║                                                           ║
║   Press Ctrl+C to stop                                    ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
