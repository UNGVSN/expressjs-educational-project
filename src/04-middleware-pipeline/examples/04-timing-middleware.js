/**
 * Example 04: Timing Middleware
 *
 * Demonstrates how to measure request processing time
 * using the middleware pipeline.
 *
 * Run: npm run example:timing
 */

'use strict';

const createApp = require('../lib');

const app = createApp();

// Statistics storage
const stats = {
  totalRequests: 0,
  totalTime: 0,
  slowest: 0,
  fastest: Infinity,
  byPath: {}
};

/**
 * Timing middleware
 *
 * Uses two techniques:
 * 1. Modify the response to capture end time
 * 2. Use res.on('finish') event (not available in raw http)
 */
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  req.startTime = start;

  // Store original end method
  const originalEnd = res.end;

  // Override end to capture timing
  res.end = function(...args) {
    // Calculate duration in milliseconds
    const duration = Number(process.hrtime.bigint() - start) / 1e6;

    // Set header (before calling original end)
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration.toFixed(3)}ms`);
    }

    // Update statistics
    stats.totalRequests++;
    stats.totalTime += duration;
    stats.slowest = Math.max(stats.slowest, duration);
    stats.fastest = Math.min(stats.fastest, duration);

    // Track by path
    const path = req.path;
    if (!stats.byPath[path]) {
      stats.byPath[path] = { count: 0, totalTime: 0 };
    }
    stats.byPath[path].count++;
    stats.byPath[path].totalTime += duration;

    // Log to console
    const color = duration > 100 ? '\x1b[31m' : duration > 50 ? '\x1b[33m' : '\x1b[32m';
    console.log(`${color}${req.method} ${req.url} - ${duration.toFixed(2)}ms\x1b[0m`);

    // Call original end
    originalEnd.apply(this, args);
  };

  next();
});

// Home page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Timing Middleware</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    .stat { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 8px; }
    .fast { color: #4CAF50; }
    .medium { color: #FF9800; }
    .slow { color: #f44336; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>Request Timing Middleware</h1>

  <div class="stat">
    <h3>How It Works</h3>
    <pre><code>// Capture start time at beginning
const start = process.hrtime.bigint();

// Override res.end to capture end time
const originalEnd = res.end;
res.end = function(...args) {
  const duration = Number(process.hrtime.bigint() - start) / 1e6;
  res.setHeader('X-Response-Time', duration + 'ms');
  originalEnd.apply(this, args);
};</code></pre>
  </div>

  <h2>Test Endpoints</h2>

  <div class="stat">
    <h3>Speed Tests</h3>
    <ul>
      <li><a href="/fast">/fast</a> - Immediate response (~1ms)</li>
      <li><a href="/medium">/medium</a> - 50ms delay</li>
      <li><a href="/slow">/slow</a> - 200ms delay</li>
      <li><a href="/random">/random</a> - Random delay (10-300ms)</li>
    </ul>
  </div>

  <div class="stat">
    <h3>Statistics</h3>
    <p><a href="/stats">/stats</a> - View request statistics</p>
  </div>

  <p><em>Check the X-Response-Time header in DevTools Network tab!</em></p>
</body>
</html>
  `);
});

// Fast endpoint
app.get('/fast', (req, res) => {
  res.json({
    endpoint: '/fast',
    expected: '~1ms',
    message: 'Immediate response'
  });
});

// Medium endpoint (50ms delay)
app.get('/medium', (req, res) => {
  setTimeout(() => {
    res.json({
      endpoint: '/medium',
      expected: '~50ms',
      message: 'Delayed response'
    });
  }, 50);
});

// Slow endpoint (200ms delay)
app.get('/slow', (req, res) => {
  setTimeout(() => {
    res.json({
      endpoint: '/slow',
      expected: '~200ms',
      message: 'Slow response'
    });
  }, 200);
});

// Random delay endpoint
app.get('/random', (req, res) => {
  const delay = Math.floor(Math.random() * 290) + 10;
  setTimeout(() => {
    res.json({
      endpoint: '/random',
      delay: `${delay}ms`,
      message: 'Random delay'
    });
  }, delay);
});

// Statistics endpoint
app.get('/stats', (req, res) => {
  const avgTime = stats.totalRequests > 0
    ? (stats.totalTime / stats.totalRequests).toFixed(2)
    : 0;

  const pathStats = Object.entries(stats.byPath).map(([path, data]) => ({
    path,
    requests: data.count,
    avgTime: (data.totalTime / data.count).toFixed(2) + 'ms'
  }));

  res.json({
    totalRequests: stats.totalRequests,
    averageResponseTime: avgTime + 'ms',
    slowestRequest: stats.slowest.toFixed(2) + 'ms',
    fastestRequest: stats.fastest === Infinity ? 'N/A' : stats.fastest.toFixed(2) + 'ms',
    byPath: pathStats
  });
});

// Reset stats endpoint
app.post('/stats/reset', (req, res) => {
  stats.totalRequests = 0;
  stats.totalTime = 0;
  stats.slowest = 0;
  stats.fastest = Infinity;
  stats.byPath = {};

  res.json({ message: 'Statistics reset' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Timing Middleware Example                                ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Endpoints:                                                      ║
║   /fast    - Immediate response                                   ║
║   /medium  - 50ms delay                                           ║
║   /slow    - 200ms delay                                          ║
║   /random  - Random delay                                         ║
║   /stats   - View statistics                                      ║
║                                                                   ║
║   Color coding in console:                                        ║
║   🟢 Green  = Fast (<50ms)                                        ║
║   🟡 Yellow = Medium (50-100ms)                                   ║
║   🔴 Red    = Slow (>100ms)                                       ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
