import { Router, Request, Response } from 'express';
import { body, query } from 'express-validator';
import { Ingredient } from '../models/Ingredient';
import { User, IUserDocument } from '../models/User';
import { Notification } from '../models/Notification';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { upload } from '../middleware/upload';
import { rateLimit } from '../middleware/rateLimit';
import { logger } from '../utils/logger';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import { pricingService } from '../services/pricingService';

const router = Router();

// Extend Express Request type to properly override Passport's User type
declare global {
  namespace Express {
    interface User extends IUserDocument {}
  }
}

// Rate limiting for ingredient operations
const createRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many ingredient listings, please try again later'
});

const updateRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many update attempts, please try again later'
});

// Get all ingredients with filtering, sorting, and pagination
router.get('/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search term must be between 1 and 100 characters'),
    query('category')
      .optional()
      .isIn(['vegetables', 'fruits', 'grains', 'spices', 'dairy', 'meat', 'seafood', 'other'])
      .withMessage('Invalid category'),
    query('city')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be between 2 and 50 characters'),
    query('minPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum price must be a positive number'),
    query('maxPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Maximum price must be a positive number'),
    query('sortBy')
      .optional()
      .isIn(['price', 'quantity', 'expiryDate', 'createdAt', 'distance'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
    query('status')
      .optional()
      .isIn(['available', 'reserved', 'sold'])
      .withMessage('Invalid status'),
    query('expiringInHours')
      .optional()
      .isInt({ min: 1, max: 168 })
      .withMessage('ExpiringInHours must be between 1 and 168'),
    query('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    query('longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    query('radius')
      .optional()
      .isFloat({ min: 0.1, max: 100 })
      .withMessage('Radius must be between 0.1 and 100 km')
  ],
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const category = req.query.category as string;
      const city = req.query.city as string;
      const minPrice = parseFloat(req.query.minPrice as string);
      const maxPrice = parseFloat(req.query.maxPrice as string);
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = req.query.sortOrder as string || 'desc';
      const status = req.query.status as string;
      const expiringInHours = parseInt(req.query.expiringInHours as string);
      const latitude = parseFloat(req.query.latitude as string);
      const longitude = parseFloat(req.query.longitude as string);
      const radius = parseFloat(req.query.radius as string) || 10;

      const filter: any = {};

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      if (category) {
        filter.category = category;
      }

      if (city) {
        filter['location.address'] = { $regex: city, $options: 'i' };
      }

      if (latitude && longitude) {
        filter['location.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: radius * 1000
          }
        };
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        filter.currentPrice = {};
        if (minPrice !== undefined) filter.currentPrice.$gte = minPrice;
        if (maxPrice !== undefined) filter.currentPrice.$lte = maxPrice;
      }

      if (status) {
        filter.isAvailable = status === 'available';
      } else {
        filter.isAvailable = true;
      }

      if (expiringInHours) {
        const expiryTime = new Date();
        expiryTime.setHours(expiryTime.getHours() + expiringInHours);
        filter.expiryDate = { $lte: expiryTime };
      }

      const sort: any = {};
      if (sortBy === 'distance' && latitude && longitude) {
        const aggregationPipeline: any[] = [
          { $match: filter },
          {
            $addFields: {
              distance: {
                $sqrt: {
                  $add: [
                    { 
                      $pow: [
                        { $subtract: ['$location.coordinates.latitude', latitude] }, 
                        2
                      ] 
                    },
                    { 
                      $pow: [
                        { $subtract: ['$location.coordinates.longitude', longitude] }, 
                        2
                      ] 
                    }
                  ]
                }
              }
            }
          },
          { $sort: { distance: sortOrder === 'desc' ? -1 : 1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'vendorId',
              foreignField: '_id',
              as: 'vendorDetails',
              pipeline: [
                { $project: { password: 0, refreshToken: 0 } }
              ]
            }
          },
          { $unwind: '$vendorDetails' }
        ];

        const ingredients = await Ingredient.aggregate(aggregationPipeline);
        const total = await Ingredient.countDocuments(filter);

        return res.json({
          success: true,
          data: {
            ingredients,
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(total / limit),
              totalItems: total,
              itemsPerPage: limit,
              hasNextPage: page < Math.ceil(total / limit),
              hasPrevPage: page > 1
            }
          }
        });
      } else {
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      }

      const skip = (page - 1) * limit;
      const [ingredients, total] = await Promise.all([
        Ingredient.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('vendorId', '-password -refreshToken')
          .lean(),
        Ingredient.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: {
          ingredients,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching ingredients:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ingredients',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
    }
  }
);

