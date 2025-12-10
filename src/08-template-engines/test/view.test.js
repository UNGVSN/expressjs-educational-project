/**
 * View Class Tests
 */

'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const View = require('../lib/view');

const viewsDir = path.join(__dirname, 'test-views');

describe('View Class', () => {
  // Setup test views
  before(() => {
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.mkdirSync(path.join(viewsDir, 'users'), { recursive: true });

    fs.writeFileSync(path.join(viewsDir, 'index.html'), '<h1>Index</h1>');
    fs.writeFileSync(path.join(viewsDir, 'test.ejs'), '<h1><%= title %></h1>');
    fs.writeFileSync(path.join(viewsDir, 'users', 'profile.html'), '<h1>Profile</h1>');
  });

  after(() => {
    fs.rmSync(viewsDir, { recursive: true });
  });

  describe('constructor', () => {
    it('should resolve extension from view name', () => {
      const view = new View('index.html', {
        root: viewsDir,
        engines: { '.html': () => {} }
      });

      assert.strictEqual(view.ext, '.html');
    });

    it('should use default engine when no extension', () => {
      const view = new View('index', {
        root: viewsDir,
        defaultEngine: 'html',
        engines: { '.html': () => {} }
      });

      assert.strictEqual(view.ext, '.html');
    });

    it('should handle default engine with leading dot', () => {
      const view = new View('index', {
        root: viewsDir,
        defaultEngine: '.html',
        engines: { '.html': () => {} }
      });

      assert.strictEqual(view.ext, '.html');
    });

    it('should throw when no extension and no default engine', () => {
      assert.throws(() => {
        new View('index', {
          root: viewsDir,
          engines: {}
        });
      }, /No default engine/);
    });
  });

  describe('lookup', () => {
    it('should find view in root directory', () => {
      const view = new View('index.html', {
        root: viewsDir,
        engines: { '.html': () => {} }
      });

      assert.ok(view.path);
      assert.ok(view.path.endsWith('index.html'));
    });

    it('should find view in subdirectory', () => {
      const view = new View('users/profile.html', {
        root: viewsDir,
        engines: { '.html': () => {} }
      });

      assert.ok(view.path);
      assert.ok(view.path.includes('users'));
      assert.ok(view.path.endsWith('profile.html'));
    });

    it('should add extension when not provided', () => {
      const view = new View('index', {
        root: viewsDir,
        defaultEngine: 'html',
        engines: { '.html': () => {} }
      });

      assert.ok(view.path);
      assert.ok(view.path.endsWith('index.html'));
    });

    it('should return null for non-existent view', () => {
      const view = new View('nonexistent', {
        root: viewsDir,
        defaultEngine: 'html',
        engines: { '.html': () => {} }
      });

      assert.strictEqual(view.path, null);
    });
  });

  describe('render', () => {
    it('should call engine with correct arguments', (_, done) => {
      const mockEngine = (filePath, options, callback) => {
        assert.ok(filePath.endsWith('index.html'));
        assert.strictEqual(options.title, 'Test');
        callback(null, '<h1>Rendered</h1>');
      };

      const view = new View('index.html', {
        root: viewsDir,
        engines: { '.html': mockEngine }
      });

      view.render({ title: 'Test' }, (err, html) => {
        assert.strictEqual(err, null);
        assert.strictEqual(html, '<h1>Rendered</h1>');
        done();
      });
    });

    it('should error for missing view', (_, done) => {
      const view = new View('nonexistent', {
        root: viewsDir,
        defaultEngine: 'html',
        engines: { '.html': () => {} }
      });

      view.render({}, (err) => {
        assert.ok(err);
        assert.ok(err.message.includes('Failed to lookup view'));
        done();
      });
    });

    it('should error for missing engine', (_, done) => {
      const view = new View('test.ejs', {
        root: viewsDir,
        engines: {} // No .ejs engine registered
      });

      view.render({}, (err) => {
        assert.ok(err);
        assert.ok(err.message.includes('No engine'));
        done();
      });
    });
  });
});
