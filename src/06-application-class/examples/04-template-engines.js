/**
 * Example 04: Template Engines
 *
 * Demonstrates the template engine system in Express-like applications.
 *
 * Run: npm run example:engines
 */

'use strict';

const createApp = require('../lib');
const path = require('node:path');
const fs = require('node:fs');

const app = createApp();

// ============================================
// VIEWS DIRECTORY SETUP
// ============================================

const viewsDir = path.join(__dirname, 'views');

// Create views directory if it doesn't exist
if (!fs.existsSync(viewsDir)) {
  fs.mkdirSync(viewsDir, { recursive: true });
}

// ============================================
// CUSTOM TEMPLATE ENGINES
// ============================================

/**
 * Simple Mustache-like Engine
 * Supports: {{variable}}, {{#each items}}...{{/each}}, {{#if condition}}...{{/if}}
 */
function mustacheEngine(filePath, options, callback) {
  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) return callback(err);

    try {
      let rendered = content;

      // Handle {{#each items}}...{{/each}}
      rendered = rendered.replace(
        /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
        (_, arrayName, template) => {
          const array = options[arrayName];
          if (!Array.isArray(array)) return '';
          return array.map(item => {
            let itemTemplate = template;
            // Replace {{.}} with the item itself (for primitives)
            itemTemplate = itemTemplate.replace(/\{\{\.\}\}/g, String(item));
            // Replace {{property}} with item properties
            if (typeof item === 'object') {
              for (const [key, value] of Object.entries(item)) {
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                itemTemplate = itemTemplate.replace(regex, String(value));
              }
            }
            return itemTemplate;
          }).join('');
        }
      );

      // Handle {{#if condition}}...{{/if}}
      rendered = rendered.replace(
        /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
        (_, condition, template) => {
          return options[condition] ? template : '';
        }
      );

      // Handle simple {{variable}} replacements
      rendered = rendered.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        return options[key] !== undefined ? String(options[key]) : '';
      });

      callback(null, rendered);
    } catch (e) {
      callback(e);
    }
  });
}

/**
 * EJS-like Engine
 * Supports: <%= expression %>, <% code %>, <%- unescaped %>
 */
function ejsEngine(filePath, options, callback) {
  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) return callback(err);

    try {
      // Escape HTML helper
      const escapeHtml = (str) => {
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      };

      // Build function body
      let code = 'let __output = "";\n';

      // Extract variable names from options for the function scope
      const varDeclarations = Object.keys(options)
        .map(key => `const ${key} = __options["${key}"];`)
        .join('\n');

      code += varDeclarations + '\n';

      let cursor = 0;
      const regex = /<%(-|=)?\s*([\s\S]*?)\s*%>/g;
      let match;

      while ((match = regex.exec(content)) !== null) {
        // Add text before the tag
        const text = content.slice(cursor, match.index);
        if (text) {
          code += `__output += ${JSON.stringify(text)};\n`;
        }

        const modifier = match[1];
        const expression = match[2];

        if (modifier === '=') {
          // Escaped output
          code += `__output += __escapeHtml(${expression});\n`;
        } else if (modifier === '-') {
          // Unescaped output
          code += `__output += (${expression});\n`;
        } else {
          // Code execution
          code += expression + '\n';
        }

        cursor = match.index + match[0].length;
      }

      // Add remaining text
      const remaining = content.slice(cursor);
      if (remaining) {
        code += `__output += ${JSON.stringify(remaining)};\n`;
      }

      code += 'return __output;';

      // Create and execute function
      const fn = new Function('__options', '__escapeHtml', code);
      const result = fn(options, escapeHtml);

      callback(null, result);
    } catch (e) {
      callback(e);
    }
  });
}

/**
 * Simple HTML Engine (just variable replacement)
 */
function htmlEngine(filePath, options, callback) {
  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) return callback(err);

    const rendered = content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return options[key] !== undefined ? String(options[key]) : '';
    });

    callback(null, rendered);
  });
}

// ============================================
// REGISTER ENGINES
// ============================================

app.engine('mustache', mustacheEngine);
app.engine('ejs', ejsEngine);
app.engine('html', htmlEngine);

// Set default engine and views directory
app.set('view engine', 'mustache');
app.set('views', viewsDir);

// ============================================
// CREATE TEMPLATE FILES
// ============================================

// Mustache template
fs.writeFileSync(path.join(viewsDir, 'index.mustache'), `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{{title}}</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    .box { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 8px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
    .user { padding: 10px; margin: 5px 0; background: #e3f2fd; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>{{title}}</h1>
  <p>{{message}}</p>

  {{#if showWelcome}}
  <div class="box">
    <h3>Welcome!</h3>
    <p>This section only shows when showWelcome is true.</p>
  </div>
  {{/if}}

  <h2>Users ({{#each}} demo)</h2>
  {{#each users}}
  <div class="user">
    <strong>{{name}}</strong> - {{email}}
  </div>
  {{/each}}

  <h2>Navigation</h2>
  <ul>
    <li><a href="/">Home (Mustache)</a></li>
    <li><a href="/ejs">EJS Demo</a></li>
    <li><a href="/html">HTML Demo</a></li>
    <li><a href="/api/engines">Registered Engines</a></li>
  </ul>
</body>
</html>`);

