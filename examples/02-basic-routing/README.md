# Example 02: Basic Routing

Comprehensive demonstration of Express.js routing.

## What You'll Learn

- HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Route parameters
- Query strings
- Chained routes with `app.route()`
- Response methods

## Running the Example

```bash
npm install
npm start
# Visit http://localhost:3000
```

## API Endpoints

### Items CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/items` | List all items |
| GET | `/items?name=term` | Filter by name |
| GET | `/items/:id` | Get single item |
| POST | `/items` | Create item |
| PUT | `/items/:id` | Replace item |
| PATCH | `/items/:id` | Partial update |
| DELETE | `/items/:id` | Delete item |

### Testing with cURL

```bash
# Get all items
curl http://localhost:3000/items

# Get with filter
curl http://localhost:3000/items?name=Item

# Get single item
curl http://localhost:3000/items/1

# Create item
curl -X POST http://localhost:3000/items \
  -H "Content-Type: application/json" \
  -d '{"name":"New Item","description":"Test"}'

# Update item
curl -X PUT http://localhost:3000/items/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated","description":"Changed"}'

# Partial update
curl -X PATCH http://localhost:3000/items/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Patched"}'

# Delete item
curl -X DELETE http://localhost:3000/items/1
```

## Key Concepts

### Route Parameters

```javascript
// Single parameter
app.get('/items/:id', (req, res) => {
  console.log(req.params.id)
})

// Multiple parameters
app.get('/users/:userId/posts/:postId', (req, res) => {
  const { userId, postId } = req.params
})

// Wildcard
app.get('/files/*', (req, res) => {
  console.log(req.params[0]) // Everything after /files/
})
```

### Query Strings

```javascript
// /search?q=term&page=1&limit=10
app.get('/search', (req, res) => {
  const { q, page = 1, limit = 10 } = req.query
})
```

### Chained Routes

```javascript
app.route('/products')
  .get((req, res) => { /* list */ })
  .post((req, res) => { /* create */ })

app.route('/products/:id')
  .get((req, res) => { /* read */ })
  .put((req, res) => { /* update */ })
  .delete((req, res) => { /* delete */ })
```

## Exercises

1. Add validation for item names (min/max length)
2. Implement sorting for the items list
3. Add pagination to the items endpoint
4. Create a `/categories/:category/items` nested route

## Next Steps

→ [03-middleware-chain](../03-middleware-chain/) - Learn middleware patterns
