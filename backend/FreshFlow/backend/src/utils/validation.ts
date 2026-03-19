// backend/src/utils/validation.ts
import Joi from 'joi';
import { Types } from 'mongoose';

// Common validation schemas
export const commonSchemas = {
  mongoId: Joi.string().custom((value, helpers) => {
    if (!Types.ObjectId.isValid(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  }).messages({
    'any.invalid': 'Invalid MongoDB ObjectId'
  }),

  email: Joi.string().email().lowercase().trim(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).messages({
    'string.pattern.base': 'Phone number must be a valid 10-digit Indian mobile number'
  }),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).messages({
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
  }),
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).required()
  }),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().default('-createdAt'),
    search: Joi.string().allow('').optional()
  }
};

// User validation schemas
export const userValidation = {
  register: Joi.object({
    name: Joi.string().min(2).max(50).trim().required(),
    email: commonSchemas.email.required(),
    phone: commonSchemas.phone.required(),
    password: commonSchemas.password.required(),
    businessName: Joi.string().min(2).max(100).trim().required(),
    businessType: Joi.string().valid('street_vendor', 'restaurant', 'cafe', 'catering', 'other').required(),
    location: commonSchemas.location.required(),
    address: Joi.string().min(10).max(200).trim().required(),
    gstNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional(),
    fssaiNumber: Joi.string().pattern(/^[0-9]{14}$/).optional(),
    operatingHours: Joi.object({
      open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
    }).required(),
    cuisineTypes: Joi.array().items(Joi.string()).min(1).required(),
    averageOrderValue: Joi.number().min(0).default(0),
    acceptsOnlinePayments: Joi.boolean().default(true)
  }),

  login: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().required()
  }),

  forgotPassword: Joi.object({
    email: commonSchemas.email.required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: commonSchemas.password.required()
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50).trim(),
    phone: commonSchemas.phone,
    businessName: Joi.string().min(2).max(100).trim(),
    businessType: Joi.string().valid('street_vendor', 'restaurant', 'cafe', 'catering', 'other'),
    address: Joi.string().min(10).max(200).trim(),
    gstNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).allow(''),
    fssaiNumber: Joi.string().pattern(/^[0-9]{14}$/).allow(''),
    operatingHours: Joi.object({
      open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    }),
    cuisineTypes: Joi.array().items(Joi.string()).min(1),
    averageOrderValue: Joi.number().min(0),
    acceptsOnlinePayments: Joi.boolean()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password.required()
  })
};

// Ingredient validation schemas
export const ingredientValidation = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).trim().required(),
    category: Joi.string().valid(
      'vegetables', 'fruits', 'grains', 'spices', 'dairy', 
      'meat', 'seafood', 'oils', 'condiments', 'beverages'
    ).required(),
    quantity: Joi.number().min(0.1).required(),
    unit: Joi.string().valid('kg', 'grams', 'liters', 'ml', 'pieces', 'dozens', 'packets').required(),
    pricePerUnit: Joi.number().min(0.01).required(),
    expiryDate: Joi.date().greater('now').required(),
    quality: Joi.string().valid('premium', 'good', 'average').default('good'),
    description: Joi.string().max(500).trim().optional(),
    minQuantity: Joi.number().min(0.1).default(0.1),
    maxQuantity: Joi.number().min(Joi.ref('minQuantity')).optional(),
    isOrganic: Joi.boolean().default(false),
    harvestedDate: Joi.date().max('now').optional(),
    storageConditions: Joi.string().max(200).optional(),
    negotiable: Joi.boolean().default(true)
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).trim(),
    category: Joi.string().valid(
      'vegetables', 'fruits', 'grains', 'spices', 'dairy', 
      'meat', 'seafood', 'oils', 'condiments', 'beverages'
    ),
    quantity: Joi.number().min(0.1),
    unit: Joi.string().valid('kg', 'grams', 'liters', 'ml', 'pieces', 'dozens', 'packets'),
    pricePerUnit: Joi.number().min(0.01),
    expiryDate: Joi.date().greater('now'),
    quality: Joi.string().valid('premium', 'good', 'average'),
    description: Joi.string().max(500).trim().allow(''),
    minQuantity: Joi.number().min(0.1),
    maxQuantity: Joi.number().min(Joi.ref('minQuantity')),
    isOrganic: Joi.boolean(),
    harvestedDate: Joi.date().max('now'),
    storageConditions: Joi.string().max(200).allow(''),
    negotiable: Joi.boolean(),
    status: Joi.string().valid('available', 'reserved', 'sold', 'expired')
  }),

  search: Joi.object({
    ...commonSchemas.pagination,
    category: Joi.string().valid(
      'vegetables', 'fruits', 'grains', 'spices', 'dairy', 
      'meat', 'seafood', 'oils', 'condiments', 'beverages'
    ).optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(Joi.ref('minPrice')).optional(),
    quality: Joi.string().valid('premium', 'good', 'average').optional(),
    isOrganic: Joi.boolean().optional(),
    location: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
      radius: Joi.number().min(1).max(50).default(5) // km
    }).optional(),
    expiryDays: Joi.number().min(1).max(30).optional(),
    availableOnly: Joi.boolean().default(true)
  })
};

