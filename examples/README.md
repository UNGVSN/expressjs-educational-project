# Examples

Complete, runnable Express.js applications demonstrating various concepts.

## Overview

Each example is a standalone application that can be run independently to understand specific Express.js concepts in practice.

## Examples

| # | Example | Description | Concepts |
|---|---------|-------------|----------|
| 01 | [hello-world](./01-hello-world/) | Minimal Express app | Basic setup |
| 02 | [basic-routing](./02-basic-routing/) | HTTP methods and routes | Routing |
| 03 | [middleware-chain](./03-middleware-chain/) | Middleware patterns | Middleware |
| 04 | [error-handling](./04-error-handling/) | Error handling patterns | Errors |
| 05 | [rest-api](./05-rest-api/) | RESTful API | CRUD, JSON |
| 06 | [authentication](./06-authentication/) | JWT authentication | Auth, JWT |
| 07 | [file-upload](./07-file-upload/) | File upload handling | Multer |
| 08 | [real-time](./08-real-time/) | WebSocket integration | Socket.io |
| 09 | [full-application](./09-full-application/) | Production-ready app | All concepts |

## Running Examples

```bash
# Navigate to example directory
cd examples/01-hello-world

# Install dependencies
npm install

# Run the example
npm start

# Or with nodemon for development
npm run dev
```

## Learning Path

### Beginner
1. **01-hello-world** - Start here to understand the basics
2. **02-basic-routing** - Learn HTTP methods and routing
3. **03-middleware-chain** - Understand middleware flow

### Intermediate
4. **04-error-handling** - Master error handling patterns
5. **05-rest-api** - Build a complete REST API
6. **06-authentication** - Implement JWT authentication

### Advanced
7. **07-file-upload** - Handle file uploads
8. **08-real-time** - Add real-time features
9. **09-full-application** - Study a complete application

## Example Structure

Each example follows this structure:

```
example-name/
├── README.md        # Explanation and instructions
├── package.json     # Dependencies
├── app.js           # Main application file
├── routes/          # Route handlers (if applicable)
├── middleware/      # Custom middleware (if applicable)
└── config/          # Configuration (if applicable)
```

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Basic JavaScript knowledge
- Understanding of HTTP concepts

## Quick Start

```bash
# Clone and run the first example
cd examples/01-hello-world
npm install
npm start

# Visit http://localhost:3000
```

---

*Work through these examples progressively to master Express.js.*
