/**
 * Response Helper Tests
 *
 * Tests for response utilities like sendJson, sendHtml, etc.
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('events');
const {
  sendJson,
  sendHtml,
  sendText,
  redirect,
  sendError,
  setHeader,
  setHeaders,
  status,
  escapeHtml,
  getMimeType
} = require('../lib/response');

/**
 * Creates a mock response object.
 */
function createMockResponse() {
  const res = new EventEmitter();

  res.statusCode = 200;
  res.headers = {};
  res.body = '';
  res.headersSent = false;

  res.writeHead = function(code, headers = {}) {
    this.statusCode = code;
    this.headers = { ...this.headers, ...headers };
    this.headersSent = true;
  };

  res.setHeader = function(name, value) {
    this.headers[name.toLowerCase()] = value;
  };

  res.write = function(chunk) {
    this.body += chunk;
  };

  res.end = function(data) {
    if (data) {
      this.body += data;
    }
    this.emit('finish');
  };

  return res;
}

describe('sendJson', () => {
  it('should send JSON response with correct headers', () => {
    const res = createMockResponse();

    sendJson(res, { message: 'Hello' });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['Content-Type'], 'application/json; charset=utf-8');
    assert.strictEqual(res.body, '{"message":"Hello"}');
  });

  it('should set custom status code', () => {
    const res = createMockResponse();

    sendJson(res, { error: 'Not found' }, 404);

    assert.strictEqual(res.statusCode, 404);
  });

  it('should pretty print when option set', () => {
    const res = createMockResponse();

    sendJson(res, { a: 1 }, 200, { pretty: true });

    assert.strictEqual(res.body, '{\n  "a": 1\n}');
  });

  it('should include custom headers', () => {
    const res = createMockResponse();

    sendJson(res, {}, 200, { headers: { 'X-Custom': 'value' } });

    assert.strictEqual(res.headers['X-Custom'], 'value');
  });

  it('should set correct Content-Length', () => {
    const res = createMockResponse();

    // Test with non-ASCII characters
    sendJson(res, { emoji: '😀' });

    const expectedLength = Buffer.byteLength('{"emoji":"😀"}', 'utf8');
    assert.strictEqual(res.headers['Content-Length'], expectedLength);
  });

  it('should handle arrays', () => {
    const res = createMockResponse();

    sendJson(res, [1, 2, 3]);

    assert.strictEqual(res.body, '[1,2,3]');
  });

  it('should handle null', () => {
    const res = createMockResponse();

    sendJson(res, null);

    assert.strictEqual(res.body, 'null');
  });
});

describe('sendHtml', () => {
  it('should send HTML response with correct headers', () => {
    const res = createMockResponse();

    sendHtml(res, '<h1>Hello</h1>');

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['Content-Type'], 'text/html; charset=utf-8');
    assert.strictEqual(res.body, '<h1>Hello</h1>');
  });

  it('should set custom status code', () => {
    const res = createMockResponse();

    sendHtml(res, '<h1>Error</h1>', 500);

    assert.strictEqual(res.statusCode, 500);
  });

  it('should set correct Content-Length', () => {
    const res = createMockResponse();
    const html = '<p>Test</p>';

    sendHtml(res, html);

    assert.strictEqual(res.headers['Content-Length'], Buffer.byteLength(html));
  });
});

describe('sendText', () => {
  it('should send plain text response', () => {
    const res = createMockResponse();

    sendText(res, 'Hello, World!');

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['Content-Type'], 'text/plain; charset=utf-8');
    assert.strictEqual(res.body, 'Hello, World!');
  });

  it('should set custom status code', () => {
    const res = createMockResponse();

    sendText(res, 'Not Found', 404);

    assert.strictEqual(res.statusCode, 404);
  });
});

describe('redirect', () => {
  it('should send 302 redirect by default', () => {
    const res = createMockResponse();

    redirect(res, '/login');

    assert.strictEqual(res.statusCode, 302);
    assert.strictEqual(res.headers['Location'], '/login');
  });

  it('should send 301 permanent redirect', () => {
    const res = createMockResponse();

    redirect(res, '/new-url', 301);

    assert.strictEqual(res.statusCode, 301);
  });

  it('should accept external URLs', () => {
    const res = createMockResponse();

    redirect(res, 'https://example.com');

    assert.strictEqual(res.headers['Location'], 'https://example.com');
  });

  it('should default to 302 for invalid status codes', () => {
    const res = createMockResponse();

    redirect(res, '/path', 418); // Invalid redirect code

    assert.strictEqual(res.statusCode, 302);
  });
});

