import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { User } from '../models/User';

// Extend the Socket type to include authenticated user
interface SocketWithUser extends Socket {
  user?: any;
}

declare global {
  var io: Server | undefined;
}

// export a mutable io reference so other modules can import { io }
export let io: Server | undefined = global.io;

export const initializeSocket = (ioInstance: Server): void => {
  io = ioInstance;
  global.io = ioInstance;
  
  // Authentication middleware for Socket.IO
  io.use(async (socket: SocketWithUser, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        logger.warn('Socket auth failed: No token provided');
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        logger.warn('Socket auth failed: User not found');
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error: any) {
      logger.error(`Socket authentication error: ${error.message}`);
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: SocketWithUser) => {
    logger.info(`✅ User connected: ${socket.user?.name} (${socket.user?._id})`);

    // Personal room
    socket.join(`user:${socket.user._id}`);

    // Vendor-specific rooms
    if (socket.user.role === 'vendor') {
      socket.join('vendors');
      socket.join(`vendor:${socket.user._id}`);
    }

    // Admin room
    if (socket.user.role === 'admin') {
      socket.join('admins');
    }

    // Ingredient price updates
    socket.on('subscribe:ingredient', (ingredientId: string) => {
      socket.join(`ingredient:${ingredientId}`);
      logger.info(`User ${socket.user._id} subscribed to ingredient ${ingredientId}`);
    });

    socket.on('unsubscribe:ingredient', (ingredientId: string) => {
      socket.leave(`ingredient:${ingredientId}`);
      logger.info(`User ${socket.user._id} unsubscribed from ingredient ${ingredientId}`);
    });

    // Order updates
    socket.on('subscribe:order', (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`⚠️ User disconnected: ${socket.user?.name} (${socket.user?._id}) - Reason: ${reason}`);
    });
  });

  // Store the instance globally and update exported reference
  global.io = ioInstance;
  io = ioInstance;
};
