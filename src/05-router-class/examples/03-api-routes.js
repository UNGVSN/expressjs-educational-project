/**
 * Example 03: API Routes Organization
 *
 * Demonstrates organizing a REST API using routers.
 * This shows a common pattern used in production Express apps.
 *
 * Run: npm run example:api
 */

'use strict';

const createApp = require('../lib');
const Router = require('../lib/router');

const app = createApp();

// ============================================
// DATABASE SIMULATION
// ============================================

const database = {
  products: [
    { id: 1, name: 'Laptop', price: 999.99, category: 'electronics' },
    { id: 2, name: 'Headphones', price: 149.99, category: 'electronics' },
    { id: 3, name: 'Coffee Mug', price: 12.99, category: 'kitchen' },
    { id: 4, name: 'Notebook', price: 5.99, category: 'office' }
  ],
  orders: [
    { id: 1, productId: 1, quantity: 1, status: 'shipped' },
    { id: 2, productId: 3, quantity: 2, status: 'pending' }
  ]
};

// ============================================
// PRODUCTS ROUTER
// ============================================

function createProductsRouter() {
  const router = new Router();

  // GET /products - List all products
  router.get('/', (req, res) => {
    let products = [...database.products];

    // Filter by category
    if (req.query.category) {
      products = products.filter(p => p.category === req.query.category);
    }

    // Filter by price range
    if (req.query.maxPrice) {
      products = products.filter(p => p.price <= parseFloat(req.query.maxPrice));
    }

    res.json({
      count: products.length,
      products
    });
  });

  // GET /products/:id - Get single product
  router.get('/:id', (req, res) => {
    const product = database.products.find(p => p.id === parseInt(req.params.id));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ product });
  });

  // POST /products - Create product
  router.post('/', (req, res) => {
    const newProduct = {
      id: database.products.length + 1,
      name: 'New Product',
      price: 0,
      category: 'uncategorized'
    };
    database.products.push(newProduct);
    res.status(201).json({
      message: 'Product created',
      product: newProduct
    });
  });

  // PUT /products/:id - Update product
  router.put('/:id', (req, res) => {
    const product = database.products.find(p => p.id === parseInt(req.params.id));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    product.name = 'Updated Product';
    res.json({
      message: 'Product updated',
      product
    });
  });

  // DELETE /products/:id - Delete product
  router.delete('/:id', (req, res) => {
    const index = database.products.findIndex(p => p.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const deleted = database.products.splice(index, 1)[0];
    res.json({
      message: 'Product deleted',
      product: deleted
    });
  });

  return router;
}

// ============================================
// ORDERS ROUTER
// ============================================

function createOrdersRouter() {
  const router = new Router();

  // GET /orders - List all orders
  router.get('/', (req, res) => {
    const orders = database.orders.map(order => {
      const product = database.products.find(p => p.id === order.productId);
      return {
        ...order,
        product: product ? product.name : 'Unknown'
      };
    });
    res.json({ orders });
  });

  // GET /orders/:id - Get single order
  router.get('/:id', (req, res) => {
    const order = database.orders.find(o => o.id === parseInt(req.params.id));
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const product = database.products.find(p => p.id === order.productId);
    res.json({
      order: {
        ...order,
        product
      }
    });
  });

  // POST /orders - Create order
  router.post('/', (req, res) => {
    const newOrder = {
      id: database.orders.length + 1,
      productId: 1,
      quantity: 1,
      status: 'pending'
    };
    database.orders.push(newOrder);
    res.status(201).json({
      message: 'Order created',
      order: newOrder
    });
  });

  return router;
}

// ============================================
// API ROUTER (combines all routes)
// ============================================

function createApiRouter() {
  const router = new Router();

  // API middleware - runs for all API requests
  router.use((req, res, next) => {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');

    // Log API access
    console.log(`[API] ${req.method} ${req.baseUrl}${req.url}`);

    next();
  });

  // API health check
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });

  // Mount resource routers
  router.use('/products', createProductsRouter());
  router.use('/orders', createOrdersRouter());

  return router;
}

// ============================================
// MOUNT API ON APP
// ============================================

// Home page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>API Routes</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 20px; }
    .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .method { display: inline-block; padding: 4px 8px; border-radius: 4px; color: white; font-weight: bold; margin-right: 10px; }
    .get { background: #61affe; }
    .post { background: #49cc90; }
    .put { background: #fca130; }
    .delete { background: #f93e3e; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>REST API with Routers</h1>

  <h2>Products API</h2>

  <div class="endpoint">
    <span class="method get">GET</span>
    <a href="/api/products">/api/products</a>
    <span>- List all products</span>
  </div>

  <div class="endpoint">
    <span class="method get">GET</span>
    <a href="/api/products?category=electronics">/api/products?category=electronics</a>
    <span>- Filter by category</span>
  </div>

  <div class="endpoint">
    <span class="method get">GET</span>
    <a href="/api/products/1">/api/products/1</a>
    <span>- Get product by ID</span>
  </div>

  <div class="endpoint">
    <span class="method post">POST</span>
    <code>/api/products</code>
    <span>- Create product</span>
  </div>

  <div class="endpoint">
    <span class="method put">PUT</span>
    <code>/api/products/:id</code>
    <span>- Update product</span>
  </div>

  <div class="endpoint">
    <span class="method delete">DELETE</span>
    <code>/api/products/:id</code>
    <span>- Delete product</span>
  </div>

  <h2>Orders API</h2>

  <div class="endpoint">
    <span class="method get">GET</span>
    <a href="/api/orders">/api/orders</a>
    <span>- List all orders</span>
  </div>

  <div class="endpoint">
    <span class="method get">GET</span>
    <a href="/api/orders/1">/api/orders/1</a>
    <span>- Get order by ID</span>
  </div>

  <h2>API Health</h2>

  <div class="endpoint">
    <span class="method get">GET</span>
    <a href="/api/health">/api/health</a>
    <span>- Health check</span>
  </div>
</body>
</html>
  `);
});

// Mount API
app.use('/api', createApiRouter());

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           API Routes Example                                       ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Server URL: http://localhost:${PORT}                              ║
║                                                                   ║
║   API Endpoints:                                                  ║
║   GET    /api/products          List products                     ║
║   GET    /api/products/:id      Get product                       ║
║   POST   /api/products          Create product                    ║
║   PUT    /api/products/:id      Update product                    ║
║   DELETE /api/products/:id      Delete product                    ║
║   GET    /api/orders            List orders                       ║
║   GET    /api/orders/:id        Get order                         ║
║   GET    /api/health            Health check                      ║
║                                                                   ║
║   Press Ctrl+C to stop                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
