/**
 * Tests for Body Parser Utilities
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { parseBytes, formatBytes } = require('../lib/bytes');
const {
  parseContentType,
  typeIs,
  matchType,
  normalizeType,
  getCharset
} = require('../lib/content-type');
const { parseSimple, parseExtended } = require('../lib/urlencoded');

describe('Bytes Utility', () => {
  describe('parseBytes', () => {
    it('should parse byte values', () => {
      assert.strictEqual(parseBytes('100'), 100);
      assert.strictEqual(parseBytes('100b'), 100);
      assert.strictEqual(parseBytes('1kb'), 1024);
      assert.strictEqual(parseBytes('1KB'), 1024);
      assert.strictEqual(parseBytes('1mb'), 1048576);
      assert.strictEqual(parseBytes('1gb'), 1073741824);
    });

    it('should handle decimal values', () => {
      assert.strictEqual(parseBytes('1.5kb'), 1536);
      assert.strictEqual(parseBytes('0.5mb'), 524288);
    });

    it('should pass through numbers', () => {
      assert.strictEqual(parseBytes(1024), 1024);
      assert.strictEqual(parseBytes(0), 0);
    });

    it('should return null for invalid values', () => {
      assert.strictEqual(parseBytes('invalid'), null);
      assert.strictEqual(parseBytes(null), null);
      assert.strictEqual(parseBytes(undefined), null);
    });
  });

  describe('formatBytes', () => {
    it('should format byte values', () => {
      assert.strictEqual(formatBytes(0), '0 B');
      assert.strictEqual(formatBytes(1024), '1 KB');
      assert.strictEqual(formatBytes(1536), '1.5 KB');
      assert.strictEqual(formatBytes(1048576), '1 MB');
    });
  });
});

describe('Content-Type Utility', () => {
  describe('parseContentType', () => {
    it('should parse simple content type', () => {
      const result = parseContentType('application/json');
      assert.strictEqual(result.type, 'application/json');
      assert.deepStrictEqual(result.parameters, {});
    });

    it('should parse content type with charset', () => {
      const result = parseContentType('application/json; charset=utf-8');
      assert.strictEqual(result.type, 'application/json');
      assert.strictEqual(result.parameters.charset, 'utf-8');
    });

    it('should parse content type with multiple parameters', () => {
      const result = parseContentType('text/plain; charset=utf-8; boundary=something');
      assert.strictEqual(result.type, 'text/plain');
      assert.strictEqual(result.parameters.charset, 'utf-8');
      assert.strictEqual(result.parameters.boundary, 'something');
    });

    it('should handle quoted values', () => {
      const result = parseContentType('text/plain; charset="utf-8"');
      assert.strictEqual(result.parameters.charset, 'utf-8');
    });

    it('should return null for invalid input', () => {
      assert.strictEqual(parseContentType(null), null);
      assert.strictEqual(parseContentType(''), null);
    });
  });

  describe('matchType', () => {
    it('should match exact types', () => {
      assert.strictEqual(matchType('application/json', 'application/json'), true);
      assert.strictEqual(matchType('text/plain', 'text/html'), false);
    });

    it('should match shorthand types', () => {
      assert.strictEqual(matchType('application/json', 'json'), true);
      assert.strictEqual(matchType('application/x-www-form-urlencoded', 'urlencoded'), true);
    });

    it('should match wildcards', () => {
      assert.strictEqual(matchType('application/json', '*/json'), true);
      assert.strictEqual(matchType('text/plain', 'text/*'), true);
      assert.strictEqual(matchType('image/png', '*/*'), true);
    });
  });

  describe('normalizeType', () => {
    it('should expand shorthand types', () => {
      assert.strictEqual(normalizeType('json'), 'application/json');
      assert.strictEqual(normalizeType('urlencoded'), 'application/x-www-form-urlencoded');
      assert.strictEqual(normalizeType('text'), 'text/plain');
      assert.strictEqual(normalizeType('html'), 'text/html');
    });

    it('should pass through full types', () => {
      assert.strictEqual(normalizeType('application/json'), 'application/json');
      assert.strictEqual(normalizeType('custom/type'), 'custom/type');
    });
  });

  describe('getCharset', () => {
    it('should extract charset', () => {
      assert.strictEqual(getCharset('text/plain; charset=utf-8'), 'utf-8');
      assert.strictEqual(getCharset('application/json; charset=ascii'), 'ascii');
    });

    it('should return undefined if no charset', () => {
      assert.strictEqual(getCharset('application/json'), undefined);
    });
  });

  describe('typeIs', () => {
    it('should check content type', () => {
      const req = { headers: { 'content-type': 'application/json' } };

      assert.ok(typeIs(req, 'application/json'));
      assert.ok(typeIs(req, 'json'));
      assert.ok(typeIs(req, ['json', 'text']));
      assert.ok(!typeIs(req, 'text/plain'));
    });

    it('should return false with no content type', () => {
      const req = { headers: {} };
      assert.strictEqual(typeIs(req, 'json'), false);
    });

    it('should support function matcher', () => {
      const req = { headers: { 'content-type': 'application/json' } };

      assert.ok(typeIs(req, (r) => r.headers['content-type'].includes('json')));
      assert.ok(!typeIs(req, (r) => r.headers['content-type'].includes('xml')));
    });
  });
});

describe('URL-Encoded Parsing', () => {
  describe('parseSimple', () => {
    it('should parse simple key-value pairs', () => {
      assert.deepStrictEqual(parseSimple('a=1&b=2'), { a: '1', b: '2' });
    });

    it('should handle duplicate keys as arrays', () => {
      assert.deepStrictEqual(parseSimple('a=1&a=2'), { a: ['1', '2'] });
    });

    it('should handle empty values', () => {
      assert.deepStrictEqual(parseSimple('a=&b=2'), { a: '', b: '2' });
    });

    it('should decode URL-encoded values', () => {
      assert.deepStrictEqual(parseSimple('msg=Hello%20World'), { msg: 'Hello World' });
    });

    it('should not parse nested keys', () => {
      const result = parseSimple('user[name]=John');
      assert.strictEqual(result['user[name]'], 'John');
    });
  });

  describe('parseExtended', () => {
    it('should parse nested objects', () => {
      assert.deepStrictEqual(
        parseExtended('user[name]=John&user[age]=30'),
        { user: { name: 'John', age: '30' } }
      );
    });

    it('should parse arrays with []', () => {
      assert.deepStrictEqual(
        parseExtended('arr[]=a&arr[]=b&arr[]=c'),
        { arr: ['a', 'b', 'c'] }
      );
    });

    it('should parse arrays with indices', () => {
      assert.deepStrictEqual(
        parseExtended('arr[0]=a&arr[1]=b'),
        { arr: ['a', 'b'] }
      );
    });

    it('should parse deeply nested objects', () => {
      assert.deepStrictEqual(
        parseExtended('a[b][c]=deep'),
        { a: { b: { c: 'deep' } } }
      );
    });

    it('should handle mixed array and object notation', () => {
      assert.deepStrictEqual(
        parseExtended('users[0][name]=John&users[1][name]=Jane'),
        { users: [{ name: 'John' }, { name: 'Jane' }] }
      );
    });
  });
});
