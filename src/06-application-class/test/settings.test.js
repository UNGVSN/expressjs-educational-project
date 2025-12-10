/**
 * Application Settings Tests
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const createApp = require('../lib');

describe('Settings', () => {
  it('should have default settings', () => {
    const app = createApp();

    assert.strictEqual(app.get('env'), process.env.NODE_ENV || 'development');
    assert.strictEqual(app.get('x-powered-by'), true);
    assert.strictEqual(app.get('trust proxy'), false);
  });

  it('should set and get settings', () => {
    const app = createApp();

    app.set('foo', 'bar');
    assert.strictEqual(app.get('foo'), 'bar');

    app.set('num', 42);
    assert.strictEqual(app.get('num'), 42);
  });

  it('should support enable/disable', () => {
    const app = createApp();

    app.enable('trust proxy');
    assert.strictEqual(app.get('trust proxy'), true);
    assert.strictEqual(app.enabled('trust proxy'), true);
    assert.strictEqual(app.disabled('trust proxy'), false);

    app.disable('trust proxy');
    assert.strictEqual(app.get('trust proxy'), false);
    assert.strictEqual(app.enabled('trust proxy'), false);
    assert.strictEqual(app.disabled('trust proxy'), true);
  });

  it('should return this for chaining', () => {
    const app = createApp();

    const result = app.set('foo', 'bar');
    assert.strictEqual(result, app);

    const enableResult = app.enable('test');
    assert.strictEqual(enableResult, app);

    const disableResult = app.disable('test');
    assert.strictEqual(disableResult, app);
  });

  it('should have settings accessible in locals', () => {
    const app = createApp();

    app.set('view engine', 'html');
    assert.strictEqual(app.locals.settings['view engine'], 'html');
  });
});

describe('Locals', () => {
  it('should allow setting locals', () => {
    const app = createApp();

    app.locals.title = 'My App';
    app.locals.version = '1.0.0';

    assert.strictEqual(app.locals.title, 'My App');
    assert.strictEqual(app.locals.version, '1.0.0');
  });

  it('should allow function locals', () => {
    const app = createApp();

    app.locals.formatDate = (date) => date.toISOString();
    assert.strictEqual(typeof app.locals.formatDate, 'function');

    const date = new Date('2024-01-01T00:00:00.000Z');
    assert.strictEqual(app.locals.formatDate(date), '2024-01-01T00:00:00.000Z');
  });
});

describe('Template Engines', () => {
  it('should register an engine', () => {
    const app = createApp();

    const mockEngine = (path, options, callback) => {
      callback(null, '<html></html>');
    };

    app.engine('html', mockEngine);
    assert.strictEqual(app.engines['.html'], mockEngine);
  });

  it('should normalize extension', () => {
    const app = createApp();

    const mockEngine = () => {};

    app.engine('.pug', mockEngine);
    assert.strictEqual(app.engines['.pug'], mockEngine);

    app.engine('ejs', mockEngine);
    assert.strictEqual(app.engines['.ejs'], mockEngine);
  });

  it('should throw for invalid engine', () => {
    const app = createApp();

    assert.throws(() => {
      app.engine('html', 'not-a-function');
    }, /callback function required/);
  });
});
