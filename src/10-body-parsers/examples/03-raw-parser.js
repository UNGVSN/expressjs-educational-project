/**
 * Example 03: Raw Body Parser
 *
 * Demonstrates parsing binary request bodies.
 */

'use strict';

const createApp = require('../lib/index');
const { raw } = require('../lib/index');
const crypto = require('node:crypto');

const app = createApp();

// ============================================
// Configure Raw Parser
// ============================================

// Parse binary data as Buffer
app.use('/upload', raw({
  type: 'application/octet-stream',
  limit: '5mb'
}));

// Parse any content type for webhooks
app.use('/webhook', raw({
  type: '*/*',
  limit: '1mb'
}));

// ============================================
// Routes
// ============================================

/**
 * Binary file upload
 */
app.post('/upload', (req, res) => {
  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).json({ error: 'Expected binary data' });
  }

  const size = req.body.length;
  const hash = crypto.createHash('sha256').update(req.body).digest('hex');

  console.log(`Received ${size} bytes, hash: ${hash.slice(0, 16)}...`);

  res.json({
    message: 'File received',
    size,
    hash,
    contentType: req.headers['content-type'],
    preview: size > 100
      ? req.body.slice(0, 100).toString('hex') + '...'
      : req.body.toString('hex')
  });
});

/**
 * Webhook with signature verification
 */
const WEBHOOK_SECRET = 'my-secret-key';

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-signature'];
  const rawBody = req.body;

  if (!signature) {
    return res.status(401).json({ error: 'Missing signature header' });
  }

  // Verify signature using raw bytes
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.log('Signature mismatch!');
    console.log('Expected:', expectedSignature);
    console.log('Received:', signature);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Parse the verified body
  let payload;
  try {
    payload = JSON.parse(rawBody.toString());
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  console.log('Webhook verified:', payload);

  res.json({
    message: 'Webhook received and verified',
    payload
  });
});

/**
 * Generate a signed webhook payload (for testing)
 */
app.get('/webhook/generate', (req, res) => {
  const payload = {
    event: 'test.event',
    data: {
      id: Date.now(),
      message: 'This is a test webhook'
    },
    timestamp: new Date().toISOString()
  };

  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  res.json({
    body,
    signature,
    curl: `curl -X POST http://localhost:${PORT}/webhook \\
  -H "Content-Type: application/json" \\
  -H "X-Signature: ${signature}" \\
  -d '${body}'`
  });
});

/**
 * Image upload simulation
 */
app.post('/upload/image', (req, res) => {
  const buffer = req.body;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return res.status(400).json({ error: 'No image data received' });
  }

  // Check for common image magic bytes
  let format = 'unknown';
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    format = 'jpeg';
  } else if (buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') {
    format = 'png';
  } else if (buffer.toString('ascii', 0, 4) === 'GIF8') {
    format = 'gif';
  } else if (buffer.toString('ascii', 0, 4) === 'RIFF' &&
             buffer.toString('ascii', 8, 12) === 'WEBP') {
    format = 'webp';
  }

  res.json({
    message: 'Image received',
    size: buffer.length,
    detectedFormat: format,
    contentType: req.headers['content-type']
  });
});

// ============================================
// Error Handling
// ============================================

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'File too large',
      limit: err.limit
    });
  }

  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// Start Server
// ============================================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
===========================================
  Raw Body Parser Example
===========================================

Server running at http://localhost:${PORT}

Test with curl:

  # Upload binary file
  curl -X POST http://localhost:${PORT}/upload \\
    -H "Content-Type: application/octet-stream" \\
    --data-binary @somefile.bin

  # Upload from stdin
  echo "Hello Binary World" | curl -X POST http://localhost:${PORT}/upload \\
    -H "Content-Type: application/octet-stream" \\
    --data-binary @-

  # Generate signed webhook test
  curl http://localhost:${PORT}/webhook/generate

  # Then use the generated curl command to test the webhook

  # Upload image
  curl -X POST http://localhost:${PORT}/upload/image \\
    -H "Content-Type: image/png" \\
    --data-binary @image.png

Press Ctrl+C to stop
===========================================
  `);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});