describe('sendError', () => {
  it('should send HTML error page by default', () => {
    const res = createMockResponse();

    sendError(res, 404, 'Page not found');

    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.includes('Page not found'));
    assert.ok(res.body.includes('<!DOCTYPE html>'));
  });

  it('should use default message for status code', () => {
    const res = createMockResponse();

    sendError(res, 404);

    assert.ok(res.body.includes('Not Found'));
  });

  it('should send JSON error when option set', () => {
    const res = createMockResponse();

    sendError(res, 400, 'Invalid input', { json: true });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.headers['Content-Type'], 'application/json; charset=utf-8');

    const body = JSON.parse(res.body);
    assert.strictEqual(body.error.message, 'Invalid input');
    assert.strictEqual(body.error.status, 400);
  });

  it('should include details in JSON error', () => {
    const res = createMockResponse();

    sendError(res, 400, 'Validation failed', {
      json: true,
      details: { field: 'email', reason: 'invalid format' }
    });

    const body = JSON.parse(res.body);
    assert.strictEqual(body.error.field, 'email');
    assert.strictEqual(body.error.reason, 'invalid format');
  });
});

describe('setHeader', () => {
  it('should set a single header', () => {
    const res = createMockResponse();

    setHeader(res, 'X-Custom', 'value');

    assert.strictEqual(res.headers['x-custom'], 'value');
  });
});

describe('setHeaders', () => {
  it('should set multiple headers', () => {
    const res = createMockResponse();

    setHeaders(res, {
      'X-One': '1',
      'X-Two': '2'
    });

    assert.strictEqual(res.headers['x-one'], '1');
    assert.strictEqual(res.headers['x-two'], '2');
  });
});

describe('status', () => {
  it('should set status code', () => {
    const res = createMockResponse();

    status(res, 201);

    assert.strictEqual(res.statusCode, 201);
  });

  it('should return response for chaining', () => {
    const res = createMockResponse();

    const result = status(res, 200);

    assert.strictEqual(result, res);
  });
});

describe('escapeHtml', () => {
  it('should escape special characters', () => {
    assert.strictEqual(escapeHtml('<script>'), '&lt;script&gt;');
    assert.strictEqual(escapeHtml('"test"'), '&quot;test&quot;');
    assert.strictEqual(escapeHtml("'test'"), '&#39;test&#39;');
    assert.strictEqual(escapeHtml('a & b'), 'a &amp; b');
  });

  it('should handle strings without special characters', () => {
    assert.strictEqual(escapeHtml('Hello World'), 'Hello World');
  });

  it('should convert non-strings', () => {
    assert.strictEqual(escapeHtml(123), '123');
    assert.strictEqual(escapeHtml(null), 'null');
  });
});

describe('getMimeType', () => {
  it('should return correct MIME type for extensions', () => {
    assert.strictEqual(getMimeType('.html'), 'text/html; charset=utf-8');
    assert.strictEqual(getMimeType('.json'), 'application/json; charset=utf-8');
    assert.strictEqual(getMimeType('.css'), 'text/css; charset=utf-8');
    assert.strictEqual(getMimeType('.js'), 'application/javascript; charset=utf-8');
    assert.strictEqual(getMimeType('.png'), 'image/png');
    assert.strictEqual(getMimeType('.jpg'), 'image/jpeg');
  });

  it('should handle extensions without leading dot', () => {
    assert.strictEqual(getMimeType('html'), 'text/html; charset=utf-8');
    assert.strictEqual(getMimeType('json'), 'application/json; charset=utf-8');
  });

  it('should be case-insensitive', () => {
    assert.strictEqual(getMimeType('.HTML'), 'text/html; charset=utf-8');
    assert.strictEqual(getMimeType('.JSON'), 'application/json; charset=utf-8');
  });

  it('should return octet-stream for unknown extensions', () => {
    assert.strictEqual(getMimeType('.xyz'), 'application/octet-stream');
    assert.strictEqual(getMimeType('.unknown'), 'application/octet-stream');
  });
});
