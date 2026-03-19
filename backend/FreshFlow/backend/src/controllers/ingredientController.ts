import { Request, Response } from 'express';
import { Ingredient } from '../models/Ingredient';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { validationResult } from 'express-validator';
import { pricingService } from '../services/pricingService';

interface AuthRequest extends Request {
  user?: any;
}

export class IngredientController {
  /**
   * Create new ingredient listing
   */
  static async createIngredient(req: AuthRequest, res: Response): Promise<void> {
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

      const {
        name,
        category,
        quantity,
        unit,
        basePrice,
        expiryDate,
        description,
        images,
        tags,
        minOrderQuantity = 1,
        maxOrderQuantity,
        location
      } = req.body;

      const vendorId = req.user.id;

      const ingredient = new Ingredient({
        vendorId,
        name: name.trim(),
        category,
        quantity: parseFloat(quantity),
        unit,
        basePrice: parseFloat(basePrice),
        originalPrice: parseFloat(basePrice),
        currentPrice: parseFloat(basePrice),
        expiryDate: new Date(expiryDate),
        description: description?.trim(),
        images: images || [],
        tags: tags || [],
        minOrderQuantity: parseFloat(minOrderQuantity),
        minimumOrderQuantity: parseFloat(minOrderQuantity),
        maxOrderQuantity: maxOrderQuantity ? parseFloat(maxOrderQuantity) : undefined,
        location: location || { address: '', coordinates: { latitude: 0, longitude: 0 } },
        priceHistory: [{
          price: parseFloat(basePrice),
          timestamp: new Date(),
          reason: 'initial_listing'
        }]
      });

      await ingredient.save();

      // Calculate dynamic price after saving
      try {
        const dynamicPrice = await pricingService.calculateDynamicPrice(ingredient._id.toString());
        ingredient.currentPrice = dynamicPrice;
        ingredient.priceHistory.push({
          price: dynamicPrice,
          timestamp: new Date(),
          reason: 'dynamic_pricing_applied'
        });
        await ingredient.save();
      } catch (priceError) {
        logger.warn('Could not apply dynamic pricing on creation:', priceError);
      }

      // Populate vendor info before returning
      await ingredient.populate('vendorId', 'name businessName location');

      logger.info(`New ingredient created: ${ingredient.name} by vendor ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Ingredient created successfully',
        data: { ingredient }
      });

    } catch (error) {
      logger.error('Create ingredient error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get all ingredients with filtering and search
   */
  static async getAllIngredients(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        category,
        location,
        radius = 10,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        expiresWithin,
        vendorId,
        tags
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build aggregation pipeline
      let pipeline: any[] = [
        { $match: { isActive: true } }
      ];

      // Search filter
      if (search) {
        pipeline.push({
          $match: {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } },
              { tags: { $in: [new RegExp(search as string, 'i')] } }
            ]
          }
        });
      }

      // Category filter
      if (category) {
        pipeline.push({ $match: { category } });
      }

      // Vendor filter
      if (vendorId) {
        pipeline.push({ $match: { vendorId: vendorId } });
      }

      // Price range filter
      if (minPrice || maxPrice) {
        const priceMatch: any = {};
        if (minPrice) priceMatch.$gte = parseFloat(minPrice as string);
        if (maxPrice) priceMatch.$lte = parseFloat(maxPrice as string);
        pipeline.push({ $match: { currentPrice: priceMatch } });
      }

      // Expiry filter
      if (expiresWithin) {
        const hours = parseInt(expiresWithin as string);
        const expiryThreshold = new Date(Date.now() + hours * 60 * 60 * 1000);
        pipeline.push({ $match: { expiryDate: { $lte: expiryThreshold } } });
      }

      // Tags filter
      if (tags) {
        const tagArray = (tags as string).split(',');
        pipeline.push({ $match: { tags: { $in: tagArray } } });
      }

      // Location-based filter
      if (location) {
        const [lng, lat] = (location as string).split(',').map(Number);
        const radiusInMeters = parseFloat(radius as string) * 1000;

        pipeline.unshift({
          $lookup: {
            from: 'users',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        });

        pipeline.push({
          $match: {
            'vendor.location': {
              $near: {
                $geometry: {
                  type: 'Point',
                  coordinates: [lng, lat]
                },
                $maxDistance: radiusInMeters
              }
            }
          }
        });
      } else {
        pipeline.push({
          $lookup: {
            from: 'users',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        });
      }

      // Add vendor info and distance calculation
      pipeline.push({
        $addFields: {
          vendor: { $arrayElemAt: ['$vendor', 0] },
          urgencyScore: {
            $divide: [
              { $subtract: ['$expiryDate', new Date()] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      });

      // Sorting
      const sortDirection = sortOrder === 'desc' ? -1 : 1;
      let sortStage: any = {};

      switch (sortBy) {
        case 'price':
          sortStage.currentPrice = sortDirection;
          break;
        case 'expiry':
          sortStage.expiryDate = sortDirection;
          break;
        case 'urgency':
          sortStage.urgencyScore = 1; // Always ascending for urgency
          break;
        case 'distance':
          if (location) {
            sortStage.distance = 1;
          } else {
            sortStage.createdAt = sortDirection;
          }
          break;
        default:
          sortStage.createdAt = sortDirection;
      }

      pipeline.push({ $sort: sortStage });

      // Get total count for pagination
      const countPipeline = [...pipeline, { $count: 'total' }];
      
      // Add pagination
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limitNum });

      // Project final fields
      pipeline.push({
        $project: {
          name: 1,
          category: 1,
          quantity: 1,
          unit: 1,
          basePrice: 1,
          currentPrice: 1,
          expiryDate: 1,
          description: 1,
          images: 1,
          tags: 1,
          minOrderQuantity: 1,
          maxOrderQuantity: 1,
          urgencyScore: 1,
          createdAt: 1,
          updatedAt: 1,
          'vendor._id': 1,
          'vendor.name': 1,
          'vendor.businessName': 1,
          'vendor.location': 1,
          'vendor.isVerified': 1
        }
      });

      // Execute aggregation
      const [ingredients, countResult] = await Promise.all([
        Ingredient.aggregate(pipeline),
        Ingredient.aggregate(countPipeline)
      ]);

      const total = countResult[0]?.total || 0;

      res.json({
        success: true,
        data: {
          ingredients,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalIngredients: total,
            hasNextPage: pageNum < Math.ceil(total / limitNum),
            hasPrevPage: pageNum > 1
          }
        }
      });

    } catch (error) {
      logger.error('Get all ingredients error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get ingredient by ID
   */
  static async getIngredientById(req: Request, res: Response): Promise<void> {
    try {
      const { ingredientId } = req.params;

      const ingredient = await Ingredient.findById(ingredientId)
        .populate('vendorId', 'name businessName location phone businessHours isVerified')
        .populate('reviews.buyerId', 'name');

      if (!ingredient || !ingredient.isActive) {
        res.status(404).json({
          success: false,
          message: 'Ingredient not found'
        });
        return;
      }

      // Calculate time until expiry
      const hoursUntilExpiry = Math.max(0, 
        (ingredient.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60)
      );

      // Get similar ingredients from same vendor
      const similarIngredients = await Ingredient.find({
        vendorId: ingredient.vendorId,
        category: ingredient.category,
        _id: { $ne: ingredient._id },
        isActive: true
      })
        .limit(4)
        .select('name currentPrice images');

      res.json({
        success: true,
        data: {
          ingredient: {
            ...ingredient.toObject(),
            hoursUntilExpiry,
            similarIngredients
          }
        }
      });

    } catch (error) {
      logger.error('Get ingredient by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update ingredient
   */
  static async updateIngredient(req: AuthRequest, res: Response): Promise<void> {
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

      const { ingredientId } = req.params;
      const vendorId = req.user.id;

      const ingredient = await Ingredient.findOne({
        _id: ingredientId,
        vendorId
      });

      if (!ingredient) {
        res.status(404).json({
          success: false,
          message: 'Ingredient not found or access denied'
        });
        return;
      }

      const {
        name,
        quantity,
        basePrice,
        expiryDate,
        description,
        images,
        tags,
        minOrderQuantity,
        maxOrderQuantity,
        isActive
      } = req.body;

      // Track price changes
      const oldPrice = ingredient.currentPrice;
      let newPrice = oldPrice;

      if (basePrice && parseFloat(basePrice) !== ingredient.basePrice) {
        ingredient.basePrice = parseFloat(basePrice);
        (ingredient as any).originalPrice = parseFloat(basePrice);
        
        // Recalculate dynamic price
        try {
          newPrice = await pricingService.calculateDynamicPrice(ingredient._id.toString());
          ingredient.currentPrice = newPrice;
          
          // Add to price history
          ingredient.priceHistory.push({
            price: newPrice,
            timestamp: new Date(),
            reason: 'manual_update'
          });
        } catch (priceError) {
          logger.warn('Could not recalculate dynamic price:', priceError);
          ingredient.currentPrice = parseFloat(basePrice);
        }
      }

      // Update other fields
      if (name) ingredient.name = name.trim();
      if (quantity) ingredient.quantity = parseFloat(quantity);
      if (expiryDate) ingredient.expiryDate = new Date(expiryDate);
      if (description !== undefined) ingredient.description = description?.trim();
      if (images) ingredient.images = images;
      if (tags) ingredient.tags = tags;
      if (minOrderQuantity) {
        ingredient.minOrderQuantity = parseFloat(minOrderQuantity);
        ingredient.minimumOrderQuantity = parseFloat(minOrderQuantity);
      }
      if (maxOrderQuantity !== undefined) ingredient.maxOrderQuantity = maxOrderQuantity ? parseFloat(maxOrderQuantity) : undefined;
      if (typeof isActive === 'boolean') ingredient.isActive = isActive;

      ingredient.updatedAt = new Date();
      await ingredient.save();

      // Populate vendor info
      await ingredient.populate('vendorId', 'name businessName');

      logger.info(`Ingredient updated: ${ingredient.name} by vendor ${req.user.email}`);

      res.json({
        success: true,
        message: 'Ingredient updated successfully',
        data: { ingredient }
      });

    } catch (error) {
      logger.error('Update ingredient error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete ingredient
   */
  static async deleteIngredient(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ingredientId } = req.params;
      const vendorId = req.user.id;

      const ingredient = await Ingredient.findOne({
        _id: ingredientId,
        vendorId
      });

      if (!ingredient) {
        res.status(404).json({
          success: false,
          message: 'Ingredient not found or access denied'
        });
        return;
      }

      // Soft delete - set as inactive
      ingredient.isActive = false;
      ingredient.updatedAt = new Date();
      await ingredient.save();

      logger.info(`Ingredient deleted: ${ingredient.name} by vendor ${req.user.email}`);

      res.json({
        success: true,
        message: 'Ingredient deleted successfully'
      });

    } catch (error) {
      logger.error('Delete ingredient error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get vendor's ingredients
   */
  static async getVendorIngredients(req: AuthRequest, res: Response): Promise<void> {
    try {
      const vendorId = req.user.id;
      const {
        page = 1,
        limit = 20,
        status = 'all', // active, inactive, all
        category,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      let query: any = { vendorId };

      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      }

      if (category) {
        query.category = category;
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // Sorting
      const sortDirection = sortOrder === 'desc' ? -1 : 1;
      let sortOptions: any = {};
      
      switch (sortBy) {
        case 'name':
          sortOptions.name = sortDirection;
          break;
        case 'price':
          sortOptions.currentPrice = sortDirection;
          break;
        case 'quantity':
          sortOptions.quantity = sortDirection;
          break;
        case 'expiry':
          sortOptions.expiryDate = sortDirection;
          break;
        default:
          sortOptions.createdAt = sortDirection;
      }

      const [ingredients, total] = await Promise.all([
        Ingredient.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .select('-priceHistory'),
        Ingredient.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          ingredients,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalIngredients: total,
            hasNextPage: pageNum < Math.ceil(total / limitNum),
            hasPrevPage: pageNum > 1
          }
        }
      });

    } catch (error) {
      logger.error('Get vendor ingredients error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get ingredient categories
   */
  static async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await Ingredient.distinct('category', { isActive: true });
      
      // Get count for each category
      const categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
          const count = await Ingredient.countDocuments({ 
            category, 
            isActive: true 
          });
          return { name: category, count };
        })
      );

      res.json({
        success: true,
        data: { categories: categoriesWithCount }
      });

    } catch (error) {
      logger.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get expiring ingredients (urgent deals)
   */
  static async getExpiringIngredients(req: Request, res: Response): Promise<void> {
    try {
      const {
        hours = 24,
        limit = 20,
        location,
        radius = 10
      } = req.query;

      const hoursNum = parseInt(hours as string);
      const limitNum = parseInt(limit as string);
      const expiryThreshold = new Date(Date.now() + hoursNum * 60 * 60 * 1000);

      let pipeline: any[] = [
        {
          $match: {
            isActive: true,
            expiryDate: { $lte: expiryThreshold },
            quantity: { $gt: 0 }
          }
        }
      ];

      // Location filter
      if (location) {
        const [lng, lat] = (location as string).split(',').map(Number);
        const radiusInMeters = parseFloat(radius as string) * 1000;

        pipeline.push({
          $lookup: {
            from: 'users',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        });

        pipeline.push({
          $match: {
            'vendor.location': {
              $near: {
                $geometry: {
                  type: 'Point',
                  coordinates: [lng, lat]
                },
                $maxDistance: radiusInMeters
              }
            }
          }
        });
      } else {
        pipeline.push({
          $lookup: {
            from: 'users',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        });
      }

      pipeline.push({
        $addFields: {
          vendor: { $arrayElemAt: ['$vendor', 0] },
          hoursUntilExpiry: {
            $divide: [
              { $subtract: ['$expiryDate', new Date()] },
              1000 * 60 * 60
            ]
          },
          discountPercentage: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ['$basePrice', '$currentPrice'] },
                  '$basePrice'
                ]
              },
              100
            ]
          }
        }
      });

      pipeline.push({
        $sort: { hoursUntilExpiry: 1 } // Most urgent first
      });

      pipeline.push({ $limit: limitNum });

      pipeline.push({
        $project: {
          name: 1,
          category: 1,
          quantity: 1,
          unit: 1,
          basePrice: 1,
          currentPrice: 1,
          expiryDate: 1,
          images: 1,
          hoursUntilExpiry: 1,
          discountPercentage: 1,
          'vendor._id': 1,
          'vendor.name': 1,
          'vendor.businessName': 1,
          'vendor.location': 1
        }
      });

      const ingredients = await Ingredient.aggregate(pipeline);

      res.json({
        success: true,
        data: {
          ingredients,
          expiryThreshold: hoursNum
        }
      });

    } catch (error) {
      logger.error('Get expiring ingredients error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Add review to ingredient
   */
  static async addReview(req: AuthRequest, res: Response): Promise<void> {
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

      const { ingredientId } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user.id;

      const ingredient = await Ingredient.findById(ingredientId);
      if (!ingredient || !ingredient.isActive) {
        res.status(404).json({
          success: false,
          message: 'Ingredient not found'
        });
        return;
      }

      // Check if user already reviewed this ingredient
      const existingReview = ingredient.reviews.find(
        review => review.buyerId.toString() === userId
      );

      if (existingReview) {
        res.status(400).json({
          success: false,
          message: 'You have already reviewed this ingredient'
        });
        return;
      }

      // Add review
      ingredient.reviews.push({
        buyerId: userId,
        rating: parseFloat(rating),
        comment: comment?.trim(),
        createdAt: new Date()
      });

      // Recalculate average rating
      const totalRating = ingredient.reviews.reduce((sum, review) => sum + review.rating, 0);
      ingredient.averageRating = totalRating / ingredient.reviews.length;
      ingredient.updatedAt = new Date();

      await ingredient.save();
      await ingredient.populate('reviews.buyerId', 'name');

      logger.info(`Review added for ingredient ${ingredient.name} by user ${req.user.email}`);

      res.json({
        success: true,
        message: 'Review added successfully',
        data: {
          review: ingredient.reviews[ingredient.reviews.length - 1],
          averageRating: ingredient.averageRating
        }
      });

    } catch (error) {
      logger.error('Add review error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update ingredient quantity (for order processing)
   */
  static async updateQuantity(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ingredientId } = req.params;
      const { quantity, operation = 'subtract' } = req.body; // add or subtract

      const ingredient = await Ingredient.findById(ingredientId);
      if (!ingredient || !ingredient.isActive) {
        res.status(404).json({
          success: false,
          message: 'Ingredient not found'
        });
        return;
      }

      const quantityChange = parseFloat(quantity);
      
      if (operation === 'subtract') {
        if (ingredient.quantity < quantityChange) {
          res.status(400).json({
            success: false,
            message: 'Insufficient quantity available'
          });
          return;
        }
        ingredient.quantity -= quantityChange;
      } else if (operation === 'add') {
        ingredient.quantity += quantityChange;
      }

      // Deactivate if quantity becomes zero
      if (ingredient.quantity <= 0) {
        ingredient.isActive = false;
        ingredient.quantity = 0;
      }

      ingredient.updatedAt = new Date();
      await ingredient.save();

      res.json({
        success: true,
        message: 'Quantity updated successfully',
        data: {
          newQuantity: ingredient.quantity,
          isActive: ingredient.isActive
        }
      });

    } catch (error) {
      logger.error('Update quantity error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Bulk update prices (admin only)
   */
  static async bulkUpdatePrices(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
        return;
      }

      const { category, priceMultiplier, reason = 'admin_bulk_update' } = req.body;

      const filter: any = { isActive: true };
      if (category) {
        filter.category = category;
      }

      const ingredients = await Ingredient.find(filter);
      
      const bulkOps = ingredients.map(ingredient => {
        const newPrice = Math.round(ingredient.currentPrice * parseFloat(priceMultiplier) * 100) / 100;
        
        return {
          updateOne: {
            filter: { _id: ingredient._id },
            update: {
              $set: {
                currentPrice: newPrice,
                updatedAt: new Date()
              },
              $push: {
                priceHistory: {
                  price: newPrice,
                  timestamp: new Date(),
                  reason
                }
              }
            }
          }
        };
      });

      const result = await Ingredient.bulkWrite(bulkOps);

      logger.info(`Bulk price update completed by admin ${req.user.email}: ${result.modifiedCount} ingredients updated`);

      res.json({
        success: true,
        message: 'Bulk price update completed',
        data: {
          updatedCount: result.modifiedCount,
          priceMultiplier: parseFloat(priceMultiplier)
        }
      });

    } catch (error) {
      logger.error('Bulk update prices error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}