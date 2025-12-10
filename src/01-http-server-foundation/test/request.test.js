/**
 * Request Parsing Tests
 *
 * Tests for URL parsing, query string parsing, and other request utilities.
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { Readable } = require('stream');
const {
  parseUrl,
  parseQueryString,
  getClientIp,
  readBody,
  readJsonBody,
  getHeader,
  accepts,
  isContentType
} = require('../lib/request');

/**
 * Creates a mock request object.
 */
function createMockRequest(options = {}) {
  const req = new Readable({
    read() {}
  });

  req.url = options.url || '/';
  req.method = options.method || 'GET';
  req.headers = options.headers || {};
  req.socket = options.socket || { remoteAddress: '127.0.0.1' };

  return req;
}

describe('parseUrl', () => {
  it('should parse simple path', () => {
    const req = createMockRequest({
      url: '/users',
      headers: { host: 'localhost:3000' }
    });

    const result = parseUrl(req);

    assert.strictEqual(result.path, '/users');
    assert.strictEqual(result.pathname, '/users');
    assert.deepStrictEqual(result.query, {});
  });

  it('should parse path with query string', () => {
    const req = createMockRequest({
      url: '/users?page=1&sort=name',
      headers: { host: 'localhost:3000' }
    });

    const result = parseUrl(req);

    assert.strictEqual(result.path, '/users');
    assert.deepStrictEqual(result.query, { page: '1', sort: 'name' });
    assert.strictEqual(result.search, '?page=1&sort=name');
  });

  it('should handle missing URL', () => {
    const req = createMockRequest({
      url: undefined,
      headers: { host: 'localhost:3000' }
    });

    const result = parseUrl(req);

    assert.strictEqual(result.path, '/');
    assert.deepStrictEqual(result.query, {});
  });

  it('should handle root path', () => {
    const req = createMockRequest({
      url: '/',
      headers: { host: 'localhost:3000' }
    });

    const result = parseUrl(req);

    assert.strictEqual(result.path, '/');
  });

  it('should handle nested paths', () => {
    const req = createMockRequest({
      url: '/api/v1/users/123/posts',
      headers: { host: 'localhost:3000' }
    });

    const result = parseUrl(req);

    assert.strictEqual(result.path, '/api/v1/users/123/posts');
  });

  it('should handle duplicate query parameters as array', () => {
    const req = createMockRequest({
      url: '/search?tag=js&tag=node&tag=express',
      headers: { host: 'localhost:3000' }
    });

    const result = parseUrl(req);

    assert.deepStrictEqual(result.query.tag, ['js', 'node', 'express']);
  });

  it('should include host information', () => {
    const req = createMockRequest({
      url: '/test',
      headers: { host: 'example.com:8080' }
    });

    const result = parseUrl(req);

    assert.strictEqual(result.host, 'example.com:8080');
    assert.strictEqual(result.hostname, 'example.com');
    assert.strictEqual(result.port, '8080');
  });
});

describe('parseQueryString', () => {
  it('should parse simple query string', () => {
    const result = parseQueryString('foo=bar&baz=qux');

    assert.deepStrictEqual(result, { foo: 'bar', baz: 'qux' });
  });

  it('should handle leading question mark', () => {
    const result = parseQueryString('?foo=bar');

    assert.deepStrictEqual(result, { foo: 'bar' });
  });

  it('should handle empty string', () => {
    const result = parseQueryString('');

    assert.deepStrictEqual(result, {});
  });

  it('should handle null/undefined', () => {
    assert.deepStrictEqual(parseQueryString(null), {});
    assert.deepStrictEqual(parseQueryString(undefined), {});
  });

  it('should handle array notation items[]=', () => {
    const result = parseQueryString('items[]=a&items[]=b&items[]=c');

    assert.deepStrictEqual(result, { items: ['a', 'b', 'c'] });
  });

  it('should handle object notation user[name]', () => {
    const result = parseQueryString('user[name]=John&user[age]=30');

    assert.deepStrictEqual(result, {
      user: { name: 'John', age: '30' }
    });
  });

  it('should handle duplicate keys as arrays', () => {
    const result = parseQueryString('color=red&color=blue&color=green');

    assert.deepStrictEqual(result, { color: ['red', 'blue', 'green'] });
  });

  it('should decode URL-encoded values', () => {
    const result = parseQueryString('message=Hello%20World&emoji=%F0%9F%98%80');

    assert.strictEqual(result.message, 'Hello World');
  });

  it('should handle keys without values', () => {
    const result = parseQueryString('flag&enabled');

    assert.deepStrictEqual(result, { flag: '', enabled: '' });
  });

  it('should handle values with equals signs', () => {
    const result = parseQueryString('equation=1+1=2');

    assert.strictEqual(result.equation, '1+1=2');
  });

  it('should handle empty pairs', () => {
    const result = parseQueryString('foo=bar&&baz=qux');

    assert.deepStrictEqual(result, { foo: 'bar', baz: 'qux' });
  });
});

