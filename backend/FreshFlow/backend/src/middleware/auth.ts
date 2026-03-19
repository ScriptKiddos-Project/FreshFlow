import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUserDocument } from '../models/User';
import { Types } from 'mongoose';

interface JWTPayload {
  userId: string;
  iat: number;
  exp: number;
}

// Main authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'UNAUTHORIZED'
      });
      return;
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    
    // Validate user exists and is active
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: 'UNAUTHORIZED'
      });
      return;
    }

    // Check if user account is suspended
    if (user.status === 'suspended') {
      res.status(403).json({
        success: false,
        message: 'Account suspended. Contact support.',
        error: 'ACCOUNT_SUSPENDED'
      });
      return;
    }

    // Attach user info to request
    req.user = user;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: 'INVALID_TOKEN'
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired',
        error: 'TOKEN_EXPIRED'
      });
      return;
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: 'AUTH_ERROR'
    });
  }
};

// Admin role authorization
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'UNAUTHORIZED'
    });
    return;
  }

  if ((req.user as IUserDocument).role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
      error: 'INSUFFICIENT_PRIVILEGES'
    });
    return;
  }

  next();
};

// Vendor role authorization
export const requireVendor = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'UNAUTHORIZED'
    });
    return;
  }

  if ((req.user as IUserDocument).role !== 'vendor') {
    res.status(403).json({
      success: false,
      message: 'Vendor access required',
      error: 'INSUFFICIENT_PRIVILEGES'
    });
    return;
  }

  next();
};

// Verified user requirement
export const requireVerified = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'UNAUTHORIZED'
    });
    return;
  }

  if (!(req.user as IUserDocument).isEmailVerified) {
    res.status(403).json({
      success: false,
      message: 'Email verification required',
      error: 'EMAIL_NOT_VERIFIED'
    });
    return;
  }

  next();
};

// Resource ownership check
export const requireOwnership = (resourceIdParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      const resourceId = req.params[resourceIdParam];
      const userId = (req.user as IUserDocument)._id.toString();

      // Admin can access any resource
      if ((req.user as IUserDocument).role === 'admin') {
        next();
        return;
      }

      if (!resourceId) {
        res.status(400).json({
          success: false,
          message: 'Resource ID required',
          error: 'MISSING_RESOURCE_ID'
        });
        return;
      }

      // Validate ObjectId format
      if (!Types.ObjectId.isValid(resourceId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid resource ID format',
          error: 'INVALID_RESOURCE_ID'
        });
        return;
      }

      // Store resource info for use in controllers
      (req as any).resourceId = resourceId;
      (req as any).isOwner = resourceId === userId;

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        error: 'AUTHORIZATION_ERROR'
      });
    }
  };
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      next();
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.status !== 'suspended') {
      req.user = user;
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

// Export aliases for backward compatibility
export const auth = authenticate;
export const authMiddleware = authenticate;