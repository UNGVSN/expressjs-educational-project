/**
 * Template Engine Tests
 */

'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const simpleEngine = require('../lib/engines/simple');
const ejsLite = require('../lib/engines/ejs-lite');

const viewsDir = path.join(__dirname, 'engine-views');

describe('Simple Engine', () => {
  before(() => {
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.mkdirSync(path.join(viewsDir, 'partials'), { recursive: true });

    fs.writeFileSync(path.join(viewsDir, 'simple.html'), '<h1>{{title}}</h1>');
    fs.writeFileSync(path.join(viewsDir, 'escaped.html'), '<p>{{content}}</p>');
    fs.writeFileSync(path.join(viewsDir, 'unescaped.html'), '<p>{{{content}}}</p>');
    fs.writeFileSync(path.join(viewsDir, 'conditional.html'), '{{#if show}}Visible{{/if}}');
    fs.writeFileSync(path.join(viewsDir, 'loop.html'), '{{#each items}}<li>{{name}}</li>{{/each}}');
    fs.writeFileSync(path.join(viewsDir, 'partials', 'header.html'), '<header>{{title}}</header>');
    fs.writeFileSync(path.join(viewsDir, 'with-partial.html'), '{{> partials/header}}<main>Content</main>');
  });

  after(() => {
    fs.rmSync(viewsDir, { recursive: true });
  });

  describe('variable substitution', () => {
    it('should replace {{variable}} with value', (_, done) => {
      simpleEngine(
        path.join(viewsDir, 'simple.html'),
        { title: 'Hello World' },
        (err, html) => {
          assert.strictEqual(err, null);
          assert.strictEqual(html, '<h1>Hello World</h1>');
          done();
        }
      );
    });

    it('should escape HTML in {{variable}}', (_, done) => {
      simpleEngine(
        path.join(viewsDir, 'escaped.html'),
        { content: '<script>alert("xss")</script>' },
        (err, html) => {
          assert.strictEqual(err, null);
          assert.ok(html.includes('&lt;script&gt;'));
          assert.ok(!html.includes('<script>'));
          done();
        }
      );
    });

    it('should not escape {{{variable}}}', (_, done) => {
      simpleEngine(
        path.join(viewsDir, 'unescaped.html'),
        { content: '<strong>Bold</strong>' },
        (err, html) => {
          assert.strictEqual(err, null);
          assert.strictEqual(html, '<p><strong>Bold</strong></p>');
          done();
        }
      );
    });
  });

  describe('conditionals', () => {
    it('should render content when condition is truthy', (_, done) => {
      simpleEngine(
        path.join(viewsDir, 'conditional.html'),
        { show: true },
        (err, html) => {
          assert.strictEqual(err, null);
          assert.strictEqual(html, 'Visible');
          done();
        }
      );
    });

    it('should not render content when condition is falsy', (_, done) => {
      simpleEngine(
        path.join(viewsDir, 'conditional.html'),
        { show: false },
        (err, html) => {
          assert.strictEqual(err, null);
          assert.strictEqual(html, '');
          done();
        }
      );
    });
  });

  describe('loops', () => {
    it('should iterate over arrays', (_, done) => {
      simpleEngine(
        path.join(viewsDir, 'loop.html'),
        { items: [{ name: 'One' }, { name: 'Two' }] },
        (err, html) => {
          assert.strictEqual(err, null);
          assert.strictEqual(html, '<li>One</li><li>Two</li>');
          done();
        }
      );
    });

    it('should handle empty arrays', (_, done) => {
      simpleEngine(
        path.join(viewsDir, 'loop.html'),
        { items: [] },
        (err, html) => {
          assert.strictEqual(err, null);
          assert.strictEqual(html, '');
          done();
        }
      );
    });
  });

  describe('partials', () => {
    it('should include partials', (_, done) => {
      simpleEngine(
        path.join(viewsDir, 'with-partial.html'),
        { title: 'Site Title', settings: { views: viewsDir } },
        (err, html) => {
          assert.strictEqual(err, null);
          assert.ok(html.includes('<header>Site Title</header>'));
          assert.ok(html.includes('<main>Content</main>'));
          done();
        }
      );
    });
  });
});

describe('EJS-Lite Engine', () => {
  before(() => {
    // Ensure directory exists
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(path.join(viewsDir, 'ejs-simple.ejs'), '<h1><%= title %></h1>');
    fs.writeFileSync(path.join(viewsDir, 'ejs-escaped.ejs'), '<p><%= content %></p>');
    fs.writeFileSync(path.join(viewsDir, 'ejs-unescaped.ejs'), '<p><%- content %></p>');
    fs.writeFileSync(path.join(viewsDir, 'ejs-code.ejs'), '<% if (show) { %>Visible<% } %>');
    fs.writeFileSync(path.join(viewsDir, 'ejs-loop.ejs'), '<% for (const item of items) { %><li><%= item.name %></li><% } %>');
  });

  describe('variable output', () => {
    it('should output <%= expression %> escaped', (_, done) => {
      ejsLite.renderFile(
        path.join(viewsDir, 'ejs-escaped.ejs'),
        { content: '<script>xss</script>' },
        (err, html) => {
          assert.strictEqual(err, null);
          assert.ok(html.includes('&lt;script&gt;'));
          done();
        }
      );
    });

    it('should output <%- expression %> unescaped', (_, done) => {
      ejsLite.renderFile(
        path.join(viewsDir, 'ejs-unescaped.ejs'),
        { content: '<strong>Bold</strong>' },
        (err, html) => {
          assert.strictEqual(err, null);
          assert.strictEqual(html, '<p><strong>Bold</strong></p>');
          done();
        }
      );
    });
  });

  describe('code execution', () => {
    it('should execute <% code %>', (_, done) => {
      ejsLite.renderFile(
        path.join(viewsDir, 'ejs-code.ejs'),
        { show: true },
        (err, html) => {
          assert.strictEqual(err, null);
          assert.strictEqual(html, 'Visible');
          done();
        }
      );
    });

    it('should handle loops', (_, done) => {
      ejsLite.renderFile(
        path.join(viewsDir, 'ejs-loop.ejs'),
        { items: [{ name: 'A' }, { name: 'B' }] },
        (err, html) => {
          assert.strictEqual(err, null);
          assert.strictEqual(html, '<li>A</li><li>B</li>');
          done();
        }
      );
    });
  });
});