// Get single ingredient by ID
router.get('/:id',
  async (req: Request, res: Response) => {
    try {
      const ingredient = await Ingredient.findById(req.params.id)
        .populate('vendorId', '-password -refreshToken')
        .lean();

      if (!ingredient) {
        return res.status(404).json({
          success: false,
          message: 'Ingredient not found'
        });
      }

      res.json({
        success: true,
        data: ingredient
      });

    } catch (error) {
      logger.error('Error fetching ingredient:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ingredient',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
    }
  }
);

// Create new ingredient
router.post('/',
  authMiddleware,
  createRateLimit,
  upload.array('images', 5),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('category')
      .isIn(['vegetables', 'fruits', 'grains', 'spices', 'dairy', 'meat', 'seafood', 'other'])
      .withMessage('Invalid category'),
    body('quantity')
      .isFloat({ min: 0.1 })
      .withMessage('Quantity must be greater than 0'),
    body('unit')
      .isIn(['kg', 'grams', 'liters', 'pieces', 'bunches', 'packets'])
      .withMessage('Invalid unit'),
    body('originalPrice')
      .isFloat({ min: 0.01 })
      .withMessage('Original price must be greater than 0'),
    body('currentPrice')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Current price must be greater than 0'),
    body('expiryDate')
      .isISO8601()
      .toDate()
      .custom((value: Date) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Expiry date must be in the future');
        }
        return true;
      }),
    body('location.address')
      .trim()
      .notEmpty()
      .withMessage('Address is required'),
    body('location.coordinates.latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    body('location.coordinates.longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    body('quality')
      .optional()
      .isIn(['premium', 'good', 'average'])
      .withMessage('Quality must be premium, good, or average'),
    body('minimumOrderQuantity')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum order must be a positive number'),
    body('negotiable')
      .optional()
      .isBoolean()
      .withMessage('Negotiable must be a boolean')
  ],
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const vendorId = req.user._id.toString();
      const files = req.files as Express.Multer.File[];

      const imageUploads = files?.map(file => uploadToCloudinary(file.buffer, {
        folder: 'ingredients',
        transformation: [
          { width: 800, height: 600, crop: 'limit', quality: 'auto' },
          { format: 'auto' }
        ]
      })) || [];

      const uploadedImages = await Promise.all(imageUploads);

      const ingredient = new Ingredient({
        ...req.body,
        vendorId: vendorId,
        basePrice: req.body.originalPrice,
        currentPrice: req.body.currentPrice || req.body.originalPrice,
        images: uploadedImages.map(img => img.secure_url),
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await ingredient.save();

      try {
        const dynamicPrice = await pricingService.calculateDynamicPrice(ingredient._id.toString());
        ingredient.currentPrice = req.body.currentPrice || dynamicPrice;
        await ingredient.save();
      } catch (priceError) {
        logger.error('Error calculating dynamic price:', priceError);
      }

      await ingredient.populate('vendorId', '-password -refreshToken');

      const nearbyVendors = await User.find({
        _id: { $ne: vendorId },
        role: 'vendor',
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [
                req.body.location.coordinates.longitude,
                req.body.location.coordinates.latitude
              ]
            },
            $maxDistance: 10000
          }
        }
      }).select('_id');

      const notifications = nearbyVendors.map(vendor => ({
        user: vendor._id,
        type: 'new_ingredient',
        title: 'New ingredient available nearby',
        message: `${ingredient.name} is now available in your area`,
        data: {
          ingredientId: ingredient._id,
          ingredientName: ingredient.name,
          price: ingredient.currentPrice,
          distance: 'nearby'
        }
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }

      logger.info(`New ingredient created: ${ingredient._id} by vendor: ${vendorId}`);

      res.status(201).json({
        success: true,
        message: 'Ingredient created successfully',
        data: ingredient
      });

    } catch (error) {
      logger.error('Error creating ingredient:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create ingredient',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
    }
  }
);

