/**
 * Example 04: Text Body Parser
 *
 * Demonstrates parsing plain text request bodies.
 */

'use strict';

const createApp = require('../lib/index');
const { text, json } = require('../lib/index');

const app = createApp();

// ============================================
// Configure Text Parser
// ============================================

// Parse plain text
app.use('/text', text({
  type: 'text/plain',
  limit: '100kb'
}));

// Parse all text types
app.use('/markup', text({
  type: 'text/*',
  limit: '1mb'
}));

// Parse XML as text
app.use('/xml', text({
  type: ['text/xml', 'application/xml'],
  limit: '1mb'
}));

// JSON for other routes
app.use(json());

// ============================================
// Routes
// ============================================

/**
 * Plain text endpoint
 */
app.post('/text', (req, res) => {
  const content = req.body;

  res.json({
    message: 'Text received',
    length: content.length,
    lines: content.split('\n').length,
    words: content.split(/\s+/).filter(Boolean).length,
    preview: content.slice(0, 200) + (content.length > 200 ? '...' : '')
  });
});

/**
 * Multi-line text processing
 */
app.post('/text/lines', (req, res) => {
  const content = req.body;
  const lines = content.split('\n');

  res.json({
    totalLines: lines.length,
    emptyLines: lines.filter(l => l.trim() === '').length,
    nonEmptyLines: lines.filter(l => l.trim() !== '').length,
    longestLine: Math.max(...lines.map(l => l.length)),
    lines: lines.slice(0, 10) // First 10 lines
  });
});

/**
 * CSV-like text processing
 */
app.post('/text/csv', (req, res) => {
  const content = req.body;
  const lines = content.trim().split('\n');

  if (lines.length === 0) {
    return res.status(400).json({ error: 'Empty content' });
  }

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim());

  // Parse rows
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    return row;
  });

  res.json({
    headers,
    rowCount: rows.length,
    data: rows
  });
});

/**
 * Markup endpoint (HTML, XML, etc.)
 */
app.post('/markup', (req, res) => {
  const content = req.body;
  const contentType = req.headers['content-type'];

  // Simple tag counting
  const tags = content.match(/<[^>]+>/g) || [];
  const uniqueTags = [...new Set(tags.map(t => t.match(/<\/?(\w+)/)?.[1]).filter(Boolean))];

  res.json({
    message: 'Markup received',
    contentType,
    length: content.length,
    tagCount: tags.length,
    uniqueTags,
    preview: content.slice(0, 500)
  });
});

/**
 * XML parsing (as text first, then process)
 */
app.post('/xml', (req, res) => {
  const content = req.body;

  // Very basic XML element extraction
  const elements = [];
  const regex = /<(\w+)[^>]*>(.*?)<\/\1>/gs;
  let match;

  while ((match = regex.exec(content)) !== null) {
    elements.push({
      tag: match[1],
      content: match[2].trim().slice(0, 100)
    });
    if (elements.length >= 10) break;
  }

  res.json({
    message: 'XML received',
    length: content.length,
    elements,
    raw: content.slice(0, 500)
  });
});

/**
 * Log ingestion endpoint
 */
app.post('/logs', (req, res) => {
  const content = req.body;
  const lines = content.trim().split('\n');

  // Parse log lines (assuming simple format)
  const parsed = lines.map(line => {
    const match = line.match(/^\[(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[^\]]*)\]\s*(\w+):\s*(.*)$/);
    if (match) {
      return {
        timestamp: match[1],
        level: match[2],
        message: match[3]
      };
    }
    return { raw: line };
  });

  const levels = {};
  parsed.forEach(p => {
    if (p.level) {
      levels[p.level] = (levels[p.level] || 0) + 1;
    }
  });

  res.json({
    totalLines: lines.length,
    parsedCount: parsed.filter(p => p.level).length,
    unparsedCount: parsed.filter(p => !p.level).length,
    levelCounts: levels,
    sample: parsed.slice(0, 5)
  });
});

/**
 * Markdown processing
 */
app.post('/markdown', (req, res) => {
  const content = req.body;

  // Extract markdown elements
  const headers = content.match(/^#+\s+.+$/gm) || [];
  const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
  const bulletPoints = content.match(/^[\s]*[-*+]\s+.+$/gm) || [];

  res.json({
    message: 'Markdown received',
    stats: {
      length: content.length,
      headers: headers.length,
      links: links.length,
      codeBlocks: codeBlocks.length,
      bulletPoints: bulletPoints.length
    },
    headings: headers.map(h => h.replace(/^#+\s+/, '')),
    preview: content.slice(0, 500)
  });
});

// ============================================
// Error Handling
// ============================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    error: err.message
  });
});

// ============================================
// Start Server
// ============================================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
===========================================
  Text Body Parser Example
===========================================

Server running at http://localhost:${PORT}

Test with curl:

  # Plain text
  curl -X POST http://localhost:${PORT}/text \\
    -H "Content-Type: text/plain" \\
    -d "Hello, this is plain text content.
        It can span multiple lines."

  # Line analysis
  echo -e "Line 1\\nLine 2\\nLine 3\\n\\nLine 5" | \\
  curl -X POST http://localhost:${PORT}/text/lines \\
    -H "Content-Type: text/plain" \\
    --data-binary @-

  # CSV data
  curl -X POST http://localhost:${PORT}/text/csv \\
    -H "Content-Type: text/plain" \\
    -d "name,age,city
John,30,NYC
Jane,25,LA
Bob,35,Chicago"

  # HTML markup
  curl -X POST http://localhost:${PORT}/markup \\
    -H "Content-Type: text/html" \\
    -d "<html><body><h1>Hello</h1><p>World</p></body></html>"

  # XML data
  curl -X POST http://localhost:${PORT}/xml \\
    -H "Content-Type: application/xml" \\
    -d "<?xml version='1.0'?>
<root>
  <item id='1'>First</item>
  <item id='2'>Second</item>
</root>"

  # Log ingestion
  curl -X POST http://localhost:${PORT}/logs \\
    -H "Content-Type: text/plain" \\
    -d "[2024-01-15 10:30:00] INFO: Server started
[2024-01-15 10:30:01] DEBUG: Loading config
[2024-01-15 10:30:02] ERROR: Connection failed
[2024-01-15 10:30:03] INFO: Retrying..."

  # Markdown
  curl -X POST http://localhost:${PORT}/markdown \\
    -H "Content-Type: text/plain" \\
    -d "# Title

## Subtitle

- Item 1
- Item 2

[Link](http://example.com)

\\\`\\\`\\\`js
const x = 1;
\\\`\\\`\\\`"

Press Ctrl+C to stop
===========================================
  `);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});
