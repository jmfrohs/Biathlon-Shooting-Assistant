const { Server } = require('socket.io');
const logger = require('./utils/logger');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: false
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000,
    maxHttpBufferSize: 1e6,
    allowUpgrades: true,
    httpCompression: true
  });

  io.on('connection', (socket) => {
    // Extract user info from JWT if available
    let userEmail = null;
    const auth = socket.handshake.auth.token;
    if (auth && auth.startsWith('Bearer ')) {
      try {
        const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
        if (payload.email) userEmail = payload.email;
      } catch { /* ignore */ }
    }

    logger.socket(userEmail, 'connected', `transport: ${socket.conn.transport.name}`);

    socket.on('join_session', (sessionId) => {
      const room = `session_${sessionId}`;
      socket.join(room);
      const clientsInRoom = io.sockets.adapter.rooms.get(room)?.size || 0;
      logger.socket(userEmail, 'join_session', `session_${sessionId} (${clientsInRoom} clients)`);
    });

    socket.on('leave_session', (sessionId) => {
      const room = `session_${sessionId}`;
      socket.leave(room);
      logger.socket(userEmail, 'leave_session', `session_${sessionId}`);
    });

    socket.on('disconnect', () => {
      logger.socket(userEmail, 'disconnected', '');
    });

    socket.on('disconnect_error', (error) => {
      logger.warn(`Socket Error: ${error}`);
    });
  });

  return io;
}

function getIo() {
  return io;
}

function emitSessionUpdate(sessionId, data) {
  if (io) {
    const room = `session_${sessionId}`;
    const clientsInRoom = io.sockets.adapter.rooms.get(room)?.size || 0;
    logger.socket(null, 'broadcast', `session_updated to ${clientsInRoom} clients in ${room}`);
    io.to(room).emit('session_updated', data);
  }
}

module.exports = { initSocket, getIo, emitSessionUpdate };
