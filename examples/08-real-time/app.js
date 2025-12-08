/**
 * Example 08: Real-Time Communication
 *
 * WebSocket integration with Socket.io.
 */

const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

app.use(express.json())

// ============================================
// In-Memory State
// ============================================

const state = {
  users: new Map(),      // socketId -> user info
  rooms: new Map(),      // roomName -> Set of socketIds
  messages: []           // Message history
}

// ============================================
// Socket.io Middleware
// ============================================

// Authentication middleware
io.use((socket, next) => {
  const username = socket.handshake.auth.username

  if (!username) {
    return next(new Error('Username required'))
  }

  // Check if username is taken
  for (const [, user] of state.users) {
    if (user.username === username) {
      return next(new Error('Username already taken'))
    }
  }

  socket.username = username
  next()
})

// ============================================
// Socket.io Connection Handler
// ============================================

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.username} (${socket.id})`)

  // Store user
  state.users.set(socket.id, {
    id: socket.id,
    username: socket.username,
    connectedAt: new Date().toISOString()
  })

  // Notify others
  socket.broadcast.emit('user:joined', {
    id: socket.id,
    username: socket.username
  })

  // Send current users list
  socket.emit('users:list', Array.from(state.users.values()))

  // Send recent messages
  socket.emit('messages:history', state.messages.slice(-50))

  // ========================================
  // Chat Messages
  // ========================================

  socket.on('message:send', (data) => {
    const message = {
      id: Date.now().toString(),
      userId: socket.id,
      username: socket.username,
      text: data.text,
      room: data.room || null,
      timestamp: new Date().toISOString()
    }

    // Store message
    state.messages.push(message)
    if (state.messages.length > 100) {
      state.messages.shift()
    }

    if (data.room) {
      // Room message
      io.to(data.room).emit('message:received', message)
    } else {
      // Broadcast to all
      io.emit('message:received', message)
    }
  })

  // Private message
  socket.on('message:private', (data) => {
    const { to, text } = data

    const message = {
      id: Date.now().toString(),
      from: socket.id,
      fromUsername: socket.username,
      to,
      text,
      timestamp: new Date().toISOString()
    }

    // Send to recipient
    io.to(to).emit('message:private', message)
    // Send back to sender
    socket.emit('message:private', message)
  })

  // Typing indicator
  socket.on('typing:start', (data) => {
    if (data.room) {
      socket.to(data.room).emit('typing:update', {
        userId: socket.id,
        username: socket.username,
        isTyping: true
      })
    } else {
      socket.broadcast.emit('typing:update', {
        userId: socket.id,
        username: socket.username,
        isTyping: true
      })
    }
  })

  socket.on('typing:stop', (data) => {
    if (data.room) {
      socket.to(data.room).emit('typing:update', {
        userId: socket.id,
        username: socket.username,
        isTyping: false
      })
    } else {
      socket.broadcast.emit('typing:update', {
        userId: socket.id,
        username: socket.username,
        isTyping: false
      })
    }
  })

  // ========================================
  // Rooms
  // ========================================

  socket.on('room:join', (roomName) => {
    socket.join(roomName)

    if (!state.rooms.has(roomName)) {
      state.rooms.set(roomName, new Set())
    }
    state.rooms.get(roomName).add(socket.id)

    // Notify room
    io.to(roomName).emit('room:userJoined', {
      room: roomName,
      userId: socket.id,
      username: socket.username
    })

    // Send room users
    const roomUsers = Array.from(state.rooms.get(roomName))
      .map(id => state.users.get(id))
      .filter(Boolean)

    socket.emit('room:users', { room: roomName, users: roomUsers })
  })

  socket.on('room:leave', (roomName) => {
    socket.leave(roomName)

    if (state.rooms.has(roomName)) {
      state.rooms.get(roomName).delete(socket.id)
    }

    io.to(roomName).emit('room:userLeft', {
      room: roomName,
      userId: socket.id,
      username: socket.username
    })
  })

  socket.on('room:list', () => {
    const rooms = Array.from(state.rooms.entries()).map(([name, users]) => ({
      name,
      userCount: users.size
    }))
    socket.emit('room:list', rooms)
  })

  // ========================================
  // Presence
  // ========================================

  socket.on('presence:update', (status) => {
    const user = state.users.get(socket.id)
    if (user) {
      user.status = status
      io.emit('presence:updated', {
        userId: socket.id,
        status
      })
    }
  })

  // ========================================
  // Disconnect
  // ========================================

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.username}`)

    // Remove from rooms
    for (const [roomName, users] of state.rooms) {
      if (users.has(socket.id)) {
        users.delete(socket.id)
        io.to(roomName).emit('room:userLeft', {
          room: roomName,
          userId: socket.id,
          username: socket.username
        })
      }
    }

    // Remove user
    state.users.delete(socket.id)

    // Notify others
    io.emit('user:left', {
      id: socket.id,
      username: socket.username
    })
  })
})

// ============================================
// REST API Endpoints
// ============================================

// Get online users
app.get('/api/users', (req, res) => {
  res.json(Array.from(state.users.values()))
})

// Get rooms
app.get('/api/rooms', (req, res) => {
  const rooms = Array.from(state.rooms.entries()).map(([name, users]) => ({
    name,
    userCount: users.size
  }))
  res.json(rooms)
})

// Get recent messages
app.get('/api/messages', (req, res) => {
  const limit = parseInt(req.query.limit) || 50
  res.json(state.messages.slice(-limit))
})

// Broadcast message from server
app.post('/api/broadcast', (req, res) => {
  const { message } = req.body

  if (!message) {
    return res.status(400).json({ error: 'Message required' })
  }

  io.emit('message:system', {
    id: Date.now().toString(),
    text: message,
    timestamp: new Date().toISOString()
  })

  res.json({ success: true })
})

// ============================================
// Client HTML
// ============================================

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Real-Time Chat</title>
      <script src="/socket.io/socket.io.js"></script>
      <style>
        * { box-sizing: border-box; }
        body { font-family: sans-serif; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        #login { text-align: center; padding: 50px; }
        #chat { display: none; }
        .messages {
          height: 400px;
          border: 1px solid #ddd;
          overflow-y: auto;
          padding: 10px;
          margin-bottom: 10px;
        }
        .message { margin: 5px 0; padding: 5px; background: #f5f5f5; border-radius: 4px; }
        .message.system { background: #e3f2fd; font-style: italic; }
        .message.private { background: #fff3e0; }
        .message .meta { font-size: 12px; color: #666; }
        .input-group { display: flex; gap: 10px; }
        .input-group input { flex: 1; padding: 10px; }
        .input-group button { padding: 10px 20px; }
        .users { margin-top: 20px; }
        .users h3 { margin-bottom: 10px; }
        .user { padding: 5px; background: #e8f5e9; margin: 2px 0; border-radius: 4px; }
        .typing { font-style: italic; color: #666; height: 20px; }
        .rooms { margin-top: 10px; }
        .room-btn { margin: 2px; padding: 5px 10px; cursor: pointer; }
        .room-btn.active { background: #2196f3; color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <div id="login">
          <h1>Real-Time Chat</h1>
          <input type="text" id="username" placeholder="Enter username">
          <button onclick="connect()">Join</button>
        </div>

        <div id="chat">
          <h2>Chat <span id="currentRoom">(Global)</span></h2>

          <div class="rooms">
            <strong>Rooms:</strong>
            <button class="room-btn active" onclick="joinRoom(null)">Global</button>
            <button class="room-btn" onclick="joinRoom('general')">General</button>
            <button class="room-btn" onclick="joinRoom('random')">Random</button>
          </div>

          <div class="messages" id="messages"></div>
          <div class="typing" id="typing"></div>

          <div class="input-group">
            <input type="text" id="messageInput" placeholder="Type a message..." onkeyup="handleTyping(event)">
            <button onclick="sendMessage()">Send</button>
          </div>

          <div class="users">
            <h3>Online Users</h3>
            <div id="usersList"></div>
          </div>
        </div>
      </div>

      <script>
        let socket;
        let currentRoom = null;
        let typingTimeout;

        function connect() {
          const username = document.getElementById('username').value.trim();
          if (!username) return alert('Enter username');

          socket = io({ auth: { username } });

          socket.on('connect', () => {
            document.getElementById('login').style.display = 'none';
            document.getElementById('chat').style.display = 'block';
          });

          socket.on('connect_error', (err) => {
            alert(err.message);
          });

          socket.on('users:list', (users) => {
            updateUsersList(users);
          });

          socket.on('user:joined', (user) => {
            addSystemMessage(user.username + ' joined');
          });

          socket.on('user:left', (user) => {
            addSystemMessage(user.username + ' left');
          });

          socket.on('messages:history', (messages) => {
            messages.forEach(addMessage);
          });

          socket.on('message:received', addMessage);

          socket.on('message:private', (msg) => {
            addMessage({ ...msg, private: true });
          });

          socket.on('message:system', (msg) => {
            addSystemMessage(msg.text);
          });

          socket.on('typing:update', (data) => {
            if (data.isTyping) {
              document.getElementById('typing').textContent = data.username + ' is typing...';
            } else {
              document.getElementById('typing').textContent = '';
            }
          });

          socket.on('room:userJoined', (data) => {
            if (data.room === currentRoom) {
              addSystemMessage(data.username + ' joined ' + data.room);
            }
          });

          socket.on('room:userLeft', (data) => {
            if (data.room === currentRoom) {
              addSystemMessage(data.username + ' left ' + data.room);
            }
          });
        }

        function addMessage(msg) {
          const div = document.createElement('div');
          div.className = 'message' + (msg.private ? ' private' : '');
          div.innerHTML = '<strong>' + (msg.username || msg.fromUsername) + '</strong>: ' + msg.text +
            '<div class="meta">' + new Date(msg.timestamp).toLocaleTimeString() +
            (msg.private ? ' (private)' : '') + '</div>';
          document.getElementById('messages').appendChild(div);
          div.scrollIntoView();
        }

        function addSystemMessage(text) {
          const div = document.createElement('div');
          div.className = 'message system';
          div.textContent = text;
          document.getElementById('messages').appendChild(div);
          div.scrollIntoView();
        }

        function updateUsersList(users) {
          document.getElementById('usersList').innerHTML = users
            .map(u => '<div class="user">' + u.username + '</div>')
            .join('');
        }

        function sendMessage() {
          const input = document.getElementById('messageInput');
          const text = input.value.trim();
          if (!text) return;

          socket.emit('message:send', { text, room: currentRoom });
          input.value = '';
          socket.emit('typing:stop', { room: currentRoom });
        }

        function handleTyping(e) {
          if (e.key === 'Enter') return sendMessage();

          socket.emit('typing:start', { room: currentRoom });
          clearTimeout(typingTimeout);
          typingTimeout = setTimeout(() => {
            socket.emit('typing:stop', { room: currentRoom });
          }, 1000);
        }

        function joinRoom(room) {
          if (currentRoom) socket.emit('room:leave', currentRoom);
          currentRoom = room;
          if (room) socket.emit('room:join', room);

          document.querySelectorAll('.room-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.toLowerCase() === (room || 'global'));
          });
          document.getElementById('currentRoom').textContent = '(' + (room || 'Global') + ')';
          document.getElementById('messages').innerHTML = '';
        }
      </script>
    </body>
    </html>
  `);
});

// Start server
const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`Real-time server running on http://localhost:${PORT}`)
  console.log('\nFeatures:')
  console.log('  - Global chat')
  console.log('  - Room-based chat')
  console.log('  - Private messages')
  console.log('  - Typing indicators')
  console.log('  - User presence')
  console.log('\nAPI Endpoints:')
  console.log('  GET  /api/users    - Online users')
  console.log('  GET  /api/rooms    - Active rooms')
  console.log('  GET  /api/messages - Recent messages')
  console.log('  POST /api/broadcast - System broadcast')
})