// Update ingredient
router.put('/:id',
  authMiddleware,
  updateRateLimit,
  upload.array('newImages', 5),
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('quantity')
      .optional()
      .isFloat({ min: 0.1 })
      .withMessage('Quantity must be greater than 0'),
    body('originalPrice')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Original price must be greater than 0'),
    body('currentPrice')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Current price must be greater than 0'),
    body('expiryDate')
      .optional()
      .isISO8601()
      .toDate()
      .custom((value: Date) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Expiry date must be in the future');
        }
        return true;
      }),
    body('isAvailable')
      .optional()
      .isBoolean()
      .withMessage('isAvailable must be a boolean'),
    body('quality')
      .optional()
      .isIn(['premium', 'good', 'average'])
      .withMessage('Quality must be premium, good, or average'),
    body('minimumOrderQuantity')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum order must be a positive number'),
    body('negotiable')
      .optional()
      .isBoolean()
      .withMessage('Negotiable must be a boolean'),
    body('imagesToDelete')
      .optional()
      .isArray()
      .withMessage('Images to delete must be an array')
  ],
  async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const ingredientId = req.params.id;
      const vendorId = req.user.id;
      const files = req.files as Express.Multer.File[];

      const ingredient = await Ingredient.findById(ingredientId);
      if (!ingredient) {
        return res.status(404).json({
          success: false,
          message: 'Ingredient not found'
        });
      }

      if (ingredient.vendorId.toString() !== vendorId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own ingredients'
        });
      }

      if (req.body.imagesToDelete && req.body.imagesToDelete.length > 0) {
        const deletePromises = req.body.imagesToDelete.map((publicId: string) => 
          deleteFromCloudinary(publicId)
        );
        await Promise.all(deletePromises);

        ingredient.images = ingredient.images.filter(
          (img: string) => !req.body.imagesToDelete.includes(img)
        );
      }

      if (files && files.length > 0) {
        const imageUploads = files.map(file => uploadToCloudinary(file.buffer, {
          folder: 'ingredients',
          transformation: [
            { width: 800, height: 600, crop: 'limit', quality: 'auto' },
            { format: 'auto' }
          ]
        }));

        const uploadedImages = await Promise.all(imageUploads);
        const newImages = uploadedImages.map(img => img.secure_url);

        ingredient.images.push(...newImages);
      }

      const allowedFields = [
        'name', 'description', 'quantity', 'originalPrice', 'currentPrice',
        'expiryDate', 'isAvailable', 'quality', 'minimumOrderQuantity', 'unit', 'category'
      ];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          (ingredient as any)[field] = req.body[field];
        }
      });

      if (req.body.originalPrice) {
        ingredient.basePrice = req.body.originalPrice;
      }

      if (req.body.originalPrice || req.body.expiryDate || req.body.quantity) {
        try {
          const dynamicPrice = await pricingService.calculateDynamicPrice(ingredientId);
          ingredient.currentPrice = req.body.currentPrice || dynamicPrice;
        } catch (priceError) {
          logger.error('Error recalculating dynamic price:', priceError);
        }
      }

      ingredient.updatedAt = new Date();
      await ingredient.save();

      await ingredient.populate('vendorId', '-password -refreshToken');

      logger.info(`Ingredient updated: ${ingredientId} by vendor: ${vendorId}`);

      res.json({
        success: true,
        message: 'Ingredient updated successfully',
        data: ingredient
      });

    } catch (error) {
      logger.error('Error updating ingredient:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update ingredient',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
    }
  }
);

