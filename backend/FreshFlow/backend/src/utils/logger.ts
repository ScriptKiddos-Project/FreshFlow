import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  // Add timestamp to logs
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  // Tell Winston that the logs must be colored
  winston.format.colorize({ all: true }),
  // Define the format of the message showing the timestamp, the level and the message
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define different log levels
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports: [
    // Console transport
    new winston.transports.Console(),
    
    // File transport for errors
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
  ],
});

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Add request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;
    
    if (res.statusCode >= 400) {
      logger.error(message);
    } else {
      logger.http(message);
    }
  });
  
  next();
};

// Enhanced logging methods
const enhancedLogger = {
  error: (message: string, error?: any, metadata?: any) => {
    if (error && error.stack) {
      logger.error(`${message} - ${error.message}\nStack: ${error.stack}`, metadata);
    } else {
      logger.error(message, metadata);
    }
  },
  
  warn: (message: string, metadata?: any) => {
    logger.warn(message, metadata);
  },
  
  info: (message: string, metadata?: any) => {
    logger.info(message, metadata);
  },
  
  http: (message: string, metadata?: any) => {
    logger.http(message, metadata);
  },
  
  debug: (message: string, metadata?: any) => {
    logger.debug(message, metadata);
  },
  
  // Business logic specific logging
  business: {
    orderCreated: (orderId: string, buyerId: string, sellerId: string, amount: number) => {
      logger.info(`ORDER_CREATED: Order ${orderId} created by buyer ${buyerId} from seller ${sellerId} for ₹${amount}`);
    },
    
    orderStatusChanged: (orderId: string, oldStatus: string, newStatus: string, updatedBy: string) => {
      logger.info(`ORDER_STATUS_CHANGED: Order ${orderId} status changed from ${oldStatus} to ${newStatus} by ${updatedBy}`);
    },
    
    priceUpdated: (ingredientId: string, oldPrice: number, newPrice: number, reason: string) => {
      logger.info(`PRICE_UPDATED: Ingredient ${ingredientId} price changed from ₹${oldPrice} to ₹${newPrice} - ${reason}`);
    },
    
    userRegistered: (userId: string, email: string, role: string) => {
      logger.info(`USER_REGISTERED: New ${role} registered - ${userId} (${email})`);
    },
    
    userLogin: (userId: string, email: string, ip: string) => {
      logger.info(`USER_LOGIN: User ${userId} (${email}) logged in from ${ip}`);
    },
    
    ingredientListed: (ingredientId: string, sellerId: string, name: string, price: number) => {
      logger.info(`INGREDIENT_LISTED: ${name} (${ingredientId}) listed by ${sellerId} at ₹${price}`);
    },
    
    paymentProcessed: (orderId: string, amount: number, method: string, status: string) => {
      logger.info(`PAYMENT_PROCESSED: Order ${orderId} payment of ₹${amount} via ${method} - ${status}`);
    },
    
    wasteReduced: (ingredientId: string, quantity: number, savings: number) => {
      logger.info(`WASTE_REDUCED: ${quantity}kg of ingredient ${ingredientId} sold, saving ₹${savings}`);
    }
  },
  
  // Security logging
  security: {
    authFailure: (email: string, ip: string, reason: string) => {
      logger.warn(`AUTH_FAILURE: Login failed for ${email} from ${ip} - ${reason}`);
    },
    
    suspiciousActivity: (userId: string, activity: string, ip: string) => {
      logger.warn(`SUSPICIOUS_ACTIVITY: User ${userId} from ${ip} - ${activity}`);
    },
    
    rateLimitExceeded: (ip: string, endpoint: string) => {
      logger.warn(`RATE_LIMIT_EXCEEDED: IP ${ip} exceeded rate limit for ${endpoint}`);
    },
    
    unauthorizedAccess: (userId: string | undefined, resource: string, ip: string) => {
      logger.warn(`UNAUTHORIZED_ACCESS: ${userId || 'Anonymous'} attempted to access ${resource} from ${ip}`);
    }
  },
  
  // Performance logging
  performance: {
    slowQuery: (query: string, duration: number, threshold: number = 1000) => {
      if (duration > threshold) {
        logger.warn(`SLOW_QUERY: Query took ${duration}ms (threshold: ${threshold}ms) - ${query}`);
      }
    },
    
    highMemoryUsage: (usage: number, threshold: number = 80) => {
      if (usage > threshold) {
        logger.warn(`HIGH_MEMORY_USAGE: Memory usage at ${usage}% (threshold: ${threshold}%)`);
      }
    },
    
    apiResponse: (endpoint: string, method: string, duration: number, statusCode: number) => {
      const level = statusCode >= 400 ? 'error' : duration > 1000 ? 'warn' : 'debug';
      logger[level](`API_RESPONSE: ${method} ${endpoint} - ${statusCode} (${duration}ms)`);
    }
  }
};

export { enhancedLogger as logger };
export default enhancedLogger;