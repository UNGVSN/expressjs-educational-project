/**
 * Server Tests
 *
 * Tests for the HTTP server creation and basic functionality.
 */

'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { createServer, listen } = require('../lib');

/**
 * Helper to make HTTP requests to the test server.
 */
function request(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Helper to close server and wait for it to fully close
 */
function closeServer(server) {
  return new Promise((resolve) => {
    if (server && server.listening) {
      server.close(resolve);
    } else {
      resolve();
    }
  });
}

// Use different ports for each test suite to avoid conflicts
let portCounter = 4000;
function getPort() {
  return portCounter++;
}

describe('createServer', () => {
  it('should create an HTTP server', () => {
    const server = createServer((req, res) => {
      res.end('OK');
    });

    assert.ok(server instanceof http.Server);
  });

  it('should handle requests', async () => {
    const PORT = getPort();
    const server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Hello, World!');
    });

    await new Promise(resolve => server.listen(PORT, resolve));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.body, 'Hello, World!');
      assert.strictEqual(response.headers['content-type'], 'text/plain');
    } finally {
      await closeServer(server);
    }
  });

  it('should parse URL path and attach to request', async () => {
    const PORT = getPort();
    let capturedPath;

    const server = createServer((req, res) => {
      capturedPath = req.path;
      res.end('OK');
    });

    await new Promise(resolve => server.listen(PORT, resolve));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/users/123',
        method: 'GET'
      });

      assert.strictEqual(capturedPath, '/users/123');
    } finally {
      await closeServer(server);
    }
  });

  it('should parse query string and attach to request', async () => {
    const PORT = getPort();
    let capturedQuery;

    const server = createServer((req, res) => {
      capturedQuery = req.query;
      res.end('OK');
    });

    await new Promise(resolve => server.listen(PORT, resolve));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/search?q=hello&page=2',
        method: 'GET'
      });

      assert.deepStrictEqual(capturedQuery, { q: 'hello', page: '2' });
    } finally {
      await closeServer(server);
    }
  });

  it('should attach client IP to request', async () => {
    const PORT = getPort();
    let capturedIp;

    const server = createServer((req, res) => {
      capturedIp = req.ip;
      res.end('OK');
    });

    await new Promise(resolve => server.listen(PORT, resolve));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      // localhost will be 127.0.0.1 or ::1 (normalized to 127.0.0.1)
      assert.ok(capturedIp === '127.0.0.1' || capturedIp === '::1');
    } finally {
      await closeServer(server);
    }
  });

  it('should handle errors in handler without crashing', async () => {
    const PORT = getPort();
    const server = createServer((req, res) => {
      throw new Error('Test error');
    });

    await new Promise(resolve => server.listen(PORT, resolve));

    try {
      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(response.statusCode, 500);
    } finally {
      await closeServer(server);
    }
  });

  it('should record request start time', async () => {
    const PORT = getPort();
    let startTime;

    const server = createServer((req, res) => {
      startTime = req._startTime;
      res.end('OK');
    });

    await new Promise(resolve => server.listen(PORT, resolve));

    try {
      const before = Date.now();

      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      const after = Date.now();

      assert.ok(startTime >= before && startTime <= after);
    } finally {
      await closeServer(server);
    }
  });
});

describe('listen', () => {
  it('should create and start server in one call', async () => {
    const PORT = getPort();
    let callbackCalled = false;

    const server = listen(
      (req, res) => {
        res.end('OK');
      },
      PORT,
      () => {
        callbackCalled = true;
      }
    );

    // Wait for callback
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      assert.ok(callbackCalled);

      const response = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.body, 'OK');
    } finally {
      await closeServer(server);
    }
  });
});

describe('HTTP Methods', () => {
  let server;
  let PORT;

  before(async () => {
    PORT = getPort();
    server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ method: req.method }));
    });

    await new Promise(resolve => server.listen(PORT, resolve));
  });

  after(async () => {
    await closeServer(server);
  });

  it('should handle GET requests', async () => {
    const response = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/',
      method: 'GET'
    });

    assert.strictEqual(JSON.parse(response.body).method, 'GET');
  });

  it('should handle POST requests', async () => {
    const response = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/',
      method: 'POST'
    });

    assert.strictEqual(JSON.parse(response.body).method, 'POST');
  });

  it('should handle PUT requests', async () => {
    const response = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/',
      method: 'PUT'
    });

    assert.strictEqual(JSON.parse(response.body).method, 'PUT');
  });

  it('should handle DELETE requests', async () => {
    const response = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/',
      method: 'DELETE'
    });

    assert.strictEqual(JSON.parse(response.body).method, 'DELETE');
  });

  it('should handle PATCH requests', async () => {
    const response = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/',
      method: 'PATCH'
    });

    assert.strictEqual(JSON.parse(response.body).method, 'PATCH');
  });
});
