require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const quizRoutes = require('./routes/quiz');
const sessionRoutes = require('./routes/session');
const { setupSocketHandlers } = require('./socket/handlers');
const { tiktokManager } = require('./tiktok/manager');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/quiz', quizRoutes);
app.use('/api/session', sessionRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Socket.IO
setupSocketHandlers(io);

// Chia sẻ io instance cho các module khác
tiktokManager.setIO(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});
