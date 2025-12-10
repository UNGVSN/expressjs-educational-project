/**
 * next() Function Tests
 *
 * Tests for the crucial next() function that drives
 * the middleware pipeline.
 */

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const createApp = require('../lib');

// Dynamic port allocation
let portCounter = 7100;
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
        res.body = data;
        res.json = () => JSON.parse(data);
        resolve(res);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

describe('next() Behavior', () => {
  let server;

  afterEach((_, done) => {
    if (server) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('should pass control to next middleware', async () => {
    const app = createApp();
    const order = [];

    app.use((req, res, next) => {
      order.push('first');
      next();
    });

    app.use((req, res, next) => {
      order.push('second');
      res.end('done');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    await request({ port, path: '/', method: 'GET' });

    assert.deepStrictEqual(order, ['first', 'second']);
  });

  it('should allow async operations before next()', async () => {
    const app = createApp();
    const order = [];

    app.use((req, res, next) => {
      order.push('start');
      setTimeout(() => {
        order.push('after-timeout');
        next();
      }, 10);
    });

    app.use((req, res, next) => {
      order.push('second');
      res.end('done');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    await request({ port, path: '/', method: 'GET' });

    assert.deepStrictEqual(order, ['start', 'after-timeout', 'second']);
  });

  it('should allow middleware to modify req before next()', async () => {
    const app = createApp();

    app.use((req, res, next) => {
      req.customData = { added: true };
      next();
    });

    app.get('/test', (req, res) => {
      res.json({ customData: req.customData });
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/test', method: 'GET' });

    assert.deepStrictEqual(res.json(), { customData: { added: true } });
  });

  it('should allow middleware to add to res before next()', async () => {
    const app = createApp();

    app.use((req, res, next) => {
      res.setHeader('X-Custom', 'value');
      next();
    });

    app.get('/test', (req, res) => {
      res.end('done');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/test', method: 'GET' });

    assert.strictEqual(res.headers['x-custom'], 'value');
  });

  it('should not call later middleware if response is sent', async () => {
    const app = createApp();
    let secondCalled = false;

    app.use((req, res, next) => {
      res.end('first');
      // Note: even calling next() here won't help as response is ended
    });

    app.use((req, res, next) => {
      secondCalled = true;
      res.end('second');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    const res = await request({ port, path: '/', method: 'GET' });

    assert.strictEqual(res.body, 'first');
    assert.strictEqual(secondCalled, false);
  });
});

describe('Middleware with Routes', () => {
  let server;

  afterEach((_, done) => {
    if (server) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('should run global middleware before routes', async () => {
    const app = createApp();
    const order = [];

    app.use((req, res, next) => {
      order.push('middleware');
      next();
    });

    app.get('/test', (req, res) => {
      order.push('route');
      res.end('done');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));
    await request({ port, path: '/test', method: 'GET' });

    assert.deepStrictEqual(order, ['middleware', 'route']);
  });

  it('should only run path middleware for matching paths', async () => {
    const app = createApp();
    const calls = [];

    app.use('/api', (req, res, next) => {
      calls.push('api-middleware');
      next();
    });

    app.get('/api/test', (req, res) => {
      calls.push('api-route');
      res.end('api');
    });

    app.get('/web/test', (req, res) => {
      calls.push('web-route');
      res.end('web');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));

    // Call /web/test
    await request({ port, path: '/web/test', method: 'GET' });
    assert.deepStrictEqual(calls, ['web-route']);

    // Clear calls
    calls.length = 0;

    // Call /api/test
    await request({ port, path: '/api/test', method: 'GET' });
    assert.deepStrictEqual(calls, ['api-middleware', 'api-route']);
  });
});

describe('Multiple next() paths', () => {
  let server;

  afterEach((_, done) => {
    if (server) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('should support conditional middleware flow', async () => {
    const app = createApp();

    app.use((req, res, next) => {
      if (req.query.skip === 'true') {
        res.end('skipped');
        return;
      }
      next();
    });

    app.get('/test', (req, res) => {
      res.end('not skipped');
    });

    const port = getPort();
    server = app.listen(port);

    await new Promise(resolve => server.on('listening', resolve));

    const resSkip = await request({ port, path: '/test?skip=true', method: 'GET' });
    assert.strictEqual(resSkip.body, 'skipped');

    const resNoSkip = await request({ port, path: '/test', method: 'GET' });
    assert.strictEqual(resNoSkip.body, 'not skipped');
  });
});
