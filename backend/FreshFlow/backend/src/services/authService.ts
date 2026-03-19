import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { responseHelpers } from '../utils/helpers';
import crypto from 'crypto';
import { redisClient } from '../config/redis';
import { Types } from 'mongoose';
import sgMail from '@sendgrid/mail';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  businessName: string;
  businessType: 'restaurant' | 'street_vendor' | 'catering' | 'other';
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
}

export class AuthService {
  private readonly JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
  private readonly JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
  private readonly JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
  private readonly SALT_ROUNDS = 12;

  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  /**
   * Register a new user
   */
  async register(userData: RegisterData) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email },
          { phone: userData.phone }
        ]
      });

      if (existingUser) {
        throw new Error('User with this email or phone already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, this.SALT_ROUNDS);

      // Create verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const user = new User({
        ...userData,
        password: hashedPassword,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpiry,
        isVerified: false,
        status: 'pending_verification',
        createdAt: new Date(),
        lastLogin: null
      });

      await user.save();

      // Send verification email
      await this.sendVerificationEmail(user.email, verificationToken, user.name);

      // Generate tokens (user can use app even without email verification)
      const tokens = await this.generateTokens(user._id.toString());

      // Log successful registration
      logger.info(`New user registered: ${user.email}`);

      return {
        user: this.sanitizeUser(user),
        tokens,
        message: 'Registration successful. Please check your email for verification link.'
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials) {
    try {
      const { email, password } = credentials;

      // Find user by email
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (user.status === 'suspended' || user.status === 'banned') {
        throw new Error('Account is suspended. Please contact support.');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        // Log failed login attempt
        await this.logFailedLoginAttempt(user._id.toString(), 'invalid_password');
        throw new Error('Invalid email or password');
      }

      // Check for too many failed attempts
      const failedAttempts = await this.getFailedLoginAttempts(user._id.toString());
      if (failedAttempts >= 5) {
        if (!redisClient) throw new Error('Redis not connected');
        const lockoutTime = await redisClient.ttl(`lockout:${user._id}`);
        if (lockoutTime > 0) {
          throw new Error(`Account temporarily locked. Try again in ${Math.ceil(lockoutTime / 60)} minutes.`);
        }
      }

      // Clear failed login attempts
      await this.clearFailedLoginAttempts(user._id.toString());

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      // Generate tokens
      const tokens = await this.generateTokens(user._id.toString());

      // Log successful login
      logger.info(`User logged in: ${user.email}`);

      return {
        user: this.sanitizeUser(user),
        tokens
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as any;
      
      // Check if token exists in Redis (for blacklisting)
      if (!redisClient) throw new Error('Redis not connected');
      const isBlacklisted = await redisClient.get(`blacklist_refresh:${refreshToken}`);
      if (isBlacklisted) {
        throw new Error('Refresh token has been revoked');
      }

      // Find user
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user._id.toString());

      // Blacklist old refresh token
      await redisClient.setEx(
        `blacklist_refresh:${refreshToken}`,
        7 * 24 * 60 * 60, // 7 days
        'revoked'
      );

      return tokens;
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(accessToken: string, refreshToken: string) {
    try {
      if (!redisClient) throw new Error('Redis not connected');
      
      // Blacklist both tokens
      const accessDecoded = jwt.decode(accessToken) as any;
      const refreshDecoded = jwt.decode(refreshToken) as any;

      if (accessDecoded) {
        const accessTTL = accessDecoded.exp - Math.floor(Date.now() / 1000);
        if (accessTTL > 0) {
          await redisClient.setEx(`blacklist_access:${accessToken}`, accessTTL, 'revoked');
        }
      }

      if (refreshDecoded) {
        const refreshTTL = refreshDecoded.exp - Math.floor(Date.now() / 1000);
        if (refreshTTL > 0) {
          await redisClient.setEx(`blacklist_refresh:${refreshToken}`, refreshTTL, 'revoked');
        }
      }

      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string) {
    try {
      const user = await User.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() }
      });

      if (!user) {
        throw new Error('Invalid or expired verification token');
      }

      user.isVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      user.status = 'active';

      await user.save();

      logger.info(`Email verified for user: ${user.email}`);

      return { message: 'Email verified successfully' };
    } catch (error) {
      logger.error('Email verification error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if email exists or not
        return { message: 'If the email exists, a reset link has been sent.' };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      user.passwordResetToken = resetToken;
      user.passwordResetExpires = resetExpiry;
      await user.save();

      // Send reset email
      await this.sendPasswordResetEmail(user.email, resetToken, user.name);

      logger.info(`Password reset requested for: ${user.email}`);

      return { message: 'If the email exists, a reset link has been sent.' };
    } catch (error) {
      logger.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string) {
    try {
      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      user.password = hashedPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.passwordChangedAt = new Date();

      await user.save();

      // Invalidate all existing sessions
      await this.invalidateAllUserSessions(user._id.toString());

      logger.info(`Password reset completed for user: ${user.email}`);

      return { message: 'Password reset successfully' };
    } catch (error) {
      logger.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      user.password = hashedPassword;
      user.passwordChangedAt = new Date();
      await user.save();

      logger.info(`Password changed for user: ${user.email}`);

      return { message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Password change error:', error);
      throw error;
    }
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(userId: string): Promise<AuthTokens> {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    this.JWT_ACCESS_SECRET,
    { expiresIn: this.JWT_ACCESS_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    this.JWT_REFRESH_SECRET,
    { expiresIn: this.JWT_REFRESH_EXPIRY }
  );

  // Store refresh token in Redis for session management
  if (!redisClient) throw new Error('Redis not connected');
  await redisClient.setEx(
    `refresh_token:${userId}`,
    7 * 24 * 60 * 60, // 7 days
    refreshToken
  );

  return { accessToken, refreshToken };
}
  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: any) {
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.emailVerificationToken;
    delete userObj.emailVerificationExpires;
    delete userObj.passwordResetToken;
    delete userObj.passwordResetExpires;
    return userObj;
  }

  /**
   * Public method to send verification email to user
   */
  public async sendVerificationEmailToUser(user: any): Promise<void> {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save({ validateBeforeSave: false });

    await this.sendVerificationEmail(user.email, verificationToken, user.name);
  }

  /**
   * Public method to send password reset email to user
   */
  public async sendPasswordResetEmailToUser(user: any, resetToken: string): Promise<void> {
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save({ validateBeforeSave: false });

    await this.sendPasswordResetEmail(user.email, resetToken, user.name);
  }

  /**
   * Send verification email
   */
  /**
   * Send verification email
   */
  private async sendVerificationEmail(email: string, token: string, name: string) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    console.log(token);
    const msg = {
      to: email,
      from: process.env.EMAIL_FROM || 'freshflow390@gmail.com',
      subject: 'Verify Your FreshFlow Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to FreshFlow, ${name}!</h2>
          <p>Thank you for registering with FreshFlow. Please verify your email address to complete your registration.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6B7280;">${verificationUrl}</p>
          <p><small>This link will expire in 24 hours.</small></p>
        </div>
      `
    };

    await sgMail.send(msg);
  }

  /**
   * Send password reset email
   */
  /**
   * Send password reset email
   */
  private async sendPasswordResetEmail(email: string, token: string, name: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const msg = {
      to: email,
      from: process.env.EMAIL_FROM || 'freshflow390@gmail.com',
      subject: 'Reset Your FreshFlow Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hi ${name},</p>
          <p>You requested to reset your password for your FreshFlow account. Click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #EF4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If you didn't request this reset, please ignore this email.</p>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6B7280;">${resetUrl}</p>
          <p><small>This link will expire in 1 hour.</small></p>
        </div>
      `
    };

    await sgMail.send(msg);
  }

  /**
   * Log failed login attempt
   */
  private async logFailedLoginAttempt(userId: string, reason: string) {
    if (!redisClient) throw new Error('Redis not connected');
    
    const key = `failed_login:${userId}`;
    const attempts = await redisClient.incr(key);
    await redisClient.expire(key, 30 * 60); // 30 minutes

    if (attempts >= 5) {
      // Lock account for 15 minutes
      await redisClient.setEx(`lockout:${userId}`, 15 * 60, 'locked');
      logger.warn(`Account locked due to too many failed attempts: ${userId}`);
    }
  }

  /**
   * Get failed login attempts
   */
  private async getFailedLoginAttempts(userId: string): Promise<number> {
    if (!redisClient) return 0;
    const attempts = await redisClient.get(`failed_login:${userId}`);
    return attempts ? parseInt(attempts) : 0;
  }

  /**
   * Clear failed login attempts
   */
  private async clearFailedLoginAttempts(userId: string) {
    if (!redisClient) return;
    await redisClient.del(`failed_login:${userId}`);
    await redisClient.del(`lockout:${userId}`);
  }

  /**
   * Invalidate all user sessions
   */
  private async invalidateAllUserSessions(userId: string) {
    if (!redisClient) throw new Error('Redis not connected');
    await redisClient.del(`refresh_token:${userId}`);
    // Add to a session invalidation list
    await redisClient.setEx(`invalidate_sessions:${userId}`, 24 * 60 * 60, Date.now().toString());
  }
}

export const authService = new AuthService();