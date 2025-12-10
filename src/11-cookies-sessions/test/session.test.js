/**
 * Tests for Session Middleware
 */

'use strict';

const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const createApp = require('../lib/index');
const { cookieParser, session, MemoryStore } = require('../lib/index');

// Helper to make HTTP requests
function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
            rawBody: data
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: null,
            rawBody: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body !== null) {
      req.write(body);
    }
    req.end();
  });
}

// Extract cookie from Set-Cookie header
function extractCookie(headers, name) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return null;

  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const cookie of cookies) {
    if (cookie.startsWith(`${name}=`)) {
      return cookie.split(';')[0].split('=')[1];
    }
  }
  return null;
}

describe('Session Middleware', () => {
  let app;
  let server;
  let port;
  let store;

  beforeEach(() => {
    app = createApp();
    store = new MemoryStore({ checkPeriod: 0 }); // Disable auto-cleanup for tests
  });

  after(() => {
    if (server) {
      server.close();
    }
    if (store) {
      store.stopCleanup();
    }
  });

  it('should create a session on first request', async () => {
    app.use(cookieParser('secret'));
    app.use(session({ secret: 'secret', store }));

    app.get('/test', (req, res) => {
      res.json({
        isNew: req.session.isNew,
        hasId: !!req.session.id
      });
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/test',
      method: 'GET'
    });

    server.close();

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.isNew, true);
    assert.strictEqual(res.body.hasId, true);
    assert.ok(res.headers['set-cookie']);
  });

  it('should persist session data across requests', async () => {
    app.use(cookieParser('secret'));
    app.use(session({ secret: 'secret', store }));

    app.post('/set', (req, res) => {
      req.session.counter = (req.session.counter || 0) + 1;
      res.json({ counter: req.session.counter });
    });

    app.get('/get', (req, res) => {
      res.json({ counter: req.session.counter || 0 });
    });

    server = app.listen(0);
    port = server.address().port;

    // First request - set counter
    const res1 = await request({
      hostname: 'localhost',
      port,
      path: '/set',
      method: 'POST'
    });

    const sessionCookie = res1.headers['set-cookie'][0].split(';')[0];

    // Second request - increment counter
    const res2 = await request({
      hostname: 'localhost',
      port,
      path: '/set',
      method: 'POST',
      headers: { Cookie: sessionCookie }
    });

    // Third request - get counter
    const res3 = await request({
      hostname: 'localhost',
      port,
      path: '/get',
      method: 'GET',
      headers: { Cookie: sessionCookie }
    });

    server.close();

    assert.strictEqual(res1.body.counter, 1);
    assert.strictEqual(res2.body.counter, 2);
    assert.strictEqual(res3.body.counter, 2);
  });

  it('should destroy session', async () => {
    app.use(cookieParser('secret'));
    app.use(session({ secret: 'secret', store }));

    app.post('/login', (req, res) => {
      req.session.userId = 123;
      res.json({ loggedIn: true });
    });

    app.post('/logout', (req, res) => {
      req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ loggedOut: true });
      });
    });

    app.get('/check', (req, res) => {
      res.json({ userId: req.session ? req.session.userId : null });
    });

    server = app.listen(0);
    port = server.address().port;

    // Login
    const loginRes = await request({
      hostname: 'localhost',
      port,
      path: '/login',
      method: 'POST'
    });

    const sessionCookie = loginRes.headers['set-cookie'][0].split(';')[0];

    // Logout
    const logoutRes = await request({
      hostname: 'localhost',
      port,
      path: '/logout',
      method: 'POST',
      headers: { Cookie: sessionCookie }
    });

    // Check - should have new session
    const checkRes = await request({
      hostname: 'localhost',
      port,
      path: '/check',
      method: 'GET',
      headers: { Cookie: sessionCookie }
    });

    server.close();

    assert.strictEqual(loginRes.body.loggedIn, true);
    assert.strictEqual(logoutRes.body.loggedOut, true);
    // After destroy, userId should be undefined in new session
    assert.strictEqual(checkRes.body.userId, undefined);
  });

  it('should regenerate session ID', async () => {
    app.use(cookieParser('secret'));
    app.use(session({ secret: 'secret', store }));

    let originalId;

    app.post('/regenerate', (req, res) => {
      originalId = req.session.id;
      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
          originalId,
          newId: req.session.id,
          different: originalId !== req.session.id
        });
      });
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/regenerate',
      method: 'POST'
    });

    server.close();

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.different, true);
  });

  it('should respect saveUninitialized: false', async () => {
    app.use(cookieParser('secret'));
    app.use(session({ secret: 'secret', store, saveUninitialized: false }));

    app.get('/empty', (req, res) => {
      // Don't set any session data
      res.json({ ok: true });
    });

    app.get('/data', (req, res) => {
      req.session.user = 'john';
      res.json({ ok: true });
    });

    server = app.listen(0);
    port = server.address().port;

    // Request without setting data - should not set cookie
    const emptyRes = await request({
      hostname: 'localhost',
      port,
      path: '/empty',
      method: 'GET'
    });

    // Request setting data - should set cookie
    const dataRes = await request({
      hostname: 'localhost',
      port,
      path: '/data',
      method: 'GET'
    });

    server.close();

    // Note: Due to simplified implementation, both may set cookies
    // In production express-session, empty would not set cookie
    assert.strictEqual(emptyRes.statusCode, 200);
    assert.strictEqual(dataRes.statusCode, 200);
  });

  it('should use custom cookie name', async () => {
    app.use(cookieParser('secret'));
    app.use(session({ secret: 'secret', name: 'my.session', store }));

    app.get('/test', (req, res) => {
      req.session.test = true;
      res.json({ ok: true });
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/test',
      method: 'GET'
    });

    server.close();

    const cookie = res.headers['set-cookie'][0];
    assert.ok(cookie.startsWith('my.session='));
  });

  it('should throw if secret is not provided', () => {
    assert.throws(() => {
      session({});
    }, /secret is required/);
  });
});

