import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode: number;
  isOperational?: boolean;
  code?: string | number;
  path?: string;
  value?: any;
  keyValue?: Record<string, any>;
}

class ErrorHandler {
  // Handle Mongoose CastError (Invalid ObjectId)
  private handleCastErrorDB(err: any): AppError {
    const message = `Invalid ${err.path}: ${err.value}`;
    const error = new Error(message) as AppError;
    error.statusCode = 400;
    error.isOperational = true;
    return error;
  }

  // Handle Mongoose Duplicate Key Error
  private handleDuplicateFieldsDB(err: any): AppError {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
    const error = new Error(message) as AppError;
    error.statusCode = 409;
    error.isOperational = true;
    return error;
  }

  // Handle Mongoose Validation Error
  private handleValidationErrorDB(err: any): AppError {
    const errors = Object.values(err.errors).map((el: any) => el.message);
    const message = `Invalid input data: ${errors.join('. ')}`;
    const error = new Error(message) as AppError;
    error.statusCode = 400;
    error.isOperational = true;
    return error;
  }

  // Handle JWT Errors
  private handleJWTError(): AppError {
    const error = new Error('Invalid token. Please log in again') as AppError;
    error.statusCode = 401;
    error.isOperational = true;
    return error;
  }

  private handleJWTExpiredError(): AppError {
    const error = new Error('Token expired. Please log in again') as AppError;
    error.statusCode = 401;
    error.isOperational = true;
    return error;
  }

  // Send error in development
  private sendErrorDev(err: AppError, res: Response) {
    res.status(err.statusCode || 500).json({
      status: 'error',
      error: err,
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
  }

  // Send error in production
  private sendErrorProd(err: AppError, res: Response) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: 'error',
        message: err.message,
        timestamp: new Date().toISOString()
      });
    } else {
      // Programming or other unknown error: don't leak error details
      logger.error('ERROR:', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong!',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Main error handling middleware
  public globalErrorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    err.statusCode = err.statusCode || 500;

    if (process.env.NODE_ENV === 'development') {
      this.sendErrorDev(err, res);
    } else {
      let error = { ...err };
      error.message = err.message;

      // Handle specific MongoDB errors
      if (error.name === 'CastError') error = this.handleCastErrorDB(error);
      if (error.code === 11000) error = this.handleDuplicateFieldsDB(error);
      if (error.name === 'ValidationError') error = this.handleValidationErrorDB(error);
      if (error.name === 'JsonWebTokenError') error = this.handleJWTError();
      if (error.name === 'TokenExpiredError') error = this.handleJWTExpiredError();

      this.sendErrorProd(error, res);
    }
  };

  // Async error wrapper
  public catchAsync = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
      fn(req, res, next).catch(next);
    };
  };

  // Create operational error
  public createError = (message: string, statusCode: number): AppError => {
    const error = new Error(message) as AppError;
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
  };
}

export const errorHandler = new ErrorHandler();
export const catchAsync = errorHandler.catchAsync;
export const createError = errorHandler.createError;
export default errorHandler.globalErrorHandler;