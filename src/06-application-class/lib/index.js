/**
 * Express-like Application Factory
 *
 * This module exports the createApplication function which returns
 * a new Application instance.
 */

'use strict';

const Application = require('./application');

/**
 * Create a new application
 *
 * @returns {Application}
 */
function createApplication() {
  const app = new Application();
  return app;
}

// Export the factory function
module.exports = createApplication;

// Export Application class for direct use
module.exports.Application = Application;

/**
 * Simple template engine for demo purposes
 *
 * Replaces {{variable}} with values from options.
 *
 * @param {string} filePath - Path to template file
 * @param {Object} options - Variables to inject
 * @param {Function} callback - Callback(err, html)
 */
module.exports.simpleEngine = function(filePath, options, callback) {
  const fs = require('node:fs');

  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) return callback(err);

    // Simple variable replacement: {{variable}}
    const rendered = content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return options[key] !== undefined ? String(options[key]) : '';
    });

    callback(null, rendered);
  });
};
