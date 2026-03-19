import { Schema, model, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  _id: Types.ObjectId;
  transactionId: string;
  orderId: Types.ObjectId;
  buyerId: Types.ObjectId;
  sellerId: Types.ObjectId;
  amount: number;
  platformFee: number;
  sellerAmount: number; // Amount after deducting platform fee
  type: 'payment' | 'refund' | 'payout' | 'fee';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  paymentMethod: 'cash' | 'upi' | 'card' | 'wallet';
  paymentGateway?: 'razorpay' | 'paytm' | 'phonepe';
  gatewayTransactionId?: string;
  gatewayResponse?: any;
  failureReason?: string;
  processedAt?: Date;
  settlementDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
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
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },
  sellerAmount: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['payment', 'refund', 'payout', 'fee'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'card', 'wallet'],
    required: true
  },
  paymentGateway: {
    type: String,
    enum: ['razorpay', 'paytm', 'phonepe']
  },
  gatewayTransactionId: {
    type: String,
    index: true
  },
  gatewayResponse: {
    type: Schema.Types.Mixed
  },
  failureReason: {
    type: String,
    maxlength: 500
  },
  processedAt: Date,
  settlementDate: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
transactionSchema.index({ buyerId: 1, status: 1, createdAt: -1 });
transactionSchema.index({ sellerId: 1, type: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });

// Virtual fields
transactionSchema.virtual('isSuccessful').get(function() {
  return this.status === 'completed';
});

transactionSchema.virtual('isPending').get(function() {
  return ['pending', 'processing'].includes(this.status);
});

// Pre-save middleware to generate transaction ID
transactionSchema.pre('save', async function(next) {
  if (this.isNew && !this.transactionId) {
    const count = await model('Transaction').countDocuments();
    this.transactionId = `TXN${Date.now().toString().slice(-8)}${String(count + 1).padStart(4, '0')}`;
  }
  
  // Auto-calculate seller amount
  if (this.isModified('amount') || this.isModified('platformFee')) {
    this.sellerAmount = this.amount - this.platformFee;
  }
  
  // Set processed time when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.processedAt) {
    this.processedAt = new Date();
  }
  
  next();
});

// Static methods
transactionSchema.statics.findByUser = function(userId: Types.ObjectId, type?: string) {
  const query: any = {
    $or: [{ buyerId: userId }, { sellerId: userId }]
  };
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .populate('orderId', 'orderId')
    .populate('buyerId', 'name')
    .populate('sellerId', 'name')
    .sort({ createdAt: -1 });
};

transactionSchema.statics.getDailyStats = function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        totalAmount: { $sum: '$amount' },
        platformFeeTotal: { $sum: '$platformFee' },
        transactionCount: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
    }
  ]);
};

transactionSchema.statics.getRevenueStats = function(startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed',
        type: 'payment'
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalPlatformFee: { $sum: '$platformFee' },
        totalTransactions: { $sum: 1 },
        avgTransactionValue: { $avg: '$amount' }
      }
    }
  ]);
};

const TransactionModel = model<ITransaction>('Transaction', transactionSchema);

export const Transaction = TransactionModel;
export default TransactionModel;