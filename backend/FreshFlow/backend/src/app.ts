import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";

import { connectDatabase } from "./config/database";
import { connectRedis } from "./config/redis";
import { initializeSocket } from "./config/socket";
import { configurePassport } from "./config/passport";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";

// Import routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import ingredientRoutes from "./routes/ingredients";
import orderRoutes from "./routes/orders";
import analyticsRoutes from "./routes/analytics";
import adminRoutes from "./routes/admin";

class App {
  public app: express.Application;
  public server: any;
  public io: Server;
  private isInitialized: boolean = false;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    this.initializeMiddlewares();
    this.initializeSocket();
  }

  private initializeMiddlewares(): void {
    // Security middlewares
    this.app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
      })
    );

    this.app.use(
      cors({
        origin: [
          process.env.FRONTEND_URL || "http://localhost:3000",
          process.env.ADMIN_URL || "http://localhost:3001",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "x-refresh-token"],
      })
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: "Too many requests from this IP, please try again later.",
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use("/api/", limiter);

    this.app.use(cookieParser() as any);

    // Body parsing and compression
    this.app.use(compression());
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Data sanitization
    this.app.use(mongoSanitize());

    // Passport configuration
    configurePassport();

    // Logging middleware
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get("/health", (req, res) => {
      res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        database: this.isInitialized ? "connected" : "disconnected",
      });
    });

    // API routes
    this.app.use("/api/auth", authRoutes);
    this.app.use("/api/users", userRoutes);
    this.app.use("/api/ingredients", ingredientRoutes);
    this.app.use("/api/orders", orderRoutes);
    this.app.use("/api/analytics", analyticsRoutes);
    this.app.use("/api/admin", adminRoutes);

    // 404 handler
    this.app.use("*", (req, res) => {
      res.status(404).json({
        success: false,
        message: "Route not found",
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler as any);
  }

  private async initializeDatabase(): Promise<void> {
    try {
      logger.info("Connecting to MongoDB...");
      await connectDatabase();
      logger.info("✅ MongoDB connected successfully");
      
      logger.info("Connecting to Redis...");
      await connectRedis();
      logger.info("✅ Redis connected successfully");
      
      this.isInitialized = true;
      logger.info("✅ All database connections established");
    } catch (error) {
      logger.error("❌ Database connection failed:", error);
      process.exit(1);
    }
  }

  private initializeSocket(): void {
    initializeSocket(this.io);
  }

  public async initialize(): Promise<void> {
    await this.initializeDatabase();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  public listen(): void {
    const port = process.env.PORT || 5000;
    this.server.listen(port, () => {
      logger.info(`🚀 Server running on port ${port} in ${process.env.NODE_ENV} mode`);
    });
  }
}

const appInstance = new App();
export const app = appInstance.app;
export default appInstance;