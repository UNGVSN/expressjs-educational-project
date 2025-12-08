# Testing Express Applications

Comprehensive guide to testing Express.js applications.

## Overview

Testing levels for Express applications:
1. **Unit Tests** - Individual functions and middleware
2. **Integration Tests** - API endpoints and database interactions
3. **End-to-End Tests** - Full application flows

## Testing Stack

Popular testing tools for Express:

| Tool | Purpose |
|------|---------|
| **Jest** | Test runner, assertions, mocking |
| **Mocha** | Test runner |
| **Chai** | Assertion library |
| **Supertest** | HTTP assertions |
| **Sinon** | Mocking, stubs, spies |
| **nock** | HTTP request mocking |

## Setup

### Jest Setup

```bash
npm install --save-dev jest supertest
```

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "coveragePathIgnorePatterns": ["/node_modules/"],
    "testMatch": ["**/*.test.js"]
  }
}
```

### Mocha + Chai Setup

```bash
npm install --save-dev mocha chai supertest
```

```json
// package.json
{
  "scripts": {
    "test": "mocha --recursive tests/",
    "test:watch": "mocha --watch --recursive tests/"
  }
}
```

## Application Structure for Testing

```javascript
// app.js - Export app without starting server
const express = require('express')
const app = express()

app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/users', (req, res) => {
  res.json([{ id: 1, name: 'John' }])
})

app.post('/users', (req, res) => {
  const { name, email } = req.body
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email required' })
  }
  res.status(201).json({ id: 2, name, email })
})

module.exports = app

// server.js - Start server
const app = require('./app')
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server on port ${PORT}`))
```

## Unit Testing

### Testing Middleware

```javascript
// middleware/auth.js
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Token required' })
  }

  try {
    req.user = verifyToken(token)
    next()
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

module.exports = { authenticate }
```

```javascript
// middleware/auth.test.js
const { authenticate } = require('./auth')

describe('authenticate middleware', () => {
  let req, res, next

  beforeEach(() => {
    req = {
      headers: {}
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    next = jest.fn()
  })

  test('returns 401 if no token', () => {
    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Token required' })
    expect(next).not.toHaveBeenCalled()
  })

  test('returns 401 if invalid token', () => {
    req.headers.authorization = 'Bearer invalid-token'

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' })
  })

  test('calls next() with valid token', () => {
    req.headers.authorization = 'Bearer valid-token'

    authenticate(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.user).toBeDefined()
  })
})
```

### Testing Utility Functions

```javascript
// utils/validators.js
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

const validatePassword = (password) => {
  return password && password.length >= 8
}

module.exports = { validateEmail, validatePassword }
```

```javascript
// utils/validators.test.js
const { validateEmail, validatePassword } = require('./validators')

describe('validateEmail', () => {
  test('returns true for valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true)
    expect(validateEmail('user.name@domain.co.uk')).toBe(true)
  })

  test('returns false for invalid email', () => {
    expect(validateEmail('invalid')).toBe(false)
    expect(validateEmail('no@domain')).toBe(false)
    expect(validateEmail('')).toBe(false)
  })
})

describe('validatePassword', () => {
  test('returns true for valid password', () => {
    expect(validatePassword('12345678')).toBe(true)
    expect(validatePassword('longpassword123')).toBe(true)
  })

  test('returns false for invalid password', () => {
    expect(validatePassword('short')).toBe(false)
    expect(validatePassword('')).toBe(false)
    expect(validatePassword(null)).toBe(false)
  })
})
```

## Integration Testing

### Testing Routes with Supertest

```javascript
// tests/users.test.js
const request = require('supertest')
const app = require('../app')

describe('User API', () => {
  describe('GET /users', () => {
    test('returns list of users', async () => {
      const response = await request(app)
        .get('/users')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toBeInstanceOf(Array)
      expect(response.body[0]).toHaveProperty('id')
      expect(response.body[0]).toHaveProperty('name')
    })
  })

  describe('POST /users', () => {
    test('creates user with valid data', async () => {
      const userData = {
        name: 'Jane Doe',
        email: 'jane@example.com'
      }

      const response = await request(app)
        .post('/users')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.name).toBe(userData.name)
      expect(response.body.email).toBe(userData.email)
    })

    test('returns 400 for missing name', async () => {
      const response = await request(app)
        .post('/users')
        .send({ email: 'test@example.com' })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })

    test('returns 400 for missing email', async () => {
      const response = await request(app)
        .post('/users')
        .send({ name: 'Test User' })
        .expect(400)

      expect(response.body.error).toBeDefined()
    })
  })
})
```

### Testing with Authentication

```javascript
// tests/protected.test.js
const request = require('supertest')
const app = require('../app')
const jwt = require('jsonwebtoken')

describe('Protected Routes', () => {
  let authToken

  beforeAll(() => {
    // Generate test token
    authToken = jwt.sign(
      { id: 1, email: 'test@example.com' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    )
  })

  test('returns 401 without token', async () => {
    await request(app)
      .get('/api/profile')
      .expect(401)
  })

  test('returns 401 with invalid token', async () => {
    await request(app)
      .get('/api/profile')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401)
  })

  test('returns profile with valid token', async () => {
    const response = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    expect(response.body).toHaveProperty('email', 'test@example.com')
  })
})
```

### Testing with Database

