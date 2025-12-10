/**
 * Tests for Body Parsers
 */

'use strict';

const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const createApp = require('../lib/index');
const { json, urlencoded, raw, text } = require('../lib/index');

// Helper to make HTTP requests with body
function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body !== null) {
      req.write(body);
    }
    req.end();
  });
}

describe('Body Parsers', () => {
  let app;
  let server;
  let port;

  beforeEach(() => {
    app = createApp();
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  describe('JSON Parser', () => {
    it('should parse JSON body', async () => {
      app.use(json());
      app.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      server = app.listen(0);
      port = server.address().port;

      const body = JSON.stringify({ name: 'John', age: 30 });
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/test',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);

      server.close();

      assert.strictEqual(res.statusCode, 200);
      assert.deepStrictEqual(res.body.received, { name: 'John', age: 30 });
    });

    it('should handle empty body', async () => {
      app.use(json());
      app.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      server = app.listen(0);
      port = server.address().port;

      const res = await request({
        hostname: 'localhost',
        port,
        path: '/test',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': '0'
        }
      });

      server.close();

      assert.strictEqual(res.statusCode, 200);
      assert.deepStrictEqual(res.body.received, {});
    });

    it('should reject invalid JSON', async () => {
      app.use(json());
      app.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      server = app.listen(0);
      port = server.address().port;

      const body = '{ invalid json }';
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/test',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);

      server.close();

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error.type, 'entity.parse.failed');
    });

    it('should enforce strict mode (reject primitives)', async () => {
      app.use(json({ strict: true }));
      app.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      server = app.listen(0);
      port = server.address().port;

      const body = '"just a string"';
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/test',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);

      server.close();

      assert.strictEqual(res.statusCode, 400);
    });

    it('should allow primitives with strict: false', async () => {
      app.use(json({ strict: false }));
      app.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      server = app.listen(0);
      port = server.address().port;

      const body = '"just a string"';
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/test',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);

      server.close();

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.received, 'just a string');
    });

    it('should skip non-JSON content types', async () => {
      app.use(json());
      app.post('/test', (req, res) => {
        res.json({ received: req.body, type: typeof req.body });
      });

      server = app.listen(0);
      port = server.address().port;

      const body = 'plain text';
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/test',
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);

      server.close();

      assert.strictEqual(res.statusCode, 200);
      // Body is undefined because JSON parser skips non-matching content types
      assert.strictEqual(res.body.received, undefined);
      assert.strictEqual(res.body.type, 'undefined');
    });
  });

  describe('URL-Encoded Parser', () => {
    it('should parse simple form data', async () => {
      app.use(urlencoded({ extended: false }));
      app.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      server = app.listen(0);
      port = server.address().port;

      const body = 'name=John&age=30';
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/test',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);

      server.close();

      assert.strictEqual(res.statusCode, 200);
      assert.deepStrictEqual(res.body.received, { name: 'John', age: '30' });
    });

    it('should parse nested objects with extended: true', async () => {
      app.use(urlencoded({ extended: true }));
      app.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      server = app.listen(0);
      port = server.address().port;

      const body = 'user[name]=John&user[age]=30';
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/test',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);

      server.close();

      assert.strictEqual(res.statusCode, 200);
      assert.deepStrictEqual(res.body.received, {
        user: { name: 'John', age: '30' }
      });
    });

    it('should parse arrays with []', async () => {
      app.use(urlencoded({ extended: true }));
      app.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      server = app.listen(0);
      port = server.address().port;

      const body = 'colors[]=red&colors[]=blue&colors[]=green';
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/test',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);

      server.close();

      assert.strictEqual(res.statusCode, 200);
      assert.deepStrictEqual(res.body.received, {
        colors: ['red', 'blue', 'green']
      });
    });

    it('should handle URL-encoded special characters', async () => {
      app.use(urlencoded({ extended: true }));
      app.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      server = app.listen(0);
      port = server.address().port;

      const body = 'message=Hello%20World%21&email=test%40example.com';
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/test',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);

      server.close();

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.received.message, 'Hello World!');
      assert.strictEqual(res.body.received.email, 'test@example.com');
    });
  });

  describe('Raw Parser', () => {
    it('should return body as Buffer', async () => {
      app.use(raw());
      app.post('/test', (req, res) => {
        res.json({
          isBuffer: Buffer.isBuffer(req.body),
          length: req.body.length,
          content: req.body.toString()
        });
      });

      server = app.listen(0);
      port = server.address().port;

      const body = 'raw binary data';
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/test',
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);

      server.close();

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.isBuffer, true);
      assert.strictEqual(res.body.content, 'raw binary data');
    });
  });

  describe('Text Parser', () => {
    it('should return body as string', async () => {
      app.use(text());
      app.post('/test', (req, res) => {
        res.json({
          type: typeof req.body,
          content: req.body
        });
      });

      server = app.listen(0);
      port = server.address().port;

      const body = 'This is plain text content';
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/test',
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);

      server.close();

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.type, 'string');
      assert.strictEqual(res.body.content, 'This is plain text content');
    });

    it('should handle different text types', async () => {
      app.use(text({ type: 'text/*' }));
      app.post('/test', (req, res) => {
        res.json({ content: req.body });
      });

      server = app.listen(0);
      port = server.address().port;

      const body = '<html><body>Hello</body></html>';
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/test',
        method: 'POST',
        headers: {
          'Content-Type': 'text/html',
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);

      server.close();

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.content, body);
    });
  });

  describe('Combined Parsers', () => {
    it('should support JSON content type', async () => {
      app.use(json());
      app.use(urlencoded({ extended: true }));
      app.use(text({ type: 'text/*' }));

      app.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      server = app.listen(0);
      port = server.address().port;

      const body = JSON.stringify({ format: 'json' });
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/test',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);

      server.close();

      assert.strictEqual(res.statusCode, 200);
      assert.deepStrictEqual(res.body.received, { format: 'json' });
    });

    it('should support URL-encoded content type', async () => {
      app.use(json());
      app.use(urlencoded({ extended: true }));
      app.use(text({ type: 'text/*' }));

      app.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      server = app.listen(0);
      port = server.address().port;

      const body = 'format=urlencoded';
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/test',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);

      server.close();

      assert.strictEqual(res.statusCode, 200);
      assert.deepStrictEqual(res.body.received, { format: 'urlencoded' });
    });

    it('should support text content type', async () => {
      app.use(json());
      app.use(urlencoded({ extended: true }));
      app.use(text({ type: 'text/*' }));

      app.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      server = app.listen(0);
      port = server.address().port;

      const body = 'plain text format';
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/test',
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);

      server.close();

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.received, 'plain text format');
    });
  });
});
