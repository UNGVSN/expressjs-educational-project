# Database Integration

Integrating databases with Express applications for data persistence.

## Overview

Express is database-agnostic - it works with any database through appropriate drivers or ORMs.

## MongoDB with Mongoose

### Installation

```bash
npm install mongoose
```

### Connection

```javascript
const mongoose = require('mongoose')

// Connect
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

// Connection events
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected')
})

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err)
})

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected')
})

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close()
  process.exit(0)
})
```

### Schema & Model

```javascript
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
})

// Methods
userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password)
}

// Statics
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email })
}

// Pre-save hook
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10)
  }
  next()
})

const User = mongoose.model('User', userSchema)
module.exports = User
```

### CRUD Operations

```javascript
// Create
const user = await User.create({ name: 'John', email: 'john@example.com' })

// Read
const users = await User.find()
const user = await User.findById(id)
const user = await User.findOne({ email })

// Update
const user = await User.findByIdAndUpdate(id, { name: 'Jane' }, { new: true })

// Delete
await User.findByIdAndDelete(id)
```

## PostgreSQL with Sequelize

### Installation

```bash
npm install sequelize pg pg-hstore
```

### Connection

```javascript
const { Sequelize } = require('sequelize')

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false
})

// Test connection
sequelize.authenticate()
  .then(() => console.log('PostgreSQL connected'))
  .catch(err => console.error('Connection error:', err))
```

### Model Definition

```javascript
const { DataTypes } = require('sequelize')

const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  }
}, {
  timestamps: true,
  tableName: 'users'
})

// Associations
User.hasMany(Post)
Post.belongsTo(User)
```

### CRUD Operations

```javascript
// Create
const user = await User.create({ name: 'John', email: 'john@example.com' })

// Read
const users = await User.findAll()
const user = await User.findByPk(id)
const user = await User.findOne({ where: { email } })

// Update
await user.update({ name: 'Jane' })
// or
await User.update({ name: 'Jane' }, { where: { id } })

// Delete
await user.destroy()
// or
await User.destroy({ where: { id } })
```

## MySQL with mysql2

### Installation

```bash
npm install mysql2
```

### Connection Pool

```javascript
const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

module.exports = pool
```

### Queries

```javascript
const pool = require('./db')

// Select
const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id])

// Insert
const [result] = await pool.query(
  'INSERT INTO users (name, email) VALUES (?, ?)',
  [name, email]
)
const insertId = result.insertId

// Update
await pool.query(
  'UPDATE users SET name = ? WHERE id = ?',
  [name, id]
)

// Delete
await pool.query('DELETE FROM users WHERE id = ?', [id])
```

## Redis

### Installation

```bash
npm install redis
```

### Connection

```javascript
const redis = require('redis')

const client = redis.createClient({
  url: process.env.REDIS_URL
})

client.on('connect', () => console.log('Redis connected'))
client.on('error', (err) => console.error('Redis error:', err))

await client.connect()
```

### Operations

```javascript
// String
await client.set('key', 'value')
await client.set('key', 'value', { EX: 3600 })  // Expire in 1 hour
const value = await client.get('key')

// Hash
await client.hSet('user:1', { name: 'John', email: 'john@example.com' })
const user = await client.hGetAll('user:1')

// List
await client.lPush('queue', 'item')
const item = await client.rPop('queue')

// Set
await client.sAdd('tags', ['javascript', 'node', 'express'])
const tags = await client.sMembers('tags')

// Sorted Set
await client.zAdd('leaderboard', { score: 100, value: 'player1' })
const top10 = await client.zRange('leaderboard', 0, 9, { REV: true })
```

### Caching Pattern

```javascript
async function getUserWithCache(id) {
  const cacheKey = `user:${id}`

  // Try cache first
  const cached = await client.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }

  // Fetch from database
  const user = await User.findById(id)
  if (user) {
    // Cache for 1 hour
    await client.set(cacheKey, JSON.stringify(user), { EX: 3600 })
  }

  return user
}
```

## Connection Best Practices

```javascript
// config/database.js
const mongoose = require('mongoose')

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI)
    console.log(`MongoDB Connected: ${conn.connection.host}`)
  } catch (err) {
    console.error('Database connection error:', err)
    process.exit(1)
  }
}

// Handle process termination
const gracefulShutdown = async () => {
  await mongoose.connection.close()
  console.log('Database connection closed')
  process.exit(0)
}

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)

module.exports = connectDB

// app.js
const connectDB = require('./config/database')
connectDB()
```

## Environment Configuration

```bash
# .env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/myapp

# PostgreSQL
DATABASE_URL=postgres://user:password@localhost:5432/myapp

# MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=myapp

# Redis
REDIS_URL=redis://localhost:6379
```

## Related

- [performance](../performance/) - Query optimization
- [production](../production/) - Connection pooling

---

*Database integration is essential for persistent data storage in Express applications.*
