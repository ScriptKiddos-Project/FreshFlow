import { Schema, model, Document, Types } from 'mongoose';

export interface IIngredient extends Document {
  _id: Types.ObjectId;
  vendorId: Types.ObjectId;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  originalPrice: number;
  currentPrice: number;
  previousPrice?: number;
  dynamicPriceHistory: Array<{
    price: number;
    timestamp: Date;
    factor: string;
  }>;
  expiryDate: Date;
  addedDate: Date;
  description?: string;
  images: string[];
  location: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  quality: 'premium' | 'good' | 'average';
  tags: string[];
  isAvailable: boolean;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  viewCount: number;
  interestedBuyers: Types.ObjectId[];
  reservedQuantity: number;
  minimumOrderQuantity: number;
  minOrderQuantity?: number;
  discountPercentage: number;
  basePrice?: number;
  isActive: boolean;
  soldQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  maxOrderQuantity?: number;
  priceHistory: Array<{
    price: number;
    timestamp: Date;
    reason?: string;
  }>;
  priceUpdatedAt?: Date;
  priceOverride?: {
    isOverridden: boolean;
    overridePrice: number | null;
    reason: string | null;
    overrideBy: string | null;
    overrideDate: Date | null;
  };
  reviews: Array<{
    rating: number;
    comment?: string;
    buyerId: Types.ObjectId;
    createdAt: Date;
  }>;
  averageRating: number;
  createdAt: Date;
  updatedAt: Date;
}

const ingredientSchema = new Schema<IIngredient>({
  vendorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  category: {
    type: String,
    required: true,
    enum: [
      'vegetables', 'fruits', 'grains', 'spices', 'dairy', 
      'meat', 'seafood', 'herbs', 'oils', 'condiments', 'other'
    ],
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'gram', 'liter', 'ml', 'piece', 'dozen', 'bundle']
  },
  originalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  currentPrice: {
    type: Number,
    required: true,
    min: 0,
    index: true
  },
  previousPrice: {
    type: Number,
    min: 0
  },
  dynamicPriceHistory: [{
    price: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    factor: {
      type: String,
      enum: ['demand', 'expiry', 'supply', 'market'],
      required: true
    }
  }],
  expiryDate: {
    type: Date,
    required: true,
    index: true
  },
  addedDate: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },
  images: [{
    type: String,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  }],
  location: {
    address: {
      type: String,
      required: true,
      trim: true
    },
    coordinates: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      }
    }
  },
  quality: {
    type: String,
    enum: ['premium', 'good', 'average'],
    default: 'good'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isAvailable: {
    type: Boolean,
    default: true,
    index: true
  },
  urgencyLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
    index: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  interestedBuyers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  reservedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  minimumOrderQuantity: {
    type: Number,
    default: 1,
    min: 0.1
  },
  minOrderQuantity: {
    type: Number,
    default: 1,
    min: 0.1
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 80
  },
  basePrice: {
    type: Number,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxOrderQuantity: {
    type: Number,
    default: null
  },
  priceHistory: [{
    price: Number,
    timestamp: { type: Date, default: Date.now },
    reason: String
  }],
  priceUpdatedAt: {
    type: Date
  },
  priceOverride: {
    isOverridden: { type: Boolean, default: false },
    overridePrice: { type: Number, default: null },
    reason: { type: String, default: null },
    overrideBy: { type: String, default: null },
    overrideDate: { type: Date, default: null }
  },
  reviews: [{
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    buyerId: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  }
} as any, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance optimization
ingredientSchema.index({ vendorId: 1, isAvailable: 1 });
ingredientSchema.index({ category: 1, currentPrice: 1 });
ingredientSchema.index({ expiryDate: 1, isAvailable: 1 });
ingredientSchema.index({ urgencyLevel: 1, expiryDate: 1 });
ingredientSchema.index({ 'location.coordinates': '2dsphere' });
ingredientSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Virtual fields
ingredientSchema.virtual('availableQuantity').get(function() {
  return this.quantity - this.reservedQuantity;
});

ingredientSchema.virtual('daysUntilExpiry').get(function() {
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

ingredientSchema.virtual('finalPrice').get(function() {
  return this.currentPrice * (1 - this.discountPercentage / 100);
});

// Pre-save middleware to update urgency level based on expiry
ingredientSchema.pre('save', function(next) {
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry <= 1) {
    (this as any).urgencyLevel = 'critical';
    (this as any).discountPercentage = Math.max((this as any).discountPercentage, 50);
  } else if (daysUntilExpiry <= 2) {
    (this as any).urgencyLevel = 'high';
    (this as any).discountPercentage = Math.max((this as any).discountPercentage, 30);
  } else if (daysUntilExpiry <= 5) {
    (this as any).urgencyLevel = 'medium';
    (this as any).discountPercentage = Math.max((this as any).discountPercentage, 15);
  } else {
    (this as any).urgencyLevel = 'low';
  }
  
  next();
});

// Static methods
ingredientSchema.statics.findByCategory = function(category: string) {
  return this.find({ category, isAvailable: true }).populate('vendorId', 'name phone location');
};

ingredientSchema.statics.findExpiringToday = function() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  return this.find({
    expiryDate: { $lt: tomorrow },
    isAvailable: true,
    quantity: { $gt: 0 }
  });
};

ingredientSchema.statics.findNearby = function(latitude: number, longitude: number, maxDistance = 10000) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    isAvailable: true
  });
};

const IngredientModel = model<IIngredient>('Ingredient', ingredientSchema);

export const Ingredient = IngredientModel;
export default IngredientModel;