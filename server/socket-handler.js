const { Server } = require('socket.io');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`  🔌 Socket verbunden: ${socket.id}`);

    socket.on('join_session', (sessionId) => {
      const room = `session_${sessionId}`;
      socket.join(room);
      console.log(`  👥 Socket ${socket.id} ist Raum ${room} beigetreten`);
    });

    socket.on('leave_session', (sessionId) => {
      const room = `session_${sessionId}`;
      socket.leave(room);
      console.log(`  👥 Socket ${socket.id} hat Raum ${room} verlassen`);
    });

    socket.on('disconnect', () => {
      console.log(`  🔌 Socket getrennt: ${socket.id}`);
    });
  });

  return io;
}

function getIo() {
  return io;
}

function emitSessionUpdate(sessionId, data) {
  if (io) {
    io.to(`session_${sessionId}`).emit('session_updated', data);
  }
}

module.exports = { initSocket, getIo, emitSessionUpdate };
