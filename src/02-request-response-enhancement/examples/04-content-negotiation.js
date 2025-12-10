/**
 * Example 04: Content Negotiation
 *
 * This example demonstrates how to use req.accepts() and res.format()
 * to serve different content types based on client preferences.
 *
 * Run: npm run example:content
 */

'use strict';

const { createServer } = require('../lib');

// Sample data
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com' }
];

const server = createServer((req, res) => {
  const path = req.path;

  console.log(`${req.method} ${path}`);
  console.log(`  Accept: ${req.get('Accept')}`);

  switch (path) {
    case '/':
      res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Content Negotiation Demo</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    .example { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; }
    code { font-family: 'Monaco', 'Consolas', monospace; }
  </style>
</head>
<body>
  <h1>Content Negotiation</h1>

  <p>Content negotiation allows the server to respond with different formats
  based on what the client requests via the <code>Accept</code> header.</p>

  <div class="example">
    <h3>/users - Multiple Formats</h3>
    <p>Try these commands:</p>
    <pre><code># JSON (default)
curl http://localhost:3000/users

# Explicitly request JSON
curl -H "Accept: application/json" http://localhost:3000/users

# Request HTML
curl -H "Accept: text/html" http://localhost:3000/users

# Request plain text
curl -H "Accept: text/plain" http://localhost:3000/users

# Request XML
curl -H "Accept: application/xml" http://localhost:3000/users</code></pre>
  </div>

  <div class="example">
    <h3>/users/:id - User Detail</h3>
    <pre><code>curl -H "Accept: text/html" http://localhost:3000/users/1
curl -H "Accept: application/json" http://localhost:3000/users/1</code></pre>
  </div>

  <div class="example">
    <h3>/format - Using res.format()</h3>
    <pre><code>curl -H "Accept: text/html" http://localhost:3000/format
curl -H "Accept: application/json" http://localhost:3000/format
curl -H "Accept: text/plain" http://localhost:3000/format</code></pre>
  </div>
</body>
</html>
      `);
      break;

    case '/users':
      // Content negotiation using req.accepts()
      res.vary('Accept'); // Important for caching

      const acceptedType = req.accepts(['json', 'html', 'text', 'xml']);

      switch (acceptedType) {
        case 'json':
          res.json(users);
          break;

        case 'html':
          res.type('html').send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Users</title>
  <style>
    body { font-family: system-ui; max-width: 600px; margin: 40px auto; padding: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>Users</h1>
  <table>
    <tr><th>ID</th><th>Name</th><th>Email</th></tr>
    ${users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${u.email}</td></tr>`).join('')}
  </table>
  <p><a href="/">Back</a></p>
</body>
</html>
          `);
          break;

        case 'text':
          const text = users.map(u => `${u.id}: ${u.name} <${u.email}>`).join('\n');
          res.type('text').send(`Users\n=====\n\n${text}`);
          break;

        case 'xml':
          const xml = `<?xml version="1.0" encoding="UTF-8"?>
<users>
${users.map(u => `  <user id="${u.id}">
    <name>${u.name}</name>
    <email>${u.email}</email>
  </user>`).join('\n')}
</users>`;
          res.type('xml').send(xml);
          break;

        default:
          // Nothing accepted - send 406
          res.status(406).json({
            error: 'Not Acceptable',
            message: 'Cannot generate response in requested format',
            acceptable: ['application/json', 'text/html', 'text/plain', 'application/xml']
          });
      }
      break;

    case '/format':
      // Using res.format() for cleaner content negotiation
      res.format({
        'text/html': () => {
          res.send('<h1>Hello HTML</h1><p>You requested HTML format</p>');
        },

        'application/json': () => {
          res.json({ message: 'Hello JSON', format: 'application/json' });
        },

        'text/plain': () => {
          res.send('Hello Text\nYou requested plain text format');
        },

        default: () => {
          res.status(406).send('Not Acceptable');
        }
      });
      break;

    default:
      // Handle /users/:id pattern
      const userMatch = path.match(/^\/users\/(\d+)$/);
      if (userMatch) {
        const userId = parseInt(userMatch[1], 10);
        const user = users.find(u => u.id === userId);

        if (!user) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        res.vary('Accept');

        if (req.accepts('html')) {
          res.type('html').send(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${user.name}</title></head>
<body>
  <h1>${user.name}</h1>
  <p>Email: ${user.email}</p>
  <p><a href="/users">Back to list</a></p>
</body>
</html>
          `);
        } else {
          res.json(user);
        }
        return;
      }

      res.status(404).json({ error: 'Not found' });
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Content Negotiation Example                              ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Try different Accept headers:                                   ║
║                                                                   ║
║   JSON (default):                                                 ║
║   curl http://localhost:${PORT}/users                               ║
║                                                                   ║
║   HTML:                                                           ║
║   curl -H "Accept: text/html" http://localhost:${PORT}/users        ║
║                                                                   ║
║   Plain text:                                                     ║
║   curl -H "Accept: text/plain" http://localhost:${PORT}/users       ║
║                                                                   ║
║   XML:                                                            ║
║   curl -H "Accept: application/xml" http://localhost:${PORT}/users  ║
║                                                                   ║
║   res.format():                                                   ║
║   curl -H "Accept: text/html" http://localhost:${PORT}/format       ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
