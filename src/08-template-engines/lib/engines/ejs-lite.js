/**
 * EJS-Lite Template Engine
 *
 * A lightweight EJS-like template engine supporting:
 * - <%= expression %> - Escaped output
 * - <%- expression %> - Unescaped output
 * - <% code %> - JavaScript execution
 * - <%# comment %> - Comments
 * - <%_ ... _%> - Whitespace trimming
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Escape HTML entities
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Compile template to function
 */
function compile(template, options = {}) {
  const filename = options.filename || 'template';

  // Build function body
  let code = `
    let __output = "";
    const __escape = ${escapeHtml.toString()};
  `;

  // Add all options as local variables
  code += `
    const __locals = __options;
    with (__locals) {
  `;

  let cursor = 0;
  // Match all EJS tags
  const regex = /<%([#_=-]?)([\s\S]*?)([_-])?%>/g;
  let match;

  while ((match = regex.exec(template)) !== null) {
    // Add text before the tag
    const text = template.slice(cursor, match.index);
    if (text) {
      // Handle whitespace trimming from previous tag
      const trimmedText = match[1] === '_' ? text.trimStart() : text;
      code += `__output += ${JSON.stringify(trimmedText)};\n`;
    }

    const modifier = match[1];
    const content = match[2];
    const endModifier = match[3];

    switch (modifier) {
      case '#':
        // Comment - ignore
        break;

      case '=':
        // Escaped output
        code += `__output += __escape(${content.trim()});\n`;
        break;

      case '-':
        // Unescaped output
        code += `__output += (${content.trim()});\n`;
        break;

      case '_':
        // Whitespace slurp + code
        code += content + '\n';
        break;

      default:
        // Plain code execution
        code += content + '\n';
        break;
    }

    cursor = match.index + match[0].length;

    // Handle end whitespace trimming
    if (endModifier === '_') {
      // Trim whitespace from start of next text
      const remaining = template.slice(cursor);
      const trimmed = remaining.replace(/^[ \t]*\n?/, '');
      cursor += remaining.length - trimmed.length;
    }
  }

  // Add remaining text
  const remaining = template.slice(cursor);
  if (remaining) {
    code += `__output += ${JSON.stringify(remaining)};\n`;
  }

  code += `
    }
    return __output;
  `;

  // Create and return function
  try {
    return new Function('__options', code);
  } catch (err) {
    err.message = `Error compiling template (${filename}): ${err.message}`;
    throw err;
  }
}

/**
 * Render template string with data
 */
function renderString(template, data, options = {}) {
  const fn = compile(template, options);
  return fn(data);
}

/**
 * Render template file
 */
function renderFile(filePath, options, callback) {
  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) return callback(err);

    try {
      const rendered = renderString(content, options, {
        filename: filePath
      });
      callback(null, rendered);
    } catch (e) {
      callback(e);
    }
  });
}

/**
 * Include helper for templates
 */
function include(filePath, data, options = {}) {
  const viewsDir = options.views || './views';
  const ext = options.ext || '.ejs';

  let fullPath = filePath;
  if (!path.isAbsolute(filePath)) {
    fullPath = path.join(viewsDir, filePath);
  }
  if (!path.extname(fullPath)) {
    fullPath += ext;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  return renderString(content, data, { filename: fullPath, ...options });
}

/**
 * Create template engine for Express
 */
function createEngine(engineOptions = {}) {
  return function ejsLiteEngine(filePath, options, callback) {
    // Add include helper to options
    const viewsDir = options.settings?.views || engineOptions.views || path.dirname(filePath);
    const enhancedOptions = {
      ...options,
      include: (partial, data = {}) => {
        return include(partial, { ...options, ...data }, { views: viewsDir });
      }
    };

    renderFile(filePath, enhancedOptions, callback);
  };
}

// Export
module.exports = renderFile;
module.exports.renderFile = renderFile;
module.exports.render = renderString;
module.exports.compile = compile;
module.exports.createEngine = createEngine;
module.exports.escapeHtml = escapeHtml;
