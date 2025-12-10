/**
 * Tests for Complete Mini-Express Framework
 */

'use strict';

const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const express = require('../lib/index');

// Helper to make HTTP requests
function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
            rawBody: data
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: null,
            rawBody: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body !== null) {
      req.write(body);
    }
    req.end();
  });
}

describe('Express Application', () => {
  let app;
  let server;
  let port;

  beforeEach(() => {
    app = express();
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  it('should create an application', () => {
    assert.ok(app);
    assert.strictEqual(typeof app.get, 'function');
    assert.strictEqual(typeof app.post, 'function');
    assert.strictEqual(typeof app.use, 'function');
    assert.strictEqual(typeof app.listen, 'function');
  });

  it('should handle GET requests', async () => {
    app.get('/test', (req, res) => {
      res.json({ method: 'GET', path: '/test' });
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/test',
      method: 'GET'
    });

    server.close();

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.method, 'GET');
    assert.strictEqual(res.body.path, '/test');
  });

  it('should handle POST requests with JSON body', async () => {
    app.use(express.json());
    app.post('/users', (req, res) => {
      res.status(201).json({ created: req.body });
    });

    server = app.listen(0);
    port = server.address().port;

    const body = JSON.stringify({ name: 'John' });
    const res = await request({
      hostname: 'localhost',
      port,
      path: '/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, body);

    server.close();

    assert.strictEqual(res.statusCode, 201);
    assert.deepStrictEqual(res.body.created, { name: 'John' });
  });

  it('should extract route parameters', async () => {
    app.get('/users/:id', (req, res) => {
      res.json({ userId: req.params.id });
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/users/42',
      method: 'GET'
    });

    server.close();

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.userId, '42');
  });

  it('should parse query parameters', async () => {
    app.get('/search', (req, res) => {
      res.json({ query: req.query });
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/search?q=test&page=2',
      method: 'GET'
    });

    server.close();

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.query.q, 'test');
    assert.strictEqual(res.body.query.page, '2');
  });

  it('should return 404 for unknown routes', async () => {
    app.get('/known', (req, res) => {
      res.json({ ok: true });
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/unknown',
      method: 'GET'
    });

    server.close();

    assert.strictEqual(res.statusCode, 404);
  });

  it('should set X-Powered-By header', async () => {
    app.get('/test', (req, res) => {
      res.json({ ok: true });
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/test',
      method: 'GET'
    });

    server.close();

    assert.strictEqual(res.headers['x-powered-by'], 'Mini-Express');
  });

  it('should disable X-Powered-By when configured', async () => {
    app.disable('x-powered-by');
    app.get('/test', (req, res) => {
      res.json({ ok: true });
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/test',
      method: 'GET'
    });

    server.close();

    assert.strictEqual(res.headers['x-powered-by'], undefined);
  });
});

describe('Express Middleware', () => {
  let app;
  let server;
  let port;

  beforeEach(() => {
    app = express();
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  it('should execute middleware in order', async () => {
    const order = [];

    app.use((req, res, next) => {
      order.push(1);
      next();
    });

    app.use((req, res, next) => {
      order.push(2);
      next();
    });

    app.get('/test', (req, res) => {
      order.push(3);
      res.json({ order });
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/test',
      method: 'GET'
    });

    server.close();

    assert.deepStrictEqual(res.body.order, [1, 2, 3]);
  });

  it('should support path-specific middleware', async () => {
    let adminCalled = false;

    app.use('/admin', (req, res, next) => {
      adminCalled = true;
      next();
    });

    app.get('/admin/dashboard', (req, res) => {
      res.json({ adminCalled });
    });

    app.get('/public', (req, res) => {
      res.json({ adminCalled });
    });

    server = app.listen(0);
    port = server.address().port;

    // Admin route should trigger middleware
    const adminRes = await request({
      hostname: 'localhost',
      port,
      path: '/admin/dashboard',
      method: 'GET'
    });
    assert.strictEqual(adminRes.body.adminCalled, true);

    // Reset
    adminCalled = false;

    // Public route should not trigger admin middleware
    const publicRes = await request({
      hostname: 'localhost',
      port,
      path: '/public',
      method: 'GET'
    });
    assert.strictEqual(publicRes.body.adminCalled, false);

    server.close();
  });

  it('should handle errors in middleware', async () => {
    app.use((req, res, next) => {
      next(new Error('Test error'));
    });

    app.get('/test', (req, res) => {
      res.json({ ok: true });
    });

    // Error handler
    app.use((err, req, res, next) => {
      res.status(500).json({ error: err.message });
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/test',
      method: 'GET'
    });

    server.close();

    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.body.error, 'Test error');
  });
});

describe('Express Router', () => {
  let app;
  let server;
  let port;

  beforeEach(() => {
    app = express();
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  it('should support modular routers', async () => {
    const router = express.Router();

    router.get('/', (req, res) => {
      res.json({ route: 'users list' });
    });

    router.get('/:id', (req, res) => {
      res.json({ route: 'user detail', id: req.params.id });
    });

    app.use('/users', router);

    server = app.listen(0);
    port = server.address().port;

    // List users
    const listRes = await request({
      hostname: 'localhost',
      port,
      path: '/users',
      method: 'GET'
    });
    assert.strictEqual(listRes.body.route, 'users list');

    // Get user
    const detailRes = await request({
      hostname: 'localhost',
      port,
      path: '/users/123',
      method: 'GET'
    });
    assert.strictEqual(detailRes.body.route, 'user detail');
    assert.strictEqual(detailRes.body.id, '123');

    server.close();
  });

  it('should support router-level middleware', async () => {
    const router = express.Router();
    let middlewareCalled = false;

    router.use((req, res, next) => {
      middlewareCalled = true;
      next();
    });

    router.get('/test', (req, res) => {
      res.json({ middlewareCalled });
    });

    app.use('/api', router);

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/api/test',
      method: 'GET'
    });

    server.close();

    assert.strictEqual(res.body.middlewareCalled, true);
  });
});

describe('Express Response Methods', () => {
  let app;
  let server;
  let port;

  beforeEach(() => {
    app = express();
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  it('should send JSON response', async () => {
    app.get('/json', (req, res) => {
      res.json({ message: 'Hello JSON' });
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/json',
      method: 'GET'
    });

    server.close();

    assert.strictEqual(res.headers['content-type'], 'application/json');
    assert.strictEqual(res.body.message, 'Hello JSON');
  });

  it('should send text response', async () => {
    app.get('/text', (req, res) => {
      res.send('Hello Text');
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/text',
      method: 'GET'
    });

    server.close();

    assert.ok(res.headers['content-type'].includes('text/html'));
    assert.strictEqual(res.rawBody, 'Hello Text');
  });

  it('should redirect', async () => {
    app.get('/old', (req, res) => {
      res.redirect('/new');
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/old',
      method: 'GET'
    });

    server.close();

    assert.strictEqual(res.statusCode, 302);
    assert.strictEqual(res.headers['location'], '/new');
  });

  it('should redirect with custom status', async () => {
    app.get('/permanent', (req, res) => {
      res.redirect(301, '/new-permanent');
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/permanent',
      method: 'GET'
    });

    server.close();

    assert.strictEqual(res.statusCode, 301);
    assert.strictEqual(res.headers['location'], '/new-permanent');
  });

  it('should set status code', async () => {
    app.get('/created', (req, res) => {
      res.status(201).json({ created: true });
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/created',
      method: 'GET'
    });

    server.close();

    assert.strictEqual(res.statusCode, 201);
  });

  it('should set headers', async () => {
    app.get('/headers', (req, res) => {
      res.set('X-Custom-Header', 'custom-value');
      res.json({ ok: true });
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/headers',
      method: 'GET'
    });

    server.close();

    assert.strictEqual(res.headers['x-custom-header'], 'custom-value');
  });
});

describe('Express Settings', () => {
  it('should get and set settings', () => {
    const app = express();

    app.set('title', 'My App');
    assert.strictEqual(app.get('title'), 'My App');
  });

  it('should enable and disable settings', () => {
    const app = express();

    app.enable('trust proxy');
    assert.strictEqual(app.enabled('trust proxy'), true);

    app.disable('trust proxy');
    assert.strictEqual(app.disabled('trust proxy'), true);
  });

  it('should have default env setting', () => {
    const app = express();
    assert.ok(['development', 'production', 'test'].includes(app.get('env')));
  });
});
