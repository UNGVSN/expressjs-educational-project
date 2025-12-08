# Example 08: Real-Time Communication

WebSocket integration with Socket.io.

## What You'll Learn

- Socket.io setup with Express
- Real-time messaging
- Rooms and namespaces
- Typing indicators
- User presence
- Broadcasting
- Authentication

## Running the Example

```bash
npm install
npm start

# Open http://localhost:3000 in multiple tabs
```

## Features

- Global chat
- Room-based chat
- Private messages
- Typing indicators
- User online/offline status
- Message history

## Socket Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `message:send` | `{ text, room? }` | Send message |
| `message:private` | `{ to, text }` | Private message |
| `typing:start` | `{ room? }` | Start typing |
| `typing:stop` | `{ room? }` | Stop typing |
| `room:join` | `roomName` | Join room |
| `room:leave` | `roomName` | Leave room |
| `presence:update` | `status` | Update status |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `users:list` | `[users]` | Online users |
| `user:joined` | `{ id, username }` | User joined |
| `user:left` | `{ id, username }` | User left |
| `message:received` | `message` | New message |
| `message:private` | `message` | Private message |
| `message:system` | `message` | System message |
| `typing:update` | `{ userId, isTyping }` | Typing state |

## Key Concepts

### Socket.io Setup

```javascript
const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer)

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('message', (data) => {
    io.emit('message', data)  // Broadcast to all
  })

  socket.on('disconnect', () => {
    console.log('User disconnected')
  })
})

httpServer.listen(3000)
```

### Authentication

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  try {
    socket.user = verifyToken(token)
    next()
  } catch (err) {
    next(new Error('Authentication failed'))
  }
})
```

### Rooms

```javascript
// Join room
socket.join('room-name')

// Leave room
socket.leave('room-name')

// Send to room
io.to('room-name').emit('event', data)

// Send to room except sender
socket.to('room-name').emit('event', data)
```

### Broadcasting

```javascript
// To all connected clients
io.emit('event', data)

// To all except sender
socket.broadcast.emit('event', data)

// To specific socket
io.to(socketId).emit('event', data)
```

## REST API

```bash
# Get online users
curl http://localhost:3000/api/users

# Get active rooms
curl http://localhost:3000/api/rooms

# Get recent messages
curl http://localhost:3000/api/messages

# Broadcast system message
curl -X POST http://localhost:3000/api/broadcast \
  -H "Content-Type: application/json" \
  -d '{"message":"Server announcement!"}'
```

## Client Implementation

```javascript
// Connect with auth
const socket = io({
  auth: { username: 'user1' }
})

// Handle connection
socket.on('connect', () => {
  console.log('Connected:', socket.id)
})

// Send message
socket.emit('message:send', { text: 'Hello!' })

// Receive message
socket.on('message:received', (msg) => {
  console.log(msg.username + ': ' + msg.text)
})

// Join room
socket.emit('room:join', 'general')

// Handle disconnect
socket.on('disconnect', () => {
  console.log('Disconnected')
})
```

## Exercises

1. Add message reactions
2. Implement read receipts
3. Add file sharing
4. Create moderation features
5. Add message persistence to database

## Next Steps

→ [09-full-application](../09-full-application/) - Complete production app
