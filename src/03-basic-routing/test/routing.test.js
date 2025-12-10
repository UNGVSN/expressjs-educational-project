/**
 * Routing Tests
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { createApplication } = require('../lib');

// Port management
let portCounter = 7000;
function getPort() {
  return portCounter++;
}

// Helper for HTTP requests
function request(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json: () => JSON.parse(body)
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'object'
        ? JSON.stringify(options.body)
        : options.body);
    }

    req.end();
  });
}

// Helper to close server
function closeServer(server) {
  return new Promise(resolve => {
    if (server?.listening) {
      server.close(resolve);
    } else {
      resolve();
    }
  });
}

describe('Basic Routing', () => {
  it('should handle GET request', async () => {
    const PORT = getPort();
    const app = createApplication();

    app.get('/', (req, res) => {
      res.json({ message: 'Hello' });
    });

    const server = app.listen(PORT);

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(response.statusCode, 200);
      assert.deepStrictEqual(response.json(), { message: 'Hello' });
    } finally {
      await closeServer(server);
    }
  });

  it('should handle POST request', async () => {
    const PORT = getPort();
    const app = createApplication();

    app.post('/users', (req, res) => {
      res.status(201).json({ created: true });
    });

    const server = app.listen(PORT);

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/users',
        method: 'POST'
      });

      assert.strictEqual(response.statusCode, 201);
      assert.deepStrictEqual(response.json(), { created: true });
    } finally {
      await closeServer(server);
    }
  });

  it('should handle multiple routes', async () => {
    const PORT = getPort();
    const app = createApplication();

    app.get('/', (req, res) => res.json({ route: 'home' }));
    app.get('/about', (req, res) => res.json({ route: 'about' }));
    app.get('/contact', (req, res) => res.json({ route: 'contact' }));

    const server = app.listen(PORT);

    try {
      let response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });
      assert.strictEqual(response.json().route, 'home');

      response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/about',
        method: 'GET'
      });
      assert.strictEqual(response.json().route, 'about');

      response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/contact',
        method: 'GET'
      });
      assert.strictEqual(response.json().route, 'contact');
    } finally {
      await closeServer(server);
    }
  });

  it('should return 404 for unmatched routes', async () => {
    const PORT = getPort();
    const app = createApplication();

    app.get('/', (req, res) => res.json({ route: 'home' }));

    const server = app.listen(PORT);

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/nonexistent',
        method: 'GET'
      });

      assert.strictEqual(response.statusCode, 404);
    } finally {
      await closeServer(server);
    }
  });

  it('should match method correctly', async () => {
    const PORT = getPort();
    const app = createApplication();

    app.get('/resource', (req, res) => res.json({ method: 'GET' }));
    app.post('/resource', (req, res) => res.json({ method: 'POST' }));

    const server = app.listen(PORT);

    try {
      let response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/resource',
        method: 'GET'
      });
      assert.strictEqual(response.json().method, 'GET');

      response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/resource',
        method: 'POST'
      });
      assert.strictEqual(response.json().method, 'POST');
    } finally {
      await closeServer(server);
    }
  });
});

describe('Route Parameters', () => {
  it('should extract single parameter', async () => {
    const PORT = getPort();
    const app = createApplication();

    app.get('/users/:id', (req, res) => {
      res.json({ id: req.params.id });
    });

    const server = app.listen(PORT);

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/users/123',
        method: 'GET'
      });

      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.json().id, '123');
    } finally {
      await closeServer(server);
    }
  });

  it('should extract multiple parameters', async () => {
    const PORT = getPort();
    const app = createApplication();

    app.get('/users/:userId/posts/:postId', (req, res) => {
      res.json(req.params);
    });

    const server = app.listen(PORT);

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/users/5/posts/10',
        method: 'GET'
      });

      assert.strictEqual(response.statusCode, 200);
      assert.deepStrictEqual(response.json(), { userId: '5', postId: '10' });
    } finally {
      await closeServer(server);
    }
  });

  it('should match different parameter values', async () => {
    const PORT = getPort();
    const app = createApplication();

    app.get('/items/:type', (req, res) => {
      res.json({ type: req.params.type });
    });

    const server = app.listen(PORT);

    try {
      let response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/items/books',
        method: 'GET'
      });
      assert.strictEqual(response.json().type, 'books');

      response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/items/electronics',
        method: 'GET'
      });
      assert.strictEqual(response.json().type, 'electronics');
    } finally {
      await closeServer(server);
    }
  });
});

describe('app.route()', () => {
  it('should allow method chaining', async () => {
    const PORT = getPort();
    const app = createApplication();

    app.route('/resource')
      .get((req, res) => res.json({ method: 'GET' }))
      .post((req, res) => res.json({ method: 'POST' }))
      .put((req, res) => res.json({ method: 'PUT' }))
      .delete((req, res) => res.json({ method: 'DELETE' }));

    const server = app.listen(PORT);

    try {
      for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
        const response = await request({
          hostname: 'localhost',
          port: PORT,
          path: '/resource',
          method
        });
        assert.strictEqual(response.json().method, method);
      }
    } finally {
      await closeServer(server);
    }
  });
});

describe('app.all()', () => {
  it('should match all HTTP methods', async () => {
    const PORT = getPort();
    const app = createApplication();

    app.all('/any', (req, res) => {
      res.json({ method: req.method });
    });

    const server = app.listen(PORT);

    try {
      for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) {
        const response = await request({
          hostname: 'localhost',
          port: PORT,
          path: '/any',
          method
        });
        assert.strictEqual(response.json().method, method);
      }
    } finally {
      await closeServer(server);
    }
  });
});

describe('Query String', () => {
  it('should parse query parameters', async () => {
    const PORT = getPort();
    const app = createApplication();

    app.get('/search', (req, res) => {
      res.json(req.query);
    });

    const server = app.listen(PORT);

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/search?q=hello&page=2',
        method: 'GET'
      });

      assert.deepStrictEqual(response.json(), { q: 'hello', page: '2' });
    } finally {
      await closeServer(server);
    }
  });
});
