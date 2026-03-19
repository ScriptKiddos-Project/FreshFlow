import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Ingredient } from '../models/Ingredient';
import { Order } from '../models/Order';
import { logger } from '../utils/logger';

// Properly typed AuthRequest interface
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  file?: Express.Multer.File & {
    path?: string;
  };
}

// Interface for populated user document
interface UserDocument {
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  role: string;
  businessName?: string;
  businessType?: string;
  phone?: string;
  address?: string;
  location?: {
    type: string;
    coordinates: [number, number];
  };
  businessHours?: any;
  description?: string;
  isActive: boolean;
  isVerified: boolean;
  profilePicture?: string;
  preferences?: any;
  createdAt: Date;
  updatedAt: Date;
}

export class UserController {
  /**
   * Get all vendors with filtering and pagination
   */
  static async getAllVendors(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        businessType,
        isVerified,
        isActive,
        location,
        radius = 10
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query: any = { role: 'vendor' };

      // Search filter
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { businessName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      if (businessType) {
        query.businessType = businessType;
      }

      if (isVerified !== undefined) {
        query.isVerified = isVerified === 'true';
      }

      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }

      // Location-based filter
      if (location) {
        const [lng, lat] = (location as string).split(',').map(Number);
        const radiusInMeters = parseFloat(radius as string) * 1000;

        query.location = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: radiusInMeters
          }
        };
      }

      // Execute query with pagination
      const [vendors, total] = await Promise.all([
        User.find(query)
          .select('-password -refreshToken')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean<UserDocument[]>(),
        User.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          vendors,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalVendors: total,
            hasNextPage: pageNum < Math.ceil(total / limitNum),
            hasPrevPage: pageNum > 1
          }
        }
      });

    } catch (error) {
      logger.error('Get all vendors error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get vendor by ID
   */
  static async getVendorById(req: Request, res: Response): Promise<void> {
    try {
      const { vendorId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid vendor ID'
        });
        return;
      }

      const vendor = await User.findById(vendorId)
        .select('-password -refreshToken')
        .lean<UserDocument>();

      if (!vendor || vendor.role !== 'vendor') {
        res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
        return;
      }

      const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

      // Get vendor's active ingredients count
      const activeIngredientsCount = await Ingredient.countDocuments({
        vendorId: vendorObjectId,
        isActive: true
      });

      // Get recent orders count (Last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentOrdersCount = await Order.countDocuments({
        $or: [
          { buyerId: vendorObjectId },
          { sellerId: vendorObjectId }
        ],
        createdAt: { $gte: thirtyDaysAgo }
      });

      res.json({
        success: true,
        data: {
          vendor: {
            ...vendor,
            activeIngredientsCount,
            recentOrdersCount
          }
        }
      });

    } catch (error) {
      logger.error('Get vendor by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get vendors near a location
   */
  static async getNearbyVendors(req: Request, res: Response): Promise<void> {
    try {
      const { lat, lng, radius = 10, limit = 20 } = req.query;

      if (!lat || !lng) {
        res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
        return;
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const radiusInMeters = parseFloat(radius as string) * 1000;
      const limitNum = parseInt(limit as string);

      const vendors = await User.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            distanceField: 'distance',
            maxDistance: radiusInMeters,
            spherical: true,
            query: { role: 'vendor', isActive: true }
          }
        },
        {
          $lookup: {
            from: 'ingredients',
            localField: '_id',
            foreignField: 'vendorId',
            as: 'ingredients'
          }
        },
        {
          $addFields: {
            activeIngredientsCount: {
              $size: {
                $filter: {
                  input: '$ingredients',
                  cond: { $eq: ['$$this.isActive', true] }
                }
              }
            },
            distance: { $round: [{ $divide: ['$distance', 1000] }, 2] }
          }
        },
        {
          $project: {
            password: 0,
            refreshToken: 0,
            ingredients: 0
          }
        },
        {
          $limit: limitNum
        }
      ]);

      res.json({
        success: true,
        data: {
          vendors,
          searchCenter: { latitude, longitude },
          searchRadius: parseFloat(radius as string)
        }
      });

    } catch (error) {
      logger.error('Get nearby vendors error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update vendor status (admin only)
   */
  static async updateVendorStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
        return;
      }

      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
        return;
      }

      const { vendorId } = req.params;
      const { isActive, isVerified } = req.body;

      if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid vendor ID'
        });
        return;
      }

      const updateData: any = { updatedAt: new Date() };
      if (typeof isActive === 'boolean') updateData.isActive = isActive;
      if (typeof isVerified === 'boolean') updateData.isVerified = isVerified;

      const vendor = await User.findByIdAndUpdate(
        vendorId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password -refreshToken');

      if (!vendor) {
        res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
        return;
      }

      logger.info(`Vendor status updated by admin ${req.user.email}: ${vendor.email}`);

      res.json({
        success: true,
        message: 'Vendor status updated successfully',
        data: { vendor }
      });

    } catch (error) {
      logger.error('Update vendor status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const user = await User.findById(req.user.id)
        .select('-password -refreshToken')
        .lean<UserDocument>();

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { user }
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const {
        name,
        businessName,
        businessType,
        phone,
        address,
        location,
        businessHours,
        description
      } = req.body;

      const updateData: Partial<UserDocument> = {
        updatedAt: new Date()
      };

      if (name) updateData.name = name;
      if (businessName) updateData.businessName = businessName;
      if (businessType) updateData.businessType = businessType;
      if (phone) updateData.phone = phone;
      if (address) updateData.address = address;
      if (location) updateData.location = location;
      if (businessHours) updateData.businessHours = businessHours;
      if (description) updateData.description = description;

      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password -refreshToken');

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser }
      });

    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const userId = new mongoose.Types.ObjectId(req.user.id);

      const [
        totalIngredients,
        activeIngredients,
        totalOrders,
        completedOrders,
        totalSales,
        totalPurchases
      ] = await Promise.all([
        Ingredient.countDocuments({ vendorId: userId }),
        Ingredient.countDocuments({ vendorId: userId, isActive: true }),
        Order.countDocuments({
          $or: [{ buyerId: userId }, { sellerId: userId }]
        }),
        Order.countDocuments({
          $or: [{ buyerId: userId }, { sellerId: userId }],
          status: 'completed'
        }),
        Order.aggregate([
          { $match: { sellerId: userId, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]),
        Order.aggregate([
          { $match: { buyerId: userId, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ])
      ]);

      const stats = {
        totalIngredients,
        activeIngredients,
        totalOrders,
        completedOrders,
        totalSalesAmount: totalSales[0]?.total || 0,
        totalPurchasesAmount: totalPurchases[0]?.total || 0,
        orderCompletionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
      };

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      logger.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete user account
   */
  static async deleteAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const { password } = req.body;

      if (!password) {
        res.status(400).json({
          success: false,
          message: 'Password is required'
        });
        return;
      }

      const user = await User.findById(req.user.id).select('+password');
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid password'
        });
        return;
      }

      const userId = new mongoose.Types.ObjectId(req.user.id);

      // Check for pending orders
      const pendingOrders = await Order.countDocuments({
        $or: [{ buyerId: userId }, { sellerId: userId }],
        status: { $in: ['pending', 'confirmed', 'processing'] }
      });

      if (pendingOrders > 0) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete account with pending orders. Please complete or cancel all pending orders first.'
        });
        return;
      }

      // Soft delete
      user.isActive = false;
      user.email = `deleted_${Date.now()}_${user.email}`;
      user.refreshToken = undefined;
      user.updatedAt = new Date();
      await user.save();

      // Deactivate all ingredients
      await Ingredient.updateMany(
        { vendorId: userId },
        { isActive: false, updatedAt: new Date() }
      );

      logger.info(`Account deleted (soft delete) for user: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });

    } catch (error) {
      logger.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get user activity log
   */
  static async getActivityLog(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const userId = new mongoose.Types.ObjectId(req.user.id);
      const { page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const recentOrders = await Order.find({
        $or: [{ buyerId: userId }, { sellerId: userId }]
      })
        .populate('ingredientId', 'name category')
        .populate('buyerId', 'name businessName')
        .populate('sellerId', 'name businessName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const recentIngredients = await Ingredient.find({
        vendorId: userId
      })
        .sort({ updatedAt: -1 })
        .limit(10)
        .select('name category currentPrice isActive updatedAt')
        .lean();

      const totalOrders = await Order.countDocuments({
        $or: [{ buyerId: userId }, { sellerId: userId }]
      });

      res.json({
        success: true,
        data: {
          recentOrders,
          recentIngredients,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(totalOrders / limitNum),
            total: totalOrders
          }
        }
      });

    } catch (error) {
      logger.error('Get activity log error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const { 
        notifications = {},
        priceAlerts = true,
        expiryAlerts = true,
        marketingEmails = false,
        language = 'en',
        timezone = 'Asia/Kolkata'
      } = req.body;

      const preferences = {
        notifications,
        priceAlerts,
        expiryAlerts,
        marketingEmails,
        language,
        timezone,
        updatedAt: new Date()
      };

      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { preferences },
        { new: true, runValidators: true }
      ).select('-password -refreshToken');

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: { preferences: updatedUser.preferences }
      });

    } catch (error) {
      logger.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
        return;
      }

      const user = await User.findById(req.user.id).select('+password');
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
        return;
      }

      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      user.password = hashedNewPassword;
      user.updatedAt = new Date();
      await user.save();

      logger.info(`Password changed for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Upload profile picture
   */
  static async uploadProfilePicture(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
        return;
      }

      const imageUrl = req.file.path || '';

      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { 
          profilePicture: imageUrl,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      ).select('-password -refreshToken');

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Profile picture updated successfully',
        data: { 
          profilePicture: updatedUser.profilePicture 
        }
      });

    } catch (error) {
      logger.error('Upload profile picture error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}