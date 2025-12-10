# Step 06: The Application Class

## Overview

The Application class is the central piece of Express.js. It ties together routing, middleware, settings, template engines, and serves as the foundation for your entire web application. In this step, we'll build a complete Application class that mirrors Express's functionality.

## Learning Objectives

By the end of this step, you will understand:

1. How the Application class organizes Express functionality
2. Application settings system (`app.set()`, `app.get()`)
3. Application locals (`app.locals`)
4. Template engine registration (`app.engine()`)
5. View rendering (`res.render()`)
6. Environment-based configuration
7. Trust proxy settings

## The Application Class Structure

```javascript
class Application {
  constructor() {
    // Middleware stack (from Router)
    this.stack = [];

    // Application settings
    this.settings = {
      'env': process.env.NODE_ENV || 'development',
      'x-powered-by': true,
      'etag': 'weak',
      'view engine': undefined,
      'views': './views',
      'trust proxy': false
    };

    // Shared data for all views
    this.locals = {
      settings: this.settings
    };

    // Registered template engines
    this.engines = {};

    // Cache for compiled views
    this.cache = {};
  }
}
```

## Key Features

### 1. Settings System

Settings control application behavior:

```javascript
// Set a setting
app.set('view engine', 'pug');
app.set('views', './templates');

// Get a setting
const engine = app.get('view engine'); // 'pug'

// Boolean settings
app.enable('trust proxy');   // set('trust proxy', true)
app.disable('x-powered-by'); // set('x-powered-by', false)

// Check boolean
app.enabled('trust proxy');  // true
app.disabled('x-powered-by'); // true
```

### 2. Common Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `env` | `development` | Application environment |
| `view engine` | - | Default template engine |
| `views` | `./views` | Template directory |
| `trust proxy` | `false` | Trust X-Forwarded-* headers |
| `x-powered-by` | `true` | Send X-Powered-By header |
| `etag` | `weak` | ETag generation mode |
| `json spaces` | - | JSON output formatting |
| `strict routing` | `false` | Treat /foo and /foo/ differently |
| `case sensitive routing` | `false` | Case sensitive routes |

### 3. Application Locals

Locals are shared across all rendered views:

```javascript
// Set locals
app.locals.title = 'My App';
app.locals.version = '1.0.0';
app.locals.formatDate = (date) => date.toISOString();

// In templates, these are available as variables
// title, version, formatDate, etc.
```

### 4. Template Engine Registration

```javascript
// Register a custom engine
app.engine('html', (filepath, options, callback) => {
  // Read file and render template
  fs.readFile(filepath, 'utf8', (err, content) => {
    if (err) return callback(err);

    // Simple variable replacement
    const rendered = content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return options[key] || '';
    });

    callback(null, rendered);
  });
});

// Use the engine
app.set('view engine', 'html');
```

### 5. View Rendering

```javascript
// res.render() renders a view and sends response
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Home Page',
    user: req.user
  });
});

// View resolution:
// 1. Find view file: views/index.html
// 2. Get template engine for extension
// 3. Render with locals + options
// 4. Send HTML response
```

## Implementation Details

### The express() Factory

```javascript
function createApplication() {
  // Create app function (callable as http handler)
  const app = function(req, res, next) {
    app.handle(req, res, next);
  };

  // Mix in Application prototype
  Object.setPrototypeOf(app, Application.prototype);

  // Initialize
  app.init();

  return app;
}
```

### Settings with Default Values

```javascript
const DEFAULT_SETTINGS = {
  'env': process.env.NODE_ENV || 'development',
  'view engine': undefined,
  'views': path.resolve('views'),
  'trust proxy': false,
  'x-powered-by': true,
  'etag': 'weak',
  'query parser': 'extended',
  'subdomain offset': 2,
  'strict routing': false,
  'case sensitive routing': false
};

app.init = function() {
  this.settings = { ...DEFAULT_SETTINGS };
  this.locals = Object.create(null);
  this.locals.settings = this.settings;
  this.engines = {};
  this.cache = {};
};
```

### The render() Method

```javascript
res.render = function(view, options = {}, callback) {
  const app = this.app;
  const opts = { ...app.locals, ...options };

  // Find view file
  const ext = path.extname(view) || '.' + app.get('view engine');
  const filename = path.join(app.get('views'), view + ext);

  // Get engine
  const engine = app.engines[ext];
  if (!engine) {
    throw new Error(`No engine registered for ${ext}`);
  }

  // Render
  engine(filename, opts, (err, html) => {
    if (err) return this.req.next(err);

    if (callback) {
      callback(err, html);
    } else {
      this.send(html);
    }
  });
};
```

## File Structure

```
06-application-class/
├── lib/
│   ├── index.js          # Express factory function
│   ├── application.js    # Application class
│   ├── request.js        # Request enhancements
│   ├── response.js       # Response enhancements
│   ├── router.js         # Router (from step 05)
│   └── view.js           # View class
├── test/
│   ├── app.test.js          # Application tests
│   ├── settings.test.js     # Settings tests
│   └── render.test.js       # Rendering tests
├── examples/
│   ├── 01-basic-app.js
│   ├── 02-app-settings.js
│   ├── 03-app-locals.js
│   └── 04-template-engines.js
└── README.md
```

## Express Source Code Reference

From Express's lib/application.js:

```javascript
var app = exports = module.exports = {};

app.init = function init() {
  this.cache = {};
  this.engines = {};
  this.settings = {};

  this.defaultConfiguration();
};

app.set = function set(setting, val) {
  if (arguments.length === 1) {
    return this.settings[setting];
  }

  this.settings[setting] = val;

  // Special handling for certain settings
  switch (setting) {
    case 'etag':
      this.set('etag fn', compileETag(val));
      break;
    case 'query parser':
      this.set('query parser fn', compileQueryParser(val));
      break;
    case 'trust proxy':
      this.set('trust proxy fn', compileTrust(val));
      break;
  }

  return this;
};
```

## Running the Examples

```bash
# Basic application usage
npm run example:basic

# Application settings
npm run example:settings

# Application locals
npm run example:locals

# Template engines
npm run example:engines

# Run all tests
npm test
```

## Key Takeaways

1. **Application is the hub** - Connects routing, middleware, views, settings
2. **Settings control behavior** - Environment, views, trust proxy, etc.
3. **Locals are shared** - Available in all rendered views
4. **Engines are pluggable** - Register any template engine
5. **Express factory pattern** - `express()` returns a callable function

## Next Step

In Step 07, we'll implement **Static File Serving** with the `express.static()` middleware, including caching, content types, and directory listings.

---

[← Previous: Step 05 - Router Class](../05-router-class/README.md) | [Next: Step 07 - Static File Serving →](../07-static-file-serving/README.md)
