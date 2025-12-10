/**
 * Router Mounting Tests
 */

'use strict';

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const createApp = require('../lib');
const Router = require('../lib/router');

// Port allocation
let portCounter = 8100;
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

describe('Router Mounting', () => {
  let server;

  afterEach((_, done) => {
    if (server) server.close(() => done());
    else done();
  });

  it('should mount router at a path', async () => {
    const app = createApp();
    const router = new Router();

    router.get('/users', (req, res) => {
      res.json({ route: '/users' });
    });

    // Mount router at /api
    app.use('/api', router);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    // /api/users should work
    const res = await request({ port, path: '/api/users', method: 'GET' });
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.json(), { route: '/users' });

    // /users alone should not work
    const res2 = await request({ port, path: '/users', method: 'GET' });
    assert.strictEqual(res2.statusCode, 404);
  });

  it('should handle nested paths', async () => {
    const app = createApp();
    const router = new Router();

    router.get('/items/:id', (req, res) => {
      res.json({ id: req.params.id });
    });

    app.use('/api/v1', router);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/api/v1/items/42', method: 'GET' });
    assert.deepStrictEqual(res.json(), { id: '42' });
  });

  it('should handle multiple mounted routers', async () => {
    const app = createApp();

    // Create separate routers
    const usersRouter = new Router();
    const postsRouter = new Router();

    // Note: For educational simplicity, this implementation uses direct routes
    // In full Express, routers maintain their own relative paths
    usersRouter.get('/list', (req, res) => res.json({ route: 'users-list' }));
    usersRouter.get('/detail/:id', (req, res) => res.json({ route: 'user-detail', id: req.params.id }));

    postsRouter.get('/list', (req, res) => res.json({ route: 'posts-list' }));

    app.use('/users', usersRouter);
    app.use('/posts', postsRouter);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const usersRes = await request({ port, path: '/users/list', method: 'GET' });
    assert.deepStrictEqual(usersRes.json(), { route: 'users-list' });

    const userDetailRes = await request({ port, path: '/users/detail/5', method: 'GET' });
    assert.deepStrictEqual(userDetailRes.json(), { route: 'user-detail', id: '5' });

    const postsRes = await request({ port, path: '/posts/list', method: 'GET' });
    assert.deepStrictEqual(postsRes.json(), { route: 'posts-list' });
  });

  it('should set req.baseUrl when mounted', async () => {
    const app = createApp();
    const router = new Router();

    router.get('/info', (req, res) => {
      res.json({
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        path: req.path
      });
    });

    app.use('/api', router);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/api/info', method: 'GET' });
    const json = res.json();

    assert.strictEqual(json.baseUrl, '/api');
    assert.strictEqual(json.originalUrl, '/api/info');
  });

  it('should handle explicit path in mounted router', async () => {
    const app = createApp();
    const router = new Router();

    // Use explicit path that matches when mounted
    router.get('/home', (req, res) => {
      res.json({ message: 'router home' });
    });

    app.use('/api', router);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/api/home', method: 'GET' });
    assert.deepStrictEqual(res.json(), { message: 'router home' });
  });
});

describe('Nested Routers', () => {
  let server;

  afterEach((_, done) => {
    if (server) server.close(() => done());
    else done();
  });

  it('should support routers mounted on routers', async () => {
    const app = createApp();

    const apiRouter = new Router();
    const usersRouter = new Router();

    // Use explicit paths for educational clarity
    usersRouter.get('/list', (req, res) => {
      res.json({ users: [] });
    });

    // Mount users router on api router
    apiRouter.use('/users', usersRouter);

    // Mount api router on app
    app.use('/api', apiRouter);

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    // Full path: /api/users/list
    const res = await request({ port, path: '/api/users/list', method: 'GET' });
    assert.deepStrictEqual(res.json(), { users: [] });
  });
});