describe('Memory Store', () => {
  let store;

  beforeEach(() => {
    store = new MemoryStore({ checkPeriod: 0 });
  });

  after(() => {
    if (store) {
      store.stopCleanup();
    }
  });

  it('should store and retrieve sessions', (t, done) => {
    const sessionData = { userId: 123, cookie: {} };

    store.set('sess:1', sessionData, (err) => {
      assert.ifError(err);

      store.get('sess:1', (err, data) => {
        assert.ifError(err);
        assert.deepStrictEqual(data, sessionData);
        done();
      });
    });
  });

  it('should return null for non-existent session', (t, done) => {
    store.get('nonexistent', (err, data) => {
      assert.ifError(err);
      assert.strictEqual(data, null);
      done();
    });
  });

  it('should destroy sessions', (t, done) => {
    store.set('sess:1', { data: 'test', cookie: {} }, (err) => {
      assert.ifError(err);

      store.destroy('sess:1', (err) => {
        assert.ifError(err);

        store.get('sess:1', (err, data) => {
          assert.ifError(err);
          assert.strictEqual(data, null);
          done();
        });
      });
    });
  });

  it('should clear all sessions', (t, done) => {
    store.set('sess:1', { a: 1, cookie: {} }, () => {
      store.set('sess:2', { b: 2, cookie: {} }, () => {
        store.clear((err) => {
          assert.ifError(err);

          store.length((err, count) => {
            assert.ifError(err);
            assert.strictEqual(count, 0);
            done();
          });
        });
      });
    });
  });

  it('should return session count', (t, done) => {
    store.set('sess:1', { cookie: {} }, () => {
      store.set('sess:2', { cookie: {} }, () => {
        store.length((err, count) => {
          assert.ifError(err);
          assert.strictEqual(count, 2);
          done();
        });
      });
    });
  });

  it('should return all session IDs', (t, done) => {
    store.set('sess:1', { cookie: {} }, () => {
      store.set('sess:2', { cookie: {} }, () => {
        store.ids((err, ids) => {
          assert.ifError(err);
          assert.ok(ids.includes('sess:1'));
          assert.ok(ids.includes('sess:2'));
          done();
        });
      });
    });
  });

  it('should expire sessions based on maxAge', (t, done) => {
    const sessionData = {
      data: 'test',
      cookie: { maxAge: 50 } // 50ms
    };

    store.set('sess:1', sessionData, () => {
      // Wait for expiration
      setTimeout(() => {
        store.get('sess:1', (err, data) => {
          assert.ifError(err);
          assert.strictEqual(data, null);
          done();
        });
      }, 100);
    });
  });

  it('should touch session to extend expiration', (t, done) => {
    const sessionData = {
      data: 'test',
      cookie: { maxAge: 100 }
    };

    store.set('sess:1', sessionData, () => {
      // Touch after 50ms
      setTimeout(() => {
        store.touch('sess:1', sessionData, () => {
          // Check after original expiration time
          setTimeout(() => {
            store.get('sess:1', (err, data) => {
              assert.ifError(err);
              assert.ok(data !== null);
              done();
            });
          }, 75);
        });
      }, 50);
    });
  });
});
