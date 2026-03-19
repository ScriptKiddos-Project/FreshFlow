import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { rateLimit } from '../middleware/rateLimit';
import { logger } from '../utils/logger';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';

const router = Router();

// Validation error handler middleware
const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Rate limiting for sensitive operations
const updateRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many update attempts, please try again later'
});

const passwordRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many password change attempts, please try again later'
});

// Get user profile
router.get('/profile',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = await User.findById(req.user?._id)
        .populate('savedIngredients', 'name category price unit location seller')
        .populate('favoriteVendors', 'businessName location rating')
        .select('-password');

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
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            businessName: user.businessName,
            businessType: user.businessType,
            businessDescription: user.businessDescription,
            status: user.status,
            profileImage: user.profileImage,
            location: user.location,
            businessHours: user.businessHours,
            paymentMethods: user.paymentMethods,
            preferences: user.preferences,
            savedIngredients: user.savedIngredients,
            favoriteVendors: user.favoriteVendors,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
            rating: user.rating,
            totalRatings: user.totalRatings,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
          }
        }
      });

    } catch (error) {
      logger.error('Get user profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user profile'
      });
    }
  }
);

// Update user profile
router.put('/profile',
  authMiddleware,
  updateRateLimit,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('businessName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Business name must be between 2 and 100 characters'),
    body('businessDescription')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Business description cannot exceed 500 characters'),
    body('phone')
      .optional()
      .isMobilePhone('en-IN')
      .withMessage('Please provide a valid Indian mobile number'),
    body('location.address')
      .optional()
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Address must be between 10 and 200 characters'),
    body('location.city')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be between 2 and 50 characters'),
    body('location.state')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('State must be between 2 and 50 characters'),
    body('location.pincode')
      .optional()
      .isPostalCode('IN')
      .withMessage('Please provide a valid Indian pincode'),
    body('businessHours.*.open')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Invalid opening time format (HH:MM)'),
    body('businessHours.*.close')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Invalid closing time format (HH:MM)'),
    body('paymentMethods')
      .optional()
      .isArray()
      .withMessage('Payment methods must be an array'),
    body('paymentMethods.*')
      .optional()
      .isIn(['cash', 'upi', 'card', 'bank_transfer'])
      .withMessage('Invalid payment method')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      const updateData = req.body;

      delete updateData.email;
      delete updateData.password;
      delete updateData.status;
      delete updateData.isEmailVerified;
      delete updateData.isPhoneVerified;
      delete updateData.rating;
      delete updateData.totalRatings;

      if (updateData.phone) {
        const existingUser = await User.findOne({ 
          phone: updateData.phone, 
          _id: { $ne: userId } 
        });

        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: 'Phone number already registered with another account'
          });
        }

        updateData.isPhoneVerified = false;
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          ...updateData,
          updatedAt: new Date()
        },
        { 
          new: true, 
          runValidators: true 
        }
      )
      .populate('savedIngredients', 'name category price unit location seller')
      .populate('favoriteVendors', 'businessName location rating')
      .select('-password');

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await Notification.create({
        user: userId,
        type: 'profile_update',
        title: 'Profile Updated',
        message: 'Your profile has been successfully updated',
        data: { updateFields: Object.keys(updateData) }
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser }
      });

    } catch (error) {
      logger.error('Update user profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }
);

// Upload profile image
router.post('/profile/image',
  authMiddleware,
  updateRateLimit,
  upload.single('profileImage'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      const currentUser = await User.findById(userId);
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'profile-images',
        transformation: [
          { width: 400, height: 400, crop: 'fill', quality: 'auto' }
        ]
      });

      if (currentUser.profileImage) {
        try {
          await deleteFromCloudinary(currentUser.profileImage);
        } catch (deleteError) {
          logger.warn('Failed to delete old profile image:', deleteError);
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          profileImage: result.secure_url,
          updatedAt: new Date()
        },
        { new: true }
      ).select('-password');

      res.json({
        success: true,
        message: 'Profile image updated successfully',
        data: {
          profileImage: result.secure_url,
          user: updatedUser
        }
      });

    } catch (error) {
      logger.error('Upload profile image error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload profile image'
      });
    }
  }
);

// Delete profile image
router.delete('/profile/image',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.profileImage) {
        return res.status(400).json({
          success: false,
          message: 'No profile image to delete'
        });
      }

      try {
        await deleteFromCloudinary(user.profileImage);
      } catch (deleteError) {
        logger.warn('Failed to delete image from Cloudinary:', deleteError);
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          $unset: { profileImage: 1 },
          updatedAt: new Date()
        },
        { new: true }
      ).select('-password');

      res.json({
        success: true,
        message: 'Profile image deleted successfully',
        data: { user: updatedUser }
      });

    } catch (error) {
      logger.error('Delete profile image error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete profile image'
      });
    }
  }
);

