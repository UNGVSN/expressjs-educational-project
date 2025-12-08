# Example 01: Hello World

The simplest possible Express.js application.

## What You'll Learn

- Creating an Express application
- Setting up a basic route
- Starting the server
- Handling GET requests

## Files

- `app.js` - Main application file
- `package.json` - Project configuration

## Running the Example

```bash
# Install dependencies
npm install

# Start the server
npm start

# Visit http://localhost:3000
```

## Code Walkthrough

### app.js

```javascript
// Import Express
const express = require('express')

// Create an Express application
const app = express()

// Define a route for GET requests to the root URL
app.get('/', (req, res) => {
  res.send('Hello World!')
})

// Start the server on port 3000
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
```

## Key Concepts

### 1. Creating the Application

```javascript
const express = require('express')
const app = express()
```

`express()` creates an Express application instance.

### 2. Defining Routes

```javascript
app.get('/', (req, res) => {
  res.send('Hello World!')
})
```

- `app.get()` - Handle GET requests
- `'/'` - The path to match
- `(req, res)` - Request and response objects
- `res.send()` - Send a response

### 3. Starting the Server

```javascript
app.listen(3000, () => {
  console.log('Server running')
})
```

`app.listen()` starts the HTTP server.

## Try It

1. Run the server: `npm start`
2. Open `http://localhost:3000` in your browser
3. See "Hello World!" displayed

## Exercises

1. Change the response message
2. Add a new route at `/about`
3. Return JSON instead of text
4. Use a different port

## Next Steps

→ [02-basic-routing](../02-basic-routing/) - Learn HTTP methods and routes
