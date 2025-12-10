/**
 * Router Class Tests
 */

'use strict';

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const createApp = require('../lib');
const Router = require('../lib/router');

// Port allocation
let portCounter = 8000;
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
        res.json = () => JSON.parse(data);
        resolve(res);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

describe('Router Basic', () => {
  let server;

  afterEach((_, done) => {
    if (server) server.close(() => done());
    else done();
  });

  it('should create a router instance', () => {
    const router = new Router();
    assert.ok(router);
    assert.ok(typeof router === 'function');
  });

  it('should handle GET routes', async () => {
    const app = createApp();
    const router = new Router();

    router.get('/test', (req, res) => {
      res.json({ message: 'test' });
    });

    app.use(router);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/test', method: 'GET' });
    assert.deepStrictEqual(res.json(), { message: 'test' });
  });

  it('should handle POST routes', async () => {
    const app = createApp();
    const router = new Router();

    router.post('/create', (req, res) => {
      res.json({ created: true });
    });

    app.use(router);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/create', method: 'POST' });
    assert.deepStrictEqual(res.json(), { created: true });
  });

  it('should handle route parameters', async () => {
    const app = createApp();
    const router = new Router();

    router.get('/users/:id', (req, res) => {
      res.json({ id: req.params.id });
    });

    app.use(router);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/users/42', method: 'GET' });
    assert.deepStrictEqual(res.json(), { id: '42' });
  });

  it('should handle multiple parameters', async () => {
    const app = createApp();
    const router = new Router();

    router.get('/users/:userId/posts/:postId', (req, res) => {
      res.json(req.params);
    });

    app.use(router);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/users/1/posts/2', method: 'GET' });
    assert.deepStrictEqual(res.json(), { userId: '1', postId: '2' });
  });
});

describe('Router Middleware', () => {
  let server;

  afterEach((_, done) => {
    if (server) server.close(() => done());
    else done();
  });

  it('should support router.use() middleware', async () => {
    const app = createApp();
    const router = new Router();
    let middlewareCalled = false;

    router.use((req, res, next) => {
      middlewareCalled = true;
      next();
    });

    router.get('/test', (req, res) => {
      res.json({ middlewareCalled });
    });

    app.use(router);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/test', method: 'GET' });
    assert.strictEqual(res.json().middlewareCalled, true);
  });

  it('should execute middleware in order', async () => {
    const app = createApp();
    const router = new Router();
    const order = [];

    router.use((req, res, next) => {
      order.push(1);
      next();
    });

    router.use((req, res, next) => {
      order.push(2);
      next();
    });

    router.get('/test', (req, res) => {
      order.push(3);
      res.json({ order });
    });

    app.use(router);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    await request({ port, path: '/test', method: 'GET' });
    assert.deepStrictEqual(order, [1, 2, 3]);
  });
});

describe('Router.route() Chaining', () => {
  let server;

  afterEach((_, done) => {
    if (server) server.close(() => done());
    else done();
  });

  it('should allow method chaining with route()', async () => {
    const app = createApp();
    const router = new Router();

    router.route('/resource')
      .get((req, res) => res.json({ method: 'GET' }))
      .post((req, res) => res.json({ method: 'POST' }));

    app.use(router);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const getRes = await request({ port, path: '/resource', method: 'GET' });
    assert.deepStrictEqual(getRes.json(), { method: 'GET' });

    const postRes = await request({ port, path: '/resource', method: 'POST' });
    assert.deepStrictEqual(postRes.json(), { method: 'POST' });
  });
});

describe('Router.all()', () => {
  let server;

  afterEach((_, done) => {
    if (server) server.close(() => done());
    else done();
  });

  it('should match all HTTP methods', async () => {
    const app = createApp();
    const router = new Router();

    router.all('/any', (req, res) => {
      res.json({ method: req.method });
    });

    app.use(router);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const getRes = await request({ port, path: '/any', method: 'GET' });
    assert.strictEqual(getRes.json().method, 'GET');

    const postRes = await request({ port, path: '/any', method: 'POST' });
    assert.strictEqual(postRes.json().method, 'POST');

    const putRes = await request({ port, path: '/any', method: 'PUT' });
    assert.strictEqual(putRes.json().method, 'PUT');
  });
});
