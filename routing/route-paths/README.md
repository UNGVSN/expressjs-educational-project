# Route Paths

Route paths define the endpoints at which requests can be made. Express supports strings, string patterns, and regular expressions.

## Overview

```javascript
// String path
app.get('/about', handler)

// String pattern
app.get('/ab?cd', handler)  // Matches acd or abcd

// Regular expression
app.get(/.*fly$/, handler)  // Matches butterfly, dragonfly
```

## String Paths

### Basic Paths

```javascript
// Root path
app.get('/', (req, res) => {
  res.send('Home page')
})

// Simple path
app.get('/about', (req, res) => {
  res.send('About page')
})

// Nested path
app.get('/users/profile', (req, res) => {
  res.send('User profile')
})

// Deep nesting
app.get('/api/v1/users/settings', (req, res) => {
  res.send('User settings')
})
```

### Path Casing

```javascript
// By default, paths are case-insensitive
app.get('/About', handler)
// Matches: /about, /About, /ABOUT

// Enable case sensitivity
const app = express()
app.set('case sensitive routing', true)

app.get('/About', handler)
// Only matches: /About
```

### Trailing Slash

```javascript
// By default, /foo and /foo/ are the same
app.get('/users', handler)
// Matches: /users and /users/

// Enable strict routing
app.set('strict routing', true)

app.get('/users', handler)   // Matches: /users only
app.get('/users/', handler)  // Matches: /users/ only
```

## String Patterns

Express uses path-to-regexp for pattern matching.

### ? - Optional Character

```javascript
// 'b' is optional
app.get('/ab?cd', handler)
// Matches: /acd, /abcd

// Optional segment
app.get('/colou?r', handler)
// Matches: /color, /colour
```

### + - One or More

```javascript
// One or more 'b'
app.get('/ab+cd', handler)
// Matches: /abcd, /abbcd, /abbbcd, ...
// Does NOT match: /acd
```

### * - Zero or More (Any Characters)

```javascript
// Any characters between 'ab' and 'cd'
app.get('/ab*cd', handler)
// Matches: /abcd, /abxcd, /abRANDOMcd, /ab123cd

// Wildcard at end
app.get('/api/*', handler)
// Matches: /api/users, /api/posts/123, /api/anything/here
```

### () - Grouping

```javascript
// Optional group
app.get('/ab(cd)?e', handler)
// Matches: /abe, /abcde

// Combined patterns
app.get('/file(s)?', handler)
// Matches: /file, /files
```

### Character Classes

```javascript
// Match specific characters
app.get('/test[123]', handler)
// Matches: /test1, /test2, /test3

// Range
app.get('/item[a-z]', handler)
// Matches: /itema, /itemb, ..., /itemz
```

## Regular Expression Paths

Use JavaScript RegExp for complex matching.

### Basic RegExp

```javascript
// Anything containing 'a'
app.get(/a/, handler)
// Matches: /apple, /banana, /cat

// Ends with 'fly'
app.get(/.*fly$/, handler)
// Matches: /butterfly, /dragonfly
// Does NOT match: /flying

// Starts with 'api'
app.get(/^\/api/, handler)
// Matches: /api, /api/users, /api/v1/posts
```

### RegExp with Capture Groups

```javascript
// Capture group becomes parameter
app.get(/^\/users\/(\d+)$/, (req, res) => {
  res.send(`User ID: ${req.params[0]}`)
})
// GET /users/123 -> User ID: 123

// Multiple capture groups
app.get(/^\/(\w+)\/(\d+)$/, (req, res) => {
  res.json({
    resource: req.params[0],
    id: req.params[1]
  })
})
// GET /posts/42 -> { resource: 'posts', id: '42' }
```

### Named Capture Groups

```javascript
// ES2018+ named capture groups
app.get(/^\/users\/(?<userId>\d+)\/posts\/(?<postId>\d+)$/, (req, res) => {
  res.json(req.params)
})
// GET /users/1/posts/5 -> { userId: '1', postId: '5' }
```

## Path Matching Examples

### API Versioning

```javascript
// Match v1 or v2
app.get('/api/v[12]/*', handler)
// Matches: /api/v1/users, /api/v2/posts

// Or using string pattern
app.get('/api/v:version(1|2)/*', handler)
```

### File Extensions

```javascript
// Match specific extensions
app.get('*.json', (req, res) => {
  res.send('JSON file requested')
})

// Match path with extension
app.get('/files/:name.:ext', (req, res) => {
  res.json({
    name: req.params.name,
    extension: req.params.ext
  })
})
```

### Catch-All Routes

```javascript
// Match anything not matched above
app.get('*', (req, res) => {
  res.status(404).send('Not found')
})

// Or for specific prefix
app.get('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' })
})
```

### SPA Fallback

```javascript
// Serve API routes
app.use('/api', apiRouter)

// Serve static files
app.use(express.static('public'))

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})
```

## Path Matching Order

Routes are matched in the order they are defined.

```javascript
// More specific routes first
app.get('/users/new', newUserForm)     // 1. Exact match
app.get('/users/:id', getUser)          // 2. Parameter match
app.get('/users/*', userWildcard)       // 3. Wildcard match
app.get('*', notFound)                  // 4. Catch-all

// WRONG ORDER:
// app.get('/users/:id', getUser)       // Would catch /users/new!
// app.get('/users/new', newUserForm)   // Never reached
```

## Query Strings

Query strings are NOT part of the route path.

```javascript
app.get('/search', (req, res) => {
  // Route matches /search
  // Query string accessed via req.query
  const { q, page } = req.query
  res.json({ query: q, page })
})
// GET /search?q=express&page=1
// Route path: /search
// Query: { q: 'express', page: '1' }
```

## Hash/Fragment

Hash fragments are NOT sent to the server.

```javascript
// Client: GET /page#section
// Server sees: GET /page
// The #section is handled by the browser only
```

## Common Patterns

### REST API

```javascript
app.get('/api/resources', list)
app.get('/api/resources/:id', show)
app.post('/api/resources', create)
app.put('/api/resources/:id', replace)
app.patch('/api/resources/:id', update)
app.delete('/api/resources/:id', destroy)
```

### Web Pages

```javascript
app.get('/', homePage)
app.get('/about', aboutPage)
app.get('/contact', contactPage)
app.get('/blog', blogIndex)
app.get('/blog/:slug', blogPost)
```

### Health Checks

```javascript
app.get('/health', (req, res) => res.send('OK'))
app.get('/ready', (req, res) => res.send('Ready'))
app.get('/live', (req, res) => res.send('Live'))
```

## Related

- [basic-routing](../basic-routing/) - HTTP methods
- [route-parameters](../route-parameters/) - URL parameters
- [route-handlers](../route-handlers/) - Handler functions

---

*Understanding route paths is essential for designing clean, RESTful APIs.*
