/**
 * Tests for Cookie Parsing and Serialization
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { parse, serialize } = require('../lib/cookie');

describe('Cookie Parse', () => {
  it('should parse a simple cookie', () => {
    const result = parse('name=value');
    assert.deepStrictEqual(result, { name: 'value' });
  });

  it('should parse multiple cookies', () => {
    const result = parse('name=value; other=data');
    assert.deepStrictEqual(result, { name: 'value', other: 'data' });
  });

  it('should handle cookies with spaces', () => {
    const result = parse('name=value;  other=data  ;  third=item');
    assert.deepStrictEqual(result, { name: 'value', other: 'data', third: 'item' });
  });

  it('should decode URI-encoded values', () => {
    const result = parse('name=hello%20world');
    assert.deepStrictEqual(result, { name: 'hello world' });
  });

  it('should handle empty string', () => {
    const result = parse('');
    assert.deepStrictEqual(result, {});
  });

  it('should handle whitespace-only string', () => {
    const result = parse('   ');
    assert.deepStrictEqual(result, {});
  });

  it('should skip malformed pairs', () => {
    const result = parse('name=value; malformed; other=data');
    assert.deepStrictEqual(result, { name: 'value', other: 'data' });
  });

  it('should remove quotes from values', () => {
    const result = parse('name="quoted value"');
    assert.deepStrictEqual(result, { name: 'quoted value' });
  });

  it('should use first value when duplicates exist', () => {
    const result = parse('name=first; name=second');
    assert.deepStrictEqual(result, { name: 'first' });
  });

  it('should handle values with equals signs', () => {
    const result = parse('formula=a=b+c');
    assert.strictEqual(result.formula, 'a=b+c');
  });

  it('should throw on non-string input', () => {
    assert.throws(() => parse(null), TypeError);
    assert.throws(() => parse(123), TypeError);
  });

  it('should use custom decode function', () => {
    const result = parse('name=VALUE', {
      decode: (v) => v.toLowerCase()
    });
    assert.deepStrictEqual(result, { name: 'value' });
  });
});

describe('Cookie Serialize', () => {
  it('should serialize a simple cookie', () => {
    const result = serialize('name', 'value');
    assert.strictEqual(result, 'name=value');
  });

  it('should encode special characters in value', () => {
    const result = serialize('name', 'hello world');
    assert.strictEqual(result, 'name=hello%20world');
  });

  it('should add Max-Age attribute', () => {
    const result = serialize('name', 'value', { maxAge: 3600000 });
    assert.strictEqual(result, 'name=value; Max-Age=3600');
  });

  it('should add Domain attribute', () => {
    const result = serialize('name', 'value', { domain: '.example.com' });
    assert.strictEqual(result, 'name=value; Domain=.example.com');
  });

  it('should add Path attribute', () => {
    const result = serialize('name', 'value', { path: '/admin' });
    assert.strictEqual(result, 'name=value; Path=/admin');
  });

  it('should add Expires attribute', () => {
    const date = new Date('2030-01-01T00:00:00Z');
    const result = serialize('name', 'value', { expires: date });
    assert.ok(result.includes('Expires='));
    assert.ok(result.includes('2030'));
  });

  it('should add HttpOnly attribute', () => {
    const result = serialize('name', 'value', { httpOnly: true });
    assert.strictEqual(result, 'name=value; HttpOnly');
  });

  it('should add Secure attribute', () => {
    const result = serialize('name', 'value', { secure: true });
    assert.strictEqual(result, 'name=value; Secure');
  });

  it('should add SameSite=Strict attribute', () => {
    const result = serialize('name', 'value', { sameSite: 'strict' });
    assert.strictEqual(result, 'name=value; SameSite=Strict');
  });

  it('should add SameSite=Lax attribute', () => {
    const result = serialize('name', 'value', { sameSite: 'lax' });
    assert.strictEqual(result, 'name=value; SameSite=Lax');
  });

  it('should add SameSite=None attribute', () => {
    const result = serialize('name', 'value', { sameSite: 'none' });
    assert.strictEqual(result, 'name=value; SameSite=None');
  });

  it('should handle boolean sameSite as strict', () => {
    const result = serialize('name', 'value', { sameSite: true });
    assert.strictEqual(result, 'name=value; SameSite=Strict');
  });

  it('should add Priority attribute', () => {
    const result = serialize('name', 'value', { priority: 'high' });
    assert.strictEqual(result, 'name=value; Priority=High');
  });

  it('should add Partitioned attribute', () => {
    const result = serialize('name', 'value', { partitioned: true });
    assert.strictEqual(result, 'name=value; Partitioned');
  });

  it('should combine multiple attributes', () => {
    const result = serialize('session', 'abc123', {
      maxAge: 3600000,
      httpOnly: true,
      secure: true,
      path: '/'
    });
    assert.ok(result.includes('session=abc123'));
    assert.ok(result.includes('Max-Age=3600'));
    assert.ok(result.includes('HttpOnly'));
    assert.ok(result.includes('Secure'));
    assert.ok(result.includes('Path=/'));
  });

  it('should throw on invalid cookie name', () => {
    assert.throws(() => serialize('', 'value'), TypeError);
    assert.throws(() => serialize('name;', 'value'), TypeError);
    assert.throws(() => serialize('name=', 'value'), TypeError);
  });

  it('should throw on invalid expires', () => {
    assert.throws(() => serialize('name', 'value', { expires: 'invalid' }), TypeError);
  });

  it('should throw on invalid sameSite', () => {
    assert.throws(() => serialize('name', 'value', { sameSite: 'invalid' }), TypeError);
  });
});
