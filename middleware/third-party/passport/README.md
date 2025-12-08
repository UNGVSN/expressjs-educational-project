# Passport

Passport is authentication middleware for Express. It provides a flexible framework for implementing various authentication strategies.

## Installation

```bash
npm install passport passport-local
```

## Basic Concepts

```
Passport Components:
├── Strategies - How to authenticate (local, OAuth, JWT)
├── Sessions - Persist login state
└── Middleware - Protect routes
```

## Local Strategy Setup

```javascript
const express = require('express')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy

const app = express()

// Body parser
app.use(express.urlencoded({ extended: false }))

// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))

// Initialize Passport
app.use(passport.initialize())
app.use(passport.session())

// Configure Local Strategy
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await User.findOne({ username })

      if (!user) {
        return done(null, false, { message: 'User not found' })
      }

      const isValid = await user.verifyPassword(password)
      if (!isValid) {
        return done(null, false, { message: 'Invalid password' })
      }

      return done(null, user)
    } catch (err) {
      return done(err)
    }
  }
))

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id)
})

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id)
    done(null, user)
  } catch (err) {
    done(err)
  }
})
```

## Authentication Routes

```javascript
// Login form
app.get('/login', (req, res) => {
  res.render('login')
})

// Handle login
app.post('/login',
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true  // Requires connect-flash
  })
)

// Or with custom callback
app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err)

    if (!user) {
      return res.status(401).json({ error: info.message })
    }

    req.logIn(user, (err) => {
      if (err) return next(err)
      return res.json({ message: 'Logged in', user })
    })
  })(req, res, next)
})

// Logout
app.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return next(err)
    res.redirect('/login')
  })
})
```

## Protecting Routes

```javascript
// Authentication middleware
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/login')
}

// API version
function ensureAuthenticatedAPI(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.status(401).json({ error: 'Not authenticated' })
}

// Protected route
app.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.render('dashboard', { user: req.user })
})

// Protected API
app.get('/api/profile', ensureAuthenticatedAPI, (req, res) => {
  res.json({ user: req.user })
})
```

## OAuth Strategies

### Google OAuth

```bash
npm install passport-google-oauth20
```

```javascript
const GoogleStrategy = require('passport-google-oauth20').Strategy

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Find or create user
      let user = await User.findOne({ googleId: profile.id })

      if (!user) {
        user = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName
        })
      }

      return done(null, user)
    } catch (err) {
      return done(err)
    }
  }
))

// Routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
)

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/dashboard')
  }
)
```

### GitHub OAuth

```bash
npm install passport-github2
```

```javascript
const GitHubStrategy = require('passport-github2').Strategy

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/auth/github/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ githubId: profile.id })

      if (!user) {
        user = await User.create({
          githubId: profile.id,
          username: profile.username,
          email: profile.emails?.[0]?.value
        })
      }

      return done(null, user)
    } catch (err) {
      return done(err)
    }
  }
))

// Routes
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
)

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/dashboard')
  }
)
```

## JWT Strategy

```bash
npm install passport-jwt jsonwebtoken
```

```javascript
const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt
const jwt = require('jsonwebtoken')

passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET
  },
  async (payload, done) => {
    try {
      const user = await User.findById(payload.sub)

      if (!user) {
        return done(null, false)
      }

      return done(null, user)
    } catch (err) {
      return done(err)
    }
  }
))

// Login - issue JWT
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email })

  if (!user || !await user.verifyPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = jwt.sign(
    { sub: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  )

  res.json({ token })
})

// Protected route with JWT
app.get('/api/profile',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    res.json({ user: req.user })
  }
)
```

## Multiple Strategies

```javascript
// Configure multiple strategies
passport.use('local', new LocalStrategy(...))
passport.use('google', new GoogleStrategy(...))
passport.use('github', new GitHubStrategy(...))
passport.use('jwt', new JwtStrategy(...))

// Use specific strategy
app.post('/login', passport.authenticate('local', ...))
app.get('/auth/google', passport.authenticate('google', ...))
app.get('/api/protected', passport.authenticate('jwt', { session: false }), ...)
```

## Complete Example

```javascript
const express = require('express')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')

const app = express()

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())

// User model (simplified)
const users = []

// Passport configuration
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    const user = users.find(u => u.email === email)

    if (!user) {
      return done(null, false, { message: 'User not found' })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return done(null, false, { message: 'Invalid password' })
    }

    return done(null, user)
  }
))

passport.serializeUser((user, done) => done(null, user.id))
passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id)
  done(null, user)
})

// Routes
app.post('/register', async (req, res) => {
  const { email, password, name } = req.body

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const user = {
    id: Date.now().toString(),
    email,
    password: hashedPassword,
    name
  }

  users.push(user)
  res.status(201).json({ message: 'User created' })
})

app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err)
    if (!user) return res.status(401).json({ error: info.message })

    req.logIn(user, (err) => {
      if (err) return next(err)
      res.json({ message: 'Logged in', user: { id: user.id, email: user.email, name: user.name } })
    })
  })(req, res, next)
})

app.post('/logout', (req, res) => {
  req.logout(() => {
    res.json({ message: 'Logged out' })
  })
})

app.get('/profile', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  res.json({ user: { id: req.user.id, email: req.user.email, name: req.user.name } })
})

app.listen(3000)
```

## Best Practices

```javascript
// 1. Store minimal data in session
passport.serializeUser((user, done) => {
  done(null, user.id)  // Just the ID
})

// 2. Handle errors properly
passport.authenticate('local', (err, user, info) => {
  if (err) return next(err)  // System error
  if (!user) return res.status(401).json(...)  // Auth failed
  // Success...
})

// 3. Use secure session settings
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict'
  }
}))

// 4. Regenerate session on login
req.logIn(user, (err) => {
  // Session automatically regenerated
})
```

## Related

- [express-session](../express-session/) - Session management
- [helmet](../helmet/) - Security headers

---

*Passport provides flexible, modular authentication for Express applications.*
