# Express Generator

Official scaffolding tool for creating Express.js applications.

## Overview

`express-generator` is a command-line tool that creates a basic Express application structure with common configurations pre-set.

## Installation

```bash
# Global installation (recommended)
npm install -g express-generator

# Or use npx (no installation required)
npx express-generator
```

## Basic Usage

```bash
# Create new application
express myapp

# Navigate and install dependencies
cd myapp
npm install

# Start application
npm start
```

## Command Options

```bash
express [options] [dir]

Options:
  -h, --help           output usage information
  -V, --version        output the version number
  -e, --ejs            add ejs engine support
      --pug            add pug engine support
      --hbs            add handlebars engine support
  -H, --hogan          add hogan.js engine support
  -v, --view <engine>  add view <engine> support (dust|ejs|hbs|hjs|jade|pug|twig|vash)
      --no-view        use static html instead of view engine
  -c, --css <engine>   add stylesheet <engine> support (less|stylus|compass|sass)
      --git            add .gitignore
  -f, --force          force on non-empty directory
```

## Examples

### Basic Application with Pug

```bash
express --view=pug myapp
```

### API-Only Application (No View Engine)

```bash
express --no-view myapi
```

### Application with EJS and Sass

```bash
express --view=ejs --css=sass myapp
```

### With Git Ignore

```bash
express --git --view=pug myapp
```

## Generated Structure

### Default Structure (with Pug)

```
myapp/
├── app.js              # Main application file
├── package.json        # Project configuration
├── bin/
│   └── www             # Server startup script
├── public/             # Static files
│   ├── images/
│   ├── javascripts/
│   └── stylesheets/
│       └── style.css
├── routes/             # Route handlers
│   ├── index.js        # Home routes
│   └── users.js        # User routes
└── views/              # View templates
    ├── error.pug       # Error page
    ├── index.pug       # Home page
    └── layout.pug      # Base layout
```

### API Structure (--no-view)

```
myapi/
├── app.js
├── package.json
├── bin/
│   └── www
├── public/
│   ├── images/
│   ├── javascripts/
│   └── stylesheets/
│       └── style.css
└── routes/
    ├── index.js
    └── users.js
```

## Generated Files Explained

### app.js

```javascript
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', indexRouter);
app.use('/users', usersRouter);

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
```

### bin/www

```javascript
#!/usr/bin/env node

var app = require('../app');
var debug = require('debug')('myapp:server');
var http = require('http');

// Get port from environment
var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

// Create HTTP server
var server = http.createServer(app);

// Listen on provided port
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// Normalize port
function normalizePort(val) {
  var port = parseInt(val, 10);
  if (isNaN(port)) return val;      // Named pipe
  if (port >= 0) return port;        // Port number
  return false;
}

// Event listener for HTTP server "error" event
function onError(error) {
  if (error.syscall !== 'listen') throw error;

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // Handle specific listen errors
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

// Event listener for HTTP server "listening" event
function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
```

### routes/index.js

```javascript
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
```

### routes/users.js

```javascript
var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;
```

### package.json

```json
{
  "name": "myapp",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "start": "node ./bin/www"
  },
  "dependencies": {
    "cookie-parser": "~1.4.4",
    "debug": "~2.6.9",
    "express": "~4.16.1",
    "http-errors": "~1.6.3",
    "morgan": "~1.9.1",
    "pug": "2.0.0-beta11"
  }
}
```

## Customizing Generated Application

### Adding Development Dependencies

```bash
cd myapp
npm install --save-dev nodemon

# Update package.json scripts
{
  "scripts": {
    "start": "node ./bin/www",
    "dev": "nodemon ./bin/www"
  }
}
```

### Adding Environment Variables

```bash
npm install dotenv
```

```javascript
// Add at top of app.js
require('dotenv').config();
```

### Adding Security Middleware

```bash
npm install helmet cors
```

```javascript
// app.js
const helmet = require('helmet');
const cors = require('cors');

app.use(helmet());
app.use(cors());
```

### Converting to ES Modules

```json
// package.json
{
  "type": "module"
}
```

```javascript
// app.js (ES modules)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import logger from 'morgan';

import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// ... rest of configuration
```

## Production Enhancements

### Enhanced app.js for Production

```javascript
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();

// Security
app.use(helmet());

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api', limiter);

// Trust proxy (if behind reverse proxy)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Logging
app.use(logger(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());

// Static files with caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0
}));

// Routes
app.use('/', indexRouter);
app.use('/users', usersRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((req, res, next) => {
  next(createError(404));
});

// Error handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);

  // JSON response for API routes
  if (req.path.startsWith('/api')) {
    return res.json({
      error: {
        message: err.message,
        status: err.status || 500
      }
    });
  }

  res.render('error');
});

module.exports = app;
```

### Enhanced bin/www for Production

```javascript
#!/usr/bin/env node

require('dotenv').config();

const app = require('../app');
const debug = require('debug')('myapp:server');
const http = require('http');

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

const server = http.createServer(app);

// Timeouts
server.setTimeout(30000);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`${signal} received. Shutting down gracefully.`);

  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forcing shutdown.');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

function normalizePort(val) {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val;
  if (port >= 0) return port;
  return false;
}

function onError(error) {
  if (error.syscall !== 'listen') throw error;

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
  console.log(`Server running on ${bind}`);
}
```

## Alternative: Custom Generator Script

For teams with specific requirements, create your own generator:

```javascript
#!/usr/bin/env node
// scripts/create-app.js

const fs = require('fs');
const path = require('path');

const appName = process.argv[2];

if (!appName) {
  console.error('Please specify app name: create-app myapp');
  process.exit(1);
}

const structure = {
  'package.json': JSON.stringify({
    name: appName,
    version: '1.0.0',
    scripts: {
      start: 'node src/index.js',
      dev: 'nodemon src/index.js'
    },
    dependencies: {
      express: '^4.18.2',
      helmet: '^7.1.0',
      compression: '^1.7.4'
    },
    devDependencies: {
      nodemon: '^3.0.1'
    }
  }, null, 2),
  'src/index.js': `const app = require('./app');
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Server on port \${PORT}\`));
`,
  'src/app.js': `const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const routes = require('./routes');

const app = express();

app.use(helmet());
app.use(compression());
app.use(express.json());
app.use('/', routes);

module.exports = app;
`,
  'src/routes/index.js': `const router = require('express').Router();
router.get('/', (req, res) => res.json({ message: 'Hello' }));
module.exports = router;
`,
  '.gitignore': 'node_modules\n.env\n',
  '.env.example': 'PORT=3000\nNODE_ENV=development\n'
};

// Create directories and files
fs.mkdirSync(path.join(appName, 'src', 'routes'), { recursive: true });

for (const [file, content] of Object.entries(structure)) {
  fs.writeFileSync(path.join(appName, file), content);
}

console.log(`Created ${appName}/`);
console.log('Run: cd ' + appName + ' && npm install && npm run dev');
```

## When to Use Express Generator

### Good For:
- Quick prototypes
- Learning Express structure
- Simple applications
- Starting points for customization

### Consider Alternatives For:
- Large production applications (use custom structure)
- API-only services (may want different structure)
- TypeScript projects (use ts-express-decorators, NestJS)
- Microservices (minimal structure preferred)

## Related Topics

- [Production Deployment](../production/README.md)
- [Security Best Practices](../security/README.md)
- [Project Structure Patterns](../project-structure/README.md)
