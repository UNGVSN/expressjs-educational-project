/**
 * Example 03: HTTP Methods
 *
 * This example demonstrates RESTful routing with
 * different HTTP methods for CRUD operations.
 *
 * Run: npm run example:methods
 */

'use strict';

const { createApplication } = require('../lib');

const app = createApplication();

// In-memory data store
let items = [
  { id: 1, name: 'Item 1', description: 'First item' },
  { id: 2, name: 'Item 2', description: 'Second item' },
  { id: 3, name: 'Item 3', description: 'Third item' }
];
let nextId = 4;

// Home page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>HTTP Methods & REST</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
    .method { font-weight: bold; padding: 4px 8px; border-radius: 4px; }
    .get { background: #61affe; color: white; }
    .post { background: #49cc90; color: white; }
    .put { background: #fca130; color: white; }
    .patch { background: #50e3c2; color: white; }
    .delete { background: #f93e3e; color: white; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>RESTful Routing with HTTP Methods</h1>

  <table>
    <tr>
      <th>Method</th>
      <th>Path</th>
      <th>Action</th>
      <th>Test Command</th>
    </tr>
    <tr>
      <td><span class="method get">GET</span></td>
      <td><a href="/items">/items</a></td>
      <td>List all items</td>
      <td><code>curl http://localhost:3000/items</code></td>
    </tr>
    <tr>
      <td><span class="method get">GET</span></td>
      <td><a href="/items/1">/items/:id</a></td>
      <td>Get single item</td>
      <td><code>curl http://localhost:3000/items/1</code></td>
    </tr>
    <tr>
      <td><span class="method post">POST</span></td>
      <td>/items</td>
      <td>Create item</td>
      <td><code>curl -X POST http://localhost:3000/items</code></td>
    </tr>
    <tr>
      <td><span class="method put">PUT</span></td>
      <td>/items/:id</td>
      <td>Replace item</td>
      <td><code>curl -X PUT http://localhost:3000/items/1</code></td>
    </tr>
    <tr>
      <td><span class="method patch">PATCH</span></td>
      <td>/items/:id</td>
      <td>Update item</td>
      <td><code>curl -X PATCH http://localhost:3000/items/1</code></td>
    </tr>
    <tr>
      <td><span class="method delete">DELETE</span></td>
      <td>/items/:id</td>
      <td>Delete item</td>
      <td><code>curl -X DELETE http://localhost:3000/items/1</code></td>
    </tr>
  </table>

  <h2>REST Conventions</h2>
  <ul>
    <li><strong>GET</strong> - Read (safe, idempotent)</li>
    <li><strong>POST</strong> - Create (not idempotent)</li>
    <li><strong>PUT</strong> - Replace entire resource (idempotent)</li>
    <li><strong>PATCH</strong> - Partial update (may not be idempotent)</li>
    <li><strong>DELETE</strong> - Remove (idempotent)</li>
  </ul>

  <h2>Using app.route()</h2>
  <pre><code>// Chain handlers for same path
app.route('/items')
  .get(listItems)
  .post(createItem);

app.route('/items/:id')
  .get(getItem)
  .put(replaceItem)
  .patch(updateItem)
  .delete(deleteItem);</code></pre>
</body>
</html>
  `);
});

// Using app.route() for cleaner code
app.route('/items')
  // GET /items - List all
  .get((req, res) => {
    res.json({
      count: items.length,
      items: items
    });
  })
  // POST /items - Create
  .post((req, res) => {
    const newItem = {
      id: nextId++,
      name: `Item ${nextId - 1}`,
      description: 'New item (body parsing in Step 10)'
    };
    items.push(newItem);

    res.status(201).json({
      message: 'Item created',
      item: newItem
    });
  });

app.route('/items/:id')
  // GET /items/:id - Read one
  .get((req, res) => {
    const id = parseInt(req.params.id);
    const item = items.find(i => i.id === id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  })
  // PUT /items/:id - Replace
  .put((req, res) => {
    const id = parseInt(req.params.id);
    const index = items.findIndex(i => i.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }

    items[index] = {
      id: id,
      name: `Updated Item ${id}`,
      description: 'Replaced via PUT'
    };

    res.json({
      message: 'Item replaced',
      item: items[index]
    });
  })
  // PATCH /items/:id - Update
  .patch((req, res) => {
    const id = parseInt(req.params.id);
    const item = items.find(i => i.id === id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    item.description = 'Patched via PATCH';

    res.json({
      message: 'Item updated',
      item: item
    });
  })
  // DELETE /items/:id - Remove
  .delete((req, res) => {
    const id = parseInt(req.params.id);
    const index = items.findIndex(i => i.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const deleted = items.splice(index, 1)[0];

    res.json({
      message: 'Item deleted',
      item: deleted
    });
  });

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           HTTP Methods Example (RESTful)                           ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   CRUD Operations:                                                ║
║                                                                   ║
║   List all:   curl http://localhost:${PORT}/items                   ║
║   Get one:    curl http://localhost:${PORT}/items/1                 ║
║   Create:     curl -X POST http://localhost:${PORT}/items           ║
║   Replace:    curl -X PUT http://localhost:${PORT}/items/1          ║
║   Update:     curl -X PATCH http://localhost:${PORT}/items/1        ║
║   Delete:     curl -X DELETE http://localhost:${PORT}/items/1       ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
