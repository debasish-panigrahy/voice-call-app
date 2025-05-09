require('dotenv').config(); // Load .env variables

const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const socketIo = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Define CallLog model
const CallLog = mongoose.model('CallLog', new mongoose.Schema({
  roomId: String,
  startTime: Date,
  endTime: Date,
  duration: Number
}));

// Track users in each room
const roomUsers = {};      // { roomId: Set of socket.id }
const roomCallers = {};    // { roomId: Set of socket.id }

const emitRoomStats = (roomId) => {
  const totalUsers = roomUsers[roomId]?.size || 0;
  const totalCallers = roomCallers[roomId]?.size || 0;

  io.to(roomId).emit('room-stats', {
    totalUsers,
    totalCallers
  });
};

io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    if (!roomUsers[roomId]) roomUsers[roomId] = new Set();
    roomUsers[roomId].add(socket.id);
    emitRoomStats(roomId);
  });

  socket.on('start-call', async ({ roomId, startTime }) => {
    try {
      if (!roomCallers[roomId]) roomCallers[roomId] = new Set();
      roomCallers[roomId].add(socket.id);
      await CallLog.create({ roomId, startTime });
      emitRoomStats(roomId);
      console.log(`Call started in room ${roomId}`);
    } catch (err) {
      console.error('Start call log error:', err);
    }
  });

  socket.on('end-call', async ({ roomId, endTime, duration }) => {
    try {
      roomCallers[roomId]?.delete(socket.id);
      await CallLog.findOneAndUpdate(
        { roomId },
        { endTime, duration },
        { new: true, sort: { startTime: -1 } }
      );
      emitRoomStats(roomId);
      console.log(`Call ended in room ${roomId}`);
    } catch (err) {
      console.error('End call log error:', err);
    }
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (roomUsers[roomId]) {
        roomUsers[roomId].delete(socket.id);
        if (roomUsers[roomId].size === 0) {
          delete roomUsers[roomId];
          delete roomCallers[roomId];
        }
      }
      if (roomCallers[roomId]) {
        roomCallers[roomId].delete(socket.id);
      }
      emitRoomStats(roomId);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
