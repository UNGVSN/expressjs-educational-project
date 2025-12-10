/**
 * Middleware Pipeline Tests
 */

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const createApp = require('../lib');

// Dynamic port allocation to avoid conflicts
let portCounter = 7000;
function getPort() {
  return portCounter++;
}

// Helper to make HTTP requests
async function request(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          res.body = data;
          res.json = () => JSON.parse(data);
          resolve(res);
        } catch (e) {
          res.body = data;
          resolve(res);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

describe('Middleware Basics', () => {
  let server;

  afterEach((_, done) => {
    if (server) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('should execute single middleware', async () => {
    const app = createApp();
    let executed = false;

    app.use((req, res, next) => {
      executed = true;
      res.end('done');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    await request({ port, path: '/', method: 'GET' });

    assert.strictEqual(executed, true);
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

    app.use((req, res, next) => {
      order.push(3);
      res.end('done');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    await request({ port, path: '/', method: 'GET' });

    assert.deepStrictEqual(order, [1, 2, 3]);
  });

  it('should stop at middleware that does not call next()', async () => {
    const app = createApp();
    const order = [];

    app.use((req, res, next) => {
      order.push(1);
      next();
    });

    app.use((req, res, next) => {
      order.push(2);
      res.end('stopped here');
      // No next() called
    });

    app.use((req, res, next) => {
      order.push(3); // Should never execute
      res.end('done');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/', method: 'GET' });

    assert.deepStrictEqual(order, [1, 2]);
    assert.strictEqual(res.body, 'stopped here');
  });

  it('should support multiple handlers in single use()', async () => {
    const app = createApp();
    const order = [];

    app.use(
      (req, res, next) => { order.push(1); next(); },
      (req, res, next) => { order.push(2); next(); },
      (req, res, next) => { order.push(3); res.end('done'); }
    );

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    await request({ port, path: '/', method: 'GET' });

    assert.deepStrictEqual(order, [1, 2, 3]);
  });
});

describe('Path-based Middleware', () => {
  let server;

  afterEach((_, done) => {
    if (server) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('should only execute for matching paths', async () => {
    const app = createApp();
    let apiCalled = false;
    let webCalled = false;

    app.use('/api', (req, res, next) => {
      apiCalled = true;
      res.end('api');
    });

    app.use('/web', (req, res, next) => {
      webCalled = true;
      res.end('web');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/api/users', method: 'GET' });

    assert.strictEqual(apiCalled, true);
    assert.strictEqual(webCalled, false);
    assert.strictEqual(res.body, 'api');
  });

  it('should match path prefix', async () => {
    const app = createApp();
    let matched = false;

    app.use('/api', (req, res, next) => {
      matched = true;
      res.end('matched');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));

    // Should match /api
    await request({ port, path: '/api', method: 'GET' });
    assert.strictEqual(matched, true);

    // Reset
    matched = false;

    // Should match /api/anything
    await request({ port, path: '/api/users/123', method: 'GET' });
    assert.strictEqual(matched, true);
  });

  it('should not match partial path segments', async () => {
    const app = createApp();
    let matched = false;

    app.use('/api', (req, res, next) => {
      matched = true;
      res.end('matched');
    });

    app.use((req, res, next) => {
      res.end('default');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));

    // /apiV2 should NOT match /api middleware
    const res = await request({ port, path: '/apiV2', method: 'GET' });
    assert.strictEqual(res.body, 'default');
  });
});

describe('Route Methods', () => {
  let server;

  afterEach((_, done) => {
    if (server) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('should handle GET requests', async () => {
    const app = createApp();

    app.get('/test', (req, res) => {
      res.end('GET');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/test', method: 'GET' });

    assert.strictEqual(res.body, 'GET');
  });

  it('should handle POST requests', async () => {
    const app = createApp();

    app.post('/test', (req, res) => {
      res.end('POST');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/test', method: 'POST' });

    assert.strictEqual(res.body, 'POST');
  });

  it('should match correct method only', async () => {
    const app = createApp();

    app.get('/test', (req, res) => {
      res.end('GET');
    });

    app.post('/test', (req, res) => {
      res.end('POST');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));

    const getRes = await request({ port, path: '/test', method: 'GET' });
    assert.strictEqual(getRes.body, 'GET');

    const postRes = await request({ port, path: '/test', method: 'POST' });
    assert.strictEqual(postRes.body, 'POST');
  });

  it('should handle app.all() for any method', async () => {
    const app = createApp();

    app.all('/test', (req, res) => {
      res.end(`ALL: ${req.method}`);
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));

    const getRes = await request({ port, path: '/test', method: 'GET' });
    assert.strictEqual(getRes.body, 'ALL: GET');

    const postRes = await request({ port, path: '/test', method: 'POST' });
    assert.strictEqual(postRes.body, 'ALL: POST');
  });
});

describe('app.route()', () => {
  let server;

  afterEach((_, done) => {
    if (server) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('should allow method chaining', async () => {
    const app = createApp();

    app.route('/resource')
      .get((req, res) => res.end('GET'))
      .post((req, res) => res.end('POST'))
      .put((req, res) => res.end('PUT'));

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));

    const getRes = await request({ port, path: '/resource', method: 'GET' });
    assert.strictEqual(getRes.body, 'GET');

    const postRes = await request({ port, path: '/resource', method: 'POST' });
    assert.strictEqual(postRes.body, 'POST');

    const putRes = await request({ port, path: '/resource', method: 'PUT' });
    assert.strictEqual(putRes.body, 'PUT');
  });
});

describe('Route Parameters', () => {
  let server;

  afterEach((_, done) => {
    if (server) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('should extract route parameters', async () => {
    const app = createApp();

    app.get('/users/:id', (req, res) => {
      res.json({ id: req.params.id });
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/users/123', method: 'GET' });

    assert.deepStrictEqual(res.json(), { id: '123' });
  });

  it('should extract multiple parameters', async () => {
    const app = createApp();

    app.get('/users/:userId/posts/:postId', (req, res) => {
      res.json(req.params);
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/users/5/posts/10', method: 'GET' });

    assert.deepStrictEqual(res.json(), { userId: '5', postId: '10' });
  });

  it('should decode URI components', async () => {
    const app = createApp();

    app.get('/search/:query', (req, res) => {
      res.json({ query: req.params.query });
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/search/hello%20world', method: 'GET' });

    assert.deepStrictEqual(res.json(), { query: 'hello world' });
  });
});

describe('Query Parameters', () => {
  let server;

  afterEach((_, done) => {
    if (server) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('should parse query parameters', async () => {
    const app = createApp();

    app.get('/search', (req, res) => {
      res.json(req.query);
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/search?q=test&page=1', method: 'GET' });

    assert.deepStrictEqual(res.json(), { q: 'test', page: '1' });
  });
});

describe('Response Helpers', () => {
  let server;

  afterEach((_, done) => {
    if (server) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('should support res.status()', async () => {
    const app = createApp();

    app.get('/test', (req, res) => {
      res.status(201).end('Created');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/test', method: 'GET' });

    assert.strictEqual(res.statusCode, 201);
  });

  it('should support res.json()', async () => {
    const app = createApp();

    app.get('/test', (req, res) => {
      res.json({ message: 'hello' });
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/test', method: 'GET' });

    assert.strictEqual(res.headers['content-type'], 'application/json');
    assert.deepStrictEqual(res.json(), { message: 'hello' });
  });

  it('should support res.send() with object', async () => {
    const app = createApp();

    app.get('/test', (req, res) => {
      res.send({ message: 'hello' });
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/test', method: 'GET' });

    assert.strictEqual(res.headers['content-type'], 'application/json');
  });

  it('should support res.redirect()', async () => {
    const app = createApp();

    app.get('/old', (req, res) => {
      res.redirect('/new');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/old', method: 'GET' });

    assert.strictEqual(res.statusCode, 302);
    assert.strictEqual(res.headers.location, '/new');
  });

  it('should support res.redirect() with status', async () => {
    const app = createApp();

    app.get('/old', (req, res) => {
      res.redirect(301, '/new');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/old', method: 'GET' });

    assert.strictEqual(res.statusCode, 301);
  });
});

describe('404 Handling', () => {
  let server;

  afterEach((_, done) => {
    if (server) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('should return 404 for unmatched routes', async () => {
    const app = createApp();

    app.get('/exists', (req, res) => {
      res.end('found');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/not-exists', method: 'GET' });

    assert.strictEqual(res.statusCode, 404);
  });
});
