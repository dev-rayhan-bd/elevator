import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from '../modules/Auth/auth.utils';
import config from '../config';

 


let io: Server;

export const initializeSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.use((socket, next) => {

    const token = socket.handshake.query.token as string;

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = verifyToken(token, config.jwt_access_secret as string);

      socket.data.user = decoded; 
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log('✅ User Authenticated & Connected:', socket.data.user.userId);

    socket.on('disconnect', () => {
      console.log('❌ User disconnected');
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};