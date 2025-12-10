/**
 * MIME Type Tests
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const mime = require('../lib/mime');

describe('MIME Types', () => {
  describe('lookup()', () => {
    it('should return MIME type for common extensions', () => {
      assert.ok(mime.lookup('.html').includes('text/html'));
      assert.ok(mime.lookup('.css').includes('text/css'));
      assert.ok(mime.lookup('.js').includes('javascript'));
      assert.ok(mime.lookup('.json').includes('application/json'));
      assert.strictEqual(mime.lookup('.png'), 'image/png');
      assert.strictEqual(mime.lookup('.jpg'), 'image/jpeg');
    });

    it('should handle extensions without dot', () => {
      assert.ok(mime.lookup('html').includes('text/html'));
      assert.ok(mime.lookup('css').includes('text/css'));
    });

    it('should handle file paths', () => {
      assert.ok(mime.lookup('style.css').includes('text/css'));
      assert.ok(mime.lookup('/path/to/file.js').includes('javascript'));
      assert.ok(mime.lookup('image.PNG').includes('image/png'));
    });

    it('should return default type for unknown extensions', () => {
      assert.strictEqual(mime.lookup('.xyz'), mime.defaultType);
      assert.strictEqual(mime.lookup('unknown'), mime.defaultType);
    });

    it('should handle empty/invalid input', () => {
      assert.strictEqual(mime.lookup(''), mime.defaultType);
      assert.strictEqual(mime.lookup(null), mime.defaultType);
      assert.strictEqual(mime.lookup(undefined), mime.defaultType);
    });
  });

  describe('contentType()', () => {
    it('should add charset for text types', () => {
      assert.ok(mime.contentType('.txt').includes('charset='));
      assert.ok(mime.contentType('.json').includes('charset='));
    });

    it('should not add charset for binary types', () => {
      assert.ok(!mime.contentType('.png').includes('charset='));
      assert.ok(!mime.contentType('.pdf').includes('charset='));
    });
  });

  describe('charset()', () => {
    it('should return utf-8 for text types', () => {
      assert.strictEqual(mime.charset('text/html'), 'utf-8');
      assert.strictEqual(mime.charset('application/json'), 'utf-8');
    });

    it('should return false for binary types', () => {
      assert.strictEqual(mime.charset('image/png'), false);
      assert.strictEqual(mime.charset('application/pdf'), false);
    });

    it('should extract charset from Content-Type', () => {
      assert.strictEqual(mime.charset('text/html; charset=iso-8859-1'), 'iso-8859-1');
    });
  });

  describe('compressible()', () => {
    it('should return true for text types', () => {
      assert.strictEqual(mime.compressible('text/html'), true);
      assert.strictEqual(mime.compressible('text/css'), true);
      assert.strictEqual(mime.compressible('application/json'), true);
      assert.strictEqual(mime.compressible('application/javascript'), true);
    });

    it('should return false for binary types', () => {
      assert.strictEqual(mime.compressible('image/png'), false);
      assert.strictEqual(mime.compressible('image/jpeg'), false);
    });

    it('should return true for SVG', () => {
      assert.strictEqual(mime.compressible('image/svg+xml'), true);
    });
  });

  describe('define()', () => {
    it('should allow defining custom types', () => {
      mime.define('custom', 'application/x-custom');
      assert.strictEqual(mime.lookup('.custom'), 'application/x-custom');
    });
  });
});
