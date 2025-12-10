# Step 11: Cookie & Session Support

Learn how Express.js handles HTTP cookies and session management.

## What You'll Learn

1. **HTTP cookies** - Setting, reading, and deleting cookies
2. **Cookie options** - Path, domain, expiration, secure flags
3. **Signed cookies** - Tamper-proof cookies with HMAC
4. **Sessions** - Server-side session management
5. **Session stores** - Memory and custom stores

## Core Concepts

### HTTP Cookies Overview

Cookies are small pieces of data stored in the browser:

```
Browser Request:
Cookie: name=value; other=data

Server Response:
Set-Cookie: session=abc123; Path=/; HttpOnly
```

### Setting Cookies

```javascript
// Basic cookie
res.cookie('name', 'value');

// Cookie with options
res.cookie('user', 'john', {
  maxAge: 900000,      // 15 minutes
  httpOnly: true,      // Not accessible via JavaScript
  secure: true,        // HTTPS only
  sameSite: 'strict'   // CSRF protection
});

// Cookie expiration
res.cookie('remember', 'yes', {
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
});
```

### Reading Cookies

```javascript
// With cookie-parser middleware
app.use(cookieParser());

app.get('/profile', (req, res) => {
  const username = req.cookies.username;
  const token = req.cookies.token;

  res.json({ username, token });
});
```

### Cookie Options

| Option | Description |
|--------|-------------|
| `maxAge` | Time in milliseconds until expiration |
| `expires` | Exact Date when cookie expires |
| `httpOnly` | Prevents JavaScript access |
| `secure` | Only send over HTTPS |
| `sameSite` | CSRF protection (strict, lax, none) |
| `path` | URL path where cookie is valid |
| `domain` | Domain where cookie is valid |
| `signed` | Sign cookie with secret |

### Signed Cookies

Signed cookies prevent tampering using HMAC signatures:

```javascript
// Setup with secret
app.use(cookieParser('my-secret-key'));

// Set signed cookie
res.cookie('user', 'john', { signed: true });
// Actual cookie: user=s:john.signature

// Read signed cookie
const user = req.signedCookies.user; // 'john' or false if tampered
```

### How Signed Cookies Work

```
Original:  value
Signed:    s:value.hmac_signature

When reading:
1. Split value and signature
2. Recompute HMAC of value
3. Compare signatures
4. If match: return value
5. If not: return false (tampered)
```

### Clearing Cookies

```javascript
// Clear a cookie
res.clearCookie('name');

// Clear with options (must match original)
res.clearCookie('name', { path: '/admin' });
```

## Sessions

Sessions store data on the server, identified by a cookie:

```javascript
// Enable sessions
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, maxAge: 60000 }
}));

// Use session
app.get('/login', (req, res) => {
  req.session.userId = 123;
  req.session.username = 'john';
  res.send('Logged in');
});

app.get('/profile', (req, res) => {
  if (req.session.userId) {
    res.json({ user: req.session.username });
  } else {
    res.status(401).send('Not logged in');
  }
});
```

### Session Flow

```
1. First Request:
   - No session cookie
   - Create new session ID
   - Store session data on server
   - Send Set-Cookie: sid=abc123

2. Subsequent Requests:
   - Browser sends Cookie: sid=abc123
   - Server looks up session by ID
   - Attach session data to req.session
```

### Session Options

```javascript
app.use(session({
  name: 'session.id',     // Cookie name (default: 'connect.sid')
  secret: 'my-secret',    // Required for signing
  resave: false,          // Don't save unchanged sessions
  saveUninitialized: false, // Don't create empty sessions
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  },
  store: new MemoryStore() // Session storage backend
}));
```

### Session Methods

```javascript
// Save session (usually automatic)
req.session.save(callback);

// Regenerate session ID (security)
req.session.regenerate(callback);

// Destroy session (logout)
req.session.destroy(callback);

// Reload session from store
req.session.reload(callback);
```

### Session Stores

```javascript
// Memory store (development only!)
const store = new MemoryStore();

// Redis store (production)
const RedisStore = require('connect-redis');
const store = new RedisStore({ client: redisClient });

// Database store
const store = new DatabaseStore({ pool: dbPool });
```

## Security Best Practices

### Cookie Security

```javascript
res.cookie('session', 'value', {
  httpOnly: true,     // Prevent XSS attacks
  secure: true,       // HTTPS only
  sameSite: 'strict', // Prevent CSRF
  maxAge: 3600000     // Short lifetime
});
```

### Session Security

```javascript
// Regenerate session after login
app.post('/login', (req, res) => {
  // Verify credentials...

  req.session.regenerate(() => {
    req.session.userId = user.id;
    res.redirect('/dashboard');
  });
});

// Clear session on logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('session.id');
    res.redirect('/');
  });
});
```

## Common Patterns

### Remember Me

```javascript
app.post('/login', (req, res) => {
  const { rememberMe } = req.body;

  req.session.userId = user.id;

  if (rememberMe) {
    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  } else {
    req.session.cookie.expires = false; // Session cookie
  }

  res.redirect('/dashboard');
});
```

### Flash Messages

```javascript
// Set flash message
app.post('/login', (req, res) => {
  if (loginFailed) {
    req.session.flash = { type: 'error', message: 'Invalid credentials' };
    return res.redirect('/login');
  }
});

// Display and clear flash message
app.get('/login', (req, res) => {
  const flash = req.session.flash;
  delete req.session.flash;

  res.render('login', { flash });
});
```

## Running Examples

```bash
# Basic cookie handling
npm run example:cookies

# Signed cookies
npm run example:signed

# Session management
npm run example:sessions

# Authentication example
npm run example:auth
```

## Running Tests

```bash
npm test
```

## Key Takeaways

1. **Cookies are sent with every request** to matching paths
2. **HttpOnly** prevents JavaScript access (XSS protection)
3. **Secure** flag ensures HTTPS-only transmission
4. **SameSite** prevents cross-site request forgery (CSRF)
5. **Signed cookies** detect tampering with HMAC
6. **Sessions** store data server-side, only ID in cookie
7. **Memory stores** are for development only
8. **Regenerate session IDs** after authentication changes

## Next Step

[Step 12: Complete Mini-Express Framework](../12-complete-framework/README.md) - Bringing it all together.
