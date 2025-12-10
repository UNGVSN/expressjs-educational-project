/**
 * Integration Tests for Cookie & Session Support
 */

'use strict';

const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const createApp = require('../lib/index');
const { cookieParser, session } = require('../lib/index');

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

describe('Integration: Cookie Handling', () => {
  let app;
  let server;
  let port;

  beforeEach(() => {
    app = createApp();
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  it('should set and read cookies', async () => {
    app.use(cookieParser());

    app.get('/set', (req, res) => {
      res.cookie('name', 'john');
      res.cookie('age', '30');
      res.json({ set: true });
    });

    app.get('/read', (req, res) => {
      res.json({
        name: req.cookies.name,
        age: req.cookies.age
      });
    });

    server = app.listen(0);
    port = server.address().port;

    // Set cookies
    const setRes = await request({
      hostname: 'localhost',
      port,
      path: '/set',
      method: 'GET'
    });

    // Extract cookies from Set-Cookie header
    const setCookies = setRes.headers['set-cookie'];
    const cookieHeader = setCookies.map(c => c.split(';')[0]).join('; ');

    // Read cookies
    const readRes = await request({
      hostname: 'localhost',
      port,
      path: '/read',
      method: 'GET',
      headers: { Cookie: cookieHeader }
    });

    server.close();

    assert.strictEqual(readRes.body.name, 'john');
    assert.strictEqual(readRes.body.age, '30');
  });

  it('should handle signed cookies', async () => {
    const secret = 'my-secret-key';
    app.use(cookieParser(secret));

    app.get('/set', (req, res) => {
      res.cookie('token', 'abc123', { signed: true });
      res.json({ set: true });
    });

    app.get('/read', (req, res) => {
      res.json({
        token: req.signedCookies.token,
        unsigned: req.cookies.token
      });
    });

    server = app.listen(0);
    port = server.address().port;

    // Set signed cookie
    const setRes = await request({
      hostname: 'localhost',
      port,
      path: '/set',
      method: 'GET'
    });

    const setCookie = setRes.headers['set-cookie'][0].split(';')[0];

    // Read signed cookie
    const readRes = await request({
      hostname: 'localhost',
      port,
      path: '/read',
      method: 'GET',
      headers: { Cookie: setCookie }
    });

    server.close();

    assert.strictEqual(readRes.body.token, 'abc123');
    assert.strictEqual(readRes.body.unsigned, undefined);
  });

  it('should detect tampered signed cookies', async () => {
    const secret = 'my-secret-key';
    app.use(cookieParser(secret));

    app.get('/read', (req, res) => {
      res.json({
        token: req.signedCookies.token
      });
    });

    server = app.listen(0);
    port = server.address().port;

    // Send a tampered signed cookie
    const readRes = await request({
      hostname: 'localhost',
      port,
      path: '/read',
      method: 'GET',
      headers: { Cookie: 'token=s%3Atampered.invalidsignature' }
    });

    server.close();

    // Tampered cookie should return false
    assert.strictEqual(readRes.body.token, false);
  });

  it('should clear cookies', async () => {
    app.use(cookieParser());

    app.get('/clear', (req, res) => {
      res.clearCookie('session');
      res.json({ cleared: true });
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/clear',
      method: 'GET'
    });

    server.close();

    const setCookie = res.headers['set-cookie'][0];
    assert.ok(setCookie.includes('session='));
    assert.ok(setCookie.includes('Max-Age=0') || setCookie.includes('Expires='));
  });

  it('should set cookie with options', async () => {
    app.use(cookieParser());

    app.get('/secure', (req, res) => {
      res.cookie('secure', 'value', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 3600000
      });
      res.json({ set: true });
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/secure',
      method: 'GET'
    });

    server.close();

    const setCookie = res.headers['set-cookie'][0];
    assert.ok(setCookie.includes('HttpOnly'));
    assert.ok(setCookie.includes('Secure'));
    assert.ok(setCookie.includes('SameSite=Strict'));
    assert.ok(setCookie.includes('Max-Age=3600'));
  });

  it('should serialize JSON cookie values', async () => {
    app.use(cookieParser());

    app.get('/set', (req, res) => {
      res.cookie('data', { name: 'john', age: 30 });
      res.json({ set: true });
    });

    server = app.listen(0);
    port = server.address().port;

    const res = await request({
      hostname: 'localhost',
      port,
      path: '/set',
      method: 'GET'
    });

    server.close();

    const setCookie = res.headers['set-cookie'][0];
    // JSON cookies are prefixed with j:
    assert.ok(setCookie.includes('j%3A') || setCookie.includes('j:'));
  });
});

describe('Integration: Full Authentication Flow', () => {
  let app;
  let server;
  let port;

  beforeEach(() => {
    app = createApp();
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  it('should implement login/logout flow with sessions', async () => {
    const secret = 'auth-secret';
    app.use(cookieParser(secret));
    app.use(session({ secret }));

    // Login endpoint
    app.post('/login', (req, res) => {
      req.session.userId = 42;
      req.session.username = 'john';
      res.json({ success: true });
    });

    // Protected endpoint
    app.get('/profile', (req, res) => {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      res.json({
        userId: req.session.userId,
        username: req.session.username
      });
    });

    // Logout endpoint
    app.post('/logout', (req, res) => {
      req.session.destroy(() => {
        res.json({ success: true });
      });
    });

    server = app.listen(0);
    port = server.address().port;

    // 1. Access profile without login - should fail
    const unauthedRes = await request({
      hostname: 'localhost',
      port,
      path: '/profile',
      method: 'GET'
    });
    assert.strictEqual(unauthedRes.statusCode, 401);

    // 2. Login
    const loginRes = await request({
      hostname: 'localhost',
      port,
      path: '/login',
      method: 'POST'
    });
    assert.strictEqual(loginRes.body.success, true);

    const sessionCookie = loginRes.headers['set-cookie'][0].split(';')[0];

    // 3. Access profile with session - should succeed
    const profileRes = await request({
      hostname: 'localhost',
      port,
      path: '/profile',
      method: 'GET',
      headers: { Cookie: sessionCookie }
    });
    assert.strictEqual(profileRes.statusCode, 200);
    assert.strictEqual(profileRes.body.userId, 42);
    assert.strictEqual(profileRes.body.username, 'john');

    // 4. Logout
    const logoutRes = await request({
      hostname: 'localhost',
      port,
      path: '/logout',
      method: 'POST',
      headers: { Cookie: sessionCookie }
    });
    assert.strictEqual(logoutRes.body.success, true);

    // 5. Access profile after logout - should fail
    const afterLogoutRes = await request({
      hostname: 'localhost',
      port,
      path: '/profile',
      method: 'GET',
      headers: { Cookie: sessionCookie }
    });
    assert.strictEqual(afterLogoutRes.statusCode, 401);

    server.close();
  });

  it('should implement remember me functionality', async () => {
    const secret = 'remember-secret';
    app.use(cookieParser(secret));
    app.use(session({ secret }));

    app.post('/login', (req, res) => {
      req.session.userId = 1;

      // Simulate "remember me" by extending cookie lifetime
      const rememberMe = req.headers['x-remember-me'] === 'true';
      if (rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      }

      res.json({ remembered: rememberMe });
    });

    server = app.listen(0);
    port = server.address().port;

    // Login with remember me
    const res = await request({
      hostname: 'localhost',
      port,
      path: '/login',
      method: 'POST',
      headers: { 'X-Remember-Me': 'true' }
    });

    server.close();

    assert.strictEqual(res.body.remembered, true);
  });
});
