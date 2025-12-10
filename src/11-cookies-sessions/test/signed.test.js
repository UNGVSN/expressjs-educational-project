/**
 * Tests for Signed Cookies
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { sign, unsign, isSigned } = require('../lib/signed');

describe('Signed Cookies', () => {
  const secret = 'test-secret-key';

  describe('sign()', () => {
    it('should sign a value', () => {
      const signed = sign('hello', secret);
      assert.ok(signed.startsWith('s:hello.'));
    });

    it('should produce different signatures for different values', () => {
      const signed1 = sign('value1', secret);
      const signed2 = sign('value2', secret);
      assert.notStrictEqual(signed1, signed2);
    });

    it('should produce different signatures for different secrets', () => {
      const signed1 = sign('value', 'secret1');
      const signed2 = sign('value', 'secret2');
      assert.notStrictEqual(signed1, signed2);
    });

    it('should use first secret when array provided', () => {
      const signed1 = sign('value', ['secret1', 'secret2']);
      const signed2 = sign('value', 'secret1');
      assert.strictEqual(signed1, signed2);
    });

    it('should throw on non-string value', () => {
      assert.throws(() => sign(123, secret), TypeError);
      assert.throws(() => sign(null, secret), TypeError);
    });

    it('should throw on empty secret', () => {
      assert.throws(() => sign('value', ''), TypeError);
      assert.throws(() => sign('value', null), TypeError);
    });
  });

  describe('unsign()', () => {
    it('should unsign a valid signed value', () => {
      const signed = sign('hello', secret);
      const unsigned = unsign(signed, secret);
      assert.strictEqual(unsigned, 'hello');
    });

    it('should return false for tampered value', () => {
      const signed = sign('hello', secret);
      const tampered = signed.replace('hello', 'world');
      const unsigned = unsign(tampered, secret);
      assert.strictEqual(unsigned, false);
    });

    it('should return false for wrong secret', () => {
      const signed = sign('hello', 'secret1');
      const unsigned = unsign(signed, 'secret2');
      assert.strictEqual(unsigned, false);
    });

    it('should return false for unsigned value', () => {
      const unsigned = unsign('plain-value', secret);
      assert.strictEqual(unsigned, false);
    });

    it('should return false for malformed signed value', () => {
      assert.strictEqual(unsign('s:notsigned', secret), false);
      assert.strictEqual(unsign('s:', secret), false);
    });

    it('should return false for non-string input', () => {
      assert.strictEqual(unsign(123, secret), false);
      assert.strictEqual(unsign(null, secret), false);
    });

    it('should support key rotation with array of secrets', () => {
      // Sign with old secret
      const signed = sign('hello', 'old-secret');

      // Unsign with array (new secret first, old second)
      const unsigned = unsign(signed, ['new-secret', 'old-secret']);
      assert.strictEqual(unsigned, 'hello');
    });

    it('should fail if none of the secrets match', () => {
      const signed = sign('hello', 'original-secret');
      const unsigned = unsign(signed, ['wrong1', 'wrong2']);
      assert.strictEqual(unsigned, false);
    });
  });

  describe('isSigned()', () => {
    it('should return true for signed values', () => {
      const signed = sign('hello', secret);
      assert.strictEqual(isSigned(signed), true);
    });

    it('should return false for unsigned values', () => {
      assert.strictEqual(isSigned('plain-value'), false);
    });

    it('should return false for non-strings', () => {
      assert.strictEqual(isSigned(123), false);
      assert.strictEqual(isSigned(null), false);
      assert.strictEqual(isSigned(undefined), false);
    });

    it('should return true for s: prefix even if malformed', () => {
      assert.strictEqual(isSigned('s:anything'), true);
    });
  });

  describe('Security', () => {
    it('should handle values with dots', () => {
      const value = 'user.name.with.dots';
      const signed = sign(value, secret);
      const unsigned = unsign(signed, secret);
      assert.strictEqual(unsigned, value);
    });

    it('should handle empty values', () => {
      const signed = sign('', secret);
      const unsigned = unsign(signed, secret);
      assert.strictEqual(unsigned, '');
    });

    it('should handle unicode values', () => {
      const value = '你好世界';
      const signed = sign(value, secret);
      const unsigned = unsign(signed, secret);
      assert.strictEqual(unsigned, value);
    });

    it('should handle special characters', () => {
      const value = '<script>alert("xss")</script>';
      const signed = sign(value, secret);
      const unsigned = unsign(signed, secret);
      assert.strictEqual(unsigned, value);
    });
  });
});