// Delete ingredient
router.delete('/:id',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const ingredientId = req.params.id;
      const vendorId = req.user.id;

      const ingredient = await Ingredient.findById(ingredientId);
      if (!ingredient) {
        return res.status(404).json({
          success: false,
          message: 'Ingredient not found'
        });
      }

      if (ingredient.vendorId.toString() !== vendorId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own ingredients'
        });
      }

      if (ingredient.reservedQuantity > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete ingredient with pending orders'
        });
      }

      if (ingredient.images && ingredient.images.length > 0) {
        const deletePromises = ingredient.images.map((img: string) => 
          deleteFromCloudinary(img)
        );
        await Promise.all(deletePromises);
      }

      await Ingredient.findByIdAndDelete(ingredientId);

      logger.info(`Ingredient deleted: ${ingredientId} by vendor: ${vendorId}`);

      res.json({
        success: true,
        message: 'Ingredient deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting ingredient:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete ingredient',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
    }
  }
);

// Get ingredients by vendor
router.get('/vendor/:vendorId',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('isAvailable')
      .optional()
      .isBoolean()
      .withMessage('isAvailable must be a boolean')
  ],
  async (req: Request, res: Response) => {
    try {
      const vendorId = req.params.vendorId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const isAvailable = req.query.isAvailable;

      const filter: any = { vendorId: vendorId };
      if (isAvailable !== undefined) {
        filter.isAvailable = isAvailable === 'true';
      }

      const skip = (page - 1) * limit;
      const [ingredients, total] = await Promise.all([
        Ingredient.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('vendorId', '-password -refreshToken')
          .lean(),
        Ingredient.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: {
          ingredients,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching vendor ingredients:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch vendor ingredients',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
    }
  }
);

// Get my ingredients (authenticated vendor)
router.get('/my/ingredients',
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
    query('isAvailable')
      .optional()
      .isBoolean()
      .withMessage('isAvailable must be a boolean')
  ],
  async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const vendorId = req.user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const isAvailable = req.query.isAvailable;

      const filter: any = { vendorId: vendorId };
      if (isAvailable !== undefined) {
        filter.isAvailable = isAvailable === 'true';
      }

      const skip = (page - 1) * limit;
      const [ingredients, total] = await Promise.all([
        Ingredient.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Ingredient.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: {
          ingredients,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching my ingredients:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch your ingredients',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
    }
  }
);

// Bulk update ingredient prices
router.patch('/bulk/update-prices',
  authMiddleware,
  [
    body('ingredients')
      .isArray({ min: 1 })
      .withMessage('Ingredients array is required'),
    body('ingredients.*.id')
      .notEmpty()
      .withMessage('Ingredient ID is required'),
    body('ingredients.*.currentPrice')
      .isFloat({ min: 0.01 })
      .withMessage('Current price must be greater than 0')
  ],
  async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const vendorId = req.user.id;
      const { ingredients } = req.body;

      const ingredientIds = ingredients.map((ing: any) => ing.id);
      
      const existingIngredients = await Ingredient.find({
        _id: { $in: ingredientIds },
        vendorId: vendorId
      });

      if (existingIngredients.length !== ingredients.length) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own ingredients'
        });
      }

      const updatePromises = ingredients.map((ing: any) => 
        Ingredient.findByIdAndUpdate(
          ing.id,
          { 
            currentPrice: ing.currentPrice,
            updatedAt: new Date()
          },
          { new: true }
        )
      );

      const updatedIngredients = await Promise.all(updatePromises);

      logger.info(`Bulk price update for ${ingredients.length} ingredients by vendor: ${vendorId}`);

      res.json({
        success: true,
        message: 'Prices updated successfully',
        data: updatedIngredients
      });

    } catch (error) {
      logger.error('Error bulk updating prices:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update prices',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
    }
  }
);

export default router;