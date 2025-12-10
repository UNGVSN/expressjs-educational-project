/**
 * Example: Session Management
 *
 * Demonstrates:
 * - Setting up session middleware
 * - Storing and retrieving session data
 * - Session lifecycle (create, update, destroy)
 * - Session ID regeneration (security)
 *
 * Run: npm run example:sessions
 * Test with: curl -c cookies.txt -b cookies.txt http://localhost:3000/
 */

'use strict';

const createApp = require('../lib/index');
const { cookieParser, session, MemoryStore } = require('../lib/index');

const app = createApp();

// Secret for signing session cookie
const SECRET = 'session-secret-change-in-production';

// Create a session store (for monitoring in this example)
const store = new MemoryStore();

// Setup middleware
app.use(cookieParser(SECRET));
app.use(session({
  secret: SECRET,
  name: 'session.id',
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    maxAge: 30 * 60 * 1000, // 30 minutes
    httpOnly: true
  }
}));

// Home page - shows session info
app.get('/', (req, res) => {
  // Track page views in session
  req.session.views = (req.session.views || 0) + 1;

  res.json({
    message: 'Session Example',
    endpoints: {
      '/': 'View session info (increments view count)',
      '/set/:key/:value': 'Store data in session',
      '/get/:key': 'Retrieve data from session',
      '/destroy': 'Destroy current session',
      '/regenerate': 'Regenerate session ID',
      '/stats': 'View session store statistics'
    },
    session: {
      id: req.session.id,
      isNew: req.session.isNew,
      views: req.session.views,
      data: getSessionData(req.session)
    }
  });
});

// Store data in session
app.get('/set/:key/:value', (req, res) => {
  const { key, value } = req.params;

  // Store in session
  req.session[key] = value;

  res.json({
    message: `Stored in session: ${key} = ${value}`,
    session: getSessionData(req.session)
  });
});

// Retrieve data from session
app.get('/get/:key', (req, res) => {
  const { key } = req.params;
  const value = req.session[key];

  if (value === undefined) {
    return res.status(404).json({
      error: `Key '${key}' not found in session`,
      availableKeys: Object.keys(getSessionData(req.session))
    });
  }

  res.json({
    key,
    value,
    allData: getSessionData(req.session)
  });
});

// Destroy session (logout)
app.get('/destroy', (req, res) => {
  const oldId = req.session.id;

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        error: 'Failed to destroy session',
        message: err.message
      });
    }

    res.json({
      message: 'Session destroyed',
      oldSessionId: oldId,
      note: 'A new session will be created on next request'
    });
  });
});

// Regenerate session ID (security best practice after login)
app.get('/regenerate', (req, res) => {
  const oldId = req.session.id;
  const oldData = getSessionData(req.session);

  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({
        error: 'Failed to regenerate session',
        message: err.message
      });
    }

    // Restore data to new session
    Object.assign(req.session, oldData);

    res.json({
      message: 'Session ID regenerated',
      oldId,
      newId: req.session.id,
      note: 'Data preserved, but ID changed (prevents session fixation attacks)'
    });
  });
});

// View session store statistics
app.get('/stats', (req, res) => {
  store.length((err, count) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    store.all((err, sessions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        message: 'Session Store Statistics',
        totalSessions: count,
        sessions: Object.entries(sessions).map(([id, data]) => ({
          id: id.slice(0, 8) + '...',
          keys: Object.keys(data).filter(k => k !== 'cookie')
        })),
        note: 'Using MemoryStore (development only!)'
      });
    });
  });
});

// Shopping cart example
app.get('/cart', (req, res) => {
  req.session.cart = req.session.cart || [];

  res.json({
    message: 'Shopping Cart',
    cart: req.session.cart,
    total: req.session.cart.reduce((sum, item) => sum + item.price, 0),
    endpoints: {
      '/cart/add/:item/:price': 'Add item to cart',
      '/cart/clear': 'Clear cart'
    }
  });
});

app.get('/cart/add/:item/:price', (req, res) => {
  req.session.cart = req.session.cart || [];

  req.session.cart.push({
    item: req.params.item,
    price: parseFloat(req.params.price),
    addedAt: new Date().toISOString()
  });

  res.json({
    message: `Added ${req.params.item} to cart`,
    cart: req.session.cart,
    total: req.session.cart.reduce((sum, item) => sum + item.price, 0)
  });
});

app.get('/cart/clear', (req, res) => {
  req.session.cart = [];

  res.json({
    message: 'Cart cleared',
    cart: []
  });
});

// Helper to extract user data from session (exclude internal properties)
function getSessionData(session) {
  const data = {};
  for (const key of Object.keys(session)) {
    if (key !== 'cookie' && key !== 'id' && typeof session[key] !== 'function') {
      data[key] = session[key];
    }
  }
  return data;
}

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Session example running on http://localhost:${PORT}`);
  console.log('\nSessions store data on the server, identified by cookie.');
  console.log('\nTry these commands:');
  console.log(`  curl -c jar.txt -b jar.txt http://localhost:${PORT}/`);
  console.log(`  curl -c jar.txt -b jar.txt http://localhost:${PORT}/set/username/john`);
  console.log(`  curl -c jar.txt -b jar.txt http://localhost:${PORT}/get/username`);
  console.log(`  curl -c jar.txt -b jar.txt http://localhost:${PORT}/cart/add/book/19.99`);
  console.log(`  curl -c jar.txt -b jar.txt http://localhost:${PORT}/cart`);
});

process.on('SIGINT', () => {
  store.stopCleanup();
  server.close(() => process.exit(0));
});
