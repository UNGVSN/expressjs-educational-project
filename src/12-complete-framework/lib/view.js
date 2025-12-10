/**
 * View - Template engine support
 *
 * Handles view resolution and rendering.
 */

'use strict';

const fs = require('fs');
const path = require('path');

class View {
  /**
   * Create a view
   *
   * @param {string} name - View name
   * @param {Object} options - View options
   */
  constructor(name, options = {}) {
    this.name = name;
    this.root = options.root;
    this.ext = options.ext || '.html';
    this.engine = options.engine;

    // Resolve the path
    this.path = this.lookup(name);
  }

  /**
   * Look up the view path
   *
   * @param {string} name - View name
   * @returns {string} Resolved path
   */
  lookup(name) {
    let viewPath = name;

    // Add extension if not present
    if (!path.extname(viewPath)) {
      viewPath += this.ext;
    }

    // Resolve against root
    if (this.root) {
      viewPath = path.resolve(this.root, viewPath);
    }

    // Check if file exists
    if (fs.existsSync(viewPath)) {
      return viewPath;
    }

    return null;
  }

  /**
   * Render the view
   *
   * @param {Object} options - Render options
   * @param {Function} callback - Callback(err, html)
   */
  render(options, callback) {
    if (!this.path) {
      return callback(new Error(`View "${this.name}" not found`));
    }

    fs.readFile(this.path, 'utf8', (err, template) => {
      if (err) {
        return callback(err);
      }

      try {
        const html = this.engine(template, options);
        callback(null, html);
      } catch (e) {
        callback(e);
      }
    });
  }
}

/**
 * Simple EJS-like template engine
 *
 * Supports:
 * - <%= expr %> - Escaped output
 * - <%- expr %> - Unescaped output
 * - <% code %> - JavaScript code
 */
function simpleEngine(template, data) {
  // Create function body
  let code = 'var __output = "";\n';
  code += 'with(__data) {\n';

  // Regex for template tags
  const regex = /<%([=-]?)([\s\S]*?)%>/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(template)) !== null) {
    // Add literal text before this match
    const literal = template.slice(lastIndex, match.index);
    if (literal) {
      code += `__output += ${JSON.stringify(literal)};\n`;
    }

    const type = match[1];
    const content = match[2].trim();

    if (type === '=') {
      // Escaped output
      code += `__output += __escape(${content});\n`;
    } else if (type === '-') {
      // Unescaped output
      code += `__output += (${content});\n`;
    } else {
      // JavaScript code
      code += content + '\n';
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining literal text
  const remaining = template.slice(lastIndex);
  if (remaining) {
    code += `__output += ${JSON.stringify(remaining)};\n`;
  }

  code += '}\n';
  code += 'return __output;';

  // Escape function
  const escape = (str) => {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // Create and execute function
  try {
    const fn = new Function('__data', '__escape', code);
    return fn(data, escape);
  } catch (err) {
    throw new Error(`Template compilation error: ${err.message}`);
  }
}

module.exports = {
  View,
  simpleEngine
};
