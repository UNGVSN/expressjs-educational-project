/**
 * View Class
 *
 * Handles template resolution and rendering.
 * Responsible for finding templates and invoking the appropriate engine.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * View class for template rendering
 */
class View {
  /**
   * Create a new View
   * @param {string} name - View name (e.g., 'users/profile')
   * @param {object} options - View options
   * @param {string} options.root - Views root directory
   * @param {string} options.defaultEngine - Default template engine extension
   * @param {object} options.engines - Registered template engines
   */
  constructor(name, options = {}) {
    this.name = name;
    this.root = options.root || './views';
    this.defaultEngine = options.defaultEngine;
    this.engines = options.engines || {};

    // Resolve extension
    this.ext = this.resolveExtension(name);

    // Get engine for this extension
    this.engine = this.engines[this.ext];

    // Lookup the view path
    this.path = this.lookup(name);
  }

  /**
   * Resolve the file extension for this view
   * @param {string} name - View name
   * @returns {string} Extension with leading dot
   */
  resolveExtension(name) {
    const ext = path.extname(name);

    // If extension provided, use it
    if (ext) {
      return ext;
    }

    // Use default engine
    if (this.defaultEngine) {
      return this.defaultEngine.startsWith('.')
        ? this.defaultEngine
        : '.' + this.defaultEngine;
    }

    throw new Error('No default engine was specified and no extension was provided');
  }

  /**
   * Lookup the view path
   * @param {string} name - View name
   * @returns {string|null} Full path to view file or null if not found
   */
  lookup(name) {
    // Build potential paths to check
    const roots = Array.isArray(this.root) ? this.root : [this.root];
    const ext = this.ext;

    // Add extension if not present
    const fileName = path.extname(name) ? name : name + ext;

    // Check each root directory
    for (const root of roots) {
      const filePath = path.resolve(root, fileName);

      // Security: ensure path is within root
      const resolvedRoot = path.resolve(root);
      if (!filePath.startsWith(resolvedRoot)) {
        continue;
      }

      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Render the view
   * @param {object} options - Render options (locals + settings)
   * @param {function} callback - Callback(err, html)
   */
  render(options, callback) {
    // Ensure we have a path
    if (!this.path) {
      const err = new Error(`Failed to lookup view "${this.name}" in views directory "${this.root}"`);
      err.view = this;
      return callback(err);
    }

    // Ensure we have an engine
    if (!this.engine) {
      const err = new Error(`No engine was found for extension "${this.ext}". Register one with app.engine('${this.ext.slice(1)}', fn)`);
      err.view = this;
      return callback(err);
    }

    // Call the engine
    try {
      this.engine(this.path, options, callback);
    } catch (err) {
      callback(err);
    }
  }
}

module.exports = View;
