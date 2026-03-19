import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { catchAsync, createError } from '../middleware/errorHandler';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';

interface AuthRequest extends Request {
  user?: any;
}

class AuthController {
  // Generate JWT token
  private signToken(id: string): string {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    
    return (jwt.sign as any)({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  }

  // Generate refresh token
  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create and send token response
  private async createSendToken(user: any, statusCode: number, res: Response): Promise<void> {
    const token = this.signToken(user._id);
    const refreshToken = this.generateRefreshToken();
    
    const cookieOptions = {
      expires: new Date(
        Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRES_IN!) || 7) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
    };

    res.cookie('jwt', token, cookieOptions);
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Save refresh token to user
    user.refreshToken = refreshToken;
    user.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    // Remove sensitive data from output
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;
    delete userResponse.passwordResetToken;
    delete userResponse.emailVerificationToken;

    res.status(statusCode).json({
      status: 'success',
      token,
      data: {
        user: userResponse,
      },
    });
  }

  // Register new user
  public register = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, passwordConfirm, phone, businessName, businessType, address } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone) {
      throw createError('Name, email, password, and phone are required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createError('Please provide a valid email address', 400);
    }

    // Validate phone format (Indian phone numbers)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
      throw createError('Please provide a valid 10-digit phone number', 400);
    }

    // Check if passwords match
    if (password !== passwordConfirm) {
      throw createError('Passwords do not match', 400);
    }

    // Password strength validation
    if (password.length < 8) {
      throw createError('Password must be at least 8 characters long', 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { phone }] 
    });
    
    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw createError('User with this email already exists', 409);
      }
      if (existingUser.phone === phone) {
        throw createError('User with this phone number already exists', 409);
      }
    }

    // Validate business type if provided
    const validBusinessTypes = ['restaurant', 'food_stall', 'catering', 'bakery', 'cafe', 'other'];
    if (businessType && !validBusinessTypes.includes(businessType)) {
      throw createError('Invalid business type', 400);
    }

    try {
      // Create new user
      const newUser = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        phone: phone.replace(/\s+/g, ''),
        businessName: businessName?.trim(),
        businessType,
        address,
        location: {
          type: 'Point',
          coordinates: [0, 0]  // Add default or use actual coordinates if provided
        },
        isVerified: false,
        role: 'vendor',
        isActive: true,
        createdAt: new Date(),
      });
      // Send verification email
      try {
        await authService.sendVerificationEmailToUser(newUser);
        logger.info(`Verification email sent to ${email}`);
      } catch (error) {
        logger.error('Failed to send verification email:', error);
        // Don't throw error here, user registration should still succeed
      }

      await this.createSendToken(newUser, 201, res);
    } catch (error: any) {
      if (error.code === 11000) {
        // Handle duplicate key error
        const field = Object.keys(error.keyValue)[0];
        throw createError(`User with this ${field} already exists`, 409);
      }
      throw error;
    }
  });

  // Login user
  public login = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      throw createError('Please provide email and password', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createError('Please provide a valid email address', 400);
    }

    // Check if user exists and password is correct
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+password +isActive');
    
    if (!user) {
      throw createError('Incorrect email or password', 401);
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      throw createError('Incorrect email or password', 401);
    }

    // Check if account is active
    if (!user.isActive) {
      throw createError('Your account has been deactivated. Please contact support.', 401);
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    await this.createSendToken(user, 200, res);
  });

  // Logout user
  public logout = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    // Clear refresh token from database
    if (req.user?.id) {
      await User.findByIdAndUpdate(req.user.id, {
        $unset: { refreshToken: 1, refreshTokenExpires: 1 }
      });
    }

    // Clear cookies
    const cookieOptions = {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
    };

    res.cookie('jwt', '', cookieOptions);
    res.cookie('refreshToken', '', cookieOptions);

    res.status(200).json({ 
      status: 'success',
      message: 'Logged out successfully' 
    });
  });

  // Refresh token
  public refreshToken = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      throw createError('No refresh token provided', 401);
    }

    // Find user with this refresh token
    const user = await User.findOne({
      refreshToken,
      refreshTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      throw createError('Invalid or expired refresh token', 401);
    }

    // Check if user is still active
    if (!user.isActive) {
      throw createError('Account is deactivated', 401);
    }

    await this.createSendToken(user, 200, res);
  });

  // Forgot password
  public forgotPassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    if (!email) {
      throw createError('Please provide an email address', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createError('Please provide a valid email address', 400);
    }

    // Get user based on email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      throw createError('There is no user with that email address', 404);
    }

    if (!user.isActive) {
      throw createError('Account is deactivated', 401);
    }

    // Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      await authService.sendPasswordResetEmailToUser(user, resetToken);

      res.status(200).json({
        status: 'success',
        message: 'Password reset token sent to email!',
      });
    } catch (err: any) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      logger.error('Failed to send password reset email:', err);
      throw createError('There was an error sending the email. Try again later.', 500);
    }
  });

  // Reset password
  public resetPassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;
    const { password, passwordConfirm } = req.body;

    if (!token) {
      throw createError('Reset token is required', 400);
    }

    if (!password || !passwordConfirm) {
      throw createError('Password and password confirmation are required', 400);
    }

    if (password !== passwordConfirm) {
      throw createError('Passwords do not match', 400);
    }

    // Password strength validation
    if (password.length < 8) {
      throw createError('Password must be at least 8 characters long', 400);
    }

    // Get user based on the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    // If token has not expired, and there is a user, set the new password
    if (!user) {
      throw createError('Token is invalid or has expired', 400);
    }

    if (!user.isActive) {
      throw createError('Account is deactivated', 401);
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    // Log the user in, send JWT
    await this.createSendToken(user, 200, res);
  });

  // Update password for logged in user
  public updatePassword = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const { passwordCurrent, password, passwordConfirm } = req.body;

    if (!passwordCurrent || !password || !passwordConfirm) {
      throw createError('Current password, new password, and password confirmation are required', 400);
    }

    if (password !== passwordConfirm) {
      throw createError('New passwords do not match', 400);
    }

    // Password strength validation
    if (password.length < 8) {
      throw createError('Password must be at least 8 characters long', 400);
    }

    // Get user from collection
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      throw createError('User not found', 404);
    }

    if (!user.isActive) {
      throw createError('Account is deactivated', 401);
    }

    // Check if POSTed current password is correct
    const isCurrentPasswordCorrect = await user.comparePassword(passwordCurrent);
    if (!isCurrentPasswordCorrect) {
      throw createError('Your current password is incorrect', 401);
    }

    // Check if new password is different from current
    const isSamePassword = await user.comparePassword(password);
    if (isSamePassword) {
      throw createError('New password must be different from current password', 400);
    }

    // Update password
    user.password = password;
    user.passwordChangedAt = new Date();
    await user.save();

    // Log user in, send JWT
    await this.createSendToken(user, 200, res);
  });

  // Verify email
  public verifyEmail = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;

    if (!token) {
      throw createError('Verification token is required', 400);
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw createError('Token is invalid or has expired', 400);
    }

    if (user.isVerified) {
      throw createError('Email is already verified', 400);
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully!',
    });
  });

  // Resend verification email
  public resendVerificationEmail = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    if (!email) {
      throw createError('Email address is required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createError('Please provide a valid email address', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      throw createError('User not found', 404);
    }

    if (!user.isActive) {
      throw createError('Account is deactivated', 401);
    }

    if (user.isVerified) {
      throw createError('Email is already verified', 400);
    }

    try {
      await authService.sendVerificationEmailToUser(user);

      res.status(200).json({
        status: 'success',
        message: 'Verification email sent!',
      });
    } catch (error: any) {
      logger.error('Failed to resend verification email:', error);
      throw createError('Failed to send verification email. Please try again later.', 500);
    }
  });

  // Get current user
  public getMe = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user?.id) {
      throw createError('User not authenticated', 401);
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      throw createError('User not found', 404);
    }

    if (!user.isActive) {
      throw createError('Account is deactivated', 401);
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  });

  // Check authentication status
  public checkAuth = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user?.id) {
      throw createError('Not authenticated', 401);
    }

    const user = await User.findById(req.user.id);
    
    if (!user || !user.isActive) {
      throw createError('User not found or deactivated', 401);
    }

    res.status(200).json({
      status: 'success',
      data: {
        authenticated: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      },
    });
  });
}

export const authController = new AuthController();