/**
 * Simple Template Engine
 *
 * A Mustache-like template engine supporting:
 * - {{variable}} - Escaped output
 * - {{{variable}}} - Unescaped output
 * - {{#if condition}}...{{/if}} - Conditionals
 * - {{#unless condition}}...{{/unless}} - Negative conditionals
 * - {{#each array}}...{{/each}} - Iteration
 * - {{> partial}} - Partials/includes
 * - {{! comment }} - Comments
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
 * Get nested property from object
 * e.g., getProperty(obj, 'user.name') => obj.user.name
 */
function getProperty(obj, propPath) {
  if (!propPath) return obj;

  const parts = propPath.split('.');
  let value = obj;

  for (const part of parts) {
    if (value == null) return undefined;
    value = value[part];
  }

  return value;
}

/**
 * Resolve a value from context
 * Checks current context, then parent contexts
 */
function resolveValue(key, context, rootContext) {
  // Check for 'this' or '.'
  if (key === 'this' || key === '.') {
    return context;
  }

  // Check current context
  let value = getProperty(context, key);
  if (value !== undefined) return value;

  // Check root context
  value = getProperty(rootContext, key);
  if (value !== undefined) return value;

  return undefined;
}

/**
 * Render template string with context
 */
function render(template, context, options = {}) {
  const rootContext = options.rootContext || context;
  const viewsDir = options.views || './views';
  let result = template;

  // Remove comments {{! ... }}
  result = result.replace(/\{\{![\s\S]*?\}\}/g, '');

  // Handle partials {{> partialName}}
  result = result.replace(/\{\{>\s*(\S+)\s*\}\}/g, (_, partialName) => {
    try {
      const partialPath = path.join(viewsDir, partialName);
      const ext = options.ext || '.html';
      const fullPath = partialPath.endsWith(ext) ? partialPath : partialPath + ext;

      if (fs.existsSync(fullPath)) {
        const partialContent = fs.readFileSync(fullPath, 'utf8');
        return render(partialContent, context, { ...options, rootContext });
      }
      return `<!-- Partial not found: ${partialName} -->`;
    } catch (err) {
      return `<!-- Error loading partial: ${err.message} -->`;
    }
  });

  // Handle {{#if condition}}...{{else}}...{{/if}}
  result = result.replace(
    /\{\{#if\s+([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, condition, content) => {
      const value = resolveValue(condition, context, rootContext);
      const isTruthy = Array.isArray(value) ? value.length > 0 : !!value;

      // Check for else block
      const parts = content.split(/\{\{else\}\}/);
      const ifContent = parts[0];
      const elseContent = parts[1] || '';

      return isTruthy
        ? render(ifContent, context, { ...options, rootContext })
        : render(elseContent, context, { ...options, rootContext });
    }
  );

  // Handle {{#unless condition}}...{{/unless}}
  result = result.replace(
    /\{\{#unless\s+([\w.]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
    (_, condition, content) => {
      const value = resolveValue(condition, context, rootContext);
      const isFalsy = Array.isArray(value) ? value.length === 0 : !value;

      return isFalsy
        ? render(content, context, { ...options, rootContext })
        : '';
    }
  );

  // Handle {{#each array}}...{{/each}}
  result = result.replace(
    /\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, arrayName, itemTemplate) => {
      const array = resolveValue(arrayName, context, rootContext);

      if (!Array.isArray(array)) {
        return '';
      }

      return array.map((item, index) => {
        // Create item context with special variables
        const itemContext = typeof item === 'object' && item !== null
          ? { ...item, '@index': index, '@first': index === 0, '@last': index === array.length - 1 }
          : { '.': item, 'this': item, '@index': index, '@first': index === 0, '@last': index === array.length - 1 };

        return render(itemTemplate, itemContext, { ...options, rootContext });
      }).join('');
    }
  );

  // Handle {{{unescaped}}} - triple braces for unescaped output
  result = result.replace(/\{\{\{(\S+?)\}\}\}/g, (_, key) => {
    const value = resolveValue(key.trim(), context, rootContext);
    return value != null ? String(value) : '';
  });

  // Handle {{variable}} - double braces for escaped output
  result = result.replace(/\{\{(\S+?)\}\}/g, (_, key) => {
    const value = resolveValue(key.trim(), context, rootContext);
    return escapeHtml(value);
  });

  return result;
}

/**
 * Create template engine function
 * Compatible with Express's engine signature: (path, options, callback)
 */
function createEngine(engineOptions = {}) {
  return function simpleEngine(filePath, options, callback) {
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) return callback(err);

      try {
        // Merge app.locals and res.locals into context
        const context = { ...options };

        // Get views directory from options or default
        const viewsDir = options.settings?.views || engineOptions.views || path.dirname(filePath);
        const ext = path.extname(filePath);

        const rendered = render(content, context, {
          views: viewsDir,
          ext: ext,
          rootContext: context
        });

        callback(null, rendered);
      } catch (e) {
        callback(e);
      }
    });
  };
}

// Export both the factory and a default instance
module.exports = createEngine();
module.exports.createEngine = createEngine;
module.exports.render = render;
module.exports.escapeHtml = escapeHtml;
