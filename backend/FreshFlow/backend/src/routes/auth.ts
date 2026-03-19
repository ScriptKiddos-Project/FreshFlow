import { Router, Request, Response } from 'express';
// import { body, query } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, IUserDocument } from '../models/User';
import { authMiddleware } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { logger } from '../utils/logger';
import Joi from 'joi';

// Create a simple validate function since the imported one has issues
const validateBody = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: Function) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorDetails
      });
    }

    req.body = value;
    next();
  };
};

// Validation schemas
const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().lowercase().required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
  businessName: Joi.string().trim().min(2).max(100).required(),
  businessType: Joi.string().valid('street_vendor', 'restaurant', 'cafe', 'cloud_kitchen', 'catering').required(),
  location: Joi.object({
    address: Joi.string().trim().min(10).max(200).required(),
    city: Joi.string().trim().min(2).max(50).required(),
    state: Joi.string().trim().min(2).max(50).required(),
    pincode: Joi.string().pattern(/^[1-9][0-9]{5}$/).required(),
    coordinates: Joi.array().items(Joi.number()).length(2).optional()
  }).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required()
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().required()
});

const verifyPhoneSchema = Joi.object({
  otp: Joi.string().length(6).pattern(/^\d+$/).required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().required()
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
});

const router = Router();

// Rate limiting for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later'
});

const otpRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: 'Too many OTP requests, please try again later'
});

// Helper functions
const generateTokens = (userId: any) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

const verifyRefreshToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
  } catch {
    return null;
  }
};

const sendEmail = async (options: any) => {
  logger.info(`Email would be sent to: ${options.to}`);
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const verifyOTP = (inputOTP: string, storedOTP: string | undefined, expiresAt: Date | undefined) => {
  if (!storedOTP || !expiresAt) return false;
  return inputOTP === storedOTP && new Date() < expiresAt;
};

// Register new user
router.post('/register',
  authRateLimit,
  validateBody(registerSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, phone, password, location, ...userData } = req.body;

      const existingUser = await User.findOne({
        $or: [{ email }, { phone }]
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email or phone already exists'
        });
      }

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const emailVerificationToken = jwt.sign(
        { email },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      const user = new User({
        ...userData,
        email,
        phone,
        password: hashedPassword,
        emailVerificationToken,
        status: 'pending_verification',
        address: {
          street: location.address,
          city: location.city,
          state: location.state,
          pincode: location.pincode
        },
        location: {
          type: 'Point',
          coordinates: location.coordinates || [0, 0]
        }
      });

      await user.save();

      await sendEmail({
        to: email,
        subject: 'Verify your FreshFlow account',
        template: 'verify-email',
        data: {
          name: userData.name,
          verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`
        }
      });

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          userId: user._id,
          email: user.email,
          status: user.status
        }
      });

    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed. Please try again.'
      });
    }
  }
);

// Login user
router.post('/login',
  authRateLimit,
  validateBody(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended. Please contact support.'
        });
      }

      if (user.status === 'pending_verification') {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email before logging in.'
        });
      }

      const { accessToken, refreshToken } = generateTokens(user._id);

      user.lastLoginAt = new Date();
      await user.save();

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      logger.info(`User logged in: ${email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            businessName: user.businessName,
            businessType: user.businessType,
            status: user.status,
            profileImage: user.profileImage,
            location: user.location,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified
          },
          accessToken
        }
      });

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.'
      });
    }
  }
);

// Refresh access token
router.post('/refresh',
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.cookies;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token not provided'
        });
      }

      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      const user = await User.findById(decoded.userId);
      if (!user || user.status === 'suspended') {
        return res.status(401).json({
          success: false,
          message: 'User not found or suspended'
        });
      }

      const tokens = generateTokens(user._id);

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        success: true,
        data: {
          accessToken: tokens.accessToken
        }
      });

    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        message: 'Token refresh failed'
      });
    }
  }
);

// Logout user
router.post('/logout',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      res.clearCookie('refreshToken');

      logger.info(`User logged out: ${(req.user as IUserDocument)?.email}`);

      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }
);

// Verify email
router.post('/verify-email',
  validateBody(verifyEmailSchema),
  async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      const user = await User.findOne({
        email: decoded.email,
        emailVerificationToken: token
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token'
        });
      }

      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.status = user.isPhoneVerified ? 'active' : 'pending_verification';
      await user.save();

      logger.info(`Email verified for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: {
          status: user.status
        }
      });

    } catch (error) {
      logger.error('Email verification error:', error);
      res.status(400).json({
        success: false,
        message: 'Email verification failed'
      });
    }
  }
);

// Send phone OTP
router.post('/send-phone-otp',
  otpRateLimit,
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = await User.findById((req.user as IUserDocument)?._id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.isPhoneVerified) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already verified'
        });
      }

      const otp = generateOTP();
      (user as any).phoneOTP = otp;
      (user as any).phoneOTPExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      logger.info(`OTP sent to phone: ${user.phone}`);

      res.json({
        success: true,
        message: 'OTP sent to your phone number'
      });

    } catch (error) {
      logger.error('Send phone OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP'
      });
    }
  }
);

// Verify phone OTP
router.post('/verify-phone',
  validateBody(verifyPhoneSchema),
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { otp } = req.body;
      
      const user = await User.findById((req.user as IUserDocument)?._id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!verifyOTP(otp, (user as any).phoneOTP, (user as any).phoneOTPExpiresAt)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }

      user.isPhoneVerified = true;
      (user as any).phoneOTP = undefined;
      (user as any).phoneOTPExpiresAt = undefined;
      user.status = user.isEmailVerified ? 'active' : 'pending_verification';
      await user.save();

      logger.info(`Phone verified for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Phone number verified successfully',
        data: {
          status: user.status
        }
      });

    } catch (error) {
      logger.error('Phone verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Phone verification failed'
      });
    }
  }
);

// Forgot password
router.post('/forgot-password',
  authRateLimit,
  validateBody(forgotPasswordSchema),
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });
      
      if (!user) {
        return res.json({
          success: true,
          message: 'If an account with this email exists, you will receive a password reset link.'
        });
      }

      const resetToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      await sendEmail({
        to: email,
        subject: 'Reset your FreshFlow password',
        template: 'reset-password',
        data: {
          name: user.name,
          resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
        }
      });

      logger.info(`Password reset requested for: ${email}`);

      res.json({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset link.'
      });

    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request'
      });
    }
  }
);

// Reset password
router.post('/reset-password',
  validateBody(resetPasswordSchema),
  async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      const user = await User.findOne({
        _id: decoded.userId,
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      user.password = hashedPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      logger.info(`Password reset successful for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Password reset successful. You can now login with your new password.'
      });

    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(400).json({
        success: false,
        message: 'Password reset failed'
      });
    }
  }
);

// Get current user profile
router.get('/me',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = await User.findById((req.user as IUserDocument)?._id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            businessName: user.businessName,
            businessType: user.businessType,
            status: user.status,
            profileImage: user.profileImage,
            location: user.location,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
          }
        }
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user profile'
      });
    }
  }
);

export default router;