// Order validation schemas
export const orderValidation = {
  create: Joi.object({
    ingredientId: commonSchemas.mongoId.required(),
    quantity: Joi.number().min(0.1).required(),
    proposedPrice: Joi.number().min(0.01).optional(),
    message: Joi.string().max(300).trim().optional(),
    preferredDeliveryDate: Joi.date().greater('now').optional(),
    paymentMethod: Joi.string().valid('cash', 'razorpay', 'bank_transfer').default('cash')
  }),

  update: Joi.object({
    status: Joi.string().valid('pending', 'accepted', 'rejected', 'in_transit', 'delivered', 'cancelled'),
    rejectionReason: Joi.string().max(200).when('status', {
      is: 'rejected',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    deliveryDate: Joi.date().greater('now').when('status', {
      is: 'accepted',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    trackingInfo: Joi.string().max(100).optional()
  }),

  search: Joi.object({
    ...commonSchemas.pagination,
    status: Joi.string().valid('pending', 'accepted', 'rejected', 'in_transit', 'delivered', 'cancelled').optional(),
    buyerId: commonSchemas.mongoId.optional(),
    sellerId: commonSchemas.mongoId.optional(),
    ingredientCategory: Joi.string().optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().min(Joi.ref('dateFrom')).optional(),
    minAmount: Joi.number().min(0).optional(),
    maxAmount: Joi.number().min(Joi.ref('minAmount')).optional()
  })
};

// Analytics validation schemas
export const analyticsValidation = {
  dashboard: Joi.object({
    period: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
    vendorId: commonSchemas.mongoId.optional()
  }),

  reports: Joi.object({
    type: Joi.string().valid('sales', 'waste', 'pricing', 'vendors', 'transactions').required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    format: Joi.string().valid('json', 'csv', 'pdf').default('json'),
    filters: Joi.object({
      category: Joi.string().optional(),
      location: Joi.string().optional(),
      vendorType: Joi.string().optional(),
      minAmount: Joi.number().min(0).optional(),
      maxAmount: Joi.number().min(Joi.ref('minAmount')).optional()
    }).optional()
  })
};

// Admin validation schemas
export const adminValidation = {
  vendorApproval: Joi.object({
    vendorId: commonSchemas.mongoId.required(),
    status: Joi.string().valid('approved', 'rejected').required(),
    reason: Joi.string().max(300).when('status', {
      is: 'rejected',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    notes: Joi.string().max(500).optional()
  }),

  systemConfig: Joi.object({
    priceUpdateFrequency: Joi.number().min(5).max(60).optional(), // minutes
    maxRadius: Joi.number().min(1).max(100).optional(), // km
    commissionRate: Joi.number().min(0).max(0.2).optional(), // 0-20%
    autoExpiryDays: Joi.number().min(1).max(30).optional(),
    maintenanceMode: Joi.boolean().optional(),
    featuresEnabled: Joi.object({
      dynamicPricing: Joi.boolean().optional(),
      autoNotifications: Joi.boolean().optional(),
      bulkOrders: Joi.boolean().optional(),
      paymentIntegration: Joi.boolean().optional()
    }).optional()
  })
};

// Custom validation helpers
export const validationHelpers = {
  // Validate coordinates
  validateCoordinates: (coordinates: [number, number]): boolean => {
    if (!Array.isArray(coordinates) || coordinates.length !== 2) return false;
    const [lng, lat] = coordinates;
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
  },

  // Validate Indian GST number
  validateGST: (gstNumber: string): boolean => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gstNumber);
  },

  // Validate FSSAI number
  validateFSSAI: (fssaiNumber: string): boolean => {
    const fssaiRegex = /^[0-9]{14}$/;
    return fssaiRegex.test(fssaiNumber);
  },

  // Validate business hours
  validateBusinessHours: (open: string, close: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(open) || !timeRegex.test(close)) return false;
    
    const openTime = new Date(`1970-01-01T${open}:00`);
    const closeTime = new Date(`1970-01-01T${close}:00`);
    return openTime < closeTime;
  },

  // Sanitize search query
  sanitizeSearchQuery: (query: string): string => {
    return query
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/[{}[\]]/g, '') // Remove brackets
      .replace(/[^\w\s-_.]/g, '') // Allow only word chars, spaces, hyphens, underscores, dots
      .trim()
      .substring(0, 100); // Limit length
  },

  // Validate file upload
  validateFileUpload: (file: any): { valid: boolean; error?: string } => {
    if (!file) return { valid: false, error: 'No file provided' };
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return { valid: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' };
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size too large. Maximum 5MB allowed' };
    }
    
    return { valid: true };
  },

  // Generate validation error message
  formatValidationError: (error: Joi.ValidationError): string => {
    return error.details
      .map(detail => detail.message.replace(/["]/g, ''))
      .join(', ');
  },

  // Check if date is within valid range
  isValidExpiryDate: (date: Date): boolean => {
    const now = new Date();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 12); // Max 1 year ahead
    
    return date > now && date <= maxDate;
  },

  // Validate quantity against min/max limits
  validateQuantityLimits: (quantity: number, minQuantity: number, maxQuantity?: number): boolean => {
    if (quantity < minQuantity) return false;
    if (maxQuantity && quantity > maxQuantity) return false;
    return true;
  },

  // Validate price reasonableness
  validatePriceRange: (price: number, category: string): boolean => {
    // Basic price validation based on category
    const priceLimits: Record<string, { min: number; max: number }> = {
      vegetables: { min: 1, max: 1000 },
      fruits: { min: 1, max: 2000 },
      grains: { min: 10, max: 500 },
      spices: { min: 50, max: 5000 },
      dairy: { min: 20, max: 1000 },
      meat: { min: 100, max: 2000 },
      seafood: { min: 150, max: 3000 },
      oils: { min: 50, max: 800 },
      condiments: { min: 10, max: 1000 },
      beverages: { min: 5, max: 500 }
    };
    
    const limits = priceLimits[category];
    if (!limits) return true; // Unknown category, allow any price
    
    return price >= limits.min && price <= limits.max;
  }
};

// Export validation middleware factory
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message.replace(/["]/g, ''),
          value: detail.context?.value
        }))
      });
    }
    
    req.body = value;
    next();
  };
};

// Export query validation middleware
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Query validation error',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message.replace(/["]/g, ''),
          value: detail.context?.value
        }))
      });
    }
    
    req.query = value;
    next();
  };
};

// Export params validation middleware
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Parameter validation error',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message.replace(/["]/g, ''),
          value: detail.context?.value
        }))
      });
    }
    
    req.params = value;
    next();
  };
};