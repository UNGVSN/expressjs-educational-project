/**
 * Response Render Tests
 */

'use strict';

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const createApp = require('../lib');

const viewsDir = path.join(__dirname, 'render-views');

// Port allocation
let portCounter = 9200;
function getPort() {
  return portCounter++;
}

// HTTP helper
async function request(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        res.body = data;
        resolve(res);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

describe('res.render()', () => {
  let server;

  before(() => {
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(path.join(viewsDir, 'index.html'), '<h1>{{title}}</h1>');
    fs.writeFileSync(path.join(viewsDir, 'user.html'), '<p>{{user.name}}</p>');
    fs.writeFileSync(path.join(viewsDir, 'locals.html'), '<p>{{appName}} - {{pageTitle}}</p>');
  });

  after(() => {
    fs.rmSync(viewsDir, { recursive: true });
  });

  afterEach((_, done) => {
    if (server) server.close(() => done());
    else done();
  });

  it('should render a view with data', async () => {
    const app = createApp();
    app.engine('html', createApp.simpleEngine);
    app.set('view engine', 'html');
    app.set('views', viewsDir);

    app.get('/', (req, res) => {
      res.render('index', { title: 'Hello World' });
    });

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/', method: 'GET' });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, '<h1>Hello World</h1>');
  });

  it('should merge app.locals into view', async () => {
    const app = createApp();
    app.engine('html', createApp.simpleEngine);
    app.set('view engine', 'html');
    app.set('views', viewsDir);

    app.locals.appName = 'My App';

    app.get('/', (req, res) => {
      res.render('locals', { pageTitle: 'Home' });
    });

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/', method: 'GET' });
    assert.ok(res.body.includes('My App'));
    assert.ok(res.body.includes('Home'));
  });

  it('should merge res.locals into view', async () => {
    const app = createApp();
    app.engine('html', createApp.simpleEngine);
    app.set('view engine', 'html');
    app.set('views', viewsDir);

    app.use((req, res, next) => {
      res.locals.pageTitle = 'From Middleware';
      next();
    });

    app.get('/', (req, res) => {
      res.render('locals', { appName: 'Test App' });
    });

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/', method: 'GET' });
    assert.ok(res.body.includes('Test App'));
    assert.ok(res.body.includes('From Middleware'));
  });

  it('should set Content-Type to text/html', async () => {
    const app = createApp();
    app.engine('html', createApp.simpleEngine);
    app.set('view engine', 'html');
    app.set('views', viewsDir);

    app.get('/', (req, res) => {
      res.render('index', { title: 'Test' });
    });

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/', method: 'GET' });
    assert.ok(res.headers['content-type'].includes('text/html'));
  });

  it('should handle nested data', async () => {
    const app = createApp();
    app.engine('html', createApp.simpleEngine);
    app.set('view engine', 'html');
    app.set('views', viewsDir);

    app.get('/', (req, res) => {
      res.render('user', { user: { name: 'Alice' } });
    });

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/', method: 'GET' });
    assert.ok(res.body.includes('Alice'));
  });

  it('should support callback for custom handling', async () => {
    const app = createApp();
    app.engine('html', createApp.simpleEngine);
    app.set('view engine', 'html');
    app.set('views', viewsDir);

    app.get('/', (req, res) => {
      res.render('index', { title: 'Custom' }, (err, html) => {
        res.json({ rendered: html });
      });
    });

    const port = getPort();
    server = app.listen(port);
    await new Promise(r => server.on('listening', r));

    const res = await request({ port, path: '/', method: 'GET' });
    const json = JSON.parse(res.body);
    assert.strictEqual(json.rendered, '<h1>Custom</h1>');
  });
});

describe('app.render()', () => {
  before(() => {
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(path.join(viewsDir, 'template.html'), '<div>{{content}}</div>');
  });

  after(() => {
    fs.rmSync(viewsDir, { recursive: true });
  });

  it('should render template directly', (_, done) => {
    const app = createApp();
    app.engine('html', createApp.simpleEngine);
    app.set('view engine', 'html');
    app.set('views', viewsDir);

    app.render('template', { content: 'Direct render' }, (err, html) => {
      assert.strictEqual(err, null);
      assert.strictEqual(html, '<div>Direct render</div>');
      done();
    });
  });

  it('should include app.locals', (_, done) => {
    const app = createApp();
    app.engine('html', createApp.simpleEngine);
    app.set('view engine', 'html');
    app.set('views', viewsDir);

    app.locals.content = 'From Locals';

    app.render('template', {}, (err, html) => {
      assert.strictEqual(err, null);
      assert.strictEqual(html, '<div>From Locals</div>');
      done();
    });
  });

  it('should error for missing view', (_, done) => {
    const app = createApp();
    app.engine('html', createApp.simpleEngine);
    app.set('view engine', 'html');
    app.set('views', viewsDir);

    app.render('nonexistent', {}, (err) => {
      assert.ok(err);
      assert.ok(err.message.includes('Failed to lookup'));
      done();
    });
  });
});
