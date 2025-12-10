/**
 * Example 07: Streaming Responses
 *
 * HTTP responses can be streamed, sending data as it becomes available.
 * This is how Express handles large files and real-time data.
 *
 * Run: npm run example:streaming
 * Test: curl http://localhost:3000/stream
 */

'use strict';

const { createServer, parseUrl, sendJson, sendHtml } = require('../lib');
const fs = require('fs');
const path = require('path');

const server = createServer((req, res) => {
  const { path: urlPath } = parseUrl(req);

  console.log(`${req.method} ${urlPath}`);

  switch (urlPath) {
    case '/':
      sendHtml(res, `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Streaming Demo</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
    }
    .endpoint { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Streaming Responses Demo</h1>

  <div class="endpoint">
    <h3><a href="/stream">/stream</a></h3>
    <p>Streams data in chunks with delays (watch it arrive piece by piece)</p>
    <code>curl http://localhost:3000/stream</code>
  </div>

  <div class="endpoint">
    <h3><a href="/sse">/sse</a></h3>
    <p>Server-Sent Events (SSE) - real-time updates</p>
    <code>curl http://localhost:3000/sse</code>
  </div>

  <div class="endpoint">
    <h3><a href="/chunked">/chunked</a></h3>
    <p>Chunked transfer encoding demonstration</p>
    <code>curl http://localhost:3000/chunked</code>
  </div>

  <div class="endpoint">
    <h3><a href="/large">/large</a></h3>
    <p>Streams a large amount of data</p>
    <code>curl http://localhost:3000/large | head -100</code>
  </div>

  <div class="endpoint">
    <h3>/file (if a file exists)</h3>
    <p>Streams a file from disk</p>
    <code>curl http://localhost:3000/file</code>
  </div>
</body>
</html>
      `);
      break;

    case '/stream':
      // Basic streaming - send data in chunks with delays
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked'
      });

      const messages = [
        'Starting stream...\n',
        'Sending chunk 1...\n',
        'Sending chunk 2...\n',
        'Sending chunk 3...\n',
        'Processing data...\n',
        'Almost done...\n',
        'Stream complete!\n'
      ];

      let index = 0;

      const sendChunk = () => {
        if (index < messages.length) {
          res.write(messages[index]);
          index++;
          setTimeout(sendChunk, 500); // 500ms delay between chunks
        } else {
          res.end();
        }
      };

      sendChunk();
      break;

    case '/sse':
      // Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      // Send initial connection message
      res.write('event: connected\n');
      res.write('data: {"status":"connected"}\n\n');

      let count = 0;
      const maxEvents = 10;

      const sendEvent = () => {
        if (count < maxEvents) {
          count++;
          res.write(`event: message\n`);
          res.write(`data: ${JSON.stringify({
            count,
            timestamp: new Date().toISOString(),
            message: `Event ${count} of ${maxEvents}`
          })}\n\n`);

          setTimeout(sendEvent, 1000);
        } else {
          res.write('event: complete\n');
          res.write('data: {"status":"complete"}\n\n');
          res.end();
        }
      };

      // Start sending events after a short delay
      setTimeout(sendEvent, 100);

      // Handle client disconnect
      req.on('close', () => {
        console.log('SSE client disconnected');
      });
      break;

    case '/chunked':
      // Explicit chunked transfer encoding
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked'
      });

      // Start JSON array
      res.write('[\n');

      let itemCount = 0;
      const totalItems = 5;

      const sendItem = () => {
        if (itemCount < totalItems) {
          const item = JSON.stringify({
            id: itemCount + 1,
            data: `Item ${itemCount + 1}`,
            timestamp: Date.now()
          });

          // Add comma for all but first item
          if (itemCount > 0) {
            res.write(',\n');
          }
          res.write('  ' + item);

          itemCount++;
          setTimeout(sendItem, 300);
        } else {
          res.write('\n]\n');
          res.end();
        }
      };

      setTimeout(sendItem, 100);
      break;

    case '/large':
      // Stream a large amount of data
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked'
      });

      let lineNum = 0;
      const totalLines = 1000;

      const sendLine = () => {
        // Send multiple lines at once for efficiency
        const batch = [];
        const batchSize = 50;

        for (let i = 0; i < batchSize && lineNum < totalLines; i++) {
          lineNum++;
          batch.push(`Line ${lineNum}: ${'x'.repeat(80)}`);
        }

        if (batch.length > 0) {
          res.write(batch.join('\n') + '\n');
        }

        if (lineNum < totalLines) {
          // Use setImmediate to not block event loop
          setImmediate(sendLine);
        } else {
          res.write(`\n--- End of ${totalLines} lines ---\n`);
          res.end();
        }
      };

      sendLine();
      break;

    case '/file':
      // Stream a file from disk
      const filePath = path.join(__dirname, '..', 'README.md');

      fs.stat(filePath, (err, stats) => {
        if (err) {
          sendJson(res, { error: 'File not found' }, 404);
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Length': stats.size
        });

        const readStream = fs.createReadStream(filePath);

        readStream.on('error', (streamErr) => {
          console.error('Stream error:', streamErr);
          res.end();
        });

        // Pipe file contents to response
        readStream.pipe(res);
      });
      break;

    case '/progress':
      // Simulated progress updates
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked'
      });

      let progress = 0;

      const updateProgress = () => {
        progress += 10;

        const bar = '█'.repeat(progress / 10) + '░'.repeat(10 - progress / 10);
        res.write(`\rProgress: [${bar}] ${progress}%`);

        if (progress < 100) {
          setTimeout(updateProgress, 200);
        } else {
          res.write('\nComplete!\n');
          res.end();
        }
      };

      res.write('Starting operation...\n');
      setTimeout(updateProgress, 500);
      break;

    default:
      sendJson(res, { error: 'Not found', path: urlPath }, 404);
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           Streaming Responses Example                              ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   Try these endpoints:                                            ║
║                                                                   ║
║   Basic streaming (watch chunks arrive):                          ║
║   curl http://localhost:${PORT}/stream                              ║
║                                                                   ║
║   Server-Sent Events:                                             ║
║   curl http://localhost:${PORT}/sse                                 ║
║                                                                   ║
║   Chunked JSON array:                                             ║
║   curl http://localhost:${PORT}/chunked                             ║
║                                                                   ║
║   Large data stream:                                              ║
║   curl http://localhost:${PORT}/large | head -20                    ║
║                                                                   ║
║   File streaming:                                                 ║
║   curl http://localhost:${PORT}/file                                ║
║                                                                   ║
║   Progress updates:                                               ║
║   curl http://localhost:${PORT}/progress                            ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});

// Handle cleanup on shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => {
    process.exit(0);
  });
});
