/**
 * Response Enhancement Tests
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { createServer } = require('../lib');

// Ensure response enhancements are loaded
require('../lib/response');

// Port management
let portCounter = 5100;
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

describe('res.status()', () => {
  it('should set status code', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.status(201).json({ created: true });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'POST'
      });

      assert.strictEqual(response.statusCode, 201);
    } finally {
      await closeServer(server);
    }
  });

  it('should be chainable', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.status(404).status(200).json({ ok: true });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(response.statusCode, 200);
    } finally {
      await closeServer(server);
    }
  });
});

describe('res.set()', () => {
  it('should set a single header', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.set('X-Custom', 'value').json({});
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(response.headers['x-custom'], 'value');
    } finally {
      await closeServer(server);
    }
  });

  it('should set multiple headers from object', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.set({
        'X-One': '1',
        'X-Two': '2'
      }).json({});
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(response.headers['x-one'], '1');
      assert.strictEqual(response.headers['x-two'], '2');
    } finally {
      await closeServer(server);
    }
  });
});

describe('res.get()', () => {
  it('should get a header value', async () => {
    const PORT = getPort();
    let contentType;

    const server = createServer((req, res) => {
      res.type('json');
      contentType = res.get('Content-Type');
      res.json({ contentType });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.ok(contentType.includes('application/json'));
    } finally {
      await closeServer(server);
    }
  });
});

describe('res.type()', () => {
  it('should set Content-Type from shorthand', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.type('html').send('<h1>Test</h1>');
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.ok(response.headers['content-type'].includes('text/html'));
    } finally {
      await closeServer(server);
    }
  });
});

describe('res.json()', () => {
  it('should send JSON response', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.json({ message: 'Hello' });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(response.statusCode, 200);
      assert.ok(response.headers['content-type'].includes('application/json'));
      assert.deepStrictEqual(response.json(), { message: 'Hello' });
    } finally {
      await closeServer(server);
    }
  });

  it('should handle null', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.json(null);
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(response.body, 'null');
    } finally {
      await closeServer(server);
    }
  });

  it('should handle arrays', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.json([1, 2, 3]);
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.deepStrictEqual(response.json(), [1, 2, 3]);
    } finally {
      await closeServer(server);
    }
  });
});

describe('res.send()', () => {
  it('should send string as text/html if starts with <', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.send('<p>Hello</p>');
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.ok(response.headers['content-type'].includes('text/html'));
      assert.strictEqual(response.body, '<p>Hello</p>');
    } finally {
      await closeServer(server);
    }
  });

  it('should send string as text/plain otherwise', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.send('Hello World');
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.ok(response.headers['content-type'].includes('text/plain'));
      assert.strictEqual(response.body, 'Hello World');
    } finally {
      await closeServer(server);
    }
  });

  it('should send object as JSON', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.send({ foo: 'bar' });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.ok(response.headers['content-type'].includes('application/json'));
      assert.deepStrictEqual(response.json(), { foo: 'bar' });
    } finally {
      await closeServer(server);
    }
  });

  it('should set Content-Length header', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.send('Hello');
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(response.headers['content-length'], '5');
    } finally {
      await closeServer(server);
    }
  });
});

describe('res.sendStatus()', () => {
  it('should send status with default message', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.sendStatus(404);
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(response.statusCode, 404);
      assert.strictEqual(response.body, 'Not Found');
    } finally {
      await closeServer(server);
    }
  });
});

describe('res.redirect()', () => {
  it('should redirect with 302 by default', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.redirect('/new-path');
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(response.statusCode, 302);
      assert.strictEqual(response.headers['location'], '/new-path');
    } finally {
      await closeServer(server);
    }
  });

  it('should redirect with custom status', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.redirect(301, '/permanent');
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(response.statusCode, 301);
      assert.strictEqual(response.headers['location'], '/permanent');
    } finally {
      await closeServer(server);
    }
  });
});

describe('res.cookie()', () => {
  it('should set cookie header', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.cookie('name', 'value').json({});
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.ok(response.headers['set-cookie']);
      assert.ok(response.headers['set-cookie'][0].includes('name=value'));
    } finally {
      await closeServer(server);
    }
  });

  it('should set cookie with options', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.cookie('session', 'abc123', {
        httpOnly: true,
        secure: true,
        maxAge: 3600000
      }).json({});
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      const cookie = response.headers['set-cookie'][0];
      assert.ok(cookie.includes('session=abc123'));
      assert.ok(cookie.includes('HttpOnly'));
      assert.ok(cookie.includes('Secure'));
      assert.ok(cookie.includes('Max-Age'));
    } finally {
      await closeServer(server);
    }
  });
});

describe('res.append()', () => {
  it('should append header values', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res.append('X-Values', 'one');
      res.append('X-Values', 'two');
      res.json({});
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      // Can be array or comma-separated
      const values = response.headers['x-values'];
      assert.ok(
        (Array.isArray(values) && values.includes('one') && values.includes('two')) ||
        (typeof values === 'string' && values.includes('one') && values.includes('two'))
      );
    } finally {
      await closeServer(server);
    }
  });
});

describe('Method chaining', () => {
  it('should support chaining multiple methods', async () => {
    const PORT = getPort();

    const server = createServer((req, res) => {
      res
        .status(201)
        .set('X-Custom', 'value')
        .type('json')
        .send({ success: true });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'POST'
      });

      assert.strictEqual(response.statusCode, 201);
      assert.strictEqual(response.headers['x-custom'], 'value');
      assert.ok(response.headers['content-type'].includes('application/json'));
      assert.deepStrictEqual(response.json(), { success: true });
    } finally {
      await closeServer(server);
    }
  });
});