// EJS template
fs.writeFileSync(path.join(viewsDir, 'index.ejs'), `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title><%= title %></title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    .box { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 8px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
    .user { padding: 10px; margin: 5px 0; background: #fff3e0; border-radius: 4px; }
    .even { background: #ffe0b2; }
  </style>
</head>
<body>
  <h1><%= title %></h1>
  <p><%= message %></p>

  <div class="box">
    <h3>EJS Features Demo</h3>
    <p>Current time: <%= new Date().toLocaleTimeString() %></p>
    <p>Math: 2 + 2 = <%= 2 + 2 %></p>
  </div>

  <% if (showWelcome) { %>
  <div class="box">
    <h3>Conditional Content</h3>
    <p>This shows because showWelcome is truthy.</p>
  </div>
  <% } %>

  <h2>Users (loop demo)</h2>
  <% for (let i = 0; i < users.length; i++) { %>
  <div class="user <%= i % 2 === 0 ? 'even' : '' %>">
    <strong><%= users[i].name %></strong> - <%= users[i].email %>
  </div>
  <% } %>

  <h2>Escaped vs Unescaped</h2>
  <div class="box">
    <p>Escaped: <%= htmlContent %></p>
    <p>Unescaped: <%- htmlContent %></p>
  </div>

  <h2>Navigation</h2>
  <ul>
    <li><a href="/">Home (Mustache)</a></li>
    <li><a href="/ejs">EJS Demo</a></li>
    <li><a href="/html">HTML Demo</a></li>
    <li><a href="/api/engines">Registered Engines</a></li>
  </ul>
</body>
</html>`);

// HTML template
fs.writeFileSync(path.join(viewsDir, 'index.html'), `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{{title}}</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    .box { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 8px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; overflow-x: auto; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>{{title}}</h1>
  <p>{{message}}</p>

  <div class="box">
    <h3>Simple HTML Engine</h3>
    <p>This engine only supports basic {{variable}} replacement.</p>
    <p>Environment: {{env}}</p>
  </div>

  <h2>How to Register Engines</h2>
  <pre><code>// Register a template engine
app.engine('ext', function(filePath, options, callback) {
  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) return callback(err);

    // Process template and call callback with result
    const rendered = processTemplate(content, options);
    callback(null, rendered);
  });
});

// Set default engine
app.set('view engine', 'ext');

// Render a view
app.get('/', (req, res) => {
  res.render('index', { title: 'Hello' });
});</code></pre>

  <h2>Navigation</h2>
  <ul>
    <li><a href="/">Home (Mustache)</a></li>
    <li><a href="/ejs">EJS Demo</a></li>
    <li><a href="/html">HTML Demo</a></li>
    <li><a href="/api/engines">Registered Engines</a></li>
  </ul>
</body>
</html>`);

// ============================================
// SET APP.LOCALS
// ============================================

app.locals.appName = 'Template Engine Demo';

// ============================================
// ROUTES
// ============================================

// Home - uses default engine (mustache)
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Mustache Template Engine',
    message: 'This page is rendered using a Mustache-like template engine.',
    showWelcome: true,
    users: [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
      { name: 'Charlie', email: 'charlie@example.com' }
    ]
  });
});

// EJS demo - explicitly specify engine
app.get('/ejs', (req, res) => {
  res.render('index.ejs', {
    title: 'EJS Template Engine',
    message: 'This page is rendered using an EJS-like template engine.',
    showWelcome: true,
    users: [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
      { name: 'Charlie', email: 'charlie@example.com' }
    ],
    htmlContent: '<strong>Bold</strong> and <em>italic</em>'
  });
});

// HTML demo
app.get('/html', (req, res) => {
  res.render('index.html', {
    title: 'Simple HTML Engine',
    message: 'This page uses a simple HTML engine with variable replacement.',
    env: app.get('env')
  });
});

// API - list registered engines
app.get('/api/engines', (req, res) => {
  const engines = {};
  for (const [ext, fn] of Object.entries(app.engines)) {
    engines[ext] = fn.name || 'anonymous';
  }

  res.json({
    registered: engines,
    default: app.get('view engine'),
    viewsDirectory: app.get('views'),
    usage: {
      'res.render("index")': 'Uses default engine (.mustache)',
      'res.render("index.ejs")': 'Uses .ejs engine',
      'res.render("index.html")': 'Uses .html engine'
    }
  });
});

// Direct app.render() demo
app.get('/api/render', (req, res) => {
  app.render('index', {
    title: 'Direct Render',
    message: 'Rendered using app.render() directly',
    showWelcome: false,
    users: []
  }, (err, html) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      method: 'app.render()',
      htmlLength: html.length,
      preview: html.substring(0, 200) + '...'
    });
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Template Engines Example                                ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Registered Engines:                                             ║
║   • .mustache - Mustache-like (default)                           ║
║   • .ejs      - EJS-like with <% %> syntax                        ║
║   • .html     - Simple variable replacement                       ║
║                                                                   ║
║   Pages:                                                          ║
║   /           Mustache template demo                              ║
║   /ejs        EJS template demo                                   ║
║   /html       HTML template demo                                  ║
║   /api/engines List registered engines                            ║
║   /api/render  Direct app.render() demo                           ║
║                                                                   ║
║   Views directory: ${viewsDir}
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
