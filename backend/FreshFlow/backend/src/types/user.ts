export interface IUser {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'vendor' | 'admin';
  businessName?: string;
  businessType?: string;
  gstNumber?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  profileImage?: string;
  profilePicture?: string;
  isVerified: boolean;
  status?: 'active' | 'pending_verification' | 'suspended' | 'banned';
  isActive: boolean;
  verificationToken?: string;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordChangedAt?: Date;
  lastActive: Date;
  lastLoginAt?: Date;
  pushToken?: string;
  pushEnabled: boolean;
  refreshToken?: string;
  refreshTokenExpires?: Date;
  isSuspended?: boolean;
  preferences: {
    notifications: {
      orders: boolean;
      prices: boolean;
      expiry: boolean;
      promotions: boolean;
    };
    language: string;
    currency: string;
  };
  subscription?: {
    plan: 'free' | 'basic' | 'premium';
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  };
  rating?: {
    average: number;
    count: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'vendor' | 'admin';
  businessName?: string;
  businessType?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
}

export interface UpdateUserData {
  name?: string;
  phone?: string;
  businessName?: string;
  businessType?: string;
  gstNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
  };
  profileImage?: string;
  preferences?: {
    notifications?: {
      orders?: boolean;
      prices?: boolean;
      expiry?: boolean;
      promotions?: boolean;
    };
    language?: string;
    currency?: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  businessName?: string;
  businessType?: string;
  gstNumber?: string;
  address: any;
  profileImage?: string;
  isVerified: boolean;
  rating?: {
    average: number;
    count: number;
  };
  createdAt: Date;
}