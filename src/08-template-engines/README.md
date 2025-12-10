# Step 08: Template Engine Integration

Learn how Express.js integrates with template engines for server-side HTML rendering.

## What You'll Learn

1. **View rendering system** - How res.render() works
2. **Template engine registration** - app.engine() and consolidate.js pattern
3. **View resolution** - Finding templates in views directory
4. **Locals and context** - app.locals, res.locals, render options
5. **Layouts and partials** - Template composition patterns
6. **Custom engines** - Building your own template engine

## Core Concepts

### Basic View Rendering

```javascript
const express = require('express');
const app = express();

// Set views directory
app.set('views', './views');

// Set default template engine
app.set('view engine', 'ejs');

// Render a view
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Home Page',
    user: { name: 'John' }
  });
});
```

### Template Engine Registration

```javascript
// Register an engine for an extension
app.engine('html', require('ejs').renderFile);

// Or register a custom engine
app.engine('ntl', (filePath, options, callback) => {
  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) return callback(err);

    // Process template
    const rendered = content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return options[key] || '';
    });

    callback(null, rendered);
  });
});
```

## View Resolution

Express resolves view names in this order:

```javascript
res.render('users/profile');

// 1. Check if extension provided
//    users/profile.ejs (if view engine is 'ejs')
// 2. Look in views directory
//    ./views/users/profile.ejs
// 3. Try absolute path if provided
```

## Data Flow: Locals

```
┌─────────────────┐
│   app.locals    │  Application-wide (persists)
│   title, year   │
└────────┬────────┘
         │ merged with
         ▼
┌─────────────────┐
│   res.locals    │  Request-specific (per request)
│   user, flash   │
└────────┬────────┘
         │ merged with
         ▼
┌─────────────────┐
│ render options  │  Call-specific (res.render())
│   data, items   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Template Engine │  All data available as locals
└─────────────────┘
```

### Using Locals

```javascript
// App-wide data (available in all views)
app.locals.siteName = 'My App';
app.locals.year = new Date().getFullYear();

// Request-specific data (via middleware)
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.flash = req.flash();
  next();
});

// Render-specific data
app.get('/profile', (req, res) => {
  res.render('profile', {
    pageTitle: 'Your Profile',
    stats: getUserStats(req.user.id)
  });
});
```

## Built-in Simple Engine

Our implementation includes a simple Mustache-like engine:

```javascript
const { simpleEngine } = require('./lib');

app.engine('html', simpleEngine);
app.set('view engine', 'html');
```

Syntax:
- `{{variable}}` - Output escaped value
- `{{{variable}}}` - Output unescaped value
- `{{#if condition}}...{{/if}}` - Conditional
- `{{#each array}}...{{/each}}` - Iteration
- `{{> partial}}` - Include partial

## Implementation

### File Structure

```
lib/
├── index.js          # Main application with view support
├── view.js           # View class for template resolution
├── engines/          # Built-in template engines
│   ├── simple.js     # Simple mustache-like engine
│   └── ejs-lite.js   # Lightweight EJS implementation
└── utils.js          # Template utilities
```

### View Class

```javascript
class View {
  constructor(name, options) {
    this.name = name;
    this.root = options.root;
    this.defaultEngine = options.defaultEngine;
    this.ext = this.resolveExtension(name);
    this.path = this.lookup(name);
    this.engine = options.engines[this.ext];
  }

  render(options, callback) {
    this.engine(this.path, options, callback);
  }
}
```

## Common Patterns

### Layouts

```html
<!-- views/layouts/main.html -->
<!DOCTYPE html>
<html>
<head>
  <title>{{title}} | {{siteName}}</title>
</head>
<body>
  <nav>{{> nav}}</nav>
  <main>{{{body}}}</main>
  <footer>{{> footer}}</footer>
</body>
</html>
```

```javascript
// Render with layout
res.render('page', {
  layout: 'layouts/main',
  title: 'My Page',
  body: '<h1>Content</h1>'
});
```

### Partials

```html
<!-- views/partials/header.html -->
<header>
  <h1>{{siteName}}</h1>
  {{#if user}}
    <span>Welcome, {{user.name}}</span>
  {{/if}}
</header>
```

```html
<!-- views/home.html -->
{{> partials/header}}
<main>
  <h2>{{title}}</h2>
  {{#each items}}
    <div>{{name}}</div>
  {{/each}}
</main>
```

### Helpers

```javascript
// Register helper functions
app.locals.formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

app.locals.truncate = (str, len) => {
  return str.length > len ? str.slice(0, len) + '...' : str;
};
```

```html
<!-- In template -->
<time>{{formatDate(post.date)}}</time>
<p>{{truncate(post.content, 100)}}</p>
```

## Real Template Engines

Express works with many template engines:

| Engine | Extension | Style |
|--------|-----------|-------|
| EJS | .ejs | `<%= %>` embedded JS |
| Pug | .pug | Indentation-based |
| Handlebars | .hbs | `{{}}` logic-less |
| Nunjucks | .njk | Jinja2-style |
| Mustache | .mustache | Logic-less |

### Using Real EJS

```javascript
const express = require('express');
const app = express();

app.set('view engine', 'ejs');
app.set('views', './views');

// EJS automatically registered for .ejs files
app.get('/', (req, res) => {
  res.render('index', { title: 'Hello' });
});
```

## Running Examples

```bash
# Basic view rendering
npm run example:basic

# Layout system
npm run example:layouts

# Partials and includes
npm run example:partials

# Helper functions
npm run example:helpers
```

## Running Tests

```bash
npm test
```

## Key Takeaways

1. **app.engine()** registers template engines for file extensions
2. **app.set('view engine')** sets the default engine
3. **app.set('views')** sets the views directory
4. **res.render()** renders a view with data
5. **Locals cascade**: app.locals → res.locals → render options
6. **Template engines** are just functions: `(path, options, callback)`
7. **Layouts and partials** enable template composition

## Next Step

[Step 09: Error Handling System](../09-error-handling/README.md) - Learn Express's comprehensive error handling mechanisms.