// Change password
router.put('/password',
  authMiddleware,
  passwordRateLimit,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    body('confirmPassword')
      .custom((value: string, { req }: { req: any }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match new password');
        }
        return true;
      })
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(userId).select('+password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      await User.findByIdAndUpdate(userId, {
        password: hashedNewPassword,
        updatedAt: new Date()
      });

      await Notification.create({
        user: userId,
        type: 'security',
        title: 'Password Changed',
        message: 'Your password has been successfully changed',
        priority: 'high'
      });

      logger.info(`Password changed for user: ${userId}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }
  }
);

// Get user notifications
router.get('/notifications',
  authMiddleware,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('status')
      .optional()
      .isIn(['read', 'unread'])
      .withMessage('Status must be either read or unread'),
    query('type')
      .optional()
      .isIn(['order', 'payment', 'ingredient', 'profile_update', 'security', 'system'])
      .withMessage('Invalid notification type')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const type = req.query.type as string;

      const filter: any = { user: userId };
      if (status) filter.isRead = status === 'read';
      if (type) filter.type = type;

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Notification.countDocuments(filter);
      const unreadCount = await Notification.countDocuments({ 
        user: userId, 
        isRead: false 
      });

      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          },
          unreadCount
        }
      });

    } catch (error) {
      logger.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications'
      });
    }
  }
);

// Mark notification as read
router.put('/notifications/:id/read',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      const notificationId = req.params.id;

      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: { notification }
      });

    } catch (error) {
      logger.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification'
      });
    }
  }
);

// Mark all notifications as read
router.put('/notifications/read-all',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;

      const result = await Notification.updateMany(
        { user: userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      res.json({
        success: true,
        message: `${result.modifiedCount} notifications marked as read`
      });

    } catch (error) {
      logger.error('Mark all notifications as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notifications'
      });
    }
  }
);

// Delete notification
router.delete('/notifications/:id',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      const notificationId = req.params.id;

      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        user: userId
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });

    } catch (error) {
      logger.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification'
      });
    }
  }
);

// Add ingredient to saved list
router.post('/saved-ingredients/:ingredientId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      const ingredientId = req.params.ingredientId;

      const user = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { savedIngredients: ingredientId } },
        { new: true }
      )
      .populate('savedIngredients', 'name category price unit location seller');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Ingredient added to saved list',
        data: { savedIngredients: user.savedIngredients }
      });

    } catch (error) {
      logger.error('Add saved ingredient error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save ingredient'
      });
    }
  }
);

// Remove ingredient from saved list
router.delete('/saved-ingredients/:ingredientId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      const ingredientId = req.params.ingredientId;

      const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { savedIngredients: ingredientId } },
        { new: true }
      )
      .populate('savedIngredients', 'name category price unit location seller');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Ingredient removed from saved list',
        data: { savedIngredients: user.savedIngredients }
      });

    } catch (error) {
      logger.error('Remove saved ingredient error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove saved ingredient'
      });
    }
  }
);

// Add vendor to favorites
router.post('/favorite-vendors/:vendorId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      const vendorId = req.params.vendorId;

      const vendor = await User.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { favoriteVendors: vendorId } },
        { new: true }
      )
      .populate('favoriteVendors', 'businessName location rating');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Vendor added to favorites',
        data: { favoriteVendors: user.favoriteVendors }
      });

    } catch (error) {
      logger.error('Add favorite vendor error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add vendor to favorites'
      });
    }
  }
);

// Remove vendor from favorites
router.delete('/favorite-vendors/:vendorId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      const vendorId = req.params.vendorId;

      const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { favoriteVendors: vendorId } },
        { new: true }
      )
      .populate('favoriteVendors', 'businessName location rating');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Vendor removed from favorites',
        data: { favoriteVendors: user.favoriteVendors }
      });

    } catch (error) {
      logger.error('Remove favorite vendor error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove vendor from favorites'
      });
    }
  }
);

// Get user statistics
router.get('/stats',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;

      const user = await User.findById(userId)
        .populate('savedIngredients')
        .populate('favoriteVendors');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const stats = {
        savedIngredients: user.savedIngredients?.length || 0,
        favoriteVendors: user.favoriteVendors?.length || 0,
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        profileCompletionPercentage: calculateProfileCompletion(user),
        memberSince: user.createdAt,
        lastActive: user.lastLoginAt,
        unreadNotifications: await Notification.countDocuments({
          user: userId,
          isRead: false
        })
      };

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      logger.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user statistics'
      });
    }
  }
);

function calculateProfileCompletion(user: any): number {
  const requiredFields = [
    'name', 'email', 'phone', 'businessName', 'businessType',
    'businessDescription', 'address.street', 'address.city',
    'address.state', 'address.pincode', 'profileImage'
  ];

  let completedFields = 0;

  requiredFields.forEach(field => {
    const fieldPath = field.split('.');
    let value = user;
    
    for (const path of fieldPath) {
      value = value?.[path];
    }
    
    if (value && value.toString().trim() !== '') {
      completedFields++;
    }
  });

  return Math.round((completedFields / requiredFields.length) * 100);
}

export default router;