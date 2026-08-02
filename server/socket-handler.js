const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./utils/logger');
const { getSocketIp, isIpBanned } = require('./middleware/ip-ban');
const { JWT_SECRET } = require('./middleware/auth');

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

  io.use((socket, next) => {
    const ip = getSocketIp(socket);
    if (isIpBanned(ip)) {
      logger.security('warning', 'Gebannte IP hat Socket-Zugriff versucht', {
        ip,
        transport: socket.conn?.transport?.name || 'unknown'
      });
      return next(new Error('Access denied'));
    }

    // Extract auth token
    let token = socket.handshake.auth?.token;
    if (token && token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
    }

    // Try reading token from cookie if not passed directly
    if (!token && socket.handshake.headers?.cookie) {
      const cookieHeader = socket.handshake.headers.cookie;
      const match = cookieHeader.match(/b_auth_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

    if (!token) {
      logger.warn(`Unauthenticated socket connection attempt from IP: ${ip}`);
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;

      // Check if user is blocked in database
      if (decoded.userId) {
        const { getDb } = require('./db/database');
        const db = getDb();
        const user = db.prepare('SELECT is_blocked FROM users WHERE id = ?').get(decoded.userId);
        if (user && user.is_blocked === 1) {
          logger.security('warning', 'Blocked user attempted Socket access', {
            ip,
            email: decoded.email
          });
          return next(new Error('Access denied (Account blocked)'));
        }
      }

      return next();
    } catch (err) {
      logger.warn(`Invalid socket token from IP: ${ip} - ${err.message}`);
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userEmail = socket.user?.email || 'guest@invite.local';

    logger.socket(userEmail, 'connected', `transport: ${socket.conn.transport.name}`);

    socket.on('join_session', (sessionId) => {
      // Basic security check: Make sure guest sockets only join the session they are allowed to see
      if (socket.user?.role === 'session_guest' && Number(socket.user.guestSessionId) !== Number(sessionId)) {
        logger.warn(`Guest socket tried to access unauthorized session. Expected ${socket.user.guestSessionId}, got ${sessionId}`);
        return;
      }

      const room = `session_${sessionId}`;
      socket.join(room);
      socket.currentSessionId = sessionId;
      const clientsInRoom = io.sockets.adapter.rooms.get(room)?.size || 0;
      logger.socket(userEmail, 'join_session', `session_${sessionId} (${clientsInRoom} clients)`);

      // Broadcast join notification to other participants in the room
      socket.to(room).emit('user_joined_session', {
        sessionId,
        userEmail,
        timestamp: Date.now()
      });
    });

    socket.on('leave_session', (sessionId) => {
      const room = `session_${sessionId}`;
      socket.to(room).emit('user_left_session', {
        sessionId,
        userEmail,
        timestamp: Date.now()
      });
      socket.leave(room);
      if (socket.currentSessionId === sessionId) {
        socket.currentSessionId = null;
      }
      logger.socket(userEmail, 'leave_session', `session_${sessionId}`);
    });

    socket.on('disconnect', () => {
      if (socket.currentSessionId) {
        const room = `session_${socket.currentSessionId}`;
        socket.to(room).emit('user_left_session', {
          sessionId: socket.currentSessionId,
          userEmail,
          timestamp: Date.now()
        });
      }
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
