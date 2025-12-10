/**
 * Example 04: Query String Parsing
 *
 * Query strings can be complex with arrays, nested objects,
 * and special characters. This example shows advanced parsing.
 *
 * Run: npm run example:query
 * Test: curl "http://localhost:3000/test?items[]=a&items[]=b&user[name]=John"
 */

'use strict';

const { createServer, parseQueryString, sendJson } = require('../lib');

const server = createServer((req, res) => {
  // Extract query string from URL
  const queryStart = req.url.indexOf('?');
  const queryString = queryStart !== -1 ? req.url.slice(queryStart) : '';

  // Parse the query string
  const query = parseQueryString(queryString);

  console.log('\n--- Query String Parsed ---');
  console.log('Raw query:', queryString);
  console.log('Parsed:', JSON.stringify(query, null, 2));
  console.log('--------------------------\n');

  // Return parsed query information
  sendJson(res, {
    message: 'Query String Analysis',
    raw: queryString,
    parsed: query,
    examples: {
      simple: '?name=John&age=30',
      arrays: '?items[]=a&items[]=b&items[]=c',
      duplicates: '?color=red&color=blue (becomes array)',
      nested: '?user[name]=John&user[email]=john@example.com',
      encoded: '?message=Hello%20World (spaces)',
      special: '?search=a+b (plus as space)',
      empty: '?flag (empty value)'
    }
  }, 200, { pretty: true });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Query String Parsing Example                             ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Try these query strings:                                        ║
║                                                                   ║
║   Simple key-value:                                               ║
║   curl "http://localhost:${PORT}/?name=John&age=30"                 ║
║                                                                   ║
║   Array notation (items[]=):                                      ║
║   curl "http://localhost:${PORT}/?items[]=apple&items[]=banana"     ║
║                                                                   ║
║   Duplicate keys (become arrays):                                 ║
║   curl "http://localhost:${PORT}/?color=red&color=blue&color=green" ║
║                                                                   ║
║   Nested objects:                                                 ║
║   curl "http://localhost:${PORT}/?user[name]=John&user[age]=30"     ║
║                                                                   ║
║   URL-encoded values:                                             ║
║   curl "http://localhost:${PORT}/?message=Hello%20World"            ║
║                                                                   ║
║   Empty values:                                                   ║
║   curl "http://localhost:${PORT}/?enabled&debug&verbose"            ║
║                                                                   ║
║   Complex example:                                                ║
║   curl "http://localhost:${PORT}/?tags[]=js&tags[]=node&filter[status]=active&filter[type]=user&page=1&limit=10"
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
