import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import authRoutes from './routes/auth';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser() as any);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'FreshFlow Backend is running!',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server with DB connections
const startServer = async () => {
  try {
    await connectDatabase();
    await connectRedis();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 Test: http://localhost:${PORT}/api/auth/register`);
    });
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
};

startServer();