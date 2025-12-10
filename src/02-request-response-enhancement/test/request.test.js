/**
 * Request Enhancement Tests
 */

'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { createServer } = require('../lib');

// Ensure request enhancements are loaded
require('../lib/request');

// Port management - use high ports to avoid conflicts
let portCounter = 6000;
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

describe('req.get()', () => {
  it('should return header value', async () => {
    const PORT = getPort();
    let capturedValue;

    const server = createServer((req, res) => {
      capturedValue = req.get('X-Custom-Header');
      res.json({ value: capturedValue });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET',
        headers: { 'X-Custom-Header': 'test-value' }
      });

      assert.strictEqual(capturedValue, 'test-value');
    } finally {
      await closeServer(server);
    }
  });

  it('should be case-insensitive', async () => {
    const PORT = getPort();
    let values = {};

    const server = createServer((req, res) => {
      values.lower = req.get('content-type');
      values.upper = req.get('Content-Type');
      values.mixed = req.get('CONTENT-TYPE');
      res.json(values);
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });

      assert.strictEqual(values.lower, 'application/json');
      assert.strictEqual(values.upper, 'application/json');
      assert.strictEqual(values.mixed, 'application/json');
    } finally {
      await closeServer(server);
    }
  });

  it('should handle referrer/referer interchangeably', async () => {
    const PORT = getPort();
    let values = {};

    const server = createServer((req, res) => {
      values.referrer = req.get('Referrer');
      values.referer = req.get('Referer');
      res.json(values);
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET',
        headers: { 'referer': 'http://example.com' }
      });

      assert.strictEqual(values.referrer, 'http://example.com');
      assert.strictEqual(values.referer, 'http://example.com');
    } finally {
      await closeServer(server);
    }
  });
});

describe('req.is()', () => {
  it('should match content type', async () => {
    const PORT = getPort();
    let result;

    const server = createServer((req, res) => {
      result = req.is('json');
      res.json({ result });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });

      assert.strictEqual(result, 'json');
    } finally {
      await closeServer(server);
    }
  });

  it('should return false for non-matching type', async () => {
    const PORT = getPort();
    let result;

    const server = createServer((req, res) => {
      result = req.is('html');
      res.json({ result });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });

      assert.strictEqual(result, false);
    } finally {
      await closeServer(server);
    }
  });

  it('should return null when no content-type', async () => {
    const PORT = getPort();
    let result;

    const server = createServer((req, res) => {
      result = req.is('json');
      res.json({ result });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(result, null);
    } finally {
      await closeServer(server);
    }
  });
});

describe('req.accepts()', () => {
  it('should return first matching type', async () => {
    const PORT = getPort();
    let result;

    const server = createServer((req, res) => {
      result = req.accepts('json', 'html');
      res.json({ result });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      assert.strictEqual(result, 'json');
    } finally {
      await closeServer(server);
    }
  });

  it('should return false when nothing matches', async () => {
    const PORT = getPort();
    let result;

    const server = createServer((req, res) => {
      result = req.accepts('xml');
      res.json({ result });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET',
        headers: { 'Accept': 'text/html' }
      });

      assert.strictEqual(result, false);
    } finally {
      await closeServer(server);
    }
  });

  it('should accept wildcard', async () => {
    const PORT = getPort();
    let result;

    const server = createServer((req, res) => {
      result = req.accepts('json');
      res.json({ result });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET',
        headers: { 'Accept': '*/*' }
      });

      assert.strictEqual(result, 'json');
    } finally {
      await closeServer(server);
    }
  });
});

describe('req.path', () => {
  it('should return URL path without query string', async () => {
    const PORT = getPort();
    let path;

    const server = createServer((req, res) => {
      path = req.path;
      res.json({ path });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/users/123?foo=bar',
        method: 'GET'
      });

      assert.strictEqual(path, '/users/123');
    } finally {
      await closeServer(server);
    }
  });
});

describe('req.query', () => {
  it('should parse query string', async () => {
    const PORT = getPort();
    let query;

    const server = createServer((req, res) => {
      query = req.query;
      res.json(query);
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/?name=john&age=30',
        method: 'GET'
      });

      assert.strictEqual(query.name, 'john');
      assert.strictEqual(query.age, '30');
    } finally {
      await closeServer(server);
    }
  });

  it('should handle duplicate keys as arrays', async () => {
    const PORT = getPort();
    let query;

    const server = createServer((req, res) => {
      query = req.query;
      res.json(query);
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/?color=red&color=blue',
        method: 'GET'
      });

      assert.deepStrictEqual(query.color, ['red', 'blue']);
    } finally {
      await closeServer(server);
    }
  });
});

describe('req.ip', () => {
  it('should return client IP', async () => {
    const PORT = getPort();
    let ip;

    const server = createServer((req, res) => {
      ip = req.ip;
      res.json({ ip });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.ok(ip === '127.0.0.1' || ip === '::1');
    } finally {
      await closeServer(server);
    }
  });

  it('should use X-Forwarded-For header', async () => {
    const PORT = getPort();
    let ip;

    const server = createServer((req, res) => {
      ip = req.ip;
      res.json({ ip });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET',
        headers: { 'X-Forwarded-For': '203.0.113.50' }
      });

      assert.strictEqual(ip, '203.0.113.50');
    } finally {
      await closeServer(server);
    }
  });
});

describe('req.xhr', () => {
  it('should return true for XMLHttpRequest', async () => {
    const PORT = getPort();
    let xhr;

    const server = createServer((req, res) => {
      xhr = req.xhr;
      res.json({ xhr });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      assert.strictEqual(xhr, true);
    } finally {
      await closeServer(server);
    }
  });

  it('should return false for regular request', async () => {
    const PORT = getPort();
    let xhr;

    const server = createServer((req, res) => {
      xhr = req.xhr;
      res.json({ xhr });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(xhr, false);
    } finally {
      await closeServer(server);
    }
  });
});

describe('req.hostname', () => {
  it('should return hostname from Host header', async () => {
    const PORT = getPort();
    let hostname;

    const server = createServer((req, res) => {
      hostname = req.hostname;
      res.json({ hostname });
    });

    await new Promise(r => server.listen(PORT, r));

    try {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(hostname, 'localhost');
    } finally {
      await closeServer(server);
    }
  });
});
