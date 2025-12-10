/**
 * Router Parameter Tests
 */

'use strict';

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const createApp = require('../lib');
const Router = require('../lib/router');

// Port allocation
let portCounter = 8200;
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

describe('router.param()', () => {
  let server;

  afterEach((_, done) => {
    if (server) server.close(() => done());
    else done();
  });

  it('should preprocess parameter values', async () => {
    const app = createApp();
    const router = new Router();

    // Simulated users database
    const users = {
      '1': { id: '1', name: 'Alice' },
      '2': { id: '2', name: 'Bob' }
    };

    // Parameter handler
    router.param('id', (req, res, next, id) => {
      const user = users[id];
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      req.user = user;
      next();
    });

    router.get('/users/:id', (req, res) => {
      res.json(req.user);
    });

    app.use(router);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    // Existing user
    const res = await request({ port, path: '/users/1', method: 'GET' });
    assert.deepStrictEqual(res.json(), { id: '1', name: 'Alice' });

    // Non-existing user
    const res404 = await request({ port, path: '/users/999', method: 'GET' });
    assert.strictEqual(res404.statusCode, 404);
  });

  it('should call param handler for each route with that param', async () => {
    const app = createApp();
    const router = new Router();
    let paramCalls = 0;

    router.param('id', (req, res, next, id) => {
      paramCalls++;
      req.paramId = id;
      next();
    });

    router.get('/a/:id', (req, res) => {
      res.json({ route: 'a', paramId: req.paramId, calls: paramCalls });
    });

    router.get('/b/:id', (req, res) => {
      res.json({ route: 'b', paramId: req.paramId, calls: paramCalls });
    });

    app.use(router);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    // First call
    const res1 = await request({ port, path: '/a/test', method: 'GET' });
    assert.strictEqual(res1.json().calls, 1);

    // Second call
    const res2 = await request({ port, path: '/b/test', method: 'GET' });
    assert.strictEqual(res2.json().calls, 2);
  });

  it('should support multiple param handlers for same param', async () => {
    const app = createApp();
    const router = new Router();
    const order = [];

    router.param('id', (req, res, next, id) => {
      order.push('handler1');
      next();
    });

    router.param('id', (req, res, next, id) => {
      order.push('handler2');
      next();
    });

    router.get('/items/:id', (req, res) => {
      order.push('route');
      res.json({ order });
    });

    app.use(router);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/items/1', method: 'GET' });
    // Reset order for assertion (handlers accumulate across requests)
    const json = res.json();
    assert.ok(json.order.includes('handler1'));
    assert.ok(json.order.includes('handler2'));
    assert.ok(json.order.includes('route'));
  });

  it('should handle param handler errors', async () => {
    const app = createApp();
    const router = new Router();

    router.param('id', (req, res, next, id) => {
      if (id === 'error') {
        return next(new Error('Invalid ID'));
      }
      next();
    });

    router.get('/items/:id', (req, res) => {
      res.json({ id: req.params.id });
    });

    // Error handler
    app.use((err, req, res, next) => {
      res.status(500).json({ error: err.message });
    });

    app.use(router);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/items/error', method: 'GET' });
    assert.strictEqual(res.statusCode, 500);
  });
});

describe('app.param()', () => {
  let server;

  afterEach((_, done) => {
    if (server) server.close(() => done());
    else done();
  });

  it('should work at application level', async () => {
    const app = createApp();

    // App-level param handler
    app.param('id', (req, res, next, id) => {
      req.itemId = parseInt(id, 10);
      next();
    });

    app.get('/items/:id', (req, res) => {
      res.json({ itemId: req.itemId, type: typeof req.itemId });
    });

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/items/42', method: 'GET' });
    assert.deepStrictEqual(res.json(), { itemId: 42, type: 'number' });
  });
});
