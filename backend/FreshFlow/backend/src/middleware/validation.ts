import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { Types } from 'mongoose';

// Custom Joi extensions for MongoDB ObjectId
const objectId = Joi.string().custom((value, helpers) => {
  if (!Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}).messages({
  'any.invalid': 'Invalid ObjectId format'
});

// Validation schemas
export const schemas = {
  // Auth schemas
  register: Joi.object({
    name: Joi.string().trim().min(2).max(50).required()
      .messages({
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot exceed 50 characters'
      }),
    email: Joi.string().email().lowercase().required()
      .messages({
        'string.email': 'Please provide a valid email address'
      }),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character'
      }),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).required()
      .messages({
        'string.pattern.base': 'Please provide a valid Indian mobile number'
      }),
    shopName: Joi.string().trim().min(2).max(100).required(),
    shopAddress: Joi.string().trim().min(10).max(200).required(),
    location: Joi.object({
      type: Joi.string().valid('Point').default('Point'),
      coordinates: Joi.array().items(Joi.number()).length(2).required()
    }).required()
  }),

  login: Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().required(),
    rememberMe: Joi.boolean().default(false)
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().lowercase().required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character'
      })
  }),

  // Ingredient schemas
  createIngredient: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    category: Joi.string().valid(
      'fruits', 'vegetables', 'spices', 'grains', 'dairy', 
      'meat', 'seafood', 'oils', 'condiments', 'others'
    ).required(),
    quantity: Joi.number().positive().precision(2).required(),
    unit: Joi.string().valid('kg', 'g', 'liter', 'ml', 'pieces', 'bunches').required(),
    basePrice: Joi.number().positive().precision(2).required(),
    currentPrice: Joi.number().positive().precision(2).optional(),
    expiryDate: Joi.date().min('now').required()
      .messages({
        'date.min': 'Expiry date must be in the future'
      }),
    description: Joi.string().trim().max(500).optional(),
    images: Joi.array().items(Joi.string().uri()).max(5).optional(),
    tags: Joi.array().items(Joi.string().trim().max(20)).max(10).optional(),
    isOrganic: Joi.boolean().default(false),
    harvestDate: Joi.date().max('now').optional(),
    qualityGrade: Joi.string().valid('A', 'B', 'C').default('B')
  }),

  updateIngredient: Joi.object({
    quantity: Joi.number().positive().precision(2).optional(),
    basePrice: Joi.number().positive().precision(2).optional(),
    currentPrice: Joi.number().positive().precision(2).optional(),
    expiryDate: Joi.date().min('now').optional(),
    description: Joi.string().trim().max(500).optional(),
    images: Joi.array().items(Joi.string().uri()).max(5).optional(),
    tags: Joi.array().items(Joi.string().trim().max(20)).max(10).optional(),
    isOrganic: Joi.boolean().optional(),
    qualityGrade: Joi.string().valid('A', 'B', 'C').optional(),
    isActive: Joi.boolean().optional()
  }),

  // Order schemas
  createOrder: Joi.object({
    items: Joi.array().items(Joi.object({
      ingredientId: objectId.required(),
      quantity: Joi.number().positive().precision(2).required(),
      requestedPrice: Joi.number().positive().precision(2).optional()
    })).min(1).required(),
    deliveryAddress: Joi.string().trim().min(10).max(200).required(),
    deliveryDate: Joi.date().min('now').required(),
    notes: Joi.string().trim().max(500).optional(),
    paymentMethod: Joi.string().valid('cash', 'online', 'credit').default('cash')
  }),

  updateOrderStatus: Joi.object({
    status: Joi.string().valid(
      'pending', 'confirmed', 'processing', 'shipped', 
      'delivered', 'cancelled', 'returned'
    ).required(),
    notes: Joi.string().trim().max(500).optional()
  }),

  // Query parameter schemas
  paginationQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('createdAt', '-createdAt', 'name', '-name', 'price', '-price').default('-createdAt')
  }),

  ingredientFilters: Joi.object({
    category: Joi.string().valid(
      'fruits', 'vegetables', 'spices', 'grains', 'dairy', 
      'meat', 'seafood', 'oils', 'condiments', 'others'
    ).optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    location: Joi.string().optional(),
    radius: Joi.number().min(1).max(100).default(10), // km
    isOrganic: Joi.boolean().optional(),
    qualityGrade: Joi.string().valid('A', 'B', 'C').optional(),
    expiringIn: Joi.number().min(1).max(30).optional(), // days
    search: Joi.string().trim().min(2).max(50).optional()
  }),

  // User profile schemas
  updateProfile: Joi.object({
    name: Joi.string().trim().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional(),
    shopName: Joi.string().trim().min(2).max(100).optional(),
    shopAddress: Joi.string().trim().min(10).max(200).optional(),
    location: Joi.object({
      type: Joi.string().valid('Point').default('Point'),
      coordinates: Joi.array().items(Joi.number()).length(2).required()
    }).optional(),
    businessHours: Joi.object({
      open: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      close: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
    }).optional(),
    description: Joi.string().trim().max(500).optional()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character'
      })
  })
};

// Generic validation middleware factory
export const validate = (schema: Joi.Schema, property: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        details: errorDetails
      });
      return;
    }

    // Replace the original data with validated and sanitized data
    req[property] = value;
    next();
  };
};

// Specific validation middlewares
export const validateRegistration = validate(schemas.register);
export const validateLogin = validate(schemas.login);
export const validateForgotPassword = validate(schemas.forgotPassword);
export const validateResetPassword = validate(schemas.resetPassword);
export const validateCreateIngredient = validate(schemas.createIngredient);
export const validateUpdateIngredient = validate(schemas.updateIngredient);
export const validateCreateOrder = validate(schemas.createOrder);
export const validateUpdateOrderStatus = validate(schemas.updateOrderStatus);
export const validateUpdateProfile = validate(schemas.updateProfile);
export const validateChangePassword = validate(schemas.changePassword);

// Query validation middlewares
export const validatePagination = validate(schemas.paginationQuery, 'query');
export const validateIngredientFilters = validate(schemas.ingredientFilters, 'query');

// ObjectId parameter validation
export const validateObjectId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: `${paramName} parameter is required`,
        error: 'MISSING_PARAMETER'
      });
      return;
    }

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`,
        error: 'INVALID_OBJECT_ID'
      });
      return;
    }

    next();
  };
};

// Sanitize input middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Recursively sanitize strings in request body
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/[<>]/g, ''); // Basic XSS prevention
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }

  next();
};

// File upload validation - FIXED
export const validateFileUpload = (maxFiles: number = 5, maxSizeMB: number = 5) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      next();
      return;
    }

    // Type guard to ensure req.files is an array
    const filesArray = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    
    if (filesArray.length > maxFiles) {
      res.status(400).json({
        success: false,
        message: `Maximum ${maxFiles} files allowed`,
        error: 'TOO_MANY_FILES'
      });
      return;
    }

    const maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    for (const file of filesArray) {
      if (file.size > maxSize) {
        res.status(400).json({
          success: false,
          message: `File size must be less than ${maxSizeMB}MB`,
          error: 'FILE_TOO_LARGE'
        });
        return;
      }

      if (!allowedTypes.includes(file.mimetype)) {
        res.status(400).json({
          success: false,
          message: 'Only JPEG, PNG and WebP images are allowed',
          error: 'INVALID_FILE_TYPE'
        });
        return;
      }
    }

    next();
  };
};

// Export alias for backward compatibility
export const validateRequest = validate;