/**
 * View Rendering Tests
 */

'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const createApp = require('../lib');

// Create test views directory
const viewsDir = path.join(__dirname, 'views');

describe('View Rendering', () => {
  // Setup test views
  before(() => {
    if (!fs.existsSync(viewsDir)) {
      fs.mkdirSync(viewsDir, { recursive: true });
    }

    // Create test template
    fs.writeFileSync(
      path.join(viewsDir, 'test.html'),
      '<h1>{{title}}</h1><p>{{message}}</p>'
    );

    fs.writeFileSync(
      path.join(viewsDir, 'empty.html'),
      '<html><body></body></html>'
    );
  });

  // Cleanup
  after(() => {
    try {
      fs.unlinkSync(path.join(viewsDir, 'test.html'));
      fs.unlinkSync(path.join(viewsDir, 'empty.html'));
      fs.rmdirSync(viewsDir);
    } catch {
      // Ignore errors
    }
  });

  it('should render a view with app.render()', (_, done) => {
    const app = createApp();

    // Register simple engine
    app.engine('html', (filePath, options, callback) => {
      fs.readFile(filePath, 'utf8', (err, content) => {
        if (err) return callback(err);
        const rendered = content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
          return options[key] !== undefined ? String(options[key]) : '';
        });
        callback(null, rendered);
      });
    });

    app.set('views', viewsDir);
    app.set('view engine', 'html');

    app.render('test', { title: 'Hello', message: 'World' }, (err, html) => {
      assert.strictEqual(err, null);
      assert.strictEqual(html, '<h1>Hello</h1><p>World</p>');
      done();
    });
  });

  it('should include app.locals in render', (_, done) => {
    const app = createApp();

    app.engine('html', (filePath, options, callback) => {
      fs.readFile(filePath, 'utf8', (err, content) => {
        if (err) return callback(err);
        const rendered = content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
          return options[key] !== undefined ? String(options[key]) : '';
        });
        callback(null, rendered);
      });
    });

    app.set('views', viewsDir);
    app.set('view engine', 'html');

    // Set local
    app.locals.title = 'App Title';

    app.render('test', { message: 'Local message' }, (err, html) => {
      assert.strictEqual(err, null);
      assert.ok(html.includes('App Title'));
      assert.ok(html.includes('Local message'));
      done();
    });
  });

  it('should error for missing view', (_, done) => {
    const app = createApp();

    app.engine('html', () => {});
    app.set('views', viewsDir);
    app.set('view engine', 'html');

    app.render('nonexistent', {}, (err, html) => {
      assert.ok(err);
      assert.ok(err.message.includes('Failed to lookup view'));
      done();
    });
  });

  it('should error for missing engine', (_, done) => {
    const app = createApp();

    app.set('views', viewsDir);
    app.set('view engine', 'pug'); // Not registered

    app.render('test', {}, (err, html) => {
      assert.ok(err);
      assert.ok(err.message.includes('No engine'));
      done();
    });
  });
});
