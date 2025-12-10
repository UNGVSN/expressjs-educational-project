/**
 * Application Class Tests
 */

'use strict';

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const createApp = require('../lib');

// Port allocation
let portCounter = 9000;
function getPort() {
  return portCounter++;
}

// HTTP helper
async function request(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        res.body = data;
        res.json = () => {
          try { return JSON.parse(data); }
          catch { return null; }
        };
        resolve(res);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

describe('Application Basics', () => {
  let server;

  afterEach((_, done) => {
    if (server) server.close(() => done());
    else done();
  });

  it('should create an application', () => {
    const app = createApp();
    assert.ok(app);
    assert.ok(app.settings);
    assert.ok(app.locals);
  });

  it('should handle requests', async () => {
    const app = createApp();

    app.get('/test', (req, res) => {
      res.json({ message: 'hello' });
    });

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/test', method: 'GET' });
    assert.deepStrictEqual(res.json(), { message: 'hello' });
  });

  it('should have X-Powered-By header by default', async () => {
    const app = createApp();

    app.get('/test', (req, res) => res.send('ok'));

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/test', method: 'GET' });
    assert.strictEqual(res.headers['x-powered-by'], 'Mini-Express');
  });

  it('should allow disabling X-Powered-By', async () => {
    const app = createApp();
    app.disable('x-powered-by');

    app.get('/test', (req, res) => res.send('ok'));

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/test', method: 'GET' });
    assert.strictEqual(res.headers['x-powered-by'], undefined);
  });
});

describe('Application Routes', () => {
  let server;

  afterEach((_, done) => {
    if (server) server.close(() => done());
    else done();
  });

  it('should handle multiple HTTP methods', async () => {
    const app = createApp();

    app.get('/resource', (req, res) => res.json({ method: 'GET' }));
    app.post('/resource', (req, res) => res.json({ method: 'POST' }));
    app.put('/resource', (req, res) => res.json({ method: 'PUT' }));
    app.delete('/resource', (req, res) => res.json({ method: 'DELETE' }));

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const getRes = await request({ port, path: '/resource', method: 'GET' });
    assert.deepStrictEqual(getRes.json(), { method: 'GET' });

    const postRes = await request({ port, path: '/resource', method: 'POST' });
    assert.deepStrictEqual(postRes.json(), { method: 'POST' });
  });

  it('should handle route parameters', async () => {
    const app = createApp();

    app.get('/users/:id', (req, res) => {
      res.json({ id: req.params.id });
    });

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/users/42', method: 'GET' });
    assert.deepStrictEqual(res.json(), { id: '42' });
  });

  it('should handle query parameters', async () => {
    const app = createApp();

    app.get('/search', (req, res) => {
      res.json(req.query);
    });

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/search?q=test&limit=10', method: 'GET' });
    assert.deepStrictEqual(res.json(), { q: 'test', limit: '10' });
  });

  it('should handle app.route() chaining', async () => {
    const app = createApp();

    app.route('/item')
      .get((req, res) => res.json({ action: 'get' }))
      .post((req, res) => res.json({ action: 'create' }));

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const getRes = await request({ port, path: '/item', method: 'GET' });
    assert.deepStrictEqual(getRes.json(), { action: 'get' });

    const postRes = await request({ port, path: '/item', method: 'POST' });
    assert.deepStrictEqual(postRes.json(), { action: 'create' });
  });
});

describe('Application Middleware', () => {
  let server;

  afterEach((_, done) => {
    if (server) server.close(() => done());
    else done();
  });

  it('should execute middleware in order', async () => {
    const app = createApp();
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

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    await request({ port, path: '/test', method: 'GET' });
    assert.deepStrictEqual(order, [1, 2, 3]);
  });

  it('should handle path-specific middleware', async () => {
    const app = createApp();
    let apiCalled = false;

    app.use('/api', (req, res, next) => {
      apiCalled = true;
      next();
    });

    app.get('/api/test', (req, res) => {
      res.json({ apiCalled });
    });

    app.get('/web/test', (req, res) => {
      res.json({ apiCalled });
    });

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    // /web/test should not trigger /api middleware
    apiCalled = false;
    await request({ port, path: '/web/test', method: 'GET' });
    assert.strictEqual(apiCalled, false);

    // /api/test should trigger /api middleware
    apiCalled = false;
    const res = await request({ port, path: '/api/test', method: 'GET' });
    assert.strictEqual(res.json().apiCalled, true);
  });
});

describe('Request/Response Objects', () => {
  let server;

  afterEach((_, done) => {
    if (server) server.close(() => done());
    else done();
  });

  it('should have req.app reference', async () => {
    const app = createApp();

    app.get('/test', (req, res) => {
      res.json({ hasApp: req.app === app });
    });

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/test', method: 'GET' });
    assert.deepStrictEqual(res.json(), { hasApp: true });
  });

  it('should have res.app reference', async () => {
    const app = createApp();

    app.get('/test', (req, res) => {
      res.json({ hasApp: res.app === app });
    });

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/test', method: 'GET' });
    assert.deepStrictEqual(res.json(), { hasApp: true });
  });

  it('should support res.status().json() chaining', async () => {
    const app = createApp();

    app.get('/test', (req, res) => {
      res.status(201).json({ created: true });
    });

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/test', method: 'GET' });
    assert.strictEqual(res.statusCode, 201);
    assert.deepStrictEqual(res.json(), { created: true });
  });

  it('should support res.redirect()', async () => {
    const app = createApp();

    app.get('/old', (req, res) => {
      res.redirect('/new');
    });

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/old', method: 'GET' });
    assert.strictEqual(res.statusCode, 302);
    assert.strictEqual(res.headers.location, '/new');
  });
});

describe('404 Handling', () => {
  let server;

  afterEach((_, done) => {
    if (server) server.close(() => done());
    else done();
  });

  it('should return 404 for unmatched routes', async () => {
    const app = createApp();

    app.get('/exists', (req, res) => res.send('found'));

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/not-found', method: 'GET' });
    assert.strictEqual(res.statusCode, 404);
  });
});