```javascript
// tests/database.test.js
const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../app')
const User = require('../models/User')

describe('User API with Database', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.TEST_MONGODB_URI || 'mongodb://localhost/test')
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  beforeEach(async () => {
    // Clear database before each test
    await User.deleteMany({})
  })

  test('creates user in database', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    }

    const response = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(201)

    // Verify in database
    const user = await User.findById(response.body.id)
    expect(user).toBeDefined()
    expect(user.name).toBe(userData.name)
    expect(user.email).toBe(userData.email)
  })

  test('prevents duplicate email', async () => {
    // Create first user
    await User.create({
      name: 'First User',
      email: 'duplicate@example.com',
      password: 'password123'
    })

    // Try to create second user with same email
    await request(app)
      .post('/api/users')
      .send({
        name: 'Second User',
        email: 'duplicate@example.com',
        password: 'password456'
      })
      .expect(409) // Conflict
  })
})
```

## Mocking

### Mocking External Services

```javascript
// services/emailService.js
const sendEmail = async (to, subject, body) => {
  // Actual email sending logic
  return { messageId: 'abc123' }
}

module.exports = { sendEmail }
```

```javascript
// tests/email.test.js
const request = require('supertest')
const app = require('../app')
const emailService = require('../services/emailService')

// Mock the email service
jest.mock('../services/emailService')

describe('Email functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('sends welcome email on registration', async () => {
    emailService.sendEmail.mockResolvedValue({ messageId: 'test123' })

    await request(app)
      .post('/api/register')
      .send({
        name: 'New User',
        email: 'new@example.com',
        password: 'password123'
      })
      .expect(201)

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      'new@example.com',
      'Welcome!',
      expect.stringContaining('New User')
    )
  })
})
```

### Mocking HTTP Requests with nock

```javascript
// tests/external-api.test.js
const request = require('supertest')
const nock = require('nock')
const app = require('../app')

describe('External API calls', () => {
  afterEach(() => {
    nock.cleanAll()
  })

  test('fetches weather data', async () => {
    // Mock external API
    nock('https://api.weather.com')
      .get('/v1/current')
      .query({ city: 'London' })
      .reply(200, {
        temperature: 15,
        condition: 'Cloudy'
      })

    const response = await request(app)
      .get('/api/weather?city=London')
      .expect(200)

    expect(response.body.temperature).toBe(15)
    expect(response.body.condition).toBe('Cloudy')
  })

  test('handles external API failure', async () => {
    nock('https://api.weather.com')
      .get('/v1/current')
      .query({ city: 'London' })
      .reply(500)

    await request(app)
      .get('/api/weather?city=London')
      .expect(503) // Service unavailable
  })
})
```

## Testing Error Handling

```javascript
// tests/errors.test.js
const request = require('supertest')
const app = require('../app')

describe('Error Handling', () => {
  test('returns 404 for unknown route', async () => {
    const response = await request(app)
      .get('/unknown-route')
      .expect(404)

    expect(response.body.error).toBeDefined()
  })

  test('returns 400 for invalid JSON', async () => {
    await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .send('invalid json')
      .expect(400)
  })

  test('returns 500 for server errors', async () => {
    // Trigger server error (depends on your error route)
    await request(app)
      .get('/api/trigger-error')
      .expect(500)
  })
})
```

## Test Fixtures and Factories

```javascript
// tests/fixtures/users.js
const users = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'user' },
  { id: 2, name: 'Jane Doe', email: 'jane@example.com', role: 'admin' }
]

const createUser = (overrides = {}) => ({
  name: 'Test User',
  email: `test-${Date.now()}@example.com`,
  password: 'password123',
  ...overrides
})

module.exports = { users, createUser }
```

```javascript
// tests/users-with-fixtures.test.js
const request = require('supertest')
const app = require('../app')
const { createUser } = require('./fixtures/users')

describe('User API with fixtures', () => {
  test('creates user with factory', async () => {
    const userData = createUser({ name: 'Custom Name' })

    const response = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(201)

    expect(response.body.name).toBe('Custom Name')
  })
})
```

## Testing Patterns

### Request Helper

```javascript
// tests/helpers/request.js
const request = require('supertest')
const app = require('../../app')

const api = {
  get: (url) => request(app).get(url),
  post: (url, data) => request(app).post(url).send(data),
  put: (url, data) => request(app).put(url).send(data),
  delete: (url) => request(app).delete(url),

  // Authenticated requests
  authGet: (url, token) =>
    request(app).get(url).set('Authorization', `Bearer ${token}`),
  authPost: (url, data, token) =>
    request(app).post(url).send(data).set('Authorization', `Bearer ${token}`)
}

module.exports = api
```

```javascript
// tests/using-helper.test.js
const api = require('./helpers/request')

describe('Using request helper', () => {
  test('get users', async () => {
    const response = await api.get('/users').expect(200)
    expect(response.body).toBeInstanceOf(Array)
  })

  test('create user', async () => {
    const response = await api
      .post('/users', { name: 'Test', email: 'test@example.com' })
      .expect(201)
    expect(response.body.name).toBe('Test')
  })
})
```

### Test Setup/Teardown

```javascript
// tests/setup.js
const mongoose = require('mongoose')

beforeAll(async () => {
  await mongoose.connect(process.env.TEST_DATABASE_URL)
})

afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()
})

beforeEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
})
```

```json
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.js']
}
```

## Code Coverage

```bash
# Generate coverage report
npm test -- --coverage

# Coverage thresholds in jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

## Best Practices

1. **Isolate tests** - Each test should be independent
2. **Use descriptive names** - Test names should describe expected behavior
3. **Test edge cases** - Empty inputs, invalid data, boundaries
4. **Mock external services** - Don't call real APIs in tests
5. **Use test database** - Never test against production
6. **Clean up after tests** - Reset state between tests
7. **Test error paths** - Not just happy paths
8. **Keep tests fast** - Optimize slow tests
9. **Run tests in CI** - Automate test execution
10. **Maintain test coverage** - Set minimum thresholds

## Related Topics

- [Error Handling](../error-handling/README.md)
- [Production Deployment](../production/README.md)
- [Security](../security/README.md)
