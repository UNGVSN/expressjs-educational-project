/**
 * Path Pattern Tests
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { pathToRegexp, extractParams, match, compile } = require('../lib/path-to-regexp');

describe('pathToRegexp', () => {
  it('should match exact paths', () => {
    const { regexp } = pathToRegexp('/users');

    assert.ok(regexp.test('/users'));
    assert.ok(!regexp.test('/users/123'));
    assert.ok(!regexp.test('/posts'));
  });

  it('should match root path', () => {
    const { regexp } = pathToRegexp('/');

    assert.ok(regexp.test('/'));
    assert.ok(!regexp.test('/users'));
  });

  it('should extract parameter names', () => {
    const { keys } = pathToRegexp('/users/:id');

    assert.strictEqual(keys.length, 1);
    assert.strictEqual(keys[0].name, 'id');
  });

  it('should extract multiple parameters', () => {
    const { keys } = pathToRegexp('/users/:userId/posts/:postId');

    assert.strictEqual(keys.length, 2);
    assert.strictEqual(keys[0].name, 'userId');
    assert.strictEqual(keys[1].name, 'postId');
  });

  it('should match paths with parameters', () => {
    const { regexp } = pathToRegexp('/users/:id');

    assert.ok(regexp.test('/users/123'));
    assert.ok(regexp.test('/users/abc'));
    assert.ok(!regexp.test('/users'));
    assert.ok(!regexp.test('/users/'));
  });

  it('should match wildcard paths', () => {
    const { regexp, keys } = pathToRegexp('/files/*');

    assert.ok(regexp.test('/files/a'));
    assert.ok(regexp.test('/files/a/b/c'));
    assert.ok(!regexp.test('/files'));

    assert.strictEqual(keys[0].name, '0');
  });

  it('should handle optional parameters', () => {
    // Note: Full optional parameter support would require the full path-to-regexp library
    // For our educational implementation, we test basic support
    const { regexp, keys } = pathToRegexp('/api/:version?');

    // Should match with parameter
    assert.ok(regexp.test('/api/v2'));

    // Keys should include the optional param
    assert.ok(keys.some(k => k.name === 'version'));
  });

  it('should be case insensitive by default', () => {
    const { regexp } = pathToRegexp('/users');

    assert.ok(regexp.test('/users'));
    assert.ok(regexp.test('/USERS'));
    assert.ok(regexp.test('/Users'));
  });

  it('should support case sensitive option', () => {
    const { regexp } = pathToRegexp('/users', { sensitive: true });

    assert.ok(regexp.test('/users'));
    assert.ok(!regexp.test('/USERS'));
  });

  it('should handle special regex characters in path', () => {
    const { regexp } = pathToRegexp('/path.with.dots');

    assert.ok(regexp.test('/path.with.dots'));
    assert.ok(!regexp.test('/pathXwithXdots'));
  });
});

describe('extractParams', () => {
  it('should extract single parameter', () => {
    const compiled = pathToRegexp('/users/:id');
    const params = extractParams('/users/123', compiled);

    assert.deepStrictEqual(params, { id: '123' });
  });

  it('should extract multiple parameters', () => {
    const compiled = pathToRegexp('/users/:userId/posts/:postId');
    const params = extractParams('/users/5/posts/10', compiled);

    assert.deepStrictEqual(params, { userId: '5', postId: '10' });
  });

  it('should extract wildcard', () => {
    const compiled = pathToRegexp('/files/*');
    const params = extractParams('/files/a/b/c.txt', compiled);

    assert.deepStrictEqual(params, { '0': 'a/b/c.txt' });
  });

  it('should return null for non-matching path', () => {
    const compiled = pathToRegexp('/users/:id');
    const params = extractParams('/posts/123', compiled);

    assert.strictEqual(params, null);
  });

  it('should decode URI components', () => {
    const compiled = pathToRegexp('/search/:query');
    const params = extractParams('/search/hello%20world', compiled);

    assert.deepStrictEqual(params, { query: 'hello world' });
  });

  it('should handle optional parameters when present', () => {
    const compiled = pathToRegexp('/api/:version?');
    const params = extractParams('/api/v2', compiled);

    // Should have version param
    assert.ok(params);
    assert.ok('version' in params);
  });
});

describe('match', () => {
  it('should return true for matching paths', () => {
    assert.ok(match('/users/123', '/users/:id'));
    assert.ok(match('/files/a/b', '/files/*'));
    assert.ok(match('/', '/'));
  });

  it('should return false for non-matching paths', () => {
    assert.ok(!match('/posts/123', '/users/:id'));
    assert.ok(!match('/users', '/users/:id'));
  });
});

describe('compile', () => {
  it('should return a matcher function', () => {
    const matcher = compile('/users/:id');

    assert.strictEqual(typeof matcher, 'function');
    assert.deepStrictEqual(matcher('/users/123'), { id: '123' });
    assert.strictEqual(matcher('/posts/123'), null);
  });
});
