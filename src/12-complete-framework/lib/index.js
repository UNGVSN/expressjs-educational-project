/**
 * Mini-Express Framework
 *
 * A complete Express-like web framework built from scratch.
 *
 * Usage:
 *   const express = require('./lib');
 *   const app = express();
 *
 *   app.get('/', (req, res) => {
 *     res.send('Hello World!');
 *   });
 *
 *   app.listen(3000);
 */

'use strict';

const Application = require('./application');
const Router = require('./router');

/**
 * Create a new Express application
 *
 * @returns {Application} Express application
 */
function createApplication() {
  const app = new Application();
  return app;
}

// Export the factory function
module.exports = createApplication;

// Export built-in middleware on the factory function
module.exports.json = Application.json;
module.exports.urlencoded = Application.urlencoded;
module.exports.raw = Application.raw;
module.exports.text = Application.text;
module.exports.static = Application.static;
module.exports.cookieParser = Application.cookieParser;
module.exports.session = Application.session;
module.exports.MemoryStore = Application.MemoryStore;

// Export Router factory (function that returns new Router instance)
const RouterFactory = function(options) {
  return new Router(options);
};

// Copy Router static methods to factory
Object.setPrototypeOf(RouterFactory, Router);

module.exports.Router = RouterFactory;

// Export classes for advanced usage
module.exports.Application = Application;
module.exports.RouterClass = Router;

// Version
module.exports.version = '1.0.0';
