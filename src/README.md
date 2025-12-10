# Express.js Reconstruction - Step-by-Step Implementation

This directory contains a complete, progressive reconstruction of Express.js from scratch. Each step builds upon the previous one, teaching you exactly how Express works internally.

## Learning Path

| Step | Directory | What You'll Build | Key Concepts |
|------|-----------|-------------------|--------------|
| 01 | `01-http-server-foundation/` | Raw HTTP server with routing concepts | Node.js http module, request/response lifecycle |
| 02 | `02-request-response-enhancement/` | Enhanced req/res objects | Prototype extension, helper methods |
| 03 | `03-basic-routing/` | Route matching and handlers | Path matching, HTTP methods, route parameters |
| 04 | `04-middleware-pipeline/` | Middleware execution system | next() function, middleware stack, async handling |
| 05 | `05-router-class/` | Modular Router implementation | Router mounting, sub-routers, route isolation |
| 06 | `06-application-class/` | Full Application class | Settings, locals, mounting, listen() |
| 07 | `07-static-file-serving/` | Static file middleware | MIME types, streaming, caching headers |
| 08 | `08-template-engines/` | View rendering system | Engine registration, res.render(), layouts |
| 09 | `09-error-handling/` | Error middleware system | Error propagation, async errors, error formatting |
| 10 | `10-body-parsers/` | Request body parsing | JSON, URL-encoded, raw, text parsers |
| 11 | `11-cookies-sessions/` | Cookie and session support | Parsing, signing, session stores |
| 12 | `12-complete-framework/` | Complete mini-Express | All features integrated, production-ready |

## How to Use This

### Progressive Learning
Start with Step 01 and work through each step sequentially. Each step:
1. Has a `README.md` explaining the concepts
2. Contains `lib/` with the implementation
3. Has `test/` with test cases proving it works
4. Includes `examples/` showing real usage

### Running Tests
```bash
cd src/01-http-server-foundation
npm install
npm test
```

### Running Examples
```bash
cd src/01-http-server-foundation/examples
node basic-server.js
```

## Architecture Overview

```
Express Request Lifecycle:

    HTTP Request
         │
         ▼
   ┌─────────────┐
   │   Server    │  (01-http-server-foundation)
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │  Enhanced   │  (02-request-response-enhancement)
   │   Req/Res   │
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │ Middleware  │  (04-middleware-pipeline)
   │  Pipeline   │
   │             │
   │  ┌───────┐  │
   │  │ MW 1  │──┼──► next()
   │  └───────┘  │
   │  ┌───────┐  │
   │  │ MW 2  │──┼──► next()
   │  └───────┘  │
   │  ┌───────┐  │
   │  │ MW N  │──┼──► next()
   │  └───────┘  │
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │   Router    │  (03-basic-routing, 05-router-class)
   │             │
   │  Match Path │
   │  Match Method│
   │  Extract Params│
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │   Route     │
   │  Handler    │
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │  Response   │
   │   Sent      │
   └─────────────┘
```

## What Makes This Different

Unlike tutorials that just show you how to USE Express, this project teaches you how to BUILD Express. You'll understand:

- Why `next()` exists and how it works
- How route parameters like `:id` are extracted
- Why middleware order matters
- How `app.use()` differs from `app.get()`
- The real implementation of `res.json()`, `res.send()`, etc.
- How Express handles async errors
- Why `express.static()` is so fast

## Prerequisites

- Solid JavaScript knowledge (ES6+)
- Basic Node.js understanding
- Familiarity with HTTP concepts
- Command line basics

## File Structure Per Step

```
XX-step-name/
├── README.md           # Detailed explanation
├── INTERNALS.md        # Deep dive into implementation
├── package.json        # Dependencies
├── lib/
│   ├── index.js        # Main export
│   ├── [component].js  # Implementation files
│   └── utils.js        # Utilities
├── test/
│   ├── [component].test.js
│   └── integration.test.js
└── examples/
    ├── basic.js
    └── advanced.js
```

## Getting Started

```bash
# Start with Step 01
cd 01-http-server-foundation
npm install
npm test
node examples/basic-server.js
```

Then open http://localhost:3000 and experiment!
