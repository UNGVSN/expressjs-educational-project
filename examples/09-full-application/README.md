# Example 09: Full Application

Production-ready Express.js application combining all concepts.

## What You'll Learn

- Professional project structure
- Layered architecture (routes → services)
- Comprehensive middleware stack
- Authentication and authorization
- Input validation
- Error handling
- Security best practices
- Configuration management
- Graceful shutdown

## Project Structure

```
09-full-application/
├── app.js                 # Application entry point
├── package.json
├── .env.example           # Environment template
├── config/
│   └── index.js           # Configuration management
├── middleware/
│   ├── auth.js            # Authentication/authorization
│   ├── validate.js        # Input validation
│   └── errorHandler.js    # Error handling
├── routes/
│   ├── index.js           # Route aggregation
│   ├── auth.js            # Auth routes
│   ├── users.js           # User routes
│   └── posts.js           # Post routes
├── services/
│   ├── authService.js     # Auth business logic
│   └── postService.js     # Post business logic
└── utils/
    ├── errors.js          # Custom error classes
    └── helpers.js         # Utility functions
```

## Running the Example

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development
npm run dev

# Start production
NODE_ENV=production npm start
```

## API Documentation

### Authentication

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Refresh token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'

# Change password
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"password123","newPassword":"newpassword"}'
```

### Users

```bash
# Get current user
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update profile
curl -X PATCH http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'

# Get my posts
curl http://localhost:3000/api/users/me/posts \
  -H "Authorization: Bearer YOUR_TOKEN"

# List users (admin)
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Posts

```bash
# List posts
curl "http://localhost:3000/api/posts?page=1&limit=10"

# List with filters
curl "http://localhost:3000/api/posts?tag=javascript&search=express"

# Get post
curl http://localhost:3000/api/posts/POST_ID

# Create post
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Post","content":"Post content here","tags":["javascript"]}'

# Update post
curl -X PATCH http://localhost:3000/api/posts/POST_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title"}'

# Delete post
curl -X DELETE http://localhost:3000/api/posts/POST_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Key Architecture Patterns

### Layered Architecture

```
Request → Routes → Middleware → Service → Response
                     ↓
              Error Handler
```

### Configuration Management

```javascript
// config/index.js
module.exports = {
  port: process.env.PORT || 3000,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '1h'
  }
}
```

### Custom Error Classes

```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
  }
}

throw new NotFoundError('User')
throw new ValidationError('Invalid input', errors)
```

### Async Handler

```javascript
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

router.get('/', asyncHandler(async (req, res) => {
  const data = await service.getData()
  res.json(data)
}))
```

### Validation Middleware

```javascript
const validate = (schema) => (req, res, next) => {
  const errors = validateSchema(req.body, schema)
  if (errors.length) throw new ValidationError('Validation failed', errors)
  next()
}

router.post('/', validate(schemas.createPost), handler)
```

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin requests
- **Rate Limiting**: Request throttling
- **Input Validation**: Schema-based validation
- **JWT**: Token-based authentication
- **Password Hashing**: bcrypt
- **Body Size Limit**: Prevents payload attacks

## Production Checklist

- [ ] Set strong JWT_SECRET
- [ ] Configure CORS_ORIGIN
- [ ] Enable HTTPS
- [ ] Set up reverse proxy (Nginx)
- [ ] Configure rate limiting
- [ ] Set up logging
- [ ] Configure process manager (PM2)
- [ ] Set up health monitoring
- [ ] Configure graceful shutdown

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| JWT_SECRET | JWT signing key | (required) |
| JWT_EXPIRES_IN | Token expiration | 1h |
| BCRYPT_ROUNDS | Hash rounds | 10 |
| RATE_LIMIT_MAX | Max requests/window | 100 |

## Exercises

1. Add database integration (MongoDB/PostgreSQL)
2. Implement email verification
3. Add file uploads
4. Implement caching (Redis)
5. Add API documentation (Swagger)
6. Set up logging (Winston)
7. Add unit and integration tests

---

*This example brings together all Express.js concepts into a production-ready application.*