describe('getClientIp', () => {
  it('should return socket remote address', () => {
    const req = createMockRequest({
      socket: { remoteAddress: '192.168.1.1' }
    });

    assert.strictEqual(getClientIp(req), '192.168.1.1');
  });

  it('should prefer X-Forwarded-For header', () => {
    const req = createMockRequest({
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
      socket: { remoteAddress: '127.0.0.1' }
    });

    assert.strictEqual(getClientIp(req), '203.0.113.195');
  });

  it('should use X-Real-IP header', () => {
    const req = createMockRequest({
      headers: { 'x-real-ip': '203.0.113.100' },
      socket: { remoteAddress: '127.0.0.1' }
    });

    assert.strictEqual(getClientIp(req), '203.0.113.100');
  });

  it('should normalize IPv6 localhost', () => {
    const req = createMockRequest({
      socket: { remoteAddress: '::1' }
    });

    assert.strictEqual(getClientIp(req), '127.0.0.1');
  });

  it('should normalize IPv6-mapped IPv4', () => {
    const req = createMockRequest({
      socket: { remoteAddress: '::ffff:192.168.1.1' }
    });

    assert.strictEqual(getClientIp(req), '192.168.1.1');
  });

  it('should return unknown for missing address', () => {
    const req = createMockRequest({
      socket: {}
    });

    assert.strictEqual(getClientIp(req), 'unknown');
  });
});

describe('readBody', () => {
  it('should read request body', async () => {
    const req = createMockRequest();

    const bodyPromise = readBody(req);

    // Simulate incoming data
    req.push('Hello, World!');
    req.push(null); // End stream

    const body = await bodyPromise;

    assert.strictEqual(body, 'Hello, World!');
  });

  it('should handle empty body', async () => {
    const req = createMockRequest();

    const bodyPromise = readBody(req);

    req.push(null);

    const body = await bodyPromise;

    assert.strictEqual(body, '');
  });

  it('should handle chunked data', async () => {
    const req = createMockRequest();

    const bodyPromise = readBody(req);

    req.push('Hello, ');
    req.push('World');
    req.push('!');
    req.push(null);

    const body = await bodyPromise;

    assert.strictEqual(body, 'Hello, World!');
  });

  it('should reject on size limit exceeded', async () => {
    const req = createMockRequest();

    const bodyPromise = readBody(req, { limit: 5 });

    req.push('This is too long');
    req.push(null);

    await assert.rejects(bodyPromise, /exceeds limit/);
  });
});

describe('readJsonBody', () => {
  it('should parse JSON body', async () => {
    const req = createMockRequest();

    const bodyPromise = readJsonBody(req);

    req.push('{"name":"John","age":30}');
    req.push(null);

    const body = await bodyPromise;

    assert.deepStrictEqual(body, { name: 'John', age: 30 });
  });

  it('should return empty object for empty body', async () => {
    const req = createMockRequest();

    const bodyPromise = readJsonBody(req);

    req.push(null);

    const body = await bodyPromise;

    assert.deepStrictEqual(body, {});
  });

  it('should reject invalid JSON', async () => {
    const req = createMockRequest();

    const bodyPromise = readJsonBody(req);

    req.push('not valid json');
    req.push(null);

    await assert.rejects(bodyPromise, /Invalid JSON/);
  });
});

describe('getHeader', () => {
  it('should get header case-insensitively', () => {
    const req = createMockRequest({
      headers: { 'content-type': 'application/json' }
    });

    assert.strictEqual(getHeader(req, 'Content-Type'), 'application/json');
    assert.strictEqual(getHeader(req, 'content-type'), 'application/json');
    assert.strictEqual(getHeader(req, 'CONTENT-TYPE'), 'application/json');
  });

  it('should return undefined for missing header', () => {
    const req = createMockRequest({ headers: {} });

    assert.strictEqual(getHeader(req, 'X-Missing'), undefined);
  });
});

describe('accepts', () => {
  it('should return true for accepted type', () => {
    const req = createMockRequest({
      headers: { accept: 'application/json' }
    });

    assert.strictEqual(accepts(req, 'json'), true);
    assert.strictEqual(accepts(req, 'application/json'), true);
  });

  it('should return true for wildcard accept', () => {
    const req = createMockRequest({
      headers: { accept: '*/*' }
    });

    assert.strictEqual(accepts(req, 'json'), true);
    assert.strictEqual(accepts(req, 'html'), true);
  });

  it('should return true for type wildcard', () => {
    const req = createMockRequest({
      headers: { accept: 'text/*' }
    });

    assert.strictEqual(accepts(req, 'text/html'), true);
    assert.strictEqual(accepts(req, 'text/plain'), true);
  });

  it('should return false for non-accepted type', () => {
    const req = createMockRequest({
      headers: { accept: 'text/html' }
    });

    assert.strictEqual(accepts(req, 'json'), false);
  });

  it('should default to accepting all', () => {
    const req = createMockRequest({ headers: {} });

    assert.strictEqual(accepts(req, 'anything'), true);
  });
});

describe('isContentType', () => {
  it('should match content type', () => {
    const req = createMockRequest({
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });

    assert.strictEqual(isContentType(req, 'application/json'), true);
    assert.strictEqual(isContentType(req, 'json'), true);
  });

  it('should return false for non-matching type', () => {
    const req = createMockRequest({
      headers: { 'content-type': 'text/html' }
    });

    assert.strictEqual(isContentType(req, 'json'), false);
  });

  it('should return false for missing content-type', () => {
    const req = createMockRequest({ headers: {} });

    assert.strictEqual(isContentType(req, 'json'), false);
  });
});
