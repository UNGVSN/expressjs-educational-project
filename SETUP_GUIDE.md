# Setup Guide

This guide will help you set up your development environment for working through the Express.js educational materials.

---

## Prerequisites

- **Node.js** 18+ (LTS recommended) - Required for Express 5.x
- **npm** 9+ (included with Node.js)
- **Git** for version control
- **VS Code** (recommended) with extensions:
  - ESLint
  - Prettier
  - REST Client or Thunder Client
  - GitLens

---

## Quick Start

### 1. Verify Node.js Installation

```bash
# Check Node.js version (must be 18+)
node --version

# Check npm version
npm --version
```

If Node.js is not installed, download from [nodejs.org](https://nodejs.org/).

### 2. Create a New Project

```bash
# Create project directory
mkdir my-express-app
cd my-express-app

# Initialize npm project
npm init -y
```

### 3. Install Express

```bash
# Install Express.js 5.x
npm install express
```

### 4. Create Your First App

Create `app.js`:

```javascript
const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
```

### 5. Run the Server

```bash
node app.js
```

Visit `http://localhost:3000` in your browser.

---

## Project Structure for Learning

```
my-express-app/
├── src/
│   ├── app.js              # Main application file
│   ├── routes/             # Route modules
│   │   ├── index.js
│   │   └── users.js
│   ├── middleware/         # Custom middleware
│   │   ├── logger.js
│   │   └── auth.js
│   ├── controllers/        # Request handlers
│   │   └── userController.js
│   └── config/             # Configuration files
│       └── index.js
├── public/                 # Static files
│   ├── css/
│   ├── js/
│   └── images/
├── views/                  # Template files (if using)
│   └── index.pug
├── tests/                  # Test files
│   └── app.test.js
├── .env                    # Environment variables
├── .gitignore
├── package.json
└── README.md
```

---

## Git Setup

### Initial Repository Setup

```bash
# Initialize git repository
git init

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Build
dist/
build/

# Test coverage
coverage/
EOF

# Initial commit
git add .
git commit -m "chore: initial project setup"
```

### Branch Strategy for Learning

```bash
# Create branch for each learning module
git checkout -b core-concepts/application

# After completing the module
git add .
git commit -m "feat(core-concepts): complete application module"

# Merge to main
git checkout main
git merge core-concepts/application

# Continue to next module
git checkout -b core-concepts/request
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance

**Examples:**
```bash
git commit -m "feat(routing): add user routes with CRUD operations"
git commit -m "fix(middleware): correct error handling in auth middleware"
git commit -m "docs(readme): add API documentation"
git commit -m "refactor(controllers): extract validation logic"
git commit -m "test(routes): add integration tests for user endpoints"
git commit -m "chore(deps): update express to 5.1.0"
```

---

## Development Tools Setup

### ESLint Configuration

```bash
# Install ESLint
npm install --save-dev eslint

# Initialize ESLint
npx eslint --init
```

Create `.eslintrc.json`:

```json
{
  "env": {
    "node": true,
    "es2022": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "indent": ["error", 2],
    "linebreak-style": ["error", "unix"],
    "quotes": ["error", "single"],
    "semi": ["error", "never"],
    "no-unused-vars": ["warn"]
  }
}
```

### Prettier Configuration

```bash
# Install Prettier
npm install --save-dev prettier
```

Create `.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80
}
```

### Nodemon for Development

```bash
# Install nodemon
npm install --save-dev nodemon
```

Update `package.json`:

```json
{
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write src/"
  }
}
```

---

## VS Code Settings

### Workspace Settings

Create `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": ["javascript"],
  "files.exclude": {
    "node_modules": true
  },
  "javascript.updateImportsOnFileMove.enabled": "always"
}
```

### Recommended Extensions

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "rangav.vscode-thunder-client",
    "eamodio.gitlens",
    "christian-kohler.path-intellisense",
    "formulahendry.auto-rename-tag"
  ]
}
```

### Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Express",
      "program": "${workspaceFolder}/src/app.js",
      "restart": true,
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Express",
      "program": "${workspaceFolder}/src/app.js",
      "env": {
        "DEBUG": "express:*",
        "NODE_ENV": "development"
      }
    }
  ]
}
```

---

## Environment Variables

### Setup dotenv

```bash
npm install dotenv
```

Create `.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=mongodb://localhost:27017/myapp
SESSION_SECRET=your-secret-key
```

Load in `app.js`:

```javascript
require('dotenv').config()

const port = process.env.PORT || 3000
```

### Environment-Specific Configs

```javascript
// config/index.js
const config = {
  development: {
    port: 3000,
    db: 'mongodb://localhost:27017/dev'
  },
  production: {
    port: process.env.PORT,
    db: process.env.DATABASE_URL
  },
  test: {
    port: 3001,
    db: 'mongodb://localhost:27017/test'
  }
}

module.exports = config[process.env.NODE_ENV || 'development']
```

---

## Testing Setup

### Install Jest

```bash
npm install --save-dev jest supertest
```

Update `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": ["src/**/*.js"]
  }
}
```

### Example Test

Create `tests/app.test.js`:

```javascript
const request = require('supertest')
const app = require('../src/app')

describe('GET /', () => {
  it('should return Hello World', async () => {
    const res = await request(app).get('/')
    expect(res.statusCode).toBe(200)
    expect(res.text).toBe('Hello World!')
  })
})
```

---

## Debugging Express

### Using DEBUG Environment Variable

```bash
# See all Express internal logs
DEBUG=express:* node app.js

# See only router logs
DEBUG=express:router node app.js

# See only application logs
DEBUG=express:application node app.js

# Multiple namespaces
DEBUG=express:router,express:application node app.js
```

### On Windows PowerShell

```powershell
$env:DEBUG='express:*'; node app.js
```

### On Windows CMD

```cmd
set DEBUG=express:* & node app.js
```

---

## Common Issues and Solutions

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Module Not Found

```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Permission Errors

```bash
# Fix npm permissions (Linux/Mac)
sudo chown -R $(whoami) ~/.npm
```

---

## Git Hooks with Husky

### Setup Husky

```bash
# Install husky
npm install --save-dev husky

# Initialize husky
npx husky init
```

### Pre-commit Hook

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint
npm test
```

### Commit-msg Hook (Conventional Commits)

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

Create `commitlint.config.js`:

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional']
}
```

Create `.husky/commit-msg`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit $1
```

---

## Next Steps

1. Complete the setup following this guide
2. Start with [Core Concepts - Application](./core-concepts/application/)
3. Progress through the learning path
4. Build the example projects

Happy learning!
