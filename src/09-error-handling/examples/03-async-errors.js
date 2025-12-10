/**
 * Example 03: Async Error Handling
 *
 * Demonstrates handling errors in asynchronous code:
 * - Callback-based async
 * - Promise-based async
 * - async/await patterns
 * - The asyncHandler wrapper
 */

'use strict';

const createApp = require('../lib/index');
const { asyncHandler, NotFoundError, InternalError } = require('../lib/index');

const app = createApp();

// ============================================
// Simulated Async Operations
// ============================================

/**
 * Simulates a database query with callbacks
 */
function fetchUserCallback(id, callback) {
  setTimeout(() => {
    if (id === 1) {
      callback(null, { id: 1, name: 'Alice' });
    } else if (id === 0) {
      callback(new Error('Database connection failed'));
    } else {
      callback(null, null);
    }
  }, 100);
}

/**
 * Simulates a database query with Promises
 */
function fetchUserPromise(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id === 1) {
        resolve({ id: 1, name: 'Alice' });
      } else if (id === 0) {
        reject(new Error('Database connection failed'));
      } else {
        resolve(null);
      }
    }, 100);
  });
}

/**
 * Simulates an external API call
 */
async function fetchFromAPI(endpoint) {
  await new Promise(resolve => setTimeout(resolve, 100));

  if (endpoint === '/slow') {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  if (endpoint === '/error') {
    throw new Error('External API error');
  }

  if (endpoint === '/timeout') {
    throw new InternalError('Request timeout');
  }

  return { data: `Response from ${endpoint}` };
}

// ============================================
// Callback-based routes
// ============================================

/**
 * WRONG way: Error in callback not caught
 * (This would crash the server without proper handling)
 */
app.get('/callback/wrong/:id', (req, res, next) => {
  const id = parseInt(req.params.id);

  fetchUserCallback(id, (err, user) => {
    if (err) {
      // Without next(err), this would crash!
      // throw err; // DON'T DO THIS
      return next(err); // DO THIS
    }

    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    res.json({ user });
  });
});

/**
 * RIGHT way: Pass errors to next()
 */
app.get('/callback/right/:id', (req, res, next) => {
  const id = parseInt(req.params.id);

  fetchUserCallback(id, (err, user) => {
    if (err) {
      return next(err); // Pass error to Express
    }

    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    res.json({ user });
  });
});

// ============================================
// Promise-based routes
// ============================================

/**
 * Promise with .catch(next)
 */
app.get('/promise/:id', (req, res, next) => {
  const id = parseInt(req.params.id);

  fetchUserPromise(id)
    .then(user => {
      if (!user) {
        throw new NotFoundError('User not found');
      }
      res.json({ user });
    })
    .catch(next); // Pass any errors to Express
});

/**
 * Promise chain with multiple operations
 */
app.get('/promise-chain', (req, res, next) => {
  fetchUserPromise(1)
    .then(user => {
      // Fetch additional data
      return fetchFromAPI('/users/' + user.id);
    })
    .then(apiData => {
      res.json({ apiData });
    })
    .catch(next);
});

// ============================================
// Async/await routes
// ============================================

/**
 * WRONG way: Async error not caught
 * (This would result in unhandled rejection)
 */
app.get('/async/wrong/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  // Without try/catch, errors won't be caught!
  const user = await fetchUserPromise(id);

  if (!user) {
    throw new NotFoundError('User not found'); // This won't be caught!
  }

  res.json({ user });
});

/**
 * RIGHT way: Use try/catch with next()
 */
app.get('/async/trycatch/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const user = await fetchUserPromise(id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({ user });
  } catch (err) {
    next(err); // Pass error to Express
  }
});

/**
 * BEST way: Use asyncHandler wrapper
 * Automatically catches async errors and passes to next()
 */
app.get('/async/wrapper/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await fetchUserPromise(id);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json({ user });
}));

/**
 * Multiple async operations with asyncHandler
 */
app.get('/async/multiple', asyncHandler(async (req, res) => {
  // Parallel async operations
  const [user, apiData] = await Promise.all([
    fetchUserPromise(1),
    fetchFromAPI('/data')
  ]);

  res.json({ user, apiData });
}));

/**
 * Sequential async operations
 */
app.get('/async/sequential', asyncHandler(async (req, res) => {
  const user = await fetchUserPromise(1);
  const profile = await fetchFromAPI('/profile');
  const settings = await fetchFromAPI('/settings');

  res.json({ user, profile, settings });
}));

/**
 * Async error from external API
 */
app.get('/async/api-error', asyncHandler(async (req, res) => {
  const data = await fetchFromAPI('/error');
  res.json(data);
}));

/**
 * Conditional async operations
 */
app.get('/async/conditional', asyncHandler(async (req, res) => {
  const { fetch } = req.query;

  let data = { base: 'always returned' };

  if (fetch === 'user') {
    data.user = await fetchUserPromise(1);
  }

  if (fetch === 'api') {
    data.api = await fetchFromAPI('/data');
  }

  if (fetch === 'both') {
    [data.user, data.api] = await Promise.all([
      fetchUserPromise(1),
      fetchFromAPI('/data')
    ]);
  }

  res.json(data);
}));

// ============================================
// Error Handling Middleware
// ============================================

/**
 * Error logger
 */
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${err.name}: ${err.message}`);
  next(err);
});

/**
 * Error response handler
 */
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    error: {
      type: err.name,
      message: err.message,
      statusCode
    }
  });
});

// ============================================
// Start Server
// ============================================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
===========================================
  Async Error Handling Example
===========================================

Server running at http://localhost:${PORT}

Callback-based:
  - GET /callback/right/1    → Success
  - GET /callback/right/0    → Database error
  - GET /callback/right/999  → Not found

Promise-based:
  - GET /promise/1           → Success
  - GET /promise/0           → Database error
  - GET /promise/999         → Not found
  - GET /promise-chain       → Chained promises

Async/await:
  - GET /async/trycatch/1    → With try/catch
  - GET /async/wrapper/1     → With asyncHandler (best!)
  - GET /async/wrapper/0     → Catches async error
  - GET /async/multiple      → Parallel operations
  - GET /async/sequential    → Sequential operations
  - GET /async/api-error     → External API error
  - GET /async/conditional   → Conditional async
  - GET /async/conditional?fetch=both

Press Ctrl+C to stop
===========================================
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});
