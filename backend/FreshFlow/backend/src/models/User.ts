import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { IUser } from '../types/user';

// Define the specific status type
export type UserStatus = 'active' | 'pending_verification' | 'suspended' | 'banned';

// Extend IUser but override the status property type
export interface IUserDocument extends Omit<IUser, 'status'>, Document {
  _id: mongoose.Types.ObjectId;
  comparePassword(password: string): Promise<boolean>;
  generateAuthToken(): string;
  createPasswordResetToken(): string;
  // Additional fields used in routes
  businessDescription?: string;
  businessType?: string;
  businessHours?: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };
  phoneOTP?: string;
  phoneOTPExpiresAt?: Date;
  paymentMethods?: string[];
  savedIngredients?: mongoose.Types.ObjectId[];
  favoriteVendors?: mongoose.Types.ObjectId[];
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  totalRatings?: number;
  status?: UserStatus;
  id: string;
  location: string;
  // Admin action fields
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
  suspensionReason?: string;
  suspendedAt?: Date;
  suspendedBy?: string;
  unsuspendedAt?: Date;
  unsuspendedBy?: string;
}

const userSchema = new Schema<IUserDocument>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['vendor', 'admin'],
    default: 'vendor'
  },
  businessName: {
    type: String,
    trim: true,
    maxlength: [100, 'Business name cannot exceed 100 characters']
  },
  businessType: {
    type: String,
    trim: true
  },
  businessDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: {
      type: String,
      match: [/^[1-9][0-9]{5}$/, 'Please enter a valid pincode']
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  businessHours: {
    monday: {
      open: { type: String },
      close: { type: String }
    },
    tuesday: {
      open: { type: String },
      close: { type: String }
    },
    wednesday: {
      open: { type: String },
      close: { type: String }
    },
    thursday: {
      open: { type: String },
      close: { type: String }
    },
    friday: {
      open: { type: String },
      close: { type: String }
    },
    saturday: {
      open: { type: String },
      close: { type: String }
    },
    sunday: {
      open: { type: String },
      close: { type: String }
    }
  },
  paymentMethods: {
    type: [String],
    enum: ['cash', 'upi', 'card', 'bank_transfer'],
    default: ['cash']
  },
  savedIngredients: [{
    type: Schema.Types.ObjectId,
    ref: 'Ingredient'
  }],
  favoriteVendors: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  preferences: {
    notifications: {
      orders: { type: Boolean, default: true },
      prices: { type: Boolean, default: true },
      expiry: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false }
    },
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'INR' }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'pending_verification', 'suspended', 'banned'],
    default: 'pending_verification'
  },
  profileImage: {
    type: String,
    default: null
  },
  profilePicture: {
    type: String,
    default: null
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  refreshToken: {
    type: String,
    default: null
  },
  refreshTokenExpires: {
    type: Date,
    default: null
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  passwordChangedAt: {
    type: Date,
    default: null
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  phoneOTP: {
    type: String,
    default: null
  },
  phoneOTPExpiresAt: {
    type: Date,
    default: null
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  pushToken: {
    type: String
  },
  pushEnabled: {
    type: Boolean,
    default: true
  },
  // Admin action tracking fields
  verifiedAt: {
    type: Date,
    default: null
  },
  verifiedBy: {
    type: String,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  suspensionReason: {
    type: String,
    default: null
  },
  suspendedAt: {
    type: Date,
    default: null
  },
  suspendedBy: {
    type: String,
    default: null
  },
  unsuspendedAt: {
    type: Date,
    default: null
  },
  unsuspendedBy: {
    type: String,
    default: null
  }
} as any, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (_doc, ret) {
      const { password, ...rest } = ret;
      return rest;
    }
  }
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ location: '2dsphere' });
userSchema.index({ isApproved: 1, role: 1 });

// Password hashing
userSchema.pre<IUserDocument>('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err as Error);
  }
});

// Compare passwords
userSchema.methods.comparePassword = function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function (): string {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );
};

// Create password reset token
userSchema.methods.createPasswordResetToken = function (): string {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
  
  return resetToken;
};

// Virtual property for 'id'
userSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

export const User = mongoose.model<IUserDocument>('User', userSchema);