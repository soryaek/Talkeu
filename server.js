const path = require('path');
const http = require('http');  
const express = require('express');
const socketio = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { formatMessage } = require('./utils/messages');
const {userJoin, getCurrentUser, userLeave, getRoomUsers, validateUsername} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

const validateJoinRoom = [
  body('username').trim().isLength({ min: 1, max: 20 }).withMessage('Username must be between 1 and 20 characters'),
  body('room').trim().isLength({ min: 1, max: 50 }).withMessage('Room name must be between 1 and 50 characters')
];

const chatBot = 'Talkeu Chatbot';

const typingUsers = new Map();

io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`);

  // Send immediate confirmation
  socket.emit('connected', { id: socket.id });

  socket.on('joinRoom', ({ username, room }) => {
    try {
      const errors = validationResult({ body: { username, room } });
      if (!errors.isEmpty()) {
        socket.emit('error', { message: 'Invalid input data' });
        return;
      }

      const sanitizedUsername = username.trim().substring(0, 20);
      const sanitizedRoom = room.trim().substring(0, 50);

      const existingUser = getRoomUsers(sanitizedRoom).find(u => u.username === sanitizedUsername);
      if (existingUser) {
        socket.emit('error', { message: 'Username already taken in this room' });
        return;
      }

      const user = userJoin(socket.id, sanitizedUsername, sanitizedRoom);
      socket.join(user.room);

      socket.emit('message', formatMessage(chatBot, 'Welcome to Talkeu! 🎉'));

      socket.broadcast
        .to(user.room)
        .emit(
          'message',
          formatMessage(chatBot, `${user.username} has joined the chat 👋`)
        );

      // Broadcast to all users in the room
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });

      // Send room info to the joining user
      socket.emit('roomJoined', {
        room: user.room,
        users: getRoomUsers(user.room)
      });

      console.log(`User ${user.username} joined room ${user.room}`);
      console.log(`Room ${user.room} now has ${getRoomUsers(user.room).length} users`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('chatMessage', msg => {
    try {
      const user = getCurrentUser(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      const sanitizedMsg = msg.trim().substring(0, 1000);
      if (!sanitizedMsg) {
        return;
      }

      socket.broadcast.to(user.room).emit('stopTyping', user.username);

      io.to(user.room).emit('message', formatMessage(user.username, sanitizedMsg));
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('typing', () => {
    const user = getCurrentUser(socket.id);
    if (user) {
      socket.broadcast.to(user.room).emit('userTyping', user.username);
    }
  });

  socket.on('stopTyping', () => {
    const user = getCurrentUser(socket.id);
    if (user) {
      socket.broadcast.to(user.room).emit('stopTyping', user.username);
    }
  });

  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(chatBot, `${user.username} has left the chat 👋`)
      );

      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });

      console.log(`User ${user.username} left room ${user.room}`);
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;

// Production optimizations
if (process.env.NODE_ENV === 'production') {
  console.log('🚀 Running in production mode');
  
  // Increase memory limit for production
  process.setMaxListeners(0);
  
  // Better error handling for production
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} to start chatting`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
