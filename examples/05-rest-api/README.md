# Example 05: REST API

Complete RESTful API implementation.

## What You'll Learn

- RESTful route design
- Resource relationships
- Pagination and filtering
- CRUD operations
- Proper HTTP status codes
- Consistent response format

## Running the Example

```bash
npm install
npm start
```

## API Endpoints

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users (paginated) |
| GET | `/api/users/:id` | Get single user |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Replace user |
| PATCH | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| GET | `/api/users/:id/posts` | Get user's posts |

### Posts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | List posts (filterable) |
| GET | `/api/posts/:id` | Get single post |
| POST | `/api/posts` | Create post |
| PUT | `/api/posts/:id` | Replace post |
| DELETE | `/api/posts/:id` | Delete post |
| GET | `/api/posts/:id/comments` | Get comments |
| POST | `/api/posts/:id/comments` | Add comment |

## Testing with cURL

### Users

```bash
# List users
curl http://localhost:3000/api/users

# List with pagination
curl "http://localhost:3000/api/users?page=1&limit=5"

# Get user
curl http://localhost:3000/api/users/1

# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Charlie","email":"charlie@example.com"}'

# Update user
curl -X PATCH http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Updated"}'

# Delete user
curl -X DELETE http://localhost:3000/api/users/1

# Get user's posts
curl http://localhost:3000/api/users/1/posts
```

### Posts

```bash
# List posts
curl http://localhost:3000/api/posts

# Filter by user
curl "http://localhost:3000/api/posts?userId=1"

# Search posts
curl "http://localhost:3000/api/posts?search=hello"

# Create post
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"userId":"1","title":"New Post","content":"Content here"}'

# Get post with author
curl http://localhost:3000/api/posts/1

# Add comment
curl -X POST http://localhost:3000/api/posts/1/comments \
  -H "Content-Type: application/json" \
  -d '{"userId":"2","text":"Nice post!"}'

# Get comments
curl http://localhost:3000/api/posts/1/comments
```

## Response Format

### Success (single resource)
```json
{
  "data": {
    "id": "1",
    "name": "Alice",
    "email": "alice@example.com"
  }
}
```

### Success (collection)
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Error
```json
{
  "error": {
    "message": "User not found",
    "status": 404
  }
}
```

## HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource |
| 500 | Server Error | Unexpected error |

## Key Concepts

### Router Organization

```javascript
const usersRouter = express.Router()
usersRouter.get('/', listUsers)
usersRouter.get('/:id', getUser)
usersRouter.post('/', createUser)

app.use('/api/users', usersRouter)
```

### Pagination

```javascript
const paginate = (array, page, limit) => ({
  data: array.slice((page - 1) * limit, page * limit),
  pagination: {
    page, limit,
    total: array.length,
    pages: Math.ceil(array.length / limit)
  }
})
```

### Nested Resources

```javascript
// GET /users/:id/posts
usersRouter.get('/:id/posts', (req, res) => {
  const posts = db.posts.filter(p => p.userId === req.params.id)
  res.json({ data: posts })
})
```

## Exercises

1. Add sorting (e.g., `/posts?sort=createdAt&order=desc`)
2. Implement field selection (e.g., `/users?fields=name,email`)
3. Add bulk operations (POST multiple items)
4. Implement soft delete

## Next Steps

→ [06-authentication](../06-authentication/) - Add JWT authentication
