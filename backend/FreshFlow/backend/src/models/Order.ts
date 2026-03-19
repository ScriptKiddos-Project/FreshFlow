import { Schema, model, Document, Types } from 'mongoose';

export interface IOrderItem {
  ingredientId: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  ingredientSnapshot: {
    name: string;
    category: string;
    unit: string;
    quality: string;
    vendorName: string;
  };
  review: string;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderId: string; // Unique human-readable order ID
  buyerId: Types.ObjectId;
  sellerId: Types.ObjectId;
  items: IOrderItem[];
  ingredientId?: Types.ObjectId; // Convenience field for single-item orders
  quantity?: number; // Convenience field for single-item orders
  unitPrice?: number; // Convenience field for single-item orders
  subtotal?: number; // Convenience field for single-item orders
  orderNumber?: string; // Alternative ID field
  totalAmount: number;
  platformFee: number;
  finalAmount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'disputed';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: 'cash' | 'upi' | 'card' | 'wallet';
  deliveryDetails: {
    type: 'pickup' | 'delivery';
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    scheduledTime?: Date;
    actualTime?: Date;
    instructions?: string;
  };
  timeline: Array<{
    status: string;
    timestamp: Date;
    note?: string;
    updatedBy?: Types.ObjectId;
  }>;
  communication: Array<{
    from: Types.ObjectId;
    message: string;
    timestamp: Date;
    type: 'text' | 'image' | 'system';
  }>;
  rating?: {
    buyerRating?: number;
    sellerRating?: number;
    buyerReview?: string;
    sellerReview?: string;
  };
  cancellationReason?: string;
  refundAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  ingredientId: {
    type: Schema.Types.ObjectId,
    ref: 'Ingredient',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  review: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    createdAt: Date
  },
  ingredientSnapshot: {
    name: { type: String, required: true },
    category: { type: String, required: true },
    unit: { type: String, required: true },
    quality: { type: String, required: true },
    vendorName: { type: String, required: true }
  }
}, { _id: false });

const orderSchema = new Schema<IOrder>({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  buyerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sellerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  items: [orderItemSchema],
  ingredientId: {
    type: Schema.Types.ObjectId,
    ref: 'Ingredient'
  },
  quantity: Number,
  unitPrice: Number,
  subtotal: Number,
  orderNumber: String,
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },
  finalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'disputed'],
    default: 'pending',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'card', 'wallet'],
    default: 'cash'
  },
  deliveryDetails: {
    type: {
      type: String,
      enum: ['pickup', 'delivery'],
      required: true
    },
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    scheduledTime: Date,
    actualTime: Date,
    instructions: String
  },
  timeline: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  communication: [{
    from: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['text', 'image', 'system'],
      default: 'text'
    }
  }],
  rating: {
    buyerRating: {
      type: Number,
      min: 1,
      max: 5
    },
    sellerRating: {
      type: Number,
      min: 1,
      max: 5
    },
    buyerReview: {
      type: String,
      maxlength: 500
    },
    sellerReview: {
      type: String,
      maxlength: 500
    }
  },
  cancellationReason: {
    type: String,
    maxlength: 500
  },
  refundAmount: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for performance
orderSchema.index({ buyerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, status: 1 });

// Virtual fields
orderSchema.virtual('itemCount').get(function() {
  return this.items.length;
});

orderSchema.virtual('totalQuantity').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

orderSchema.virtual('canCancel').get(function() {
  return ['pending', 'confirmed'].includes(this.status);
});

orderSchema.virtual('isActive').get(function() {
  return !['completed', 'cancelled'].includes(this.status);
});

// Pre-save middleware to generate order ID
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderId) {
    const count = await model('Order').countDocuments();
    this.orderId = `FF${Date.now().toString().slice(-6)}${String(count + 1).padStart(3, '0')}`;
  }
  
  // Add status change to timeline
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({
      status: this.status,
      timestamp: new Date(),
      updatedBy: this.sellerId // Default to seller, should be overridden in controller
    });
  }
  
  next();
});

// Static methods
orderSchema.statics.findActiveOrders = function(userId: Types.ObjectId) {
  return this.find({
    $or: [{ buyerId: userId }, { sellerId: userId }],
    status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] }
  })
  .populate('buyerId', 'name phone')
  .populate('sellerId', 'name phone')
  .sort({ createdAt: -1 });
};

orderSchema.statics.findOrderHistory = function(userId: Types.ObjectId, limit = 20) {
  return this.find({
    $or: [{ buyerId: userId }, { sellerId: userId }],
    status: { $in: ['completed', 'cancelled'] }
  })
  .populate('buyerId', 'name phone')
  .populate('sellerId', 'name phone')
  .sort({ createdAt: -1 })
  .limit(limit);
};

orderSchema.statics.getOrderStats = function(userId: Types.ObjectId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        $or: [{ buyerId: userId }, { sellerId: userId }],
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$finalAmount' }
      }
    }
  ]);
};

// Instance methods
orderSchema.methods.addMessage = function(fromId: Types.ObjectId, message: string, type = 'text') {
  this.communication.push({
    from: fromId,
    message,
    type,
    timestamp: new Date()
  });
  return this.save();
};

orderSchema.methods.updateStatus = function(status: string, updatedBy: Types.ObjectId, note?: string) {
  this.status = status;
  this.timeline.push({
    status,
    timestamp: new Date(),
    updatedBy,
    note
  });
  return this.save();
};

orderSchema.methods.calculatePlatformFee = function() {
  // 2% platform fee, minimum ₹2, maximum ₹50
  const feeRate = 0.02;
  const fee = this.totalAmount * feeRate;
  this.platformFee = Math.min(Math.max(fee, 2), 50);
  this.finalAmount = this.totalAmount + this.platformFee;
};

const OrderModel = model<IOrder>('Order', orderSchema);

export const Order = OrderModel;
export default OrderModel;