import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

// make the client nullable to satisfy strict TS checks and add generics to RedisClientType
export let redisClient: RedisClientType<any, any> | null = null;

export const connectRedis = async (): Promise<void> => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 60000,
      },
    });

    redisClient.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('Redis ready for operations');
    });

    redisClient.on('end', () => {
      logger.warn('Redis connection ended');
    });

    await redisClient.connect();
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
};

export const getRedisClient = (): RedisClientType<any, any> => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

// Cache helper functions
export const setCache = async (key: string, value: any, expireInSeconds = 3600): Promise<void> => {
  try {
    const client = getRedisClient();
    await client.setEx(key, expireInSeconds, JSON.stringify(value));
  } catch (error) {
    logger.error('Redis set error:', error);
  }
};

export const getCache = async (key: string): Promise<any> => {
  try {
    const client = getRedisClient();
    const result = await client.get(key);
    return result ? JSON.parse(result) : null;
  } catch (error) {
    logger.error('Redis get error:', error);
    return null;
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    logger.error('Redis delete error:', error);
  }
};
