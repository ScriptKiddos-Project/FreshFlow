import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

// Export rateLimit for use in routes
export { rateLimit };

// Redis client for rate limiting
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  logger.error('Redis Rate Limit Error:', err);
});

redisClient.connect().catch((err) => {
  logger.error('Failed to connect to Redis for rate limiting:', err);
});

// Custom key generator for rate limiting
const generateKey = (req: any) => {
  const userId = req.user?.id;
  const ip = req.ip || req.connection.remoteAddress;
  return userId ? `user:${userId}` : `ip:${ip}`;
};

// General API rate limiter
export const generalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later',
    retryAfter: '15 minutes'
  },
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication rate limiter (stricter)
export const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later',
    retryAfter: '15 minutes'
  },
  keyGenerator: (req) => (req.ip || req.connection.remoteAddress || 'unknown') as string,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Password reset rate limiter
export const passwordResetLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    error: 'Too many password reset attempts, please try again later',
    retryAfter: '1 hour'
  },
  keyGenerator: (req) => (req.ip || req.connection.remoteAddress || 'unknown') as string,
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload rate limiter
export const uploadLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // limit each user to 20 uploads per 10 minutes
  message: {
    error: 'Too many file uploads, please try again later',
    retryAfter: '10 minutes'
  },
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
});

// Order creation rate limiter
export const orderLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each user to 10 orders per 5 minutes
  message: {
    error: 'Too many orders created, please slow down',
    retryAfter: '5 minutes'
  },
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
});

// Search rate limiter (for expensive operations)
export const searchLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each user to 30 searches per minute
  message: {
    error: 'Too many search requests, please slow down',
    retryAfter: '1 minute'
  },
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin operations rate limiter
export const adminLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // limit admin operations
  message: {
    error: 'Too many admin operations, please slow down',
    retryAfter: '1 minute'
  },
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
});

// Custom rate limiter factory
export const createCustomLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: any) => string;
}) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: options.message,
      retryAfter: `${Math.ceil(options.windowMs / 60000)} minutes`
    },
    keyGenerator: options.keyGenerator || generateKey,
    standardHeaders: true,
    legacyHeaders: false,
  });
};