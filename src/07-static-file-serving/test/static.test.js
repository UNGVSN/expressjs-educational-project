/**
 * Static Middleware Tests
 */

'use strict';

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const createApp = require('../lib');

// Test files directory
const fixturesDir = path.join(__dirname, 'fixtures');

// Port allocation
let portCounter = 9100;
function getPort() {
  return portCounter++;
}

// HTTP helper
async function request(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = Buffer.alloc(0);
      res.on('data', chunk => data = Buffer.concat([data, chunk]));
      res.on('end', () => {
        res.body = data.toString();
        res.buffer = data;
        resolve(res);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

describe('Static Middleware', () => {
  let server;

  // Create test fixtures
  before(() => {
    // Create fixtures directory
    fs.mkdirSync(fixturesDir, { recursive: true });
    fs.mkdirSync(path.join(fixturesDir, 'subdir'), { recursive: true });

    // Create test files
    fs.writeFileSync(path.join(fixturesDir, 'index.html'), '<html><body>Index</body></html>');
    fs.writeFileSync(path.join(fixturesDir, 'style.css'), 'body { color: red; }');
    fs.writeFileSync(path.join(fixturesDir, 'app.js'), 'console.log("hello");');
    fs.writeFileSync(path.join(fixturesDir, 'data.json'), '{"name": "test"}');
    fs.writeFileSync(path.join(fixturesDir, 'plain.txt'), 'Plain text file');
    fs.writeFileSync(path.join(fixturesDir, '.hidden'), 'Hidden file');
    fs.writeFileSync(path.join(fixturesDir, 'subdir', 'nested.html'), '<html>Nested</html>');
    fs.writeFileSync(path.join(fixturesDir, 'subdir', 'index.html'), '<html>Subdir Index</html>');
    fs.writeFileSync(path.join(fixturesDir, 'page'), '<html>No Extension</html>');
  });

  // Cleanup
  after(() => {
    try {
      fs.rmSync(fixturesDir, { recursive: true });
    } catch {
      // Ignore
    }
  });

  afterEach((_, done) => {
    if (server) server.close(() => done());
    else done();
  });

  describe('Basic File Serving', () => {
    it('should serve HTML files', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/index.html', method: 'GET' });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('text/html'));
      assert.ok(res.body.includes('Index'));
    });

    it('should serve CSS files', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/style.css', method: 'GET' });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('text/css'));
      assert.ok(res.body.includes('color: red'));
    });

    it('should serve JavaScript files', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/app.js', method: 'GET' });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('javascript'));
    });

    it('should serve JSON files', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/data.json', method: 'GET' });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('application/json'));
    });
  });

  describe('Index Files', () => {
    it('should serve index.html for directory requests', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/', method: 'GET' });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.body.includes('Index'));
    });

    it('should redirect /dir to /dir/', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/subdir', method: 'GET' });
      assert.strictEqual(res.statusCode, 301);
      assert.strictEqual(res.headers.location, '/subdir/');
    });

    it('should serve index.html in subdirectory', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/subdir/', method: 'GET' });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.body.includes('Subdir Index'));
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for non-existent files', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir, { fallthrough: false }));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/nonexistent.txt', method: 'GET' });
      assert.strictEqual(res.statusCode, 404);
    });

    it('should fallthrough by default', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir));
      app.get('/api/test', (req, res) => res.json({ api: true }));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/api/test', method: 'GET' });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.body.includes('api'));
    });
  });

  describe('Dotfiles', () => {
    it('should ignore dotfiles by default', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir, { fallthrough: false }));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/.hidden', method: 'GET' });
      assert.strictEqual(res.statusCode, 404);
    });

    it('should deny dotfiles when configured', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir, { dotfiles: 'deny' }));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/.hidden', method: 'GET' });
      assert.strictEqual(res.statusCode, 403);
    });

    it('should allow dotfiles when configured', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir, { dotfiles: 'allow' }));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/.hidden', method: 'GET' });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.body.includes('Hidden file'));
    });
  });

  describe('Extension Fallbacks', () => {
    it('should try extensions when configured', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir, { extensions: ['html'] }));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/page', method: 'GET' });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.body.includes('No Extension'));
    });
  });

  describe('Virtual Path Prefix', () => {
    it('should serve files under virtual path', async () => {
      const app = createApp();
      app.use('/static', createApp.static(fixturesDir));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/static/style.css', method: 'GET' });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('text/css'));
    });

    it('should not serve files outside virtual path', async () => {
      const app = createApp();
      app.use('/static', createApp.static(fixturesDir));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/style.css', method: 'GET' });
      assert.strictEqual(res.statusCode, 404);
    });
  });

  describe('Caching Headers', () => {
    it('should set ETag header', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/index.html', method: 'GET' });
      assert.ok(res.headers.etag);
    });

    it('should set Last-Modified header', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/index.html', method: 'GET' });
      assert.ok(res.headers['last-modified']);
    });

    it('should return 304 for unchanged files', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      // First request to get ETag
      const res1 = await request({ port, path: '/index.html', method: 'GET' });
      const etag = res1.headers.etag;

      // Second request with If-None-Match
      const res2 = await request({
        port,
        path: '/index.html',
        method: 'GET',
        headers: { 'If-None-Match': etag }
      });
      assert.strictEqual(res2.statusCode, 304);
    });

    it('should set Cache-Control header', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir, { maxAge: '1d' }));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/index.html', method: 'GET' });
      assert.ok(res.headers['cache-control']);
      assert.ok(res.headers['cache-control'].includes('max-age=86400'));
    });
  });

  describe('Security', () => {
    it('should prevent path traversal attacks', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir, { fallthrough: false }));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/../package.json', method: 'GET' });
      assert.ok([403, 404].includes(res.statusCode));
    });

    it('should reject null bytes', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir, { fallthrough: false }));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/index.html%00.txt', method: 'GET' });
      assert.strictEqual(res.statusCode, 400);
    });
  });

  describe('HEAD Requests', () => {
    it('should handle HEAD requests', async () => {
      const app = createApp();
      app.use(createApp.static(fixturesDir));

      const port = getPort();
      server = app.listen(port);
      await new Promise(r => server.on('listening', r));

      const res = await request({ port, path: '/index.html', method: 'HEAD' });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-length']);
      assert.strictEqual(res.body, '');
    });
  });
});
