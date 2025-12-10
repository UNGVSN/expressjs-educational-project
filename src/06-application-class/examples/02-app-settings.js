/**
 * Example 02: Application Settings
 *
 * Demonstrates the settings system in Express-like applications.
 *
 * Run: npm run example:settings
 */

'use strict';

const createApp = require('../lib');

const app = createApp();

// ============================================
// CONFIGURING SETTINGS
// ============================================

// Set environment (usually from NODE_ENV)
app.set('env', process.env.NODE_ENV || 'development');

// View settings (we'll use these in later steps)
app.set('view engine', 'html');
app.set('views', './templates');

// JSON formatting
app.set('json spaces', 2);

// Security settings
app.disable('x-powered-by'); // Don't reveal framework
app.enable('trust proxy');   // Trust reverse proxy

// Custom settings
app.set('app name', 'Settings Demo');
app.set('app version', '1.0.0');
app.set('max items per page', 50);

// ============================================
// ROUTES
// ============================================

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Application Settings</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
    th { background: #f5f5f5; }
    .true { color: #4CAF50; }
    .false { color: #f44336; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Application Settings</h1>

  <h2>Current Settings</h2>
  <table>
    <tr><th>Setting</th><th>Value</th><th>Type</th></tr>
    <tr><td>env</td><td>${app.get('env')}</td><td>string</td></tr>
    <tr><td>x-powered-by</td><td class="${app.get('x-powered-by')}">${app.get('x-powered-by')}</td><td>boolean</td></tr>
    <tr><td>trust proxy</td><td class="${app.get('trust proxy')}">${app.get('trust proxy')}</td><td>boolean</td></tr>
    <tr><td>view engine</td><td>${app.get('view engine')}</td><td>string</td></tr>
    <tr><td>views</td><td>${app.get('views')}</td><td>string</td></tr>
    <tr><td>json spaces</td><td>${app.get('json spaces')}</td><td>number</td></tr>
    <tr><td>app name</td><td>${app.get('app name')}</td><td>string</td></tr>
    <tr><td>app version</td><td>${app.get('app version')}</td><td>string</td></tr>
    <tr><td>max items per page</td><td>${app.get('max items per page')}</td><td>number</td></tr>
  </table>

  <h2>Settings API</h2>
  <ul>
    <li><a href="/api/settings">/api/settings</a> - All settings as JSON</li>
    <li><a href="/api/enabled/trust%20proxy">/api/enabled/trust proxy</a> - Check enabled</li>
    <li><a href="/api/disabled/x-powered-by">/api/disabled/x-powered-by</a> - Check disabled</li>
  </ul>

  <h2>Code Examples</h2>
  <pre><code>// Set a setting
app.set('view engine', 'pug');
app.set('json spaces', 2);

// Get a setting
const engine = app.get('view engine'); // 'pug'

// Boolean settings
app.enable('trust proxy');    // Same as app.set('trust proxy', true)
app.disable('x-powered-by');  // Same as app.set('x-powered-by', false)

// Check boolean settings
app.enabled('trust proxy');   // true
app.disabled('x-powered-by'); // true</code></pre>

  <h2>Common Settings</h2>
  <table>
    <tr><th>Setting</th><th>Default</th><th>Description</th></tr>
    <tr><td>env</td><td>development</td><td>Application environment</td></tr>
    <tr><td>view engine</td><td>-</td><td>Default template engine</td></tr>
    <tr><td>views</td><td>./views</td><td>Template directory</td></tr>
    <tr><td>trust proxy</td><td>false</td><td>Trust X-Forwarded-* headers</td></tr>
    <tr><td>x-powered-by</td><td>true</td><td>Send X-Powered-By header</td></tr>
    <tr><td>json spaces</td><td>-</td><td>JSON.stringify spacing</td></tr>
    <tr><td>strict routing</td><td>false</td><td>/foo vs /foo/ different</td></tr>
  </table>
</body>
</html>
  `);
});

// Get all settings as JSON
app.get('/api/settings', (req, res) => {
  // Demonstrate JSON spacing setting
  res.json({
    settings: { ...app.settings },
    note: `JSON formatted with ${app.get('json spaces')} spaces`
  });
});

// Check if setting is enabled
app.get('/api/enabled/:setting', (req, res) => {
  const setting = req.params.setting;
  res.json({
    setting,
    value: app.get(setting),
    enabled: app.enabled(setting)
  });
});

// Check if setting is disabled
app.get('/api/disabled/:setting', (req, res) => {
  const setting = req.params.setting;
  res.json({
    setting,
    value: app.get(setting),
    disabled: app.disabled(setting)
  });
});

// Environment-specific behavior
app.get('/api/debug', (req, res) => {
  if (app.get('env') === 'development') {
    res.json({
      debug: true,
      settings: { ...app.settings },
      headers: req.headers
    });
  } else {
    res.json({ debug: false, message: 'Debug only in development' });
  }
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Application Settings Example                             ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Settings Configured:                                            ║
║   • env: ${app.get('env')}                                            ║
║   • x-powered-by: ${app.get('x-powered-by')}                                   ║
║   • trust proxy: ${app.get('trust proxy')}                                    ║
║   • json spaces: ${app.get('json spaces')}                                         ║
║                                                                   ║
║   Endpoints:                                                      ║
║   /api/settings        - All settings                             ║
║   /api/enabled/:name   - Check if enabled                         ║
║   /api/disabled/:name  - Check if disabled                        ║
║   /api/debug           - Debug info (dev only)                    ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
