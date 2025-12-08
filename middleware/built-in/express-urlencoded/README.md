# express.urlencoded()

Parses incoming requests with URL-encoded payloads (HTML form submissions). This is the format used by standard HTML forms with `application/x-www-form-urlencoded` content type.

## Overview

```javascript
const express = require('express')
const app = express()

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }))

app.post('/login', (req, res) => {
  console.log(req.body)  // { username: 'john', password: '...' }
  res.redirect('/dashboard')
})
```

## Form Encoding Format

```html
<!-- HTML Form -->
<form action="/submit" method="POST">
  <input name="name" value="John Doe">
  <input name="email" value="john@example.com">
  <button type="submit">Submit</button>
</form>

<!-- Sends body as: -->
<!-- name=John+Doe&email=john%40example.com -->
```

## Options

```javascript
app.use(express.urlencoded({
  extended: true,                              // Use qs library
  inflate: true,                               // Handle compressed bodies
  limit: '100kb',                              // Max body size
  parameterLimit: 1000,                        // Max number of params
  type: 'application/x-www-form-urlencoded',  // Content-Type to parse
  verify: undefined                            // Verification function
}))
```

### extended

The most important option - determines the parsing library used.

```javascript
// extended: true (recommended) - Use 'qs' library
app.use(express.urlencoded({ extended: true }))

// Supports rich objects and arrays:
// name=John&address[city]=NYC&address[zip]=10001
// becomes: { name: 'John', address: { city: 'NYC', zip: '10001' } }

// tags[0]=js&tags[1]=node
// becomes: { tags: ['js', 'node'] }


// extended: false - Use 'querystring' library
app.use(express.urlencoded({ extended: false }))

// Only supports simple key-value pairs:
// name=John&address[city]=NYC
// becomes: { name: 'John', 'address[city]': 'NYC' }  // Not nested!
```

### limit

```javascript
// String format
app.use(express.urlencoded({
  extended: true,
  limit: '100kb'
}))

// Number format (bytes)
app.use(express.urlencoded({
  extended: true,
  limit: 102400  // 100KB
}))

// Exceeding limit returns 413 Payload Too Large
```

### parameterLimit

```javascript
// Limit number of parameters (security measure)
app.use(express.urlencoded({
  extended: true,
  parameterLimit: 100  // Max 100 parameters
}))

// Exceeding returns 413 Too Many Parameters
```

### type

```javascript
// Default type
app.use(express.urlencoded({
  extended: true,
  type: 'application/x-www-form-urlencoded'
}))

// Custom type
app.use(express.urlencoded({
  extended: true,
  type: 'application/x-custom-urlencoded'
}))

// Multiple types
app.use(express.urlencoded({
  extended: true,
  type: [
    'application/x-www-form-urlencoded',
    'application/x-www-form-urlencoded; charset=UTF-8'
  ]
}))
```

## Extended vs Non-Extended

### extended: true (qs library)

```javascript
app.use(express.urlencoded({ extended: true }))

// Nested objects
// user[name]=John&user[profile][age]=30
{
  user: {
    name: 'John',
    profile: {
      age: '30'  // Note: still a string
    }
  }
}

// Arrays
// colors[]=red&colors[]=blue
{ colors: ['red', 'blue'] }

// Indexed arrays
// items[0][name]=Book&items[0][price]=10&items[1][name]=Pen
{
  items: [
    { name: 'Book', price: '10' },
    { name: 'Pen' }
  ]
}
```

### extended: false (querystring library)

```javascript
app.use(express.urlencoded({ extended: false }))

// Same input: user[name]=John&user[profile][age]=30
{
  'user[name]': 'John',
  'user[profile][age]': '30'  // No nesting!
}

// Simple arrays work
// colors=red&colors=blue
{ colors: ['red', 'blue'] }
```

## Common Patterns

### Traditional Form Handling

```javascript
app.use(express.urlencoded({ extended: true }))

// Render form
app.get('/register', (req, res) => {
  res.render('register')
})

// Handle submission
app.post('/register', (req, res) => {
  const { username, email, password } = req.body

  // Validate
  if (!username || !email || !password) {
    return res.render('register', { error: 'All fields required' })
  }

  // Create user
  createUser({ username, email, password })
  res.redirect('/login')
})
```

### Complex Form Data

```html
<!-- Form with nested data -->
<form action="/order" method="POST">
  <input name="customer[name]" value="John">
  <input name="customer[email]" value="john@example.com">
  <input name="items[0][product]" value="Widget">
  <input name="items[0][quantity]" value="2">
  <input name="items[1][product]" value="Gadget">
  <input name="items[1][quantity]" value="1">
</form>
```

```javascript
app.post('/order', (req, res) => {
  console.log(req.body)
  // {
  //   customer: { name: 'John', email: 'john@example.com' },
  //   items: [
  //     { product: 'Widget', quantity: '2' },
  //     { product: 'Gadget', quantity: '1' }
  //   ]
  // }

  res.json({ received: true })
})
```

### Checkbox Arrays

```html
<form action="/settings" method="POST">
  <label><input type="checkbox" name="notifications[]" value="email"> Email</label>
  <label><input type="checkbox" name="notifications[]" value="sms"> SMS</label>
  <label><input type="checkbox" name="notifications[]" value="push"> Push</label>
</form>
```

```javascript
app.post('/settings', (req, res) => {
  console.log(req.body.notifications)  // ['email', 'push'] (checked boxes)
})
```

### Combined with JSON

```javascript
// Support both form submissions and JSON APIs
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.post('/api/create', (req, res) => {
  // Works with both Content-Types:
  // - application/json
  // - application/x-www-form-urlencoded
  console.log(req.body)
  res.json({ success: true })
})
```

## Security Considerations

```javascript
// 1. Limit body size to prevent DoS
app.use(express.urlencoded({
  extended: true,
  limit: '10kb'  // Small for form data
}))

// 2. Limit parameter count
app.use(express.urlencoded({
  extended: true,
  parameterLimit: 50
}))

// 3. Validate expected fields
app.post('/login', (req, res) => {
  const { username, password } = req.body

  // Only use expected fields, ignore others
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' })
  }

  // Don't spread req.body directly into database queries
  authenticateUser(username, password)
})
```

## When to Use

| Use Case | Middleware |
|----------|------------|
| HTML form submissions | express.urlencoded() |
| AJAX with JSON | express.json() |
| API requests | express.json() |
| File uploads | multer (third-party) |

## Related

- [express-json](../express-json/) - JSON body parsing
- [express-static](../express-static/) - Static file serving
- [multer](../../third-party/multer/) - File upload handling

---

*express.urlencoded() is essential for handling traditional HTML form submissions.*
