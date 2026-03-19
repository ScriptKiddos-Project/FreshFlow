import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: 'order' | 'price_alert' | 'expiry_warning' | 'system' | 'promotion' | 'payment';
  title: string;
  message: string;
  data?: {
    orderId?: Types.ObjectId;
    ingredientId?: Types.ObjectId;
    transactionId?: Types.ObjectId;
    actionUrl?: string;
    [key: string]: any;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  isArchived: boolean;
  readAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isExpired: boolean;
  timeAgo: string;
}

const notificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['order', 'price_alert', 'expiry_warning', 'system', 'promotion', 'payment'],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 500,
    trim: true
  },
  data: {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order'
    },
    ingredientId: {
      type: Schema.Types.ObjectId,
      ref: 'Ingredient'
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    actionUrl: String,
    type: Schema.Types.Mixed
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: Date,
  expiresAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for optimal querying
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, priority: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual fields
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now.getTime() - this.createdAt.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
});

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

// Static methods
notificationSchema.statics.createNotification = async function(
  userId: Types.ObjectId,
  type: string,
  title: string,
  message: string,
  data?: any,
  priority: string = 'medium',
  expiresAt?: Date
) {
  return this.create({
    userId,
    type,
    title,
    message,
    data,
    priority,
    expiresAt
  });
};

notificationSchema.statics.markAsRead = async function(notificationId: Types.ObjectId, userId: Types.ObjectId) {
  return this.findOneAndUpdate(
    { _id: notificationId, userId },
    { 
      isRead: true, 
      readAt: new Date() 
    },
    { new: true }
  );
};

notificationSchema.statics.markAllAsRead = async function(userId: Types.ObjectId) {
  return this.updateMany(
    { userId, isRead: false },
    { 
      isRead: true, 
      readAt: new Date() 
    }
  );
};

notificationSchema.statics.getUnreadCount = async function(userId: Types.ObjectId) {
  return this.countDocuments({ userId, isRead: false, isArchived: false });
};

notificationSchema.statics.cleanup = async function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.deleteMany({
    $or: [
      { isArchived: true, updatedAt: { $lte: thirtyDaysAgo } },
      { isRead: true, createdAt: { $lte: thirtyDaysAgo } }
    ]
  });
};

export const Notification = model<INotification>('Notification', notificationSchema);