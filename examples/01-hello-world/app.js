/**
 * Example 01: Hello World
 *
 * The simplest possible Express.js application.
 * This demonstrates the basic structure of an Express app.
 */

const express = require('express')

// Create Express application
const app = express()

// Define route for root URL
app.get('/', (req, res) => {
  res.send('Hello World!')
})

// Additional routes to explore
app.get('/about', (req, res) => {
  res.send('About page')
})

app.get('/json', (req, res) => {
  res.json({
    message: 'Hello World!',
    timestamp: new Date().toISOString()
  })
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log('Available routes:')
  console.log('  GET /       - Hello World')
  console.log('  GET /about  - About page')
  console.log('  GET /json   - JSON response')
})
