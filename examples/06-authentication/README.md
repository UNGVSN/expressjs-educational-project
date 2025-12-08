# Example 06: Authentication

JWT-based authentication implementation.

## What You'll Learn

- User registration and login
- Password hashing with bcrypt
- JWT access tokens
- Refresh token pattern
- Role-based authorization
- Protected routes

## Running the Example

```bash
npm install
npm start
```

## Default Admin Account

```
Email: admin@example.com
Password: admin123
```

## Testing with cURL

### Register

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"Test User"}'
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Protected Route

```bash
# Replace YOUR_TOKEN with actual token from login
curl http://localhost:3000/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Refresh Token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

### Change Password

```bash
curl -X POST http://localhost:3000/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"password123","newPassword":"newpassword123"}'
```

### Admin Routes

```bash
# Login as admin first
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# List users (admin only)
curl http://localhost:3000/admin/users \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Change user role
curl -X PATCH http://localhost:3000/admin/users/1/role \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
```

## Key Concepts

### Password Hashing

```javascript
const bcrypt = require('bcryptjs')

// Hash password
const hash = await bcrypt.hash(password, 10)

// Compare password
const isMatch = await bcrypt.compare(password, hash)
```

### JWT Generation

```javascript
const jwt = require('jsonwebtoken')

// Generate token
const token = jwt.sign(
  { id: user.id, email: user.email },
  SECRET,
  { expiresIn: '1h' }
)

// Verify token
const decoded = jwt.verify(token, SECRET)
```

### Auth Middleware

```javascript
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Token required' })
  }

  try {
    req.user = jwt.verify(token, SECRET)
    next()
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
}
```

### Authorization Middleware

```javascript
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
}

// Usage
app.get('/admin', authenticate, authorize('admin'), handler)
```

## Token Flow

```
1. User logs in with email/password
2. Server returns access token (1h) + refresh token (7d)
3. Client stores tokens (secure storage)
4. Client sends access token with requests
5. When access token expires, use refresh token to get new one
6. On logout, invalidate refresh token
```

## Security Considerations

1. **JWT Secret**: Use strong, random secret in production
2. **HTTPS**: Always use HTTPS in production
3. **Token Storage**: Store tokens securely (HttpOnly cookies or secure storage)
4. **Token Expiration**: Keep access tokens short-lived
5. **Password Requirements**: Enforce strong passwords
6. **Rate Limiting**: Add rate limiting to auth endpoints

## Exercises

1. Add email verification
2. Implement password reset
3. Add "remember me" functionality
4. Implement account lockout after failed attempts
5. Add OAuth (Google, GitHub) login

## Next Steps

→ [07-file-upload](../07-file-upload/) - Handle file uploads
