/**
 * View Class
 *
 * The View class represents a template that can be rendered.
 * It handles view resolution, engine lookup, and rendering.
 */

'use strict';

const path = require('node:path');
const fs = require('node:fs');

/**
 * View class
 */
class View {
  /**
   * Create a new View
   *
   * @param {string} name - View name
   * @param {Object} options - View options
   * @param {string} [options.defaultEngine] - Default engine extension
   * @param {string} [options.root] - Views directory
   * @param {Object} [options.engines] - Registered engines
   */
  constructor(name, options = {}) {
    this.name = name;
    this.root = options.root || './views';
    this.defaultEngine = options.defaultEngine;
    this.engines = options.engines || {};

    // Determine extension
    const ext = path.extname(name);
    if (!ext && !this.defaultEngine) {
      throw new Error('No default engine was specified and no extension was provided.');
    }

    let fileName = name;
    if (!ext) {
      // Add default extension
      this.ext = '.' + this.defaultEngine.replace(/^\./, '');
      fileName += this.ext;
    } else {
      this.ext = ext;
    }

    // Get the engine
    this.engine = this.engines[this.ext];
    if (!this.engine) {
      throw new Error(`No engine was found for extension "${this.ext}"`);
    }

    // Resolve the path
    this.path = this.lookup(fileName);
  }

  /**
   * Look up the view path
   *
   * @param {string} name - View name with extension
   * @returns {string|undefined} Resolved path
   */
  lookup(name) {
    let filePath;

    // If name is absolute, use directly
    if (path.isAbsolute(name)) {
      filePath = name;
    } else {
      // Resolve relative to root
      filePath = path.resolve(this.root, name);
    }

    // Check if file exists
    if (fs.existsSync(filePath)) {
      return filePath;
    }

    // Try without extension in subdirectories
    // e.g., 'users/profile' -> 'views/users/profile.html'
    return undefined;
  }

  /**
   * Render the view
   *
   * @param {Object} options - Render options (locals)
   * @param {Function} callback - Callback function(err, html)
   */
  render(options, callback) {
    if (!this.path) {
      return callback(new Error(`Failed to lookup view "${this.name}" in views directory "${this.root}"`));
    }

    try {
      this.engine(this.path, options, callback);
    } catch (err) {
      callback(err);
    }
  }
}

module.exports = View;